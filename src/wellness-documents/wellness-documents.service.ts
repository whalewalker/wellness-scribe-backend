import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  WellnessDocument,
  WellnessDocumentDocument,
} from '../schemas/wellness-document.schema';
import {
  CreateWellnessDocumentDto,
  UpdateWellnessDocumentDto,
  GenerateInsightsDto,
  WellnessDocumentResponseDto,
  DocumentStatsDto,
  InsightsResponseDto,
} from '../dto/wellness-document.dto';
import { MessageResponseDto } from '../dto/auth.dto';
import { AiService } from '../ai/ai.service';
import {
  DocumentFilters,
  DocumentUpdateData,
  MongoQuery,
} from '../types/common.types';

@Injectable()
export class WellnessDocumentsService {
  constructor(
    @InjectModel(WellnessDocument.name)
    private wellnessDocumentModel: Model<WellnessDocumentDocument>,
    private aiService: AiService,
  ) {}

  async createDocument(
    userId: string,
    createDocumentDto: CreateWellnessDocumentDto,
  ): Promise<WellnessDocumentResponseDto> {
    const { title, content, type, metadata, tags, attachments } =
      createDocumentDto;

    const document = new this.wellnessDocumentModel({
      userId: new Types.ObjectId(userId),
      title,
      content,
      type,
      metadata,
      tags: tags || [],
      attachments: attachments || [],
      wordCount: content.split(' ').length,
      lastModifiedAt: new Date(),
    });

    const savedDocument = await document.save();

    // Generate AI insights asynchronously
    this.generateDocumentInsights(
      savedDocument._id.toString(),
      content,
      type,
    ).catch((error) => {
      console.error('Error generating insights:', error);
    });

    return this.mapDocumentToResponse(savedDocument);
  }

  async updateDocument(
    userId: string,
    documentId: string,
    updateDocumentDto: UpdateWellnessDocumentDto,
  ): Promise<WellnessDocumentResponseDto> {
    const { content, type } = updateDocumentDto;

    const updateData: DocumentUpdateData = {
      ...updateDocumentDto,
      lastModifiedAt: new Date(),
    };

    if (content) {
      updateData.wordCount = content.split(' ').length;
    }

    const document = await this.wellnessDocumentModel.findOneAndUpdate(
      {
        _id: documentId,
        userId: new Types.ObjectId(userId),
      },
      updateData,
      { new: true },
    );

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Regenerate AI insights if content changed
    if (content) {
      this.generateDocumentInsights(
        documentId,
        content,
        type || document.type,
      ).catch((error) => {
        console.error('Error regenerating insights:', error);
      });
    }

    return this.mapDocumentToResponse(document);
  }

  async getUserDocuments(
    userId: string,
    filters: DocumentFilters,
  ): Promise<WellnessDocumentResponseDto[]> {
    const query: MongoQuery = { userId: new Types.ObjectId(userId) };

    if (filters.type) {
      query.type = filters.type;
    }
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    const documents = await this.wellnessDocumentModel
      .find(query)
      .sort({ lastModifiedAt: -1 });

    return documents.map((document) => this.mapDocumentToResponse(document));
  }

  async getDocumentById(
    userId: string,
    documentId: string,
  ): Promise<WellnessDocumentResponseDto> {
    const document = await this.wellnessDocumentModel.findOne({
      _id: documentId,
      userId: new Types.ObjectId(userId),
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return this.mapDocumentToResponse(document);
  }

  async deleteDocument(
    userId: string,
    documentId: string,
  ): Promise<MessageResponseDto> {
    const result = await this.wellnessDocumentModel.deleteOne({
      _id: documentId,
      userId: new Types.ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Document not found');
    }

    return { message: 'Document deleted successfully' };
  }

  async generateInsights(
    generateInsightsDto: GenerateInsightsDto,
  ): Promise<InsightsResponseDto> {
    const { content, type, context } = generateInsightsDto;

    const insights = await this.aiService.generateWellnessInsights(
      content,
      type || 'note',
      context,
    );

    return {
      summary: insights.summary,
      recommendations: insights.recommendations,
      riskFactors: insights.riskFactors,
      keywords: insights.keywords,
      sentiment: insights.sentiment as 'positive' | 'negative' | 'neutral',
    };
  }

  async searchDocuments(
    userId: string,
    query: string,
  ): Promise<WellnessDocumentResponseDto[]> {
    const documents = await this.wellnessDocumentModel.find({
      userId: new Types.ObjectId(userId),
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } },
      ],
    });

    return documents.map((document) => this.mapDocumentToResponse(document));
  }

  async getDocumentStats(userId: string): Promise<DocumentStatsDto> {
    const documents = await this.wellnessDocumentModel.find({
      userId: new Types.ObjectId(userId),
    });

    const totalDocuments = documents.length;
    const totalWords = documents.reduce(
      (sum, doc) => sum + (doc.wordCount || 0),
      0,
    );

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    documents.forEach((doc) => {
      byType[doc.type] = (byType[doc.type] || 0) + 1;
      byStatus[doc.status] = (byStatus[doc.status] || 0) + 1;
    });

    return {
      totalDocuments,
      totalWords,
      byType,
      byStatus,
    };
  }

  private async generateDocumentInsights(
    documentId: string,
    content: string,
    type: string,
  ) {
    const insights = await this.aiService.generateWellnessInsights(
      content,
      type || 'note',
    );

    await this.wellnessDocumentModel.findByIdAndUpdate(documentId, {
      $set: {
        aiInsights: insights,
      },
    });
  }

  private mapDocumentToResponse(
    document: WellnessDocumentDocument,
  ): WellnessDocumentResponseDto {
    return {
      id: document._id.toString(),
      title: document.title,
      content: document.content,
      type: document.type,
      metadata: document.metadata,
      tags: document.tags,
      aiInsights: document.aiInsights,
      attachments: document.attachments,
      status: document.status,
      wordCount: document.wordCount,
      lastModifiedAt: document.lastModifiedAt,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}
