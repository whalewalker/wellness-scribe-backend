import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { EmbeddingModel, RAGConfig } from '../types/rag.types';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly config: RAGConfig;
  private readonly apiKey: string;
  private readonly embeddingUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('mistral.apiKey') || '';
    this.embeddingUrl = 'https://api.mistral.ai/v1/embeddings';

    this.config = {
      embeddingModel: {
        name: 'mistral-embed',
        dimensions: 1024,
        maxTokens: 8192,
        provider: 'mistral',
      },
      vectorSearchConfig: {
        indexName: 'wellness_documents',
        similarityMetric: 'cosine',
        topK: 10,
        threshold: 0.7,
      },
      cacheConfig: {
        enabled: true,
        ttl: 3600, // 1 hour
        maxSize: 1000,
      },
      chunkingConfig: {
        maxChunkSize: 1000,
        overlapSize: 200,
        separator: '\n\n',
      },
    };
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.apiKey) {
      this.logger.warn('No API key provided, using fallback embedding');
      return this.generateFallbackEmbedding(text);
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          this.embeddingUrl,
          {
            model: this.config.embeddingModel.name,
            input: text,
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      if (response.data?.data?.[0]?.embedding) {
        return response.data.data[0].embedding;
      }

      throw new Error('Invalid embedding response');
    } catch (error) {
      this.logger.error('Error generating embedding:', error);
      return this.generateFallbackEmbedding(text);
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (const text of texts) {
      const embedding = await this.generateEmbedding(text);
      embeddings.push(embedding);
    }

    return embeddings;
  }

  chunkDocument(
    content: string,
    maxChunkSize: number = 1000,
    overlapSize: number = 200,
  ): string[] {
    const chunks: string[] = [];
    const sentences = content
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0);

    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();

      if (currentChunk.length + trimmedSentence.length > maxChunkSize) {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = trimmedSentence;
      } else {
        currentChunk += (currentChunk.length > 0 ? '. ' : '') + trimmedSentence;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embedding dimensions must match');
    }

    const dotProduct = embedding1.reduce(
      (sum, val, i) => sum + val * embedding2[i],
      0,
    );
    const magnitude1 = Math.sqrt(
      embedding1.reduce((sum, val) => sum + val * val, 0),
    );
    const magnitude2 = Math.sqrt(
      embedding2.reduce((sum, val) => sum + val * val, 0),
    );

    return dotProduct / (magnitude1 * magnitude2);
  }

  private generateFallbackEmbedding(text: string): number[] {
    // Simple hash-based fallback embedding
    const hash = this.simpleHash(text);
    const embedding = new Array(this.config.embeddingModel.dimensions).fill(0);

    for (let i = 0; i < this.config.embeddingModel.dimensions; i++) {
      embedding[i] = Math.sin(hash + i) * 0.1;
    }

    return embedding;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  getConfig(): RAGConfig {
    return this.config;
  }
}
