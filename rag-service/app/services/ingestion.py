from __future__ import annotations

import hashlib

from qdrant_client import models

from app.db.qdrant import QdrantRepository
from app.models.schemas import (
    IngestionResult,
    ParsedDocument,
)
from app.services.chunking import chunk_document
from app.services.embeddings import EmbeddingService


class IngestionService:


    def __init__(self) -> None:

        self.embedding_service = (
            EmbeddingService()
        )

        self.qdrant = (
            QdrantRepository()
        )

    def calculate_content_hash(
        self,
        content: str,
    ) -> str:
        
        # Create a stable SHA-256 hash of document content.
       

        return hashlib.sha256(
            content.encode("utf-8")
        ).hexdigest()

    def process_document(
        self,
        document: ParsedDocument,
        workspace_id: str = "default",
        document_id: str | None = None,
    ) -> IngestionResult:
        
        # Index a new document or replace an existing document when its content changes.
    

        actual_document_id = (
            document_id
            or document.name
        )

        content_hash = (
            self.calculate_content_hash(
                document.content
            )
        )

        document_exists = (
            self.qdrant.document_exists(
                workspace_id=workspace_id,
                document_id=actual_document_id,
            )
        )

        if document_exists:

            existing_hash = (
                self.qdrant.get_document_content_hash(
                    workspace_id=workspace_id,
                    document_id=actual_document_id,
                )
            )

            if (
                existing_hash
                == content_hash
            ):
                return IngestionResult(
                    document_id=actual_document_id,
                    workspace_id=workspace_id,
                    status="already_indexed",
                    chunks_count=0,
                )

        chunks = chunk_document(
            document_name=document.name,
            content=document.content,
            document_id=actual_document_id,
        )

        if not chunks:

            if document_exists:
                self.qdrant.delete_document(
                    workspace_id=workspace_id,
                    document_id=actual_document_id,
                )

            status = (
                "reindexed"
                if document_exists
                else "indexed"
            )

            return IngestionResult(
                document_id=actual_document_id,
                workspace_id=workspace_id,
                status=status,
                chunks_count=0,
            )

        embeddings = (
            self.embedding_service.embed_texts(
                [
                    chunk.content
                    for chunk in chunks
                ]
            )
        )

        points: list[
            models.PointStruct
        ] = []

        for chunk, embedding in zip(
            chunks,
            embeddings,
            strict=True,
        ):

            payload = {
                "workspace_id": workspace_id,
                "document_id": actual_document_id,
                "document_name": document.name,
                "document_type": document.type,
                "chunk_id": chunk.id,
                "chunk_index": chunk.chunk_index,
                "content": chunk.content,
                "start_line": chunk.start_line,
                "end_line": chunk.end_line,
                "token_count": chunk.token_count,
                "content_hash": content_hash,
            }

            points.append(
                models.PointStruct(
                    id=chunk.id,
                    vector={
                        "dense": embedding,
                        "sparse": models.Document(
                            text=chunk.content,
                            model="qdrant/bm25",
                        ),
                    },
                    payload=payload,
                )
            )

        if document_exists:
            self.qdrant.delete_document(
                workspace_id=workspace_id,
                document_id=actual_document_id,
            )

        self.qdrant.upsert_chunks(
            points
        )

        status = (
            "reindexed"
            if document_exists
            else "indexed"
        )

        return IngestionResult(
            document_id=actual_document_id,
            workspace_id=workspace_id,
            status=status,
            chunks_count=len(chunks),
        )