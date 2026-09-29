type RagIngestionRequest = {
  name: string;
  size: string;
  type: string;
  content: string;
  workspace_id: string;
  document_id: string;
};

type RagIngestionResponse = {
  document_id: string;
  workspace_id: string;
  status: "indexed" | "already_indexed" | "reindexed";
  chunks_count: number;
};

type RagSearchRequest = {
  query: string;
  workspace_id: string;
  document_ids?: string[];
  top_k?: number;
};

type RagSearchResult = {
  id: string;
  document_name: string;
  document_id: string;
  content: string;
  start_line: number;
  end_line: number;
  chunk_index: number;
  score: number;
  base_score: number;
  workspace_id: string;
};

type RagCitation = {
  id: string;
  document_name: string;
  document_id: string;
  start_line: number;
  end_line: number;
  snippet: string;
  score: number;
};

type RagSearchResponse = {
  query: string;
  workspace_id: string;
  results: RagSearchResult[];
  citations: RagCitation[];
  contextPrompt: string;
};

const RAG_SERVICE_URL =
  process.env.RAG_SERVICE_URL ||
  "http://127.0.0.1:8000";


export async function ingestAttachment(
  attachment: RagIngestionRequest,
): Promise<RagIngestionResponse> {
  const response = await fetch(
    `${RAG_SERVICE_URL}/rag/ingest`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(
        attachment,
      ),
    },
  );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `RAG ingestion failed: ${response.status} ${errorText}`,
    );
  }

  return response.json();
}

export async function getRagContext(
  request: RagSearchRequest,
): Promise<RagSearchResponse> {
  const response = await fetch(
    `${RAG_SERVICE_URL}/rag/search`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(request),
    },
  );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `RAG search failed: ${response.status} ${errorText}`,
    );
  }

  return response.json();
}