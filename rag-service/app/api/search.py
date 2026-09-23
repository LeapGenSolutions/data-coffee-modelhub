from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import SearchRequest
from app.services.retrieval import RetrievalService


router = APIRouter(
    prefix="/rag/search",
    tags=["search"],
)


retrieval_service = RetrievalService()


@router.post("")
def search_documents(
    request: SearchRequest,
):

   # Receive a search request and delegate the retrieval work to the retrieval service.

    result = retrieval_service.search(
        request
    )

    return {
        "query": request.query,
        "workspace_id": request.workspace_id,
        "results": [
            item.model_dump()
            for item in result.results
        ],
        "citations": [
            item.model_dump()
            for item in result.citations
        ],
        "contextPrompt": result.context_prompt,
    }