from __future__ import annotations

import os

from dotenv import load_dotenv


load_dotenv("../.env.local")


AZURE_OPENAI_ENDPOINT = os.getenv(
    "AZURE_OPENAI_ENDPOINT",
    "",
)

OPENAI_API_KEY = os.getenv(
    "OPENAI_API_KEY",
    "",
)

EMBEDDING_MODEL = os.getenv(
    "EMBEDDING_MODEL",
    "text-embedding-3-small",
)

EMBEDDING_DIMENSION = int(
    os.getenv(
        "EMBEDDING_DIMENSION",
        "1536",
    )
)


QDRANT_URL = os.getenv(
    "QDRANT_URL",
    "http://localhost:6333",
)

QDRANT_API_KEY = os.getenv(
    "QDRANT_API_KEY",
    "",
)

QDRANT_COLLECTION = os.getenv(
    "QDRANT_COLLECTION",
    "documents",
)


RAG_SERVICE_HOST = os.getenv(
    "RAG_SERVICE_HOST",
    "0.0.0.0",
)

RAG_SERVICE_PORT = int(
    os.getenv(
        "RAG_SERVICE_PORT",
        "8000",
    )
)

RAG_SERVICE_URL = os.getenv(
    "RAG_SERVICE_URL",
    "http://127.0.0.1:8000",
)