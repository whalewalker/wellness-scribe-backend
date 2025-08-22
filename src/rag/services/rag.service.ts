import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  RAGWellnessDocument,
  RAGWellnessDocumentDocument,
} from '../schemas/wellness-document.schema';
import {
  ConversationContext,
  ConversationContextDocument,
} from '../schemas/conversation-context.schema';
import { VectorSearchService } from './vector-search.service';
import { EmbeddingService } from './embedding.service';
import { CacheService } from './cache.service';
import { MistralApiService } from '../../ai/services/mistral-api.service';
import {
  RAGQuery,
  RAGResponse,
  SearchResult,
  ConversationContext as ConversationContextType,
  RAGWellnessDocumentType,
} from '../types/rag.types';

@Injectable()
export class RAGService {
  private readonly logger = new Logger(RAGService.name);

  constructor(
    @InjectModel(RAGWellnessDocument.name)
    private readonly wellnessDocumentModel: Model<RAGWellnessDocumentDocument>,
    @InjectModel(ConversationContext.name)
    private readonly conversationContextModel: Model<ConversationContextDocument>,
    private readonly vectorSearchService: VectorSearchService,
    private readonly embeddingService: EmbeddingService,
    private readonly cacheService: CacheService,
    private readonly mistralApiService: MistralApiService,
  ) {}

  async searchDocuments(query: RAGQuery): Promise<RAGResponse> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = `search:${query.query}:${query.userId}:${query.limit}`;
      const cachedResult = await this.cacheService.get(cacheKey);

      if (cachedResult) {
        this.logger.debug('Returning cached search results');
        return cachedResult;
      }

      // Perform hybrid search
      const results = await this.vectorSearchService.hybridSearch(
        query.query,
        {
          categories: query.filters?.categories,
          evidenceLevels: query.filters?.evidenceLevels,
          sources: query.filters?.sources,
        },
        query.limit,
      );

      const processingTime = Date.now() - startTime;

      const response: RAGResponse = {
        query: query.query,
        response: '', // This will be filled by the calling method
        results,
        totalResults: results.length,
        processingTime,
        model: this.embeddingService.getConfig().embeddingModel.name,
        sources: results.map((r) => r.document.source).filter(Boolean),
        confidence: 0.8,
        metadata: {
          vectorSearchTime: processingTime * 0.7,
          rerankingTime: processingTime * 0.3,
          cacheHit: false,
        },
      };

      // Cache the result
      await this.cacheService.set(cacheKey, response, 3600);

      return response;
    } catch (error) {
      this.logger.error('Error in searchDocuments:', error);

      return {
        query: query.query,
        response: '',
        results: [],
        totalResults: 0,
        processingTime: Date.now() - startTime,
        model: 'fallback',
        sources: [],
        confidence: 0.0,
        metadata: {
          vectorSearchTime: 0,
          rerankingTime: 0,
          cacheHit: false,
        },
      };
    }
  }

  async generateContextualResponse(
    query: string,
    userId: string,
    conversationId?: string,
    generationId?: string,
  ): Promise<string> {
    try {
      // Check if this is a stop signal
      const stopKeywords = ['stop', 'end', 'quit', 'exit', 'terminate', 'halt'];
      const isStopSignal = stopKeywords.some((keyword) =>
        query.toLowerCase().includes(keyword),
      );

      if (isStopSignal) {
        // If it's a stop signal, return a confirmation and don't generate further responses
        return "I understand you want to stop. I'll respect that and won't continue this conversation. Feel free to start a new chat when you're ready.";
      }

      // Get or create conversation context
      const conversationContext = await this.getOrCreateConversationContext(
        userId,
        conversationId || `session_${Date.now()}`,
      );

      // Check if the conversation has been stopped
      const lastMessage =
        conversationContext.messages[conversationContext.messages.length - 1];
      if (lastMessage && lastMessage.content.toLowerCase().includes('stop')) {
        return "This conversation has been stopped. I won't continue responding. Please start a new chat if you need assistance.";
      }

      // Add user message to context
      conversationContext.messages.push({
        role: 'user',
        content: query,
        timestamp: new Date(),
      });

      // Search for relevant documents
      const searchResults = await this.searchUserRelevantDocuments(
        query,
        userId,
        conversationContext,
      );

      // Build context from search results
      const context = searchResults
        .map((result) => `${result.document.title}: ${result.document.content}`)
        .join('\n\n');

      // Generate response
      const prompt = this.buildResponsePrompt(
        query,
        context,
        conversationContext,
      );
      const response = await this.mistralApiService.callMistralAPI(
        prompt,
        1000,
        generationId,
      );

      if (response && response.choices && response.choices[0]) {
        const aiResponse =
          response.choices[0].message?.content ||
          'I apologize, but I cannot generate a response at this time.';

        // Add AI response to context
        conversationContext.messages.push({
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date(),
        });

        // Save updated context
        await this.saveConversationContext(conversationContext);

        return aiResponse;
      }

      return "I'm having technical issues right now. For immediate concerns, please consult with a healthcare professional.";
    } catch (error) {
      this.logger.error('Error generating contextual response:', error);
      return "I'm having technical issues right now. For immediate concerns, please consult with a healthcare professional.";
    }
  }

  async addUserWellnessDocument(
    userId: string,
    document: RAGWellnessDocumentType,
  ): Promise<void> {
    try {
      // Generate embedding for the document
      const embedding = await this.embeddingService.generateEmbedding(
        `${document.title} ${document.content}`,
      );

      // Ensure ID is always set
      const documentId = document.id || new Types.ObjectId().toString();

      // Save document with embedding and user association
      const doc = new this.wellnessDocumentModel({
        ...document,
        id: documentId,
        embedding,
        metadata: {
          ...document.metadata,
          userId,
          addedAt: new Date(),
        },
      });

      await doc.save();
      this.logger.log(
        `Added wellness document for user ${userId}: ${document.title}`,
      );
    } catch (error) {
      this.logger.error('Error adding user wellness document:', error);
      throw error;
    }
  }

  async getUserWellnessDocuments(
    userId: string,
  ): Promise<RAGWellnessDocumentType[]> {
    try {
      const documents = await this.wellnessDocumentModel
        .find({ 'metadata.userId': userId })
        .exec();

      return documents.map((doc) => ({
        id: doc.id,
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
      }));
    } catch (error) {
      this.logger.error('Error getting user wellness documents:', error);
      return [];
    }
  }

  async searchUserRelevantDocuments(
    query: string,
    userId: string,
    conversationContext: ConversationContextDocument,
  ): Promise<SearchResult[]> {
    try {
      // Search in user's wellness documents
      const userDocuments = await this.wellnessDocumentModel
        .find({ 'metadata.userId': userId })
        .exec();

      const userResults = userDocuments.map((doc) => ({
        document: {
          id: doc.id,
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
        score: this.calculateUserDocumentRelevance(
          doc,
          query,
          conversationContext,
        ),
        relevance: 0.8, // User documents get higher relevance
        context: `User document: ${doc.title}`,
      }));

      // Search in general wellness knowledge base
      const generalSearch = await this.searchDocuments({
        query,
        userId,
        context: conversationContext.context,
        limit: 3,
      });

      // Combine user-specific and general results
      const combinedResults = await this.combineUserAndGeneralResults(
        query,
        userResults,
        generalSearch.results,
        conversationContext,
      );

      return combinedResults;
    } catch (error) {
      this.logger.error('Error searching user relevant documents:', error);
      return [];
    }
  }

  private async combineUserAndGeneralResults(
    query: string,
    userResults: SearchResult[],
    generalResults: SearchResult[],
    conversationContext: ConversationContextDocument,
  ): Promise<SearchResult[]> {
    const combined: SearchResult[] = [];

    // Process user documents
    for (const result of userResults) {
      if (result.document.embedding) {
        const queryEmbedding =
          await this.embeddingService.generateEmbedding(query);
        const similarity = this.embeddingService.calculateSimilarity(
          queryEmbedding,
          result.document.embedding,
        );

        if (similarity >= 0.5) {
          combined.push({
            document: result.document,
            score: similarity,
            relevance: result.relevance,
            context: result.context,
          });
        }
      }
    }

    // Add general results with lower priority
    generalResults.forEach((result) => {
      result.score *= 0.7; // Reduce score for general results
      combined.push(result);
    });

    // Sort by combined score
    combined.sort((a, b) => {
      const combinedScoreA = a.score * 0.7 + a.relevance * 0.3;
      const combinedScoreB = b.score * 0.7 + b.relevance * 0.3;
      return combinedScoreB - combinedScoreA;
    });

    return combined.slice(0, 5); // Return top 5 results
  }

  private calculateUserDocumentRelevance(
    doc: RAGWellnessDocumentDocument,
    query: string,
    conversationContext: ConversationContextDocument,
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

    // User context relevance
    const userContext = conversationContext.context;
    if (userContext?.healthConditions?.length) {
      const conditionMatches = userContext.healthConditions.filter(
        (condition) =>
          doc.content.toLowerCase().includes(condition.toLowerCase()),
      ).length;
      relevance +=
        (conditionMatches / userContext.healthConditions.length) * 0.2;
    }

    return Math.min(relevance, 1.0);
  }

  private async rerankWithUserContext(
    results: SearchResult[],
    query: RAGQuery,
  ): Promise<SearchResult[]> {
    if (!query.context) {
      return results;
    }

    return results
      .map((result) => {
        let contextScore = 0;
        const userContext = query.context!;

        // Health conditions relevance
        if (userContext.healthConditions?.length) {
          const conditionMatches = userContext.healthConditions.filter(
            (condition) =>
              result.document.content
                .toLowerCase()
                .includes(condition.toLowerCase()) ||
              result.document.keywords.some((keyword) =>
                keyword.toLowerCase().includes(condition.toLowerCase()),
              ),
          ).length;
          contextScore +=
            (conditionMatches / userContext.healthConditions.length) * 0.3;
        }

        // Medications relevance
        if (userContext.medications?.length) {
          const medicationMatches = userContext.medications.filter(
            (medication) =>
              result.document.content
                .toLowerCase()
                .includes(medication.toLowerCase()),
          ).length;
          contextScore +=
            (medicationMatches / userContext.medications.length) * 0.2;
        }

        // Wellness goals relevance
        if (userContext.wellnessGoals?.length) {
          const goalMatches = userContext.wellnessGoals.filter((goal) =>
            result.document.content.toLowerCase().includes(goal.toLowerCase()),
          ).length;
          contextScore +=
            (goalMatches / userContext.wellnessGoals.length) * 0.2;
        }

        // Recent topics relevance
        if (userContext.recentTopics?.length) {
          const topicMatches = userContext.recentTopics.filter(
            (topic) =>
              result.document.content
                .toLowerCase()
                .includes(topic.toLowerCase()) ||
              result.document.keywords.some((keyword) =>
                keyword.toLowerCase().includes(topic.toLowerCase()),
              ),
          ).length;
          contextScore +=
            (topicMatches / userContext.recentTopics.length) * 0.3;
        }

        return {
          ...result,
          relevance: Math.min(result.relevance + contextScore, 1.0),
        };
      })
      .sort((a, b) => b.relevance - a.relevance);
  }

  private buildContextFromResults(results: SearchResult[]): string {
    if (results.length === 0) {
      return 'General wellness principles and best practices.';
    }

    return results
      .map((result) => `${result.document.title}: ${result.context}`)
      .join('\n\n');
  }

  private buildResponsePrompt(
    query: string,
    context: string,
    conversationContext: ConversationContextDocument,
  ): string {
    const recentMessages = conversationContext.messages.slice(-3);
    const messageHistory = recentMessages
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');

    return `<s>[INST] You are a knowledgeable wellness consultant who provides helpful, practical advice. Be natural and conversational in your responses.

Your approach:
- Respond directly to the user's question or concern
- Be helpful and informative without being overly formal
- Only ask follow-up questions if the user specifically requests them or if it's clearly needed for safety
- If the user says "stop" or indicates they're done, respect that
- Provide evidence-based information when relevant
- Keep responses concise and actionable
- Be warm and supportive, but not robotic

KNOWLEDGE BASE:
${context}

CONVERSATION HISTORY:
${messageHistory || 'This is a new conversation.'}

USER CONTEXT:
- Health Conditions: ${conversationContext.context?.healthConditions?.join(', ') || 'None specified'}
- Medications: ${conversationContext.context?.medications?.join(', ') || 'None specified'}
- Wellness Goals: ${conversationContext.context?.wellnessGoals?.join(', ') || 'None specified'}
- Communication Style: ${conversationContext.context?.communicationStyle || 'professional'}

USER MESSAGE: ${query}

Respond naturally and directly to the user's message. Focus on being helpful and informative without unnecessary formalities or follow-up questions unless specifically requested. [/INST]`;
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

  private async getOrCreateConversationContext(
    userId: string,
    sessionId: string,
  ): Promise<ConversationContextDocument> {
    let context = await this.conversationContextModel
      .findOne({ userId, sessionId })
      .exec();

    if (!context) {
      context = new this.conversationContextModel({
        userId,
        sessionId,
        messages: [],
        context: {
          communicationStyle: 'professional',
        },
        lastUpdated: new Date(),
      });
    }

    return context;
  }

  private async saveConversationContext(
    context: ConversationContextDocument,
  ): Promise<void> {
    context.lastUpdated = new Date();
    await context.save();
  }

  private async updateConversationContext(
    context: ConversationContextDocument,
    userMessage: string,
    assistantResponse: string,
  ): Promise<void> {
    context.messages.push({
      role: 'user' as const,
      content: userMessage,
      timestamp: new Date(),
    });

    context.messages.push({
      role: 'assistant' as const,
      content: assistantResponse,
      timestamp: new Date(),
    });

    context.messageCount = context.messages.length;
    context.lastUpdated = new Date();

    await context.save();
  }
}
