import DocumentIntelligence, { getLongRunningPoller } from "@azure-rest/ai-document-intelligence";
import { DocumentExtractionMethod } from "../../types";

const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT || "";
const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY || "";

/**
 * Checks if Azure Document Intelligence is configured via environment variables.
 * @returns {boolean} True if configured, false otherwise.
 */
export function isOcrConfigured(): boolean {
  return Boolean(endpoint && key);
}

/**
 * Result of document extraction.
 */
export interface ExtractionResult {
  text: string;
  pageCount: number;
  tables: string[];
  confidence: number;
  extractionMethod: DocumentExtractionMethod;
  error?: string;
}

/**
 * Analyzes a document using the prebuilt-layout model.
 * @param fileBuffer The file content as a Buffer.
 * @param mimeType The MIME type of the file.
 * @returns {Promise<ExtractionResult>} Structured extraction result.
 */
export async function extractDocumentText(fileBuffer: Buffer, mimeType: string): Promise<ExtractionResult> {
  if (!isOcrConfigured()) {
    return {
      text: "",
      pageCount: 0,
      tables: [],
      confidence: 0,
      extractionMethod: "ocr-azure" as DocumentExtractionMethod,
      error: "Azure Document Intelligence is not configured."
    };
  }

  try {
    const client = DocumentIntelligence(endpoint, { key });
    
    const initialResponse = await client.path("/documentModels/{modelId}:analyze", "prebuilt-layout").post({
      contentType: "application/json",
      body: {
        base64Source: fileBuffer.toString("base64")
      },
      queryParameters: {
        outputContentFormat: "markdown"
      }
    });

    if (initialResponse.status !== "202") {
      throw new Error(`Failed to submit document. Status code: ${initialResponse.status}`);
    }

    const poller = await getLongRunningPoller(client, initialResponse);
    const result: any = await (poller as any).pollUntilDone();

    if (!result.body?.analyzeResult) {
      throw new Error("Failed to analyze document.");
    }

    const analyzeResult = result.body.analyzeResult;
    
    const text = analyzeResult.content || "";
    const pageCount = analyzeResult.pages?.length || 0;
    
    let tables: string[] = [];
    if (analyzeResult.tables) {
      tables = analyzeResult.tables.map((t: any) => JSON.stringify(t));
    }
    
    let totalConfidence = 0;
    let wordCount = 0;
    if (analyzeResult.pages) {
      for (const page of analyzeResult.pages) {
        if (page.words) {
          for (const word of page.words) {
            if (word.confidence !== undefined) {
              totalConfidence += word.confidence;
              wordCount++;
            }
          }
        }
      }
    }
    const confidence = wordCount > 0 ? totalConfidence / wordCount : 0;

    return {
      text,
      pageCount,
      tables,
      confidence,
      extractionMethod: "ocr-azure" as DocumentExtractionMethod
    };
  } catch (error: any) {
    console.error("Error extracting document text:", error);
    return {
      text: "",
      pageCount: 0,
      tables: [],
      confidence: 0,
      extractionMethod: "ocr-azure" as DocumentExtractionMethod,
      error: error.message || "Failed to extract text."
    };
  }
}
