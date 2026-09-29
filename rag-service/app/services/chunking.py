from __future__ import annotations

import math
import re
import uuid

from app.models.schemas import DocumentChunk


DEFAULT_MAX_CHUNK_TOKENS = 800
DEFAULT_OVERLAP_TOKENS = 120


STRUCTURAL_START = re.compile(
    r"^(?:"
    r"#{1,6}\s+"
    r"|(?:export\s+)?(?:async\s+)?function\s+"
    r"|(?:export\s+)?class\s+"
    r"|(?:export\s+)?interface\s+"
    r"|(?:export\s+)?type\s+"
    r"|(?:async\s+)?def\s+"
    r")"
)


def estimate_token_count(text: str) -> int:
    
    # Rough token estimate used by the prototype.
    

    if not text:
        return 0

    return max(
        1,
        math.ceil(len(text) / 3.8),
    )


def create_chunk_id(
    document_id: str,
    chunk_index: int,
) -> str:
    
    # Create a deterministic UUID for a document chunk.
    

    return str(
        uuid.uuid5(
            uuid.NAMESPACE_URL,
            f"{document_id}:chunk:{chunk_index}",
        )
    )


def is_structural_start(
    line: str,
) -> bool:
    
    # Check whether the line starts a new logical section.
    

    stripped_line = line.strip()

    if not stripped_line:
        return False

    return bool(
        STRUCTURAL_START.match(
            stripped_line
        )
    )


def build_blocks(
    lines: list[str],
) -> list[tuple[int, int, str]]:

    blocks: list[
        tuple[int, int, str]
    ] = []

    block_start = 0

    for index, line in enumerate(lines):

        starts_new_block = (
            index > block_start
            and is_structural_start(line)
        )

        ends_block = (
            index > block_start
            and not line.strip()
        )

        if starts_new_block or ends_block:

            block_text = "\n".join(
                lines[block_start:index]
            ).strip()

            if block_text:
                blocks.append(
                    (
                        block_start + 1,
                        index,
                        block_text,
                    )
                )

            if ends_block:
                block_start = index + 1
            else:
                block_start = index

    if block_start < len(lines):

        block_text = "\n".join(
            lines[block_start:]
        ).strip()

        if block_text:
            blocks.append(
                (
                    block_start + 1,
                    len(lines),
                    block_text,
                )
            )

    return blocks


def split_large_block(
    block_start: int,
    block_end: int,
    block_text: str,
    max_tokens: int,
) -> list[tuple[int, int, str]]:
    
    # Split an oversized logical block using line boundaries.
    

    if estimate_token_count(
        block_text
    ) <= max_tokens:
        return [
            (
                block_start,
                block_end,
                block_text,
            )
        ]

    lines = block_text.splitlines()

    pieces: list[
        tuple[int, int, str]
    ] = []

    current_lines: list[str] = []
    current_start = block_start

    for offset, line in enumerate(lines):

        candidate_lines = (
            current_lines + [line]
        )

        candidate_text = "\n".join(
            candidate_lines
        ).strip()

        if (
            current_lines
            and estimate_token_count(
                candidate_text
            ) > max_tokens
        ):
            pieces.append(
                (
                    current_start,
                    current_start
                    + len(current_lines)
                    - 1,
                    "\n".join(
                        current_lines
                    ).strip(),
                )
            )

            current_lines = [line]
            current_start = (
                block_start + offset
            )
        else:
            current_lines.append(line)

    if current_lines:
        pieces.append(
            (
                current_start,
                current_start
                + len(current_lines)
                - 1,
                "\n".join(
                    current_lines
                ).strip(),
            )
        )

    return pieces


def get_overlap_pieces(
    pieces: list[tuple[int, int, str]],
    overlap_tokens: int,
) -> list[tuple[int, int, str]]:
    

    overlap: list[
        tuple[int, int, str]
    ] = []

    token_count = 0

    for piece in reversed(pieces):

        piece_tokens = estimate_token_count(
            piece[2]
        )

        if (
            token_count + piece_tokens
            > overlap_tokens
        ):
            break

        overlap.insert(
            0,
            piece,
        )

        token_count += piece_tokens

    return overlap


def build_document_chunk(
    document_name: str,
    document_id: str,
    chunk_index: int,
    pieces: list[tuple[int, int, str]],
) -> DocumentChunk:
    
    # Create a DocumentChunk from logical pieces.
    

    content = "\n\n".join(
        piece[2]
        for piece in pieces
    ).strip()

    return DocumentChunk(
        id=create_chunk_id(
            document_id=document_id,
            chunk_index=chunk_index,
        ),
        document_name=document_name,
        chunk_index=chunk_index,
        start_line=pieces[0][0],
        end_line=pieces[-1][1],
        content=content,
        token_count=estimate_token_count(
            content
        ),
    )


def chunk_document(
    document_name: str,
    content: str,
    document_id: str | None = None,
    max_chunk_tokens: int = DEFAULT_MAX_CHUNK_TOKENS,
    overlap_tokens: int = DEFAULT_OVERLAP_TOKENS,
) -> list[DocumentChunk]:
    
    # Split a document 

    if not content or not content.strip():
        return []

    if max_chunk_tokens <= 0:
        raise ValueError(
            "max_chunk_tokens must be greater than 0."
        )

    if overlap_tokens < 0:
        raise ValueError(
            "overlap_tokens cannot be negative."
        )

    if overlap_tokens >= max_chunk_tokens:
        raise ValueError(
            "overlap_tokens must be smaller than "
            "max_chunk_tokens."
        )

    actual_document_id = (
        document_id
        or document_name
    )

    lines = content.splitlines()

    blocks = build_blocks(lines)

    pieces: list[
        tuple[int, int, str]
    ] = []

    for (
        block_start,
        block_end,
        block_text,
    ) in blocks:

        pieces.extend(
            split_large_block(
                block_start=block_start,
                block_end=block_end,
                block_text=block_text,
                max_tokens=max_chunk_tokens,
            )
        )

    chunks: list[DocumentChunk] = []

    current_pieces: list[
        tuple[int, int, str]
    ] = []

    chunk_index = 0

    for piece in pieces:

        candidate_pieces = (
            current_pieces + [piece]
        )

        candidate_content = "\n\n".join(
            item[2]
            for item in candidate_pieces
        ).strip()

        candidate_tokens = (
            estimate_token_count(
                candidate_content
            )
        )

        if (
            current_pieces
            and candidate_tokens
            > max_chunk_tokens
        ):

            chunks.append(
                build_document_chunk(
                    document_name=document_name,
                    document_id=actual_document_id,
                    chunk_index=chunk_index,
                    pieces=current_pieces,
                )
            )

            chunk_index += 1

            overlap = get_overlap_pieces(
                pieces=current_pieces,
                overlap_tokens=overlap_tokens,
            )

            while overlap:

                overlap_content = "\n\n".join(
                    item[2]
                    for item in overlap + [piece]
                ).strip()

                if (
                    estimate_token_count(
                        overlap_content
                    )
                    <= max_chunk_tokens
                ):
                    break

                overlap.pop(0)

            current_pieces = (
                overlap + [piece]
            )

        else:
            current_pieces = (
                candidate_pieces
            )

    if current_pieces:
        chunks.append(
            build_document_chunk(
                document_name=document_name,
                document_id=actual_document_id,
                chunk_index=chunk_index,
                pieces=current_pieces,
            )
        )

    return chunks