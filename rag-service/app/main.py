from fastapi import FastAPI

from app.api.ingestion import router as ingestion_router
from app.api.search import router as search_router


app = FastAPI(
    title="Data Coffee Model Hub RAG Service",
    version="1.0.0",
    description="Python service for RAG ingestion and retrieval.",
)


app.include_router(
    ingestion_router
)

app.include_router(
    search_router
)