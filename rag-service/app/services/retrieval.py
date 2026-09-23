from __future__ import annotations

from qdrant_client import models

from app.db.qdrant import QdrantRepository
from app.models.schemas import (
    RagContext,
    SearchRequest,
    SearchResult,
)
from app.services.citations import build_rag_context
from app.services.embeddings import EmbeddingService
from app.services.reranking import rerank_results


class RetrievalService:

    def __init__(self) -> None:
        self.embedding_service = (
            EmbeddingService()
        )

        self.qdrant = (
            QdrantRepository()
        )

    def build_filter(
        self,
        request: SearchRequest,
    ) -> models.Filter:

        # Build the Qdrant filter using workspace and optional document restrictions.

        conditions = [
            models.FieldCondition(
                key="workspace_id",
                match=models.MatchValue(
                    value=request.workspace_id,
                ),
            )
        ]

        if request.document_ids:
            conditions.append(
                models.FieldCondition(
                    key="document_id",
                    match=models.MatchAny(
                        any=request.document_ids,
                    ),
                )
            )

        return models.Filter(
            must=conditions,
        )

    def search(
        self,
        request: SearchRequest,
    ) -> RagContext:
        
        # Runs hybrid retrieval and prepare the final RAG context.

        dense_query = (
            self.embedding_service.embed_text(
                request.query
            )
        )

        query_filter = self.build_filter(
            request
        )

        points = self.qdrant.hybrid_search(
            dense_query=dense_query,
            sparse_query=request.query,
            top_k=max(
                request.top_k * 3,
                12,
            ),
            query_filter=query_filter,
        )

        results: list[SearchResult] = []

        for point in points:
            payload = (
                point.payload
                or {}
            )

            results.append(
                SearchResult(
                    id=str(point.id),
                    document_name=str(
                        payload.get(
                            "document_name",
                            "",
                        )
                    ),
                    document_id=str(
                        payload.get(
                            "document_id",
                            "",
                        )
                    ),
                    content=str(
                        payload.get(
                            "content",
                            "",
                        )
                    ),
                    start_line=int(
                        payload.get(
                            "start_line",
                            0,
                        )
                    ),
                    end_line=int(
                        payload.get(
                            "end_line",
                            0,
                        )
                    ),
                    chunk_index=int(
                        payload.get(
                            "chunk_index",
                            0,
                        )
                    ),
                    score=float(
                        point.score
                    ),
                    base_score=float(
                        point.score
                    ),
                    workspace_id=str(
                        payload.get(
                            "workspace_id",
                            request.workspace_id,
                        )
                    ),
                )
            )

        reranked_results = rerank_results(
            query=request.query,
            results=results,
        )

        final_results = reranked_results[
            :request.top_k
        ]

        return build_rag_context(
            results=final_results,
        )