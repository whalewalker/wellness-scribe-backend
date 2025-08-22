import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { WellnessDocumentsService } from './wellness-documents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CreateWellnessDocumentDto,
  UpdateWellnessDocumentDto,
  GenerateInsightsDto,
  WellnessDocumentResponseDto,
  DocumentStatsDto,
  InsightsResponseDto,
} from '../dto/wellness-document.dto';
import { MessageResponseDto } from '../dto/auth.dto';
import { CurrentUser } from '../decorators';
import { DocumentFilters } from '../types/common.types';

@ApiTags('Wellness Documents')
@Controller('wellness-documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WellnessDocumentsController {
  constructor(
    private readonly wellnessDocumentsService: WellnessDocumentsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new wellness document',
    description:
      'Creates a new wellness document (notes, symptoms, medications, etc.) with optional AI insights generation.',
  })
  @ApiResponse({
    status: 201,
    description: 'Document created successfully',
    type: WellnessDocumentResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async createDocument(
    @CurrentUser('_id') userId: string,
    @Body() createDocumentDto: CreateWellnessDocumentDto,
  ): Promise<WellnessDocumentResponseDto> {
    return this.wellnessDocumentsService.createDocument(
      userId,
      createDocumentDto,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get user wellness documents',
    description:
      'Retrieves all wellness documents for the authenticated user with optional filtering by type, status, and tags.',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by document type',
    example: 'symptom',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by document status',
    example: 'published',
  })
  @ApiQuery({
    name: 'tags',
    required: false,
    description: 'Filter by tags (comma-separated)',
    example: 'diabetes,blood sugar',
  })
  @ApiResponse({
    status: 200,
    description: 'Documents retrieved successfully',
    type: [WellnessDocumentResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getUserDocuments(
    @CurrentUser('_id') userId: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('tags') tags?: string,
  ): Promise<WellnessDocumentResponseDto[]> {
    const filters: DocumentFilters = {};
    if (type) filters.type = type;
    if (status) filters.status = status;
    if (tags) filters.tags = tags.split(',');

    return this.wellnessDocumentsService.getUserDocuments(userId, filters);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search wellness documents',
    description:
      'Searches wellness documents by title, content, and tags using full-text search.',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Search query',
    example: 'blood sugar',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
    type: [WellnessDocumentResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async searchDocuments(
    @CurrentUser('_id') userId: string,
    @Query('q') query: string,
  ): Promise<WellnessDocumentResponseDto[]> {
    return this.wellnessDocumentsService.searchDocuments(userId, query);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get document statistics',
    description:
      "Retrieves comprehensive statistics about the user's wellness documents including counts, word totals, and breakdowns by type and status.",
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: DocumentStatsDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getDocumentStats(
    @CurrentUser('_id') userId: string,
  ): Promise<DocumentStatsDto> {
    return this.wellnessDocumentsService.getDocumentStats(userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get wellness document by ID',
    description:
      'Retrieves a specific wellness document with all its details, metadata, and AI insights.',
  })
  @ApiParam({
    name: 'id',
    description: 'Document ID',
    example: '507f1f77bcf86cd799439013',
  })
  @ApiResponse({
    status: 200,
    description: 'Document retrieved successfully',
    type: WellnessDocumentResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
  })
  async getDocumentById(
    @CurrentUser('_id') userId: string,
    @Param('id') documentId: string,
  ): Promise<WellnessDocumentResponseDto> {
    return this.wellnessDocumentsService.getDocumentById(userId, documentId);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update wellness document',
    description:
      'Updates an existing wellness document with new information. Triggers AI insights regeneration if content changes.',
  })
  @ApiParam({
    name: 'id',
    description: 'Document ID',
    example: '507f1f77bcf86cd799439013',
  })
  @ApiResponse({
    status: 200,
    description: 'Document updated successfully',
    type: WellnessDocumentResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
  })
  async updateDocument(
    @CurrentUser('_id') userId: string,
    @Param('id') documentId: string,
    @Body() updateDocumentDto: UpdateWellnessDocumentDto,
  ): Promise<WellnessDocumentResponseDto> {
    return this.wellnessDocumentsService.updateDocument(
      userId,
      documentId,
      updateDocumentDto,
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete wellness document',
    description:
      'Permanently deletes a wellness document and all its associated data.',
  })
  @ApiParam({
    name: 'id',
    description: 'Document ID',
    example: '507f1f77bcf86cd799439013',
  })
  @ApiResponse({
    status: 200,
    description: 'Document deleted successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
  })
  async deleteDocument(
    @CurrentUser('_id') userId: string,
    @Param('id') documentId: string,
  ): Promise<MessageResponseDto> {
    return this.wellnessDocumentsService.deleteDocument(userId, documentId);
  }

  @Post('generate-insights')
  @ApiOperation({
    summary: 'Generate AI insights for wellness content',
    description:
      'Generates AI-powered insights for wellness content including summary, recommendations, risk factors, and sentiment analysis.',
  })
  @ApiResponse({
    status: 200,
    description: 'Insights generated successfully',
    type: InsightsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async generateInsights(
    @Body() generateInsightsDto: GenerateInsightsDto,
  ): Promise<InsightsResponseDto> {
    return this.wellnessDocumentsService.generateInsights(generateInsightsDto);
  }
}
