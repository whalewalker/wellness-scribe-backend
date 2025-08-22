import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { MistralResponse } from '../types/ai.types';
import { AbortController } from 'node-abort-controller';

@Injectable()
export class MistralApiService {
  private readonly logger = new Logger(MistralApiService.name);
  private readonly apiUrl = 'https://api.mistral.ai/v1/chat/completions';
  private readonly model = 'mistral-small-latest';
  private readonly apiKey: string;
  private readonly useFallback: boolean;
  private activeGenerations = new Map<string, AbortController>();

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('mistral.apiKey') || '';
    this.useFallback = !this.apiKey;
    this.logger.log(
      `Mistral API Service initialized with model: ${this.model}`,
    );
  }

  async callMistralAPI(
    prompt: string,
    maxTokens: number = 1000,
    generationId?: string,
  ): Promise<MistralResponse | null> {
    if (this.useFallback) {
      this.logger.warn('Using fallback response - no Mistral API key provided');
      return null;
    }

    try {
      const abortController = new AbortController();

      // Store the abort controller for potential cancellation
      if (generationId) {
        this.activeGenerations.set(generationId, abortController);
      }

      const headers = {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      };

      const payload = {
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
        top_p: 0.9,
        stream: false,
      };

      this.logger.log(`Making API call to Mistral: ${this.apiUrl}`);
      this.logger.log(`Using model: ${this.model}`);

      const response = await firstValueFrom(
        this.httpService.post<MistralResponse>(this.apiUrl, payload, {
          headers,
          signal: abortController.signal,
        }),
      );

      this.logger.log(`API response status: ${response.status}`);

      // Clean up the stored abort controller
      if (generationId) {
        this.activeGenerations.delete(generationId);
      }

      if (
        response.data &&
        response.data.choices &&
        response.data.choices.length > 0
      ) {
        return response.data;
      }

      throw new Error('No response generated from Mistral API');
    } catch (error) {
      // Clean up the stored abort controller on error
      if (generationId) {
        this.activeGenerations.delete(generationId);
      }

      // Check if it was an abort error
      if (error.name === 'AbortError' || error.code === 'ABORT_ERR') {
        this.logger.log(`Generation ${generationId} was cancelled`);
        throw new Error('Generation cancelled');
      }

      this.logger.error('Mistral API call failed:', error);

      if (error.response) {
        this.logger.error(`Response status: ${error.response.status}`);
        this.logger.error(
          `Response data: ${JSON.stringify(error.response.data)}`,
        );
      }

      return null;
    }
  }

  private generateFallbackResponse(prompt: string): string {
    return "I'm having technical issues right now. For health concerns, please consult with healthcare professionals. I'll be back to help soon.";
  }

  getModel(): string {
    return this.model;
  }

  isUsingFallback(): boolean {
    return this.useFallback;
  }

  /**
   * Cancel an active generation by its ID
   * @param generationId The unique identifier for the generation to cancel
   * @returns true if the generation was cancelled, false if no active generation found
   */
  cancelGeneration(generationId: string): boolean {
    const abortController = this.activeGenerations.get(generationId);
    if (abortController) {
      abortController.abort();
      this.activeGenerations.delete(generationId);
      this.logger.log(`Successfully cancelled generation: ${generationId}`);
      return true;
    }
    this.logger.warn(`No active generation found for ID: ${generationId}`);
    return false;
  }

  /**
   * Check if a generation is currently active
   * @param generationId The unique identifier for the generation
   * @returns true if the generation is active, false otherwise
   */
  isGenerationActive(generationId: string): boolean {
    return this.activeGenerations.has(generationId);
  }

  /**
   * Get all active generation IDs
   * @returns Array of active generation IDs
   */
  getActiveGenerationIds(): string[] {
    return Array.from(this.activeGenerations.keys());
  }
}
