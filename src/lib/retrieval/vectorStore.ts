import type { SemanticChunkRecord } from "@/lib/retrieval/semanticChunkSchema";

export interface VectorRecord {
  chunk: SemanticChunkRecord;
  embedding: number[];
}

export interface VectorQueryFilters {
  documentIds?: string[];
  sourceFormats?: string[];
}

export interface VectorQuery {
  embedding: number[];
  filters?: VectorQueryFilters;
  limit?: number;
}

export interface VectorQueryResult {
  record: VectorRecord;
  score: number;
}

const dot = (left: number[], right: number[]) => left.reduce((sum, value, index) => sum + (value * (right[index] || 0)), 0);
const magnitude = (vector: number[]) => Math.sqrt(vector.reduce((sum, value) => sum + (value * value), 0));
const cosineSimilarity = (left: number[], right: number[]) => {
  const denominator = magnitude(left) * magnitude(right);
  return denominator === 0 ? 0 : dot(left, right) / denominator;
};

export class InMemoryVectorStore {
  private dimension: number | null = null;

  private records = new Map<string, VectorRecord>();

  upsert(records: VectorRecord[]) {
    for (const record of records) {
      if (this.dimension === null) {
        this.dimension = record.embedding.length;
      }

      if (record.embedding.length !== this.dimension) {
        throw new Error(`Vector dimension mismatch. Expected ${this.dimension}, received ${record.embedding.length}.`);
      }

      this.records.set(record.chunk.semanticChunkId, record);
    }
  }

  size() {
    return this.records.size;
  }

  query(query: VectorQuery): VectorQueryResult[] {
    if (this.dimension !== null && query.embedding.length !== this.dimension) {
      throw new Error(`Query vector dimension mismatch. Expected ${this.dimension}, received ${query.embedding.length}.`);
    }

    return Array.from(this.records.values())
      .filter((record) => {
        if (!query.filters) {
          return true;
        }

        if (query.filters.documentIds?.length && !query.filters.documentIds.includes(record.chunk.documentId)) {
          return false;
        }

        if (
          query.filters.sourceFormats?.length
          && !query.filters.sourceFormats.includes(record.chunk.metadata.sourceFormat)
        ) {
          return false;
        }

        return true;
      })
      .map((record) => ({
        record,
        score: cosineSimilarity(query.embedding, record.embedding),
      }))
      .sort((left, right) =>
        right.score - left.score
        || left.record.chunk.semanticChunkId.localeCompare(right.record.chunk.semanticChunkId))
      .slice(0, query.limit ?? 5);
  }
}
