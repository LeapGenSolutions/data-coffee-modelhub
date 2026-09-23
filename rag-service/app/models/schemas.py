from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ParsedDocument(BaseModel):
    
   # Represents a document after its content has been extracted.
    

    name: str
    size: str
    type: str
    content: str


class DocumentChunk(BaseModel):
    
    #Represents one chunk that will be stored in Qdrant. 
    
    id: str
    document_name: str
    chunk_index: int

    start_line: int
    end_line: int

    content: str

    token_count: int = Field(
        ge=0,
    )


class IngestionResult(BaseModel):
    
    # Result returned after document ingestion.
    

    document_id: str
    workspace_id: str

    status: Literal[
        "indexed",
        "already_indexed",
        "reindexed",
    ]

    chunks_count: int


class SearchRequest(BaseModel):
    
    # Request for hybrid document retrieval.
    

    query: str = Field(
        min_length=1,
    )

    workspace_id: str = "default"

    document_ids: list[str] | None = None

    top_k: int = Field(
        default=4,
        ge=1,
        le=50,
    )


class SearchResult(BaseModel):
    
    # One result returned by the retrieval pipeline.
    
    id: str

    document_name: str
    document_id: str

    content: str

    start_line: int
    end_line: int

    chunk_index: int

    score: float
    base_score: float

    workspace_id: str


class Citation(BaseModel):
    
    # Source information used by the frontend.
    

    id: str

    document_name: str
    document_id: str

    start_line: int
    end_line: int

    snippet: str

    score: float


class RagContext(BaseModel):
    
    # Final context prepared for the LLM.
    

    context_prompt: str

    citations: list[Citation]

    results: list[SearchResult]