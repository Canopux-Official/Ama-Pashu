import os
from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
from schemas import RegistrationRequest, SearchRequest
from dl_pipeline import DLPipeline
from vector_store import CattleVectorStore
from dotenv import load_dotenv
load_dotenv()
dl = None
db = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global dl, db
    print("Initializing AI components and Vector Database...")
    dl = DLPipeline(
        yolo_path="models/best.pt", 
        siamese_path="models/siamese_resnet18_newdataset.pt",
        spoof_path="models/best_model.pth"
    )
    db = CattleVectorStore(
    url=os.getenv("QDRANT_URL"), 
    api_key=os.getenv("QDRANT_API_KEY")
)
    print("System Ready.")
    yield
    print("Shutting down...")

app = FastAPI(lifespan=lifespan)

@app.post("/register")
async def register_cow(req: RegistrationRequest):
    embeddings_added = 0
    is_disputed = False
    all_embeddings = []
    
    # Process Muzzle image specifically for Spoof and registration
    try:
        muzzle_img = dl.decode_base64(req.muzzle_image)
        
        # 1. Anti-Spoofing Check
        if dl.is_spoof(muzzle_img):
            raise HTTPException(status_code=400, detail="Spoof detected in muzzle image. Please capture a real, live photo.")
            
        # 2. Extract Muzzle Crop using YOLO
        muzzle_crop = dl.crop_muzzle(muzzle_img)
        if muzzle_crop is not None:
            # 3. Generate Embedding
            emb = dl.get_embedding(muzzle_crop)
            all_embeddings.append(("muzzle_image", emb))
            embeddings_added += 1
    except HTTPException:
        raise
    except Exception as e:
        print(f"Muzzle image processing error: {e}")

    # Process Face image as a secondary source
    try:
        face_img = dl.decode_base64(req.face_image)
        if dl.is_spoof(face_img):
            raise HTTPException(status_code=400, detail="Spoof detected in face image. Please capture a real, live photo.")
            
        face_crop = dl.crop_muzzle(face_img)
        if face_crop is not None:
            emb = dl.get_embedding(face_crop)
            all_embeddings.append(("face_image", emb))
            embeddings_added += 1
    except HTTPException:
        raise
    except Exception as e:
        print(f"Face processing error: {e}")

    if embeddings_added == 0:
        raise HTTPException(status_code=400, detail="Could not detect muzzles in either provided image.")
        
    # 4. Check for duplicates across the ENTIRE database (Dispute Check)
    match_status = "SUCCESS"
    matched_cow_id = None

    for source, emb in all_embeddings:
        try:
            # role="admin" bypasses farmer_id filtering to search across all farmers
            result = db.search(emb, user_id=None, role="admin", top_k=1)
            
            # Check if match is close enough
            if result["found"] and result["distance"] <= 0.4:
                matched_cow_id = result["cow_id"]
                match_farmer_id = result["farmer_id"]
                
                if match_farmer_id == req.farmer_id:
                    match_status = "DUPLICATE"
                else:
                    match_status = "DISPUTE"
                
                print(f"{match_status} triggered! Match found: {matched_cow_id} with farmer {match_farmer_id}")
                break
        except Exception as e:
            print(f"Error during dispute/duplicate check: {e}")
            
    # 5. Save Embeddings only if not a duplicate
    if match_status != "DUPLICATE":
        for source, emb in all_embeddings:
            db.add_embedding(emb, req.cow_id, req.farmer_id, source=source)
        
    return {
        "message": "Double Registration Detected" if match_status == "DUPLICATE" else "Successfully registered cattle.",
        "status": match_status,
        "matched_cow_id": matched_cow_id,
        "is_dispute": match_status == "DISPUTE"
    }

@app.post("/search")
async def search_cow(req: SearchRequest):
    try:
        face_img = dl.decode_base64(req.face_image)
        muzzle_img = dl.decode_base64(req.muzzle_image)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Base64 string format")
    
    # Try the muzzle image first, fallback to face image
    crop = dl.crop_muzzle(muzzle_img)
    if crop is None:
        crop = dl.crop_muzzle(face_img)
        
    if crop is None:
         raise HTTPException(status_code=400, detail="Could not detect a muzzle in search images.")
         
    # Generate embedding
    search_embedding = dl.get_embedding(crop)
    
    # Query database
    result = db.search(search_embedding, user_id=req.user_id, role=req.role)
    
    if not result["found"]:
        raise HTTPException(status_code=404, detail=result["message"])
        
    # Threshold for validation (tune this based on your model's accuracy)
    if result["distance"] > 0.4: 
        raise HTTPException(status_code=404, detail="Cow not found (Similarity too low).")
        
    return {"cow_id": result["cow_id"], "distance": result["distance"]}

@app.get("/health")
async def health_check():
    """Liveness check for Hugging Face Spaces."""
    return {"status": "healthy", "model_loaded": dl is not None}