from __future__ import annotations

from openai import OpenAI

from app.config import (
    AZURE_OPENAI_ENDPOINT,
    OPENAI_API_KEY,
    EMBEDDING_MODEL,
)


class EmbeddingService:
    

    def __init__(self) -> None:
        if not AZURE_OPENAI_ENDPOINT:
            raise ValueError(
                "AZURE_OPENAI_ENDPOINT is not configured."
            )

        if not OPENAI_API_KEY:
            raise ValueError(
                "OPENAI_API_KEY is not configured."
            )

        self.client = OpenAI(
            api_key=OPENAI_API_KEY,
            base_url=AZURE_OPENAI_ENDPOINT,
        )

        self.model = EMBEDDING_MODEL

    def embed_texts(
        self,
        texts: list[str],
    ) -> list[list[float]]:
        
        # Generate embeddings for multiple texts.

        if not texts:
            return []

        # Sanitize empty chunks to a placeholder so output length strictly matches input length
        sanitized_texts = [
            text.strip() if (text and text.strip()) else " "
            for text in texts
        ]

        if not sanitized_texts:
            return []

        response = self.client.embeddings.create(
            model=self.model,
            input=sanitized_texts,
        )

        return [
            item.embedding
            for item in response.data
        ]

    def embed_text(
        self,
        text: str,
    ) -> list[float]:
    
        # Generate an embedding for a single text.
        

        embeddings = self.embed_texts([text])

        if not embeddings:
            return []

        return embeddings[0]    