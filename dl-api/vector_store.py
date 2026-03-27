import oracledb
import os
import array
import numpy as np
from typing import List, Dict, Any

class CattleVectorStore:
    def __init__(self, dsn: str, user: str, password: str, vector_size: int = 128):
        # Connect to Oracle 23ai Database
        # Note: If connecting as 'sys', we must use SYSDBA mode
        mode = oracledb.AUTH_MODE_SYSDBA if user.lower() == "sys" else oracledb.AUTH_MODE_DEFAULT
        
        self.pool = oracledb.create_pool(
            user=user,
            password=password,
            dsn=dsn,
            min=1,
            max=5,
            increment=1,
            mode=mode
        )
        self.vector_size = vector_size
        self._init_table()
        
    def _normalize_vector(self, embedding: List[float]) -> List[float]:
        """L2 Normalization for Cosine Similarity optimization."""
        vec = np.array(embedding, dtype=np.float32)
        norm = np.linalg.norm(vec)
        if norm == 0:
            return vec.tolist()
        return (vec / norm).tolist()

    def _init_table(self):
        with self.pool.acquire() as connection:
            with connection.cursor() as cursor:
                # Check if table exists
                cursor.execute("""
                    SELECT count(*) FROM user_tables WHERE table_name = 'CATTLE_VECTORS'
                """)
                count, = cursor.fetchone()
                
                if count == 0:
                    print("Table 'CATTLE_VECTORS' not found. Initializing new table...")
                    cursor.execute(f"""
                        CREATE TABLE cattle_vectors (
                            vector_id VARCHAR2(255) PRIMARY KEY,
                            cow_id VARCHAR2(255) NOT NULL,
                            farmer_id VARCHAR2(255) NOT NULL,
                            source VARCHAR2(50),
                            image_vector VECTOR({self.vector_size}, FLOAT32)
                        )
                    """)
                    # Create HNSW index for fast retrieval
                    cursor.execute("""
                        CREATE VECTOR INDEX cattle_vectors_idx ON cattle_vectors (image_vector)
                        ORGANIZATION NEIGHBOR GRAPH
                        DISTANCE COSINE
                        WITH TARGET ACCURACY 95 
                    """)
                    connection.commit()
                else:
                    print("Vector database table found and ready.")

    def add_embedding(self, embedding: List[float], cow_id: str, farmer_id: str, source: str):
        # Oracle 23ai uses Python's `array` module for native VECTOR ingestion
        # Normalize vector for optimal Cosine Distance search performance
        normalized_emb = self._normalize_vector(embedding)
        vec = array.array("f", normalized_emb)
        vector_id = f"{cow_id}_{source}"
        
        with self.pool.acquire() as connection:
            with connection.cursor() as cursor:
                cursor.execute("""
                    MERGE INTO cattle_vectors tgt
                    USING (SELECT :vector_id as id, :cow_id as cow, :farmer_id as farmer, :source as src, :vec as v FROM dual) src
                    ON (tgt.vector_id = src.id)
                    WHEN MATCHED THEN
                        UPDATE SET tgt.image_vector = src.v
                    WHEN NOT MATCHED THEN
                        INSERT (vector_id, cow_id, farmer_id, source, image_vector)
                        VALUES (src.id, src.cow, src.farmer, src.src, src.v)
                """, vector_id=vector_id, cow_id=cow_id, farmer_id=farmer_id, source=source, vec=vec)
                connection.commit()

    def search(self, embedding: List[float], user_id: str, role: str, top_k: int = 1) -> Dict[str, Any]:
        normalized_emb = self._normalize_vector(embedding)
        vec = array.array("f", normalized_emb)
        
        with self.pool.acquire() as connection:
            with connection.cursor() as cursor:
                if role == "farmer":
                    # Filter by farmer_id
                    cursor.execute("""
                        SELECT cow_id, farmer_id, VECTOR_DISTANCE(image_vector, :vec, COSINE) as distance
                        FROM cattle_vectors
                        WHERE farmer_id = :user_id
                        ORDER BY distance ASC
                        FETCH FIRST :top_k ROWS ONLY
                    """, vec=vec, user_id=user_id, top_k=top_k)
                else:
                    # Global search (Admin/Dispute checks)
                    cursor.execute("""
                        SELECT cow_id, farmer_id, VECTOR_DISTANCE(image_vector, :vec, COSINE) as distance
                        FROM cattle_vectors
                        ORDER BY distance ASC
                        FETCH FIRST :top_k ROWS ONLY
                    """, vec=vec, top_k=top_k)

                results = cursor.fetchall()

                if not results:
                    return {"found": False, "message": "No matching cattle found in the database."}
                    
                best_match = results[0]
                cow_id, auth_farmer_id, distance = best_match
                
                return {
                    "found": True,
                    "cow_id": cow_id,
                    "farmer_id": auth_farmer_id,
                    "distance": float(distance)
                }