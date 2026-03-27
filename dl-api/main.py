import os
import asyncio
import json
import time
import requests
import oci
import numpy as np
import cv2
from fastapi import FastAPI, HTTPException, BackgroundTasks
from contextlib import asynccontextmanager
from schemas import SearchRequest, RegistrationJobPayload
from dl_pipeline import DLPipeline
from vector_store import CattleVectorStore
from ml_logger import MLLogger
from dotenv import load_dotenv

load_dotenv(override=True)
# Ensure we re-read these after load_dotenv
IS_LOCAL_DEV = os.getenv("IS_LOCAL_DEV", "false").lower() == "true"
EXPRESS_WEBHOOK_URL = os.getenv("EXPRESS_WEBHOOK_URL", "http://localhost:2424/api/cattle/webhook/dl-api-complete")
print(f"DEBUG: IS_LOCAL_DEV={IS_LOCAL_DEV}, WEBHOOK={EXPRESS_WEBHOOK_URL}")

# Globals
dl = None
db = None
ml_log = MLLogger()
oci_config = None
object_storage_client = None
queue_client = None

# OCI Environment setup
OCI_NAMESPACE = os.getenv("OCI_NAMESPACE", "your-namespace")
OCI_BUCKET_NAME = os.getenv("OCI_BUCKET_NAME", "ama-pashu-images")
OCI_QUEUE_ID = os.getenv("OCI_QUEUE_ID", "ocid1.queue.oc1...")
EXPRESS_WEBHOOK_URL = os.getenv("EXPRESS_WEBHOOK_URL", "http://localhost:2424/api/cattle/webhook/dl-api-complete")
IS_LOCAL_DEV = os.getenv("IS_LOCAL_DEV", "false").lower() == "true"
LOCAL_UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "server", "uploads"))

def download_oci_image(file_name: str) -> np.ndarray:
    """Helper to download image from OCI Object Storage into OpenCV format"""
    if IS_LOCAL_DEV:
        file_path = os.path.join(LOCAL_UPLOAD_DIR, file_name)
        img = cv2.imread(file_path, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError(f"Could not read local file: {file_path}")
        return img

    response = object_storage_client.get_object(
        namespace_name=OCI_NAMESPACE,
        bucket_name=OCI_BUCKET_NAME,
        object_name=file_name
    )
    # Read response content as numpy array
    image_bytes = response.data.content
    np_arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    return img

async def poll_oci_queue():
    """Background task to poll OCI Queue for new image registration jobs."""
    print("Started OCI Queue Worker...")
    while True:
        try:
            # Polling queue for messages (blocks up to 10 seconds on the server side if empty)
            response = queue_client.get_messages(
                queue_id=OCI_QUEUE_ID,
                limit=5,
                timeout_in_seconds=10
            )
            
            messages = response.data.messages
            for msg in messages:
                print(f"Received job receipt: {msg.receipt}")
                try:
                    payload = json.loads(msg.content)
                    
                    if payload.get("type") == "register":
                        process_registration(payload)
                    
                    # Delete message on successful processing
                    queue_client.delete_message(
                        queue_id=OCI_QUEUE_ID,
                        message_receipt=msg.receipt
                    )
                except Exception as eval_err:
                    print(f"Error processing message {msg.receipt}: {eval_err}")
                    
                    # Implement retry logic based on payload delivery counts
                    # Fallback to local dict retry counter if OCI delivery count isn't immediately parsed
                    retries = payload.get("retry_count", 0) if payload else 0
                    if retries < 3:
                        print(f"Retry {retries + 1}/3 for job {payload.get('cow_id', 'unknown')}")
                        if payload:
                             payload["retry_count"] = retries + 1
                             # Push back to queue (In real OCI, you can update msg or simply not delete it to rely on visibility timeout)
                             # For demonstration, we'll let visibility timeout handle it but log an exponential delay
                             await asyncio.sleep(2 ** retries) 
                    else:
                        print(f"<< DEAD LETTER QUEUE >> Max retries reached for cow_id: {payload.get('cow_id', 'unknown')}")
                        # In production: push this payload to an actual dead-letter OCI Queue here.
                        
                        queue_client.delete_message(
                             queue_id=OCI_QUEUE_ID,
                             message_receipt=msg.receipt
                        )
                        if payload and payload.get('cow_id'):
                            requests.post(EXPRESS_WEBHOOK_URL, json={
                                "cow_id": payload.get("cow_id"),
                                "farmer_id": payload.get("farmer_id"),
                                "status": "FAILED_MAX_RETRIES"
                            })
                    
        except oci.exceptions.ServiceError as oci_err:
            if oci_err.status == 404:
                print("OCI Queue not found. Retrying in 5s...")
                await asyncio.sleep(5)
            elif oci_err.status == 408:
                # Long poll timeout, just continue
                pass
            else:
                print(f"OCI Service Error: {oci_err}")
                await asyncio.sleep(5)
        except Exception as e:
            print(f"Queue Worker Exception: {e}")
            await asyncio.sleep(5)
            
def process_registration(payload: dict):
    start_time = time.time()
    farmer_id = payload["farmer_id"]
    cow_id = payload["cow_id"]
    face_oci = payload["face_image_oci"]
    muzzle_oci = payload["muzzle_image_oci"]
    
    embeddings_added = 0
    all_embeddings = []
    
    spoof_prob_muzzle = None
    spoof_prob_face = None
    muzzle_conf = None
    face_conf = None
    muzzle_crops = []
    face_crops = []
    is_spoof_muzzle = False
    is_spoof_face = False
    
    # 1. Process Muzzle
    try:
        muzzle_img = download_oci_image(muzzle_oci)
        is_spoof_res, spoof_prob_muzzle = dl.is_spoof(muzzle_img)
        if is_spoof_res:
            is_spoof_muzzle = True
            raise ValueError("Spoof detected in muzzle image.")
        muzzle_crops, muzzle_conf = dl.crop_muzzles(muzzle_img)
        if muzzle_crops:
            embs = dl.get_embeddings_batch(muzzle_crops)
            for emb in embs:
                all_embeddings.append(("muzzle_image", emb))
                embeddings_added += 1
    except Exception as e:
        print(f"Muzzle processing error for {cow_id}: {e}")

    # 2. Process Face
    try:
        face_img = download_oci_image(face_oci)
        is_spoof_res, spoof_prob_face = dl.is_spoof(face_img)
        if is_spoof_res:
            is_spoof_face = True
            raise ValueError("Spoof detected in face image.")
        face_crops, face_conf = dl.crop_muzzles(face_img)
        if face_crops:
            embs = dl.get_embeddings_batch(face_crops)
            for emb in embs:
                all_embeddings.append(("face_image", emb))
                embeddings_added += 1
    except Exception as e:
        print(f"Face processing error for {cow_id}: {e}")
        
    best_result = {"found": False, "distance": float('inf'), "cow_id": None, "farmer_id": None}
    matched_cow_id = None
    
    if is_spoof_muzzle and is_spoof_face:
        match_status = "SPOOF_DETECTED_BOTH"
        print(f"Spoof detected in both images for cow {cow_id}.")
    elif is_spoof_muzzle:
        match_status = "SPOOF_DETECTED_MUZZLE"
        print(f"Spoof detected in muzzle image for cow {cow_id}.")
    elif is_spoof_face:
        match_status = "SPOOF_DETECTED_FACE"
        print(f"Spoof detected in face image for cow {cow_id}.")
    elif not muzzle_crops and not face_crops:
        match_status = "NO_MUZZLE_DETECTED_BOTH"
        print(f"Muzzle detection failed for both images for cow {cow_id}.")
    elif not muzzle_crops:
        match_status = "NO_MUZZLE_DETECTED_MUZZLE_IMAGE"
        print(f"Muzzle detection failed in muzzle profile image for cow {cow_id}.")
    elif not face_crops:
        match_status = "NO_MUZZLE_DETECTED_FACE_IMAGE"
        print(f"Muzzle detection failed in face profile image for cow {cow_id}.")
    else:
        # Verify Muzzle and Face crops match (similarity >= 80% / distance <= 0.2)
        muzzle_embs = [emb for src, emb in all_embeddings if src == "muzzle_image"]
        face_embs = [emb for src, emb in all_embeddings if src == "face_image"]
        cross_min_dist = float('inf')
        
        for m_emb in muzzle_embs:
            m_vec = np.array(m_emb, dtype=np.float32)
            m_norm = m_vec / (np.linalg.norm(m_vec) or 1)
            for f_emb in face_embs:
                f_vec = np.array(f_emb, dtype=np.float32)
                f_norm = f_vec / (np.linalg.norm(f_vec) or 1)
                dist = 1.0 - float(np.dot(m_norm, f_norm))
                if dist < cross_min_dist:
                    cross_min_dist = dist
                    
        print(f"Face and Muzzle cross-match distance for {cow_id}: {cross_min_dist} (Similarity: {(1-cross_min_dist)*100:.2f}%)")
        
        if cross_min_dist > 0.20:
            match_status = "FACE_MUZZLE_MISMATCH"
            print(f"Muzzle in face and muzzle profile do not match (Similarity < 80%) for cow {cow_id}.")
        else:
            match_status = "SUCCESS"
            
            # 3. Duplicate/Dispute Checks via Oracle AI Vector Search
            for source, emb in all_embeddings:
                result = db.search(emb, user_id=None, role="admin", top_k=1)
                if result["found"]:
                    # Track the absolute best match across all crops for logging
                    if result["distance"] < best_result["distance"]:
                        best_result = result
                    
                    # If a high-confidence match is found, trigger DUPLICATE/DISPUTE
                    if result["distance"] <= 0.4:
                        matched_cow_id = result["cow_id"]
                        if result["farmer_id"] == farmer_id:
                            match_status = "DUPLICATE"
                        else:
                            match_status = "DISPUTE"
    
            if match_status != "DUPLICATE":
                for source, emb in all_embeddings:
                    db.add_embedding(emb, cow_id, farmer_id, source=source)

            
    # Record ML Telemetry
    inference_time = (time.time() - start_time) * 1000
    ml_log.log_inference(
        job_type="registration",
        cow_id=cow_id,
        farmer_id=farmer_id,
        match_status=match_status,
        inference_time_ms=inference_time,
        best_distance=best_result["distance"] if best_result.get("found") else None,
        matched_cow_id=matched_cow_id,
        num_crops=len(all_embeddings),
        muzzle_img_url=muzzle_oci,
        face_img_url=face_oci,
        muzzle_conf_m=muzzle_conf,
        muzzle_conf_f=face_conf,
        spoof_prob_m=spoof_prob_muzzle,
        spoof_prob_f=spoof_prob_face
    )
            
    # 5. Notify Express Backend via Webhook
    requests.post(EXPRESS_WEBHOOK_URL, json={
        "cow_id": cow_id,
        "farmer_id": farmer_id,
        "status": match_status,
        "matched_cow_id": matched_cow_id
    })
    print(f"Finished processing job for cow {cow_id}. Result: {match_status} (took {int(inference_time)}ms)")

@asynccontextmanager
async def lifespan(app: FastAPI):
    global dl, db, oci_config, object_storage_client, queue_client
    print(f"Initializing AI components and DB (Local Dev: {IS_LOCAL_DEV})...")
    
    if not IS_LOCAL_DEV:
        try:
            oci_config = oci.config.from_file()
            object_storage_client = oci.object_storage.ObjectStorageClient(oci_config)
            queue_client = oci.queue.QueueClient(oci_config)
            print("OCI Clients authenticated and connected.")
        except Exception as e:
            print(f"Warning: OCI Authentication failed: {e}")

    dl = DLPipeline(
        yolo_path="models/best.pt", 
        siamese_path="models/siamese_resnet18_newdataset.pt",
        spoof_path="models/best_model.pth"
    )
    
    dsn = os.getenv("ORACLE_DSN", "localhost:1521/FREEPDB1")
    user = os.getenv("ORACLE_USER", "sys")
    print(f"Connecting to Oracle DB: {dsn} as {user}...")
    
    # Needs Oracle 23ai valid credentials mapped to these ENV variables.
    db = CattleVectorStore(
        dsn=dsn, 
        user=user,
        password=os.getenv("ORACLE_PASSWORD", "password")
    )
    print("System Ready.")
    
    task = None
    if not IS_LOCAL_DEV:
        # Start the Queue Worker Thread only if not local dev
        task = asyncio.create_task(poll_oci_queue())
    
    yield
    print("Shutting down...")
    if task:
        task.cancel()

from fastapi.staticfiles import StaticFiles
app = FastAPI(lifespan=lifespan)

if IS_LOCAL_DEV:
    os.makedirs(LOCAL_UPLOAD_DIR, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=LOCAL_UPLOAD_DIR), name="uploads")

def process_registration_safe(payload: dict):
    try:
        process_registration(payload)
    except Exception as e:
        print(f"Error processing local registration: {e}")
        if payload and payload.get("cow_id"):
            requests.post(EXPRESS_WEBHOOK_URL, json={
                "cow_id": payload.get("cow_id"),
                "farmer_id": payload.get("farmer_id"),
                "status": "FAILED"
            })

@app.post("/local-queue-trigger")
async def local_queue_trigger(payload: dict, background_tasks: BackgroundTasks):
    """Fallback endpoint for Express to trigger background jobs locally without OCI Queue."""
    if not IS_LOCAL_DEV:
        raise HTTPException(status_code=403, detail="Local dev endpoint disabled")
    
    # Add to FastAPI background tasks (simulates OCI message queue decoupled processing)
    background_tasks.add_task(process_registration_safe, payload)
    return {"status": "Job accepted"}

@app.post("/search")
async def search_cow(req: SearchRequest):
    try:
        face_img = download_oci_image(req.face_image_oci)
        muzzle_img = download_oci_image(req.muzzle_image_oci)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch images from OCI storage: {e}")
    
    # Try the muzzle image first, fallback to face image
    crops, muzzle_conf = dl.crop_muzzles(muzzle_img)
    face_conf = None
    if not crops:
        crops, face_conf = dl.crop_muzzles(face_img)
        
    start_time = time.time()
        
    if not crops:
         inference_time = (time.time() - start_time) * 1000
         ml_log.log_inference(
             job_type="search",
             cow_id=req.user_id, # Can't know cow id yet
             farmer_id=req.user_id,
             match_status="NO_MUZZLE_DETECTED",
             inference_time_ms=inference_time,
             best_distance=None,
             num_crops=0,
             muzzle_img_url=req.muzzle_image_oci,
             face_img_url=req.face_image_oci,
             muzzle_conf_m=muzzle_conf,
             muzzle_conf_f=face_conf
         )
         raise HTTPException(status_code=400, detail="Could not detect a muzzle in search images.")
         
    # Generate batch embeddings
    search_embeddings = dl.get_embeddings_batch(crops)
    
    # Query database and find best match across all extracted crops (Max Similarity approach)
    best_result = {"found": False, "distance": float('inf'), "cow_id": None}
    
    for emb in search_embeddings:
        result = db.search(emb, user_id=req.user_id, role=req.role)
        if result["found"] and result["distance"] < best_result["distance"]:
            best_result = result
            
    inference_time = (time.time() - start_time) * 1000
    
    ml_log.log_inference(
         job_type="search",
         cow_id=best_result["cow_id"] if best_result["found"] else req.user_id,
         farmer_id=req.user_id,
         match_status="FOUND" if best_result["found"] and best_result["distance"] <= 0.4 else "NOT_FOUND",
         inference_time_ms=inference_time,
         best_distance=best_result["distance"] if best_result.get("found") else None,
         num_crops=len(crops),
         muzzle_img_url=req.muzzle_image_oci,
         face_img_url=req.face_image_oci,
         muzzle_conf_m=muzzle_conf,
         muzzle_conf_f=face_conf
    )
    
    if not best_result["found"]:
        raise HTTPException(status_code=404, detail="No matching cattle found in the database.")
        
    print(f"Confidence Score: {(1-best_result['distance'])*100}")
    if best_result["distance"] > 0.4: 
        raise HTTPException(status_code=404, detail="Cow not found (Similarity too low).")
        
    return {"cow_id": best_result["cow_id"], "distance": best_result["distance"]}

@app.get("/health")
async def health_check():
    """Liveness check for Load Balancers."""
    return {
        "status": "healthy", 
        "model_loaded": dl is not None,
        "db_connected": db is not None
    }

from fastapi.responses import HTMLResponse
@app.get("/ml-dashboard", response_class=HTMLResponse)
async def view_ml_dashboard():
    """Serves the generated ML Telemetry Dashboard HTML."""
    html_path = ml_log.generate_html_report()
    if os.path.exists(html_path):
        with open(html_path, "r") as f:
            return f.read()
    return "<h1>No logs available yet.</h1>"