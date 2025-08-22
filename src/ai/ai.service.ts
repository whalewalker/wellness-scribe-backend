import { Injectable, Logger } from '@nestjs/common';
import {
  ChatResponse,
  ConversationHistoryItem,
  UserContext,
  WellnessInsights,
} from './types/ai.types';
import { RAGService } from '../rag/services/rag.service';
import { MistralApiService } from './services/mistral-api.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly ragService: RAGService,
    private readonly mistralApiService: MistralApiService,
  ) {
    this.logger.log(
      `AI Service initialized with RAG-powered wellness assistance using Mistral ${this.mistralApiService.getModel()}`,
    );
  }

  async generateChatResponse(
    message: string,
    conversationHistory: ConversationHistoryItem[],
    context?: UserContext,
    generationId?: string,
  ): Promise<ChatResponse> {
    try {
      // Check if this is a stop signal
      const stopKeywords = ['stop', 'end', 'quit', 'exit', 'terminate', 'halt'];
      const isStopSignal = stopKeywords.some((keyword) =>
        message.toLowerCase().includes(keyword),
      );

      if (isStopSignal) {
        return {
          content:
            "I understand you want to stop. I'll respect that and won't continue this conversation. Feel free to start a new chat when you're ready.",
          usage: { total_tokens: 50 },
          model: this.mistralApiService.getModel(),
          sources: [],
          confidence: 1.0,
          memory: {
            topics: [],
            sentiment: 'neutral',
            followUpQuestions: [],
          },
        };
      }

      // Check if the conversation has been stopped
      const lastMessage = conversationHistory[conversationHistory.length - 1];
      if (lastMessage && lastMessage.content.toLowerCase().includes('stop')) {
        return {
          content:
            "This conversation has been stopped. I won't continue responding. Please start a new chat if you need assistance.",
          usage: { total_tokens: 30 },
          model: this.mistralApiService.getModel(),
          sources: [],
          confidence: 1.0,
          memory: {
            topics: [],
            sentiment: 'neutral',
            followUpQuestions: [],
          },
        };
      }

      // Use RAG service for intelligent responses
      const response = await this.ragService.generateContextualResponse(
        message,
        context?.userId || 'anonymous',
        `chat_${Date.now()}`,
        generationId,
      );

      return {
        content: response,
        usage: { total_tokens: response.length / 4 }, // Rough estimate
        model: this.mistralApiService.getModel(),
        sources: [],
        confidence: 0.8,
        memory: {
          topics: [],
          sentiment: 'neutral',
          followUpQuestions: [],
        },
      };
    } catch (error) {
      this.logger.error('Error generating chat response:', error);
      return this.getFallbackResponse();
    }
  }

  async generateWellnessInsights(
    content: string,
    type: string,
    context?: UserContext,
  ): Promise<WellnessInsights> {
    try {
      this.logger.log(`Generating wellness insights for type: ${type}`);

      const knowledgeContext = await this.ragService.searchDocuments({
        query: content,
        userId: context?.userId || 'anonymous',
        limit: 5,
      });

      const prompt = this.buildInsightsPrompt(
        content,
        type,
        knowledgeContext.results.map((r) => r.document.content).join('\n\n'),
        context,
      );

      this.logger.log(
        `Calling Mistral API with prompt length: ${prompt.length}`,
      );
      const response = await this.mistralApiService.callMistralAPI(prompt);

      if (response && response.choices && response.choices[0]) {
        const insightsText = response.choices[0].message?.content || '';
        this.logger.log(
          `Received Mistral response with length: ${insightsText.length}`,
        );
        return this.parseInsightsResponse(insightsText);
      }

      this.logger.warn('No valid response from Mistral API, using fallback');
      return this.getFallbackInsights(content, type);
    } catch (error) {
      this.logger.error('Error generating wellness insights:', error);
      return this.getFallbackInsights(content, type);
    }
  }

  async generateDocumentSummary(
    content: string,
    type: string,
  ): Promise<string> {
    try {
      const knowledgeContext = await this.ragService.searchDocuments({
        query: content,
        userId: 'anonymous',
        limit: 3,
      });

      const prompt = this.buildSummaryPrompt(
        content,
        type,
        knowledgeContext.results.map((r) => r.document.content).join('\n\n'),
      );
      const response = await this.mistralApiService.callMistralAPI(prompt);

      if (response && response.choices && response.choices[0]) {
        return (
          response.choices[0].message?.content ||
          this.getFallbackSummary(content, type)
        );
      }

      return this.getFallbackSummary(content, type);
    } catch (error) {
      this.logger.error('Error generating document summary:', error);
      return this.getFallbackSummary(content, type);
    }
  }

  private generateSessionId(userId: string): string {
    return `${userId}_${Date.now()}`;
  }

  private extractTopics(message: string): string[] {
    const wellnessKeywords = [
      'nutrition',
      'diet',
      'exercise',
      'fitness',
      'sleep',
      'stress',
      'mental health',
      'wellness',
      'meditation',
      'yoga',
      'therapy',
      'medication',
      'symptoms',
      'pain',
      'fatigue',
      'energy',
    ];

    return wellnessKeywords.filter((keyword) =>
      message.toLowerCase().includes(keyword.toLowerCase()),
    );
  }

  private analyzeSentiment(message: string): string {
    const positiveWords = ['good', 'better', 'improved', 'happy', 'excited'];
    const negativeWords = ['bad', 'worse', 'pain', 'tired', 'stress'];

    const words = message.toLowerCase().split(' ');
    const positiveCount = words.filter((word) =>
      positiveWords.includes(word),
    ).length;
    const negativeCount = words.filter((word) =>
      negativeWords.includes(word),
    ).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private generateFollowUpQuestions(message: string): string[] {
    const topics = this.extractTopics(message);
    if (topics.length === 0) {
      return [
        'What specific aspect of wellness would you like to focus on?',
        'What are your main wellness goals right now?',
      ];
    }

    return [
      `Tell me more about your ${topics[0]} goals.`,
      'How has this been affecting your daily life?',
    ];
  }

  private buildInsightsPrompt(
    content: string,
    type: string,
    knowledgeContext: string,
    context?: UserContext,
  ): string {
    return `<s>[INST] Analyze this wellness ${type} and provide helpful insights.

KNOWLEDGE BASE:
${knowledgeContext}

${context ? `USER CONTEXT: ${JSON.stringify(context)}` : ''}

CONTENT TO ANALYZE:
${content}

You must provide insights in exactly this format (do not use markdown or special formatting):

SUMMARY: A clear, concise summary of the wellness content in 1-2 sentences.

RECOMMENDATIONS: List practical recommendations separated by commas or newlines.

RISK FACTORS: List any potential risk factors separated by commas or newlines.

Keep it concise, actionable, and use plain text without markdown formatting. [/INST]`;
  }

  private buildSummaryPrompt(
    content: string,
    type: string,
    knowledgeContext: string,
  ): string {
    return `<s>[INST] Create a concise summary of this wellness ${type}.

EVIDENCE BASE:
${knowledgeContext}

CONTENT:
${content}

Provide a brief, informative summary. [/INST]`;
  }

  private parseInsightsResponse(response: string): WellnessInsights {
    try {
      this.logger.log(
        `Parsing insights response: ${response.substring(0, 200)}...`,
      );

      // More flexible regex patterns to handle various formatting
      const summaryMatch = response.match(
        /(?:SUMMARY|Summary):\s*(.+?)(?=\n(?:RECOMMENDATIONS?|RISK\s*FACTORS?)|$)/is,
      );
      const recommendationsMatch = response.match(
        /(?:RECOMMENDATIONS?|Recommendations?):\s*(.+?)(?=\n(?:RISK\s*FACTORS?|SUMMARY)|$)/is,
      );
      const riskFactorsMatch = response.match(
        /(?:RISK\s*FACTORS?|Risk\s*Factors?):\s*(.+?)(?=\n(?:SUMMARY|RECOMMENDATIONS?)|$)/is,
      );

      // Extract and clean the content
      const summary =
        summaryMatch?.[1]?.trim().replace(/[[\]]/g, '') ||
        'Analysis completed.';

      // Handle both comma-separated and newline-separated recommendations
      const recommendationsText =
        recommendationsMatch?.[1]?.trim().replace(/[[\]]/g, '') || '';
      const recommendations = recommendationsText
        ? recommendationsText
            .split(/[,\n]/)
            .map((r) => r.trim())
            .filter((r) => r.length > 0)
        : [
            'Keep track of your wellness patterns',
            'Consult healthcare providers for specific concerns',
          ];

      // Handle both comma-separated and newline-separated risk factors
      const riskFactorsText =
        riskFactorsMatch?.[1]?.trim().replace(/[[\]]/g, '') || '';
      const riskFactors = riskFactorsText
        ? riskFactorsText
            .split(/[,\n]/)
            .map((r) => r.trim())
            .filter((r) => r.length > 0)
        : ['Seek professional advice for medical concerns'];

      return {
        summary,
        recommendations,
        riskFactors,
        keywords: this.extractTopics(response),
        sentiment: this.analyzeSentiment(response),
      };
    } catch (error) {
      this.logger.error('Error parsing insights response:', error);
      this.logger.error(`Response content: ${response}`);
      return this.getFallbackInsights('', '');
    }
  }

  private getFallbackResponse(): ChatResponse {
    return {
      content:
        "I'm having some technical issues right now. For immediate health concerns, please consult with a healthcare professional. I'll be back to help with your wellness questions soon.",
      usage: { total_tokens: 200 },
      model: this.mistralApiService.getModel(),
      sources: [],
      confidence: 0.3,
      memory: {
        topics: [],
        sentiment: 'neutral',
        followUpQuestions: [],
      },
    };
  }

  private getFallbackInsights(content: string, type: string): WellnessInsights {
    return {
      summary: `Your ${type} has been recorded.`,
      recommendations: [
        'Keep track of your wellness patterns',
        'Consult healthcare providers for specific concerns',
        'Maintain healthy lifestyle habits',
      ],
      riskFactors: ['Seek professional advice for medical concerns'],
      keywords: [type, 'wellness', 'health'],
      sentiment: 'neutral',
    };
  }

  async generateChatTitle(firstUserMessage: string): Promise<string> {
    try {
      // Create a focused prompt for title generation
      const prompt = `Generate a concise, descriptive title (3-6 words) for a wellness chat that starts with this message: "${firstUserMessage}"

The title should:
- Be clear and specific to the topic
- Use natural, wellness-focused language
- NOT include "Chat about" or "Help with"
- Be professional but approachable

Examples:
- "Sleep Quality Improvement"
- "Managing Daily Fatigue"
- "Heart Health Questions"
- "Stress Management Tips"

Title:`;

      const response = await this.mistralApiService.callMistralAPI(
        prompt,
        50,
        `title_${Date.now()}`,
      );

      if (response?.choices?.[0]?.message?.content) {
        const title = response.choices[0].message.content
          .trim()
          .replace(/^["']|["']$/g, '') // Remove quotes
          .replace(/^Title:\s*/i, '') // Remove "Title:" prefix
          .substring(0, 60); // Limit length

        return title || this.getFallbackTitle(firstUserMessage);
      }

      return this.getFallbackTitle(firstUserMessage);
    } catch (error) {
      this.logger.error('Error generating chat title:', error);
      return this.getFallbackTitle(firstUserMessage);
    }
  }

  private getFallbackTitle(message: string): string {
    // Extract key health/wellness terms for fallback title
    const healthTerms = [
      'sleep',
      'fatigue',
      'energy',
      'stress',
      'anxiety',
      'diet',
      'exercise',
      'pain',
      'headache',
      'heart',
      'blood',
      'pressure',
      'diabetes',
      'weight',
      'nutrition',
      'mental health',
      'wellness',
      'health',
      'medication',
      'symptom',
    ];

    const messageLower = message.toLowerCase();
    const foundTerm = healthTerms.find((term) => messageLower.includes(term));

    if (foundTerm) {
      return `${foundTerm.charAt(0).toUpperCase() + foundTerm.slice(1)} Discussion`;
    }

    return `Wellness Chat - ${new Date().toLocaleDateString()}`;
  }

  private getFallbackSummary(content: string, type: string): string {
    return `Your ${type} has been processed and stored. For detailed analysis, consult with your healthcare provider.`;
  }

  /**
   * Cancel an active AI generation
   * @param generationId The unique identifier for the generation to cancel
   * @returns true if the generation was cancelled, false if no active generation found
   */
  cancelGeneration(generationId: string): boolean {
    return this.mistralApiService.cancelGeneration(generationId);
  }

  /**
   * Check if a generation is currently active
   * @param generationId The unique identifier for the generation
   * @returns true if the generation is active, false otherwise
   */
  isGenerationActive(generationId: string): boolean {
    return this.mistralApiService.isGenerationActive(generationId);
  }

  /**
   * Get all active generation IDs
   * @returns Array of active generation IDs
   */
  getActiveGenerationIds(): string[] {
    return this.mistralApiService.getActiveGenerationIds();
  }
}
