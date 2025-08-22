import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Request,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { RAGService } from './services/rag.service';
import { RAGQuery, RAGResponse, RAGWellnessDocument } from './types/rag.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('RAG - Retrieval Augmented Generation')
@Controller('rag')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RAGController {
  constructor(private readonly ragService: RAGService) {}

  @Post('search')
  @ApiOperation({ summary: 'Search wellness documents using RAG' })
  @ApiResponse({
    status: 200,
    description: 'Search results returned successfully',
  })
  async searchDocuments(@Body() query: RAGQuery): Promise<RAGResponse> {
    return this.ragService.searchDocuments(query);
  }

  @Post('documents')
  @ApiOperation({ summary: 'Add user wellness document to RAG system' })
  @ApiResponse({ status: 201, description: 'Document added successfully' })
  async addUserDocument(
    @Body() document: RAGWellnessDocument,
    @Query('userId') userId: string,
  ): Promise<{ message: string }> {
    await this.ragService.addUserWellnessDocument(userId, document);
    return { message: 'Document added successfully' };
  }

  @Get('documents/:userId')
  @ApiOperation({ summary: 'Get user wellness documents' })
  @ApiResponse({
    status: 200,
    description: 'User documents retrieved successfully',
  })
  async getUserDocuments(
    @Param('userId') userId: string,
  ): Promise<RAGWellnessDocument[]> {
    return this.ragService.getUserWellnessDocuments(userId);
  }

  @Post('generate-response')
  @ApiOperation({ summary: 'Generate contextual response' })
  @ApiResponse({ status: 200, description: 'Response generated successfully' })
  async generateResponse(
    @Body() body: { query: string; userId: string; conversationId?: string },
  ): Promise<RAGResponse> {
    const response = await this.ragService.generateContextualResponse(
      body.query,
      body.userId,
      body.conversationId,
    );

    return {
      query: body.query,
      response,
      results: [],
      totalResults: 0,
      processingTime: 0,
      model: 'mistral-small-latest',
      sources: [],
      confidence: 0.8,
      metadata: {
        vectorSearchTime: 0,
        rerankingTime: 0,
        cacheHit: false,
      },
    };
  }
}
