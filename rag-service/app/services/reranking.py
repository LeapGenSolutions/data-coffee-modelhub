from __future__ import annotations

import re

from app.models.schemas import SearchResult


def normalize_terms(
    query: str,
) -> list[str]:
        

    return [
        term
        for term in re.findall(
            r"[A-Za-z0-9_.$-]+",
            query.lower(),
        )
        if len(term) > 1
    ]


def rerank_results(
    query: str,
    results: list[SearchResult],
) -> list[SearchResult]:

    terms = normalize_terms(
        query
    )

    ranked_results: list[
        SearchResult
    ] = []

    for result in results:

        content = result.content.lower()

        exact_match_count = sum(
            content.count(term)
            for term in terms
        )

        exact_match_bonus = (
            min(
                exact_match_count,
                5,
            )
            * 0.04
        )

        query_phrase_bonus = (
            0.10
            if query.lower()
            in content
            else 0.0
        )

        header_bonus = (
            0.05
            if any(
                line.lstrip().startswith("#")
                for line in result.content.splitlines()
            )
            else 0.0
        )

        final_score = (
            result.base_score
            + exact_match_bonus
            + query_phrase_bonus
            + header_bonus
        )

        ranked_results.append(
            result.model_copy(
                update={
                    "score": final_score,
                }
            )
        )

    ranked_results.sort(
        key=lambda result: result.score,
        reverse=True,
    )

    return ranked_results