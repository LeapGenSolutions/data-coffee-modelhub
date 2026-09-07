import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || "";
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || "modelhub-documents";

/**
 * Checks if Azure Blob Storage is configured via environment variables.
 * @returns {boolean} True if configured, false otherwise.
 */
export function isBlobConfigured(): boolean {
  return Boolean(connectionString);
}

async function getContainerClient(): Promise<ContainerClient> {
  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = blobServiceClient.getContainerClient(containerName);
  await containerClient.createIfNotExists();
  return containerClient;
}

/**
 * Uploads a file to blob storage.
 * @param documentId Document ID for grouping.
 * @param fileName Name of the file.
 * @param buffer File content buffer.
 * @param mimeType MIME type of the file.
 * @param metadata Optional metadata to store with the blob.
 * @returns {Promise<string>} The blob URL.
 */
export async function uploadDocument(
  documentId: string, 
  fileName: string, 
  buffer: Buffer, 
  mimeType: string, 
  metadata?: Record<string, string>
): Promise<string> {
  if (!isBlobConfigured()) {
    console.warn("Azure Blob Storage is not configured.");
    throw new Error("Azure Blob Storage is not configured.");
  }
  try {
    const containerClient = await getContainerClient();
    const blobName = `${documentId}/${fileName}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: mimeType },
      metadata
    });
    
    return blockBlobClient.url;
  } catch (error) {
    console.error("Error uploading document:", error);
    throw error;
  }
}

/**
 * Downloads a blob and returns the buffer.
 * @param documentId Document ID for grouping.
 * @param fileName Name of the file.
 * @returns {Promise<Buffer>} The file buffer.
 */
export async function downloadDocument(documentId: string, fileName: string): Promise<Buffer> {
  if (!isBlobConfigured()) {
    console.warn("Azure Blob Storage is not configured.");
    throw new Error("Azure Blob Storage is not configured.");
  }
  try {
    const containerClient = await getContainerClient();
    const blobName = `${documentId}/${fileName}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    const downloadResponse = await blockBlobClient.downloadToBuffer();
    return downloadResponse;
  } catch (error) {
    console.error("Error downloading document:", error);
    throw error;
  }
}

/**
 * Deletes a blob.
 * @param documentId Document ID for grouping.
 * @param fileName Name of the file.
 */
export async function deleteDocument(documentId: string, fileName: string): Promise<void> {
  if (!isBlobConfigured()) {
    console.warn("Azure Blob Storage is not configured.");
    throw new Error("Azure Blob Storage is not configured.");
  }
  try {
    const containerClient = await getContainerClient();
    const blobName = `${documentId}/${fileName}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    await blockBlobClient.deleteIfExists();
  } catch (error) {
    console.error("Error deleting document:", error);
    throw error;
  }
}

/**
 * Lists blobs with an optional prefix filter.
 * @param prefix Optional prefix to filter blobs (e.g., documentId + "/").
 * @returns {Promise<any[]>} List of blobs.
 */
export async function listDocuments(prefix?: string): Promise<any[]> {
  if (!isBlobConfigured()) {
    console.warn("Azure Blob Storage is not configured.");
    throw new Error("Azure Blob Storage is not configured.");
  }
  try {
    const containerClient = await getContainerClient();
    const blobs = [];
    for await (const blob of containerClient.listBlobsFlat({ prefix })) {
      blobs.push(blob);
    }
    return blobs;
  } catch (error) {
    console.error("Error listing documents:", error);
    throw error;
  }
}
