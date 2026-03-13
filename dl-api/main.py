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
    dl = DLPipeline(yolo_path="models/best.pt", siamese_path="models/siamese_resnet18_newdataset.pt")
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
    
    # 1. Process Face
    try:
        face_img = dl.decode_base64(req.face_image)
        face_crop = dl.crop_muzzle(face_img)
        if face_crop is not None:
            emb = dl.get_embedding(face_crop)
            db.add_embedding(emb, req.cow_id, req.farmer_id, source="face_image")
            embeddings_added += 1
    except Exception as e:
        print(f"Face processing error: {e}")

    # 2. Process Muzzle
    try:
        muzzle_img = dl.decode_base64(req.muzzle_image)
        muzzle_crop = dl.crop_muzzle(muzzle_img)
        if muzzle_crop is not None:
            emb = dl.get_embedding(muzzle_crop)
            db.add_embedding(emb, req.cow_id, req.farmer_id, source="muzzle_image")
            embeddings_added += 1
    except Exception as e:
        print(f"Muzzle image processing error: {e}")

    if embeddings_added == 0:
        raise HTTPException(status_code=400, detail="Could not detect muzzles in either provided image.")
        
    return {"message": "Successfully registered cattle.", "embeddings_stored": embeddings_added}

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