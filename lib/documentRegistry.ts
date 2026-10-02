import { UploadedDocument } from '../types';

/**
 * In-memory document registry for demo / session storage.
 * In production, replace with a database (PostgreSQL / CosmosDB).
 */
export const documentRegistry = new Map<string, UploadedDocument>();

export function getDocumentById(id: string): UploadedDocument | undefined {
  return documentRegistry.get(id);
}

export function listAllDocuments(workspaceId?: string): UploadedDocument[] {
  const all = Array.from(documentRegistry.values());
  if (workspaceId) return all.filter((d) => d.workspaceId === workspaceId);
  return all;
}
