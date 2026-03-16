from qdrant_client import QdrantClient
from qdrant_client.http import models
import uuid
from typing import List, Dict, Any

class CattleVectorStore:
    def __init__(self, url: str, api_key: str, vector_size: int = 128):
        # Connect to Qdrant Cloud
        self.client = QdrantClient(url=url, api_key=api_key)
        self.collection_name = "cattle_embeddings"
        
        # If collection exists but has wrong dimension, recreate it
        if self.client.collection_exists(self.collection_name):
            info = self.client.get_collection(self.collection_name)
            existing_size = info.config.params.vectors.size
            if existing_size != vector_size:
                print(f"⚠️ Collection dimension mismatch: expected {vector_size}, got {existing_size}. Recreating...")
                self.client.delete_collection(self.collection_name)
                self._init_collection(vector_size)
        else:
            self._init_collection(vector_size)

    def _init_collection(self, vector_size: int):
        self.client.create_collection(
            collection_name=self.collection_name,
            vectors_config=models.VectorParams(
                size=vector_size, 
                distance=models.Distance.COSINE
            ),
        )
        # Create payload index for farmer_id (required for filtering in search)
        self.client.create_payload_index(
            collection_name=self.collection_name,
            field_name="farmer_id",
            field_schema="keyword",
        )
        # Create payload index for cow_id for efficient lookup
        self.client.create_payload_index(
            collection_name=self.collection_name,
            field_name="cow_id",
            field_schema="keyword",
        )

    def add_embedding(self, embedding: List[float], cow_id: str, farmer_id: str, source: str):
        # Qdrant requires UUIDs. We generate a consistent UUID from your unique string.
        vector_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{cow_id}_{source}"))
        
        self.client.upsert(
            collection_name=self.collection_name,
            points=[
                models.PointStruct(
                    id=vector_id,
                    vector=embedding,
                    payload={"cow_id": cow_id, "farmer_id": farmer_id, "source": source}
                )
            ]
        )

    def search(self, embedding: List[float], user_id: str, role: str, top_k: int = 1) -> Dict[str, Any]:
        # Filter metadata based on role
        query_filter = None
        if role == "farmer":
            query_filter = models.Filter(
                must=[
                    models.FieldCondition(
                        key="farmer_id",
                        match=models.MatchValue(value=user_id)
                    )
                ]
            )

        # Use the modern query_points API instead of the legacy search()
        # which can have compatibility issues in some client versions.
        response = self.client.query_points(
            collection_name=self.collection_name,
            query=embedding,
            query_filter=query_filter,
            limit=top_k
        )
        
        if not response.points:
            return {"found": False, "message": "No matching cattle found in the specified database."}
            
        best_match = response.points[0]
        # In query_points, the score is directly accessible
        distance = 1.0 - best_match.score 
        
        return {
            "found": True,
            "cow_id": best_match.payload['cow_id'],
            "farmer_id": best_match.payload['farmer_id'],
            "distance": distance
        }