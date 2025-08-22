import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  RAGWellnessDocument,
  RAGWellnessDocumentDocument,
} from '../schemas/wellness-document.schema';
import { EmbeddingService } from './embedding.service';
import { SearchResult } from '../types/rag.types';

@Injectable()
export class VectorSearchService {
  private readonly logger = new Logger(VectorSearchService.name);

  constructor(
    @InjectModel(RAGWellnessDocument.name)
    private readonly wellnessDocumentModel: Model<RAGWellnessDocumentDocument>,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async searchSimilarDocuments(
    query: string,
    filters?: {
      categories?: string[];
      evidenceLevels?: string[];
      sources?: string[];
    },
    limit: number = 10,
    threshold: number = 0.7,
  ): Promise<SearchResult[]> {
    const startTime = Date.now();

    try {
      // Generate embedding for the query
      const queryEmbedding =
        await this.embeddingService.generateEmbedding(query);

      // Build MongoDB query with filters
      const mongoQuery: Record<string, any> = {};
      if (filters?.categories?.length) {
        mongoQuery['category'] = { $in: filters.categories };
      }
      if (filters?.evidenceLevels?.length) {
        mongoQuery['evidence_level'] = { $in: filters.evidenceLevels };
      }
      if (filters?.sources?.length) {
        mongoQuery['source'] = { $in: filters.sources };
      }

      // Get documents with embeddings
      const documents = await this.wellnessDocumentModel
        .find({ ...mongoQuery, embedding: { $exists: true } })
        .limit(limit * 2) // Get more for reranking
        .exec();

      // Calculate similarities and rank
      const results: SearchResult[] = [];

      for (const doc of documents) {
        if (doc.embedding) {
          const similarity = this.embeddingService.calculateSimilarity(
            queryEmbedding,
            doc.embedding,
          );

          if (similarity >= threshold) {
            results.push({
              document: {
                id: doc.id as string,
                title: doc.title,
                content: doc.content,
                category: doc.category as
                  | 'condition'
                  | 'symptom'
                  | 'treatment'
                  | 'lifestyle'
                  | 'medication'
                  | 'prevention',
                keywords: doc.keywords,
                evidence_level: doc.evidence_level as 'high' | 'medium' | 'low',
                source: doc.source,
                last_updated: doc.last_updated,
                metadata: doc.metadata,
                tags: doc.tags,
                usage_count: doc.usage_count,
                created_at: doc.created_at,
                updated_at: doc.updated_at,
              },
              score: similarity,
              relevance: this.calculateRelevance(doc, query),
              context: this.extractContext(doc.content, query),
            });
          }
        }
      }

      // Sort by combined score (similarity + relevance)
      results.sort((a, b) => {
        const combinedScoreA = a.score * 0.7 + a.relevance * 0.3;
        const combinedScoreB = b.score * 0.7 + b.relevance * 0.3;
        return combinedScoreB - combinedScoreA;
      });

      this.logger.log(`Vector search completed in ${Date.now() - startTime}ms`);
      return results.slice(0, limit);
    } catch (error) {
      this.logger.error('Error in vector search:', error);
      return [];
    }
  }

  async hybridSearch(
    query: string,
    filters?: {
      categories?: string[];
      evidenceLevels?: string[];
      sources?: string[];
    },
    limit: number = 10,
  ): Promise<SearchResult[]> {
    const startTime = Date.now();

    try {
      // Perform vector search
      const vectorResults = await this.searchSimilarDocuments(
        query,
        filters,
        limit,
        0.5,
      );

      // Perform text search
      const textResults = await this.textSearch(query, filters, limit);

      // Combine and rerank results
      const combinedResults = this.combineAndRerank(vectorResults, textResults);

      this.logger.log(`Hybrid search completed in ${Date.now() - startTime}ms`);
      return combinedResults.slice(0, limit);
    } catch (error) {
      this.logger.error('Error in hybrid search:', error);
      return [];
    }
  }

  private async textSearch(
    query: string,
    filters?: {
      categories?: string[];
      evidenceLevels?: string[];
      sources?: string[];
    },
    limit: number = 10,
  ): Promise<SearchResult[]> {
    const mongoQuery: Record<string, any> = {
      $text: { $search: query },
    };

    if (filters?.categories?.length) {
      mongoQuery['category'] = { $in: filters.categories };
    }
    if (filters?.evidenceLevels?.length) {
      mongoQuery['evidence_level'] = { $in: filters.evidenceLevels };
    }
    if (filters?.sources?.length) {
      mongoQuery['source'] = { $in: filters.sources };
    }

    const documents = await this.wellnessDocumentModel
      .find(mongoQuery)
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .exec();

    return documents.map((doc) => ({
      document: {
        id: doc.id as string,
        title: doc.title,
        content: doc.content,
        category: doc.category as
          | 'condition'
          | 'symptom'
          | 'treatment'
          | 'lifestyle'
          | 'medication'
          | 'prevention',
        keywords: doc.keywords,
        evidence_level: doc.evidence_level as 'high' | 'medium' | 'low',
        source: doc.source,
        last_updated: doc.last_updated,
        metadata: doc.metadata,
        tags: doc.tags,
        usage_count: doc.usage_count,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
      },
      score: this.calculateRelevance(doc, query),
      relevance: 0.5,
      context: this.extractContext(doc.content, query),
    }));
  }

  private calculateRelevance(
    doc: RAGWellnessDocumentDocument,
    query: string,
  ): number {
    let relevance = 0;
    const queryLower = query.toLowerCase();

    // Title relevance
    if (doc.title.toLowerCase().includes(queryLower)) {
      relevance += 0.3;
    }

    // Keyword relevance
    const keywordMatches = doc.keywords.filter((keyword) =>
      keyword.toLowerCase().includes(queryLower),
    ).length;
    relevance += (keywordMatches / doc.keywords.length) * 0.4;

    // Content relevance
    const contentWords = doc.content.toLowerCase().split(' ');
    const queryWords = query.toLowerCase().split(' ');
    const contentMatches = queryWords.filter((word) =>
      contentWords.some((contentWord) => contentWord.includes(word)),
    ).length;
    relevance += (contentMatches / queryWords.length) * 0.3;

    return Math.min(relevance, 1.0);
  }

  private extractContext(content: string, query: string): string {
    const sentences = content.split(/[.!?]+/);
    const queryWords = query.toLowerCase().split(' ');

    // Find sentences that contain query words
    const relevantSentences = sentences.filter((sentence) =>
      queryWords.some((word) => sentence.toLowerCase().includes(word)),
    );

    if (relevantSentences.length > 0) {
      return relevantSentences.slice(0, 2).join('. ') + '.';
    }

    // Fallback to first few sentences
    return sentences.slice(0, 2).join('. ') + '.';
  }

  private combineAndRerank(
    vectorResults: SearchResult[],
    textResults: SearchResult[],
  ): SearchResult[] {
    const combined = new Map<string, SearchResult>();

    // Add vector results
    vectorResults.forEach((result) => {
      const docId =
        result.document.id ||
        result.document._id?.toString() ||
        `unknown-${Date.now()}`;
      combined.set(docId, result);
    });

    // Add text results (merge if exists)
    textResults.forEach((result) => {
      const docId =
        result.document.id ||
        result.document._id?.toString() ||
        `unknown-${Date.now()}`;
      const existing = combined.get(docId);
      if (existing) {
        // Average the scores
        existing.score = (existing.score + result.score) / 2;
        existing.relevance = Math.max(existing.relevance, result.relevance);
      } else {
        combined.set(docId, result);
      }
    });

    // Sort by combined score
    return Array.from(combined.values()).sort((a, b) => {
      const combinedScoreA = a.score * 0.7 + a.relevance * 0.3;
      const combinedScoreB = b.score * 0.7 + b.relevance * 0.3;
      return combinedScoreB - combinedScoreA;
    });
  }
}
