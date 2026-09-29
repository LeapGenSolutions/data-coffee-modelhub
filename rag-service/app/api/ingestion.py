from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app.models.schemas import ParsedDocument
from app.services.ingestion import IngestionService


router = APIRouter(
    prefix="/rag/ingest",
    tags=["ingestion"],
)


ingestion_service = IngestionService()


class IngestionRequest(BaseModel):
    name: str
    size: str = "0"
    type: str = "text/plain"
    content: str

    workspace_id: str = "default"
    document_id: str | None = None


@router.post("")
def ingest_document(
    request: IngestionRequest,
):

    # Receives extracted text and delegate the indexing work to the service layer.

    actual_document_id = (
        request.document_id
        or request.name
    )

    document = ParsedDocument(
        name=request.name,
        size=request.size,
        type=request.type,
        content=request.content,
    )

    result = (
        ingestion_service.process_document(
            document=document,
            workspace_id=request.workspace_id,
            document_id=actual_document_id,
        )
    )

    return result.model_dump()