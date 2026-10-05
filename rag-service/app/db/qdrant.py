from __future__ import annotations

from qdrant_client import QdrantClient, models

from app.config import (
    EMBEDDING_DIMENSION,
    QDRANT_API_KEY,
    QDRANT_COLLECTION,
    QDRANT_URL,
)


class QdrantRepository:


    DENSE_VECTOR_NAME = "dense"
    SPARSE_VECTOR_NAME = "sparse"

    def __init__(
        self,
        url: str = QDRANT_URL,
        api_key: str | None = QDRANT_API_KEY,
    ) -> None:

        self.client = QdrantClient(
            url=url,
            api_key=api_key or None,
        )

        self.collection_name = QDRANT_COLLECTION
        self._collection_initialized = False

    def ensure_collection(self) -> None:
        """
        Create the collection and payload indexes when it does not already exist.
        """
        if self._collection_initialized:
            return

        collections = self.client.get_collections()

        exists = any(
            collection.name == self.collection_name
            for collection in collections.collections
        )

        if not exists:
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config={
                    self.DENSE_VECTOR_NAME: models.VectorParams(
                        size=EMBEDDING_DIMENSION,
                        distance=models.Distance.COSINE,
                    ),
                },
                sparse_vectors_config={
                    self.SPARSE_VECTOR_NAME: models.SparseVectorParams(),
                },
            )
            try:
                self.client.create_payload_index(
                    collection_name=self.collection_name,
                    field_name="workspace_id",
                    field_schema=models.PayloadSchemaType.KEYWORD,
                )
                self.client.create_payload_index(
                    collection_name=self.collection_name,
                    field_name="document_id",
                    field_schema=models.PayloadSchemaType.KEYWORD,
                )
            except Exception:
                pass

        self._collection_initialized = True

    def upsert_chunks(
        self,
        points: list[models.PointStruct],
    ) -> None:
        
        # Insert or replace document chunks in Qdrant.
        

        if not points:
            return

        self.ensure_collection()

        self.client.upsert(
            collection_name=self.collection_name,
            points=points,
            wait=True,
        )

    def document_exists(
        self,
        workspace_id: str,
        document_id: str,
    ) -> bool:
        
        # Check whether the document already has indexed chunks.
        

        self.ensure_collection()

        result = self.client.count(
            collection_name=self.collection_name,
            count_filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="workspace_id",
                        match=models.MatchValue(
                            value=workspace_id,
                        ),
                    ),
                    models.FieldCondition(
                        key="document_id",
                        match=models.MatchValue(
                            value=document_id,
                        ),
                    ),
                ],
            ),
            exact=True,
        )

        return result.count > 0

    def get_document_content_hash(
        self,
        workspace_id: str,
        document_id: str,
    ) -> str | None:
        
        # Get the content hash stored on an existing document.
        

        self.ensure_collection()

        records, _ = self.client.scroll(
            collection_name=self.collection_name,
            scroll_filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="workspace_id",
                        match=models.MatchValue(
                            value=workspace_id,
                        ),
                    ),
                    models.FieldCondition(
                        key="document_id",
                        match=models.MatchValue(
                            value=document_id,
                        ),
                    ),
                ],
            ),
            limit=1,
            with_payload=True,
            with_vectors=False,
        )

        if not records:
            return None

        payload = records[0].payload or {}

        content_hash = payload.get(
            "content_hash"
        )

        if content_hash is None:
            return None

        return str(content_hash)

    def delete_document(
        self,
        workspace_id: str,
        document_id: str,
    ) -> None:
        
        # Delete all chunks belonging to one document.
        

        self.ensure_collection()

        self.client.delete(
            collection_name=self.collection_name,
            points_selector=models.FilterSelector(
                filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="workspace_id",
                            match=models.MatchValue(
                                value=workspace_id,
                            ),
                        ),
                        models.FieldCondition(
                            key="document_id",
                            match=models.MatchValue(
                                value=document_id,
                            ),
                        ),
                    ],
                )
            ),
            wait=True,
        )

    def count_document_points(
        self,
        workspace_id: str,
        document_id: str,
    ) -> int:
        
        # Count the number of indexed chunks for one document.

        self.ensure_collection()

        result = self.client.count(
            collection_name=self.collection_name,
            count_filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="workspace_id",
                        match=models.MatchValue(
                            value=workspace_id,
                        ),
                    ),
                    models.FieldCondition(
                        key="document_id",
                        match=models.MatchValue(
                            value=document_id,
                        ),
                    ),
                ],
            ),
            exact=True,
        )

        return result.count

    def hybrid_search(
        self,
        dense_query: list[float],
        sparse_query: str,
        top_k: int,
        query_filter: models.Filter | None = None,
        prefetch_limit: int | None = None,
    ):

       # Perform dense and sparse retrieval and combine their rankings using Reciprocal Rank Fusion.

        self.ensure_collection()

        if top_k <= 0:
            raise ValueError(
                "top_k must be greater than 0."
            )

        if prefetch_limit is None:
            prefetch_limit = max(
                top_k * 3,
                20,
            )

        response = self.client.query_points(
            collection_name=self.collection_name,

            prefetch=[
                models.Prefetch(
                    query=dense_query,
                    using=self.DENSE_VECTOR_NAME,
                    limit=prefetch_limit,
                    filter=query_filter,
                ),
                models.Prefetch(
                    query=models.Document(
                        text=sparse_query,
                        model="qdrant/bm25",
                    ),
                    using=self.SPARSE_VECTOR_NAME,
                    limit=prefetch_limit,
                    filter=query_filter,
                ),
            ],

            query=models.RrfQuery(
                rrf=models.Rrf(
                    k=61,
                    weights=[
                        0.6,
                        0.4,
                    ],
                ),
            ),

            limit=top_k,

            with_payload=True,
            with_vectors=False,
        )

        return response.points

    def collection_info(self):
        
        # Return information about the Qdrant collection.

        self.ensure_collection()

        return self.client.get_collection(
            collection_name=self.collection_name,
        )

    def count_points(self) -> int:
        """
        Return the total number of points in the collection.
        """

        self.ensure_collection()

        result = self.client.count(
            collection_name=self.collection_name,
            exact=True,
        )

        return result.count