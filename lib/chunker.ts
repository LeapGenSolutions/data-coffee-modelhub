import { EnrichedChunk } from '../types';

export interface SemanticChunkOptions {
  maxTokens?: number;
  overlapTokens?: number;
  strategy?: 'heading' | 'paragraph' | 'recursive';
}

const CHARS_PER_TOKEN = 3.8;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Extracts the closest preceding markdown heading.
 */
function getSectionHeading(text: string): string | undefined {
  const headings = text.match(/^#{1,6}\s+.+$/gm);
  return headings ? headings[headings.length - 1] : undefined;
}

/**
 * Groups lines into logical blocks (tables, code blocks, lists, paragraphs).
 */
function parseBlocks(text: string): { type: string; content: string; startLine: number; endLine: number }[] {
  const lines = text.split('\n');
  const blocks: { type: string; content: string; startLine: number; endLine: number }[] = [];
  
  let currentBlock: string[] = [];
  let currentType: string | null = null;
  let blockStartLine = 1;
  let inCodeBlock = false;

  const pushCurrent = (lineIndex: number) => {
    if (currentBlock.length > 0) {
      blocks.push({
        type: currentType || 'text',
        content: currentBlock.join('\n'),
        startLine: blockStartLine,
        endLine: lineIndex,
      });
      currentBlock = [];
      currentType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        currentBlock.push(line);
        pushCurrent(lineNum);
        inCodeBlock = false;
      } else {
        pushCurrent(lineNum - 1);
        inCodeBlock = true;
        currentType = 'code';
        blockStartLine = lineNum;
        currentBlock.push(line);
      }
      continue;
    }

    if (inCodeBlock) {
      currentBlock.push(line);
      continue;
    }

    if (line.trim().startsWith('|')) {
      if (currentType !== 'table') {
        pushCurrent(lineNum - 1);
        currentType = 'table';
        blockStartLine = lineNum;
      }
      currentBlock.push(line);
      continue;
    }

    if (/^(\s*[-*+]\s|\s*\d+\.\s)/.test(line)) {
      if (currentType !== 'list' && currentType !== null) {
        pushCurrent(lineNum - 1);
      }
      if (currentType !== 'list') {
        currentType = 'list';
        blockStartLine = lineNum;
      }
      currentBlock.push(line);
      continue;
    }
    
    if (line.trim() === '') {
      if (currentType) {
        pushCurrent(lineNum - 1);
      }
      continue;
    }

    if (currentType && currentType !== 'text') {
      pushCurrent(lineNum - 1);
      currentType = 'text';
      blockStartLine = lineNum;
      currentBlock.push(line);
    } else {
      if (currentType === null) {
        currentType = 'text';
        blockStartLine = lineNum;
      }
      currentBlock.push(line);
    }
  }

  pushCurrent(lines.length);
  return blocks;
}

/**
 * Main chunking function that semantically chunks text.
 */
export function semanticChunk(text: string, options?: SemanticChunkOptions): { content: string, startLine: number, endLine: number, tokenCount: number, chunkType: string, sectionHeading?: string }[] {
  const maxTokens = options?.maxTokens || 400;
  const overlapTokens = options?.overlapTokens || 50;
  
  const blocks = parseBlocks(text);
  const chunks: { content: string, startLine: number, endLine: number, tokenCount: number, chunkType: string, sectionHeading?: string }[] = [];
  
  let currentChunkContent = '';
  let currentChunkStartLine = 1;
  let currentChunkEndLine = 1;
  let currentTokens = 0;
  let currentType = 'text';
  let currentHeading = undefined;
  
  for (const block of blocks) {
    const blockTokens = estimateTokens(block.content);
    
    if (currentTokens + blockTokens > maxTokens && currentChunkContent) {
      chunks.push({
        content: currentChunkContent,
        startLine: currentChunkStartLine,
        endLine: currentChunkEndLine,
        tokenCount: currentTokens,
        chunkType: currentType,
        sectionHeading: currentHeading
      });
      
      const words = currentChunkContent.split(/\s+/);
      const overlapWords = words.slice(-Math.floor(overlapTokens * (CHARS_PER_TOKEN / 5))).join(' ');
      
      currentChunkContent = overlapWords ? overlapWords + '\n\n' + block.content : block.content;
      currentChunkStartLine = block.startLine;
      currentChunkEndLine = block.endLine;
      currentTokens = estimateTokens(currentChunkContent);
      currentType = block.type;
      currentHeading = getSectionHeading(block.content);
    } else {
      if (!currentChunkContent) {
        currentChunkStartLine = block.startLine;
        currentType = block.type;
        currentHeading = getSectionHeading(block.content);
      }
      currentChunkContent = currentChunkContent ? currentChunkContent + '\n\n' + block.content : block.content;
      currentChunkEndLine = block.endLine;
      currentTokens = estimateTokens(currentChunkContent);
    }
  }
  
  if (currentChunkContent) {
    chunks.push({
      content: currentChunkContent,
      startLine: currentChunkStartLine,
      endLine: currentChunkEndLine,
      tokenCount: currentTokens,
      chunkType: currentType,
      sectionHeading: currentHeading
    });
  }
  
  return chunks;
}

/**
 * Returns chunks with full metadata.
 */
export function chunkWithMetadata(documentName: string, text: string, sourceFormat: EnrichedChunk['sourceFormat'], options?: SemanticChunkOptions): EnrichedChunk[] {
  const sanitizedDocName = documentName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const rawChunks = semanticChunk(text, options);
  
  return rawChunks.map((chunk, index) => ({
    id: `chunk_${sanitizedDocName}_${index}`,
    documentName,
    chunkIndex: index,
    content: chunk.content,
    startLine: chunk.startLine,
    endLine: chunk.endLine,
    tokenCount: chunk.tokenCount,
    chunkType: chunk.chunkType as EnrichedChunk['chunkType'],
    sectionHeading: chunk.sectionHeading,
    sourceFormat,
    documentId: documentName,
  }));
}
