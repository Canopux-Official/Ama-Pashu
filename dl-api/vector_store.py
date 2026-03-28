import os
import uuid
import numpy as np
from typing import List, Dict, Any
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue

class CattleVectorStore:
    def __init__(self, qdrant_url: str, qdrant_api_key: str, vector_size: int = 128):
        self.client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
        self.vector_size = vector_size
        self.collection_name = "cattle_vectors"
        self._init_collection()
        
    def _normalize_vector(self, embedding: List[float]) -> List[float]:
        """L2 Normalization for Cosine Similarity optimization."""
        vec = np.array(embedding, dtype=np.float32)
        norm = np.linalg.norm(vec)
        if norm == 0:
            return vec.tolist()
        return (vec / norm).tolist()

    def _init_collection(self):
        try:
            if not self.client.collection_exists(self.collection_name):
                print(f"Collection '{self.collection_name}' not found. Initializing new collection...")
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(size=self.vector_size, distance=Distance.COSINE),
                )
            else:
                print("Vector database collection found and ready.")
            
            # Qdrant strictly requires payload indexes for fields used in query_filter
            self.client.create_payload_index(
                collection_name=self.collection_name,
                field_name="farmer_id",
                field_schema="keyword",
            )
        except Exception as e:
            print(f"Warning: Error initializing collection or indexes: {e}")

    def add_embedding(self, embedding: List[float], cow_id: str, farmer_id: str, source: str):
        normalized_emb = self._normalize_vector(embedding)
        vector_id = str(uuid.uuid5(uuid.NAMESPACE_OID, f"{cow_id}_{source}"))
        
        try:
            self.client.upsert(
                collection_name=self.collection_name,
                points=[
                    PointStruct(
                        id=vector_id,
                        vector=normalized_emb,
                        payload={"cow_id": cow_id, "farmer_id": farmer_id, "source": source}
                    )
                ]
            )
        except Exception as e:
            if "Not found" in str(e) or (hasattr(e, 'status_code') and e.status_code == 404):
                self._init_collection()
                self.client.upsert(
                    collection_name=self.collection_name,
                    points=[
                        PointStruct(
                            id=vector_id,
                            vector=normalized_emb,
                            payload={"cow_id": cow_id, "farmer_id": farmer_id, "source": source}
                        )
                    ]
                )
            else:
                raise e

    def search(self, embedding: List[float], user_id: str, role: str, top_k: int = 1) -> Dict[str, Any]:
        normalized_emb = self._normalize_vector(embedding)
        
        query_filter = None
        if role == "farmer" and user_id:
            query_filter = Filter(
                must=[
                    FieldCondition(key="farmer_id", match=MatchValue(value=user_id))
                ]
            )
            
        try:
            query_response = self.client.query_points(
                collection_name=self.collection_name,
                query=normalized_emb,
                query_filter=query_filter,
                limit=top_k
            )
        except Exception as e:
            if "Not found" in str(e) or (hasattr(e, 'status_code') and e.status_code == 404):
                self._init_collection()
                query_response = self.client.query_points(
                    collection_name=self.collection_name,
                    query=normalized_emb,
                    query_filter=query_filter,
                    limit=top_k
                )
            else:
                raise e
        results = query_response.points

        if not results:
            return {"found": False, "message": "No matching cattle found in the database."}
            
        best_match = results[0]
        # Qdrant's Cosine distance returns cosine similarity (score between -1 and 1)
        # Original code used distance where 0 is perfect match.
        distance = max(0.0, 1.0 - best_match.score)
        
        return {
            "found": True,
            "cow_id": best_match.payload["cow_id"],
            "farmer_id": best_match.payload["farmer_id"],
            "distance": float(distance)
        }