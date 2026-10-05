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

        # Proportional multiplier to reward lexical/phrase overlap without obliterating RRF base score
        multiplier = 1.0
        if exact_match_count > 0:
            multiplier += min(exact_match_count, 5) * 0.04  # Up to +20%
        if query.lower() in content:
            multiplier += 0.15  # +15% exact phrase match boost
        if any(line.lstrip().startswith("#") for line in result.content.splitlines()):
            multiplier += 0.05  # +5% section header boost

        final_score = result.base_score * multiplier

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