export interface RAGWellnessDocument {
  _id?: string;
  id: string;
  title: string;
  content: string;
  category:
    | 'condition'
    | 'symptom'
    | 'treatment'
    | 'lifestyle'
    | 'medication'
    | 'prevention';
  keywords: string[];
  evidence_level: 'high' | 'medium' | 'low';
  source: string;
  last_updated: Date;
  embedding?: number[];
  metadata?: {
    author?: string;
    publication_date?: Date;
    doi?: string;
    journal?: string;
    page_count?: number;
    language?: string;
    userId?: string;
    addedAt?: Date;
  };
  tags?: string[];
  usage_count: number;
  created_at: Date;
  updated_at: Date;
}

export type RAGWellnessDocumentType = RAGWellnessDocument;

export interface EmbeddingVector {
  id: string;
  vector: number[];
  metadata: {
    documentId: string;
    title: string;
    category: string;
    evidence_level: string;
    source: string;
    keywords: string[];
  };
}

export interface SearchResult {
  document: RAGWellnessDocument;
  score: number;
  relevance: number;
  context: string;
}

export interface RAGQuery {
  query: string;
  userId?: string;
  context?: {
    healthConditions?: string[];
    medications?: string[];
    wellnessGoals?: string[];
    recentTopics?: string[];
  };
  filters?: {
    categories?: string[];
    evidenceLevels?: string[];
    sources?: string[];
  };
  limit?: number;
  threshold?: number;
}

export interface RAGResponse {
  query: string;
  response: string;
  results: SearchResult[];
  totalResults: number;
  processingTime: number;
  model: string;
  sources: string[];
  confidence: number;
  metadata: {
    vectorSearchTime: number;
    rerankingTime: number;
    cacheHit: boolean;
  };
}

export interface ConversationContext {
  userId: string;
  sessionId: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    metadata?: {
      topics?: string[];
      sentiment?: string;
      confidence?: number;
    };
  }>;
  context: {
    healthConditions?: string[];
    medications?: string[];
    wellnessGoals?: string[];
    recentTopics?: string[];
    communicationStyle?: 'professional' | 'friendly' | 'direct';
  };
  lastUpdated: Date;
}

export interface VectorSearchParams {
  query: string;
  embedding: number[];
  filters?: {
    categories?: string[];
    evidenceLevels?: string[];
    sources?: string[];
  };
  limit: number;
  threshold: number;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  embedding: number[];
  metadata: {
    chunkIndex: number;
    startPosition: number;
    endPosition: number;
    title: string;
    category: string;
    evidence_level: string;
    source: string;
    keywords: string[];
  };
}

export interface CacheEntry {
  key: string;
  value: RAGResponse;
  timestamp: Date;
  ttl: number;
}

export interface EmbeddingModel {
  name: string;
  dimensions: number;
  maxTokens: number;
  provider: 'openai' | 'mistral' | 'local';
}

export interface RAGConfig {
  embeddingModel: EmbeddingModel;
  vectorSearchConfig: {
    indexName: string;
    similarityMetric: 'cosine' | 'euclidean' | 'dot_product';
    topK: number;
    threshold: number;
  };
  cacheConfig: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
  chunkingConfig: {
    maxChunkSize: number;
    overlapSize: number;
    separator: string;
  };
}

export interface AddDocumentRequest {
  document: RAGWellnessDocument;
  userId: string;
}
