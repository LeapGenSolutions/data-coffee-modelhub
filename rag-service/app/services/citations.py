from __future__ import annotations

from app.models.schemas import (
    Citation,
    RagContext,
    SearchResult,
)


def build_citations(
    results: list[SearchResult],
) -> list[Citation]:
    
    # Convert retrieval results into source references.

    citations: list[Citation] = []

    for result in results:

        snippet = result.content.strip()

        if len(snippet) > 500:
            snippet = (
                snippet[:500]
                + "..."
            )

        citations.append(
            Citation(
                id=result.id,
                document_name=result.document_name,
                document_id=result.document_id,
                start_line=result.start_line,
                end_line=result.end_line,
                snippet=snippet,
                score=result.score,
            )
        )

    return citations


def build_context_prompt(
    results: list[SearchResult],
) -> str:
    
    # Builds the text context 
    

    if not results:
        return ""

    sections: list[str] = [
        "=== VERIFIED RAG CONTEXT ==="
    ]

    for index, result in enumerate(
        results,
        start=1,
    ):
        sections.append(
            f"""
[SOURCE {index}]
Document: {result.document_name}
Lines: {result.start_line}-{result.end_line}
Relevance: {result.score:.4f}

{result.content}
""".strip()
        )

    sections.append(
        "=== END VERIFIED RAG CONTEXT ==="
    )

    return "\n\n".join(
        sections
    )


def build_rag_context(
    results: list[SearchResult],
) -> RagContext:
    
   # Build the final results, citations and context prompt.
    

    return RagContext(
        context_prompt=build_context_prompt(
            results
        ),
        citations=build_citations(
            results
        ),
        results=results,
    )