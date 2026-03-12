from qdrant_client import QdrantClient
from qdrant_client.http import models
import uuid
from typing import List, Dict, Any

class CattleVectorStore:
    def __init__(self, url: str, api_key: str, vector_size: int = 512):
        # Connect to Qdrant Cloud
        self.client = QdrantClient(url=url, api_key=api_key)
        self.collection_name = "cattle_embeddings"
        
        # Create collection if it doesn't exist
        if not self.client.collection_exists(self.collection_name):
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=models.VectorParams(
                    size=vector_size, 
                    distance=models.Distance.COSINE
                ),
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

        results = self.client.search(
            collection_name=self.collection_name,
            query_vector=embedding,
            query_filter=query_filter,
            limit=top_k
        )
        
        if not results:
            return {"found": False, "message": "No matching cattle found in the specified database."}
            
        best_match = results[0]
        distance = 1.0 - best_match.score 
        
        return {
            "found": True,
            "cow_id": best_match.payload['cow_id'],
            "distance": distance
        }