import { SearchClient, SearchIndexClient, AzureKeyCredential, SearchIndex } from "@azure/search-documents";
import { SearchIndexDocument } from "../../types";

const endpoint = process.env.AZURE_SEARCH_ENDPOINT || "";
const key = process.env.AZURE_SEARCH_KEY || "";
const indexName = process.env.AZURE_SEARCH_INDEX_NAME || "modelhub-documents";

/**
 * Checks if Azure AI Search is configured via environment variables.
 * @returns {boolean} True if configured, false otherwise.
 */
export function isSearchConfigured(): boolean {
  return Boolean(endpoint && key);
}

/**
 * Returns a configured SearchClient instance for document operations.
 * @returns {SearchClient<any> | null} SearchClient or null if not configured.
 */
export function getSearchClient(): SearchClient<any> | null {
  if (!isSearchConfigured()) {
    console.warn("Azure AI Search is not configured.");
    return null;
  }
  return new SearchClient(endpoint, indexName, new AzureKeyCredential(key));
}

/**
 * Creates or updates the search index with the required schema.
 */
export async function ensureSearchIndex(): Promise<void> {
  if (!isSearchConfigured()) return;
  try {
    const client = new SearchIndexClient(endpoint, new AzureKeyCredential(key));
    const index: SearchIndex = {
      name: indexName,
      vectorSearch: {
        algorithms: [{ name: "myHnswProfile", kind: "hnsw", parameters: { metric: "cosine" } }],
        profiles: [{ name: "myVectorProfile", algorithmConfigurationName: "myHnswProfile" }]
      },
      fields: [
        { name: "id", type: "Edm.String", key: true, filterable: true },
        { name: "documentId", type: "Edm.String", filterable: true },
        { name: "workspaceId", type: "Edm.String", filterable: true },
        { name: "documentName", type: "Edm.String", searchable: true },
        { name: "chunkIndex", type: "Edm.Int32" },
        { name: "content", type: "Edm.String", searchable: true },
        { 
          name: "contentVector", 
          type: "Collection(Edm.Single)",
          searchable: true,
          vectorSearchDimensions: 1536,
          vectorSearchProfileName: "myVectorProfile"
        },
        { name: "pageNumber", type: "Edm.Int32" },
        { name: "sectionHeading", type: "Edm.String", searchable: true },
        { name: "startLine", type: "Edm.Int32" },
        { name: "endLine", type: "Edm.Int32" },
        { name: "chunkType", type: "Edm.String", filterable: true },
        { name: "tokenCount", type: "Edm.Int32" },
        { name: "sourceFormat", type: "Edm.String", filterable: true }
      ]
    };
    await client.createOrUpdateIndex(index);
    console.log(`Index ${indexName} ensured successfully.`);
  } catch (error) {
    console.error("Error ensuring search index:", error);
    throw error;
  }
}

/**
 * Batch upload or merge chunks into the index.
 * @param chunks Array of SearchIndexDocument to index.
 */
export async function indexDocumentChunks(chunks: SearchIndexDocument[]): Promise<void> {
  const client = getSearchClient();
  if (!client) {
    console.warn("Skipping indexing as Azure AI Search is not configured.");
    return;
  }
  try {
    const result = await client.uploadDocuments(chunks);
    console.log(`Indexed ${result.results.length} chunks successfully.`);
  } catch (error) {
    console.error("Error indexing document chunks:", error);
    throw error;
  }
}

/**
 * Performs a hybrid search (vector + BM25) with optional filters.
 */
export async function hybridSearch(
  query: string, 
  queryVector: number[], 
  workspaceId: string, 
  options?: { topK?: number, documentIds?: string[], fileTypes?: string[] }
): Promise<any[]> {
  const client = getSearchClient();
  if (!client) {
    console.warn("Returning empty results as Azure AI Search is not configured.");
    return [];
  }
  try {
    const filters: string[] = [`workspaceId eq '${workspaceId}'`];
    if (options?.documentIds && options.documentIds.length > 0) {
      filters.push(`search.in(documentId, '${options.documentIds.join(",")}')`);
    }
    if (options?.fileTypes && options.fileTypes.length > 0) {
      filters.push(`search.in(sourceFormat, '${options.fileTypes.join(",")}')`);
    }

    const searchResults = await client.search(query, {
      top: options?.topK || 5,
      filter: filters.join(" and "),
      vectorSearchOptions: {
        queries: [{
          kind: "vector",
          vector: queryVector,
          fields: ["contentVector"],
          kNearestNeighborsCount: options?.topK || 5
        }]
      }
    });

    const results = [];
    for await (const result of searchResults.results) {
      results.push({
        score: result.score,
        document: result.document
      });
    }
    return results;
  } catch (error) {
    console.error("Error performing hybrid search:", error);
    throw error;
  }
}

/**
 * Removes all chunks for a document.
 * @param documentId The ID of the document to delete chunks for.
 */
export async function deleteDocumentChunks(documentId: string): Promise<void> {
  const client = getSearchClient();
  if (!client) {
    console.warn("Skipping deletion as Azure AI Search is not configured.");
    return;
  }
  try {
    // First, find all chunk IDs for this document
    const searchResults = await client.search("*", {
      filter: `documentId eq '${documentId}'`,
      select: ["id"]
    });
    
    const chunksToDelete = [];
    for await (const result of searchResults.results) {
      chunksToDelete.push({ id: result.document.id });
    }

    if (chunksToDelete.length > 0) {
      await client.deleteDocuments(chunksToDelete);
      console.log(`Deleted ${chunksToDelete.length} chunks for document ${documentId}.`);
    }
  } catch (error) {
    console.error("Error deleting document chunks:", error);
    throw error;
  }
}
