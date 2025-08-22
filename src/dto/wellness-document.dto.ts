import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsNumber,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWellnessDocumentDto {
  @ApiProperty({
    description: 'Document title',
    example: 'Morning Blood Sugar Reading',
    type: String,
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Document content',
    example:
      'Blood sugar was 120 mg/dL this morning. Feeling slightly tired but otherwise okay.',
    type: String,
  })
  @IsString()
  content: string;

  @ApiProperty({
    description: 'Document type',
    example: 'test_result',
    enum: [
      'note',
      'symptom',
      'medication',
      'appointment',
      'test_result',
      'treatment',
      'goal',
    ],
  })
  @IsEnum([
    'note',
    'symptom',
    'medication',
    'appointment',
    'test_result',
    'treatment',
    'goal',
  ])
  type:
    | 'note'
    | 'symptom'
    | 'medication'
    | 'appointment'
    | 'test_result'
    | 'treatment'
    | 'goal';

  @ApiPropertyOptional({
    description: 'Document metadata',
    example: {
      severity: 'low',
      category: 'diabetes',
      date: '2024-01-01T08:00:00.000Z',
      location: 'home',
      intensity: 2,
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: {
    severity?: 'low' | 'medium' | 'high';
    category?: string;
    date?: Date;
    location?: string;
    duration?: string;
    intensity?: number;
  };

  @ApiPropertyOptional({
    description: 'Document tags',
    example: ['blood sugar', 'diabetes', 'morning'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Document attachments',
    example: [
      {
        filename: 'blood_sugar_chart.jpg',
        url: 'https://example.com/chart.jpg',
        type: 'image/jpeg',
        size: 1024000,
      },
    ],
    type: 'array',
  })
  @IsOptional()
  @IsArray()
  attachments?: Array<{
    filename: string;
    url: string;
    type: string;
    size: number;
  }>;
}

export class UpdateWellnessDocumentDto {
  @ApiPropertyOptional({
    description: 'Document title',
    example: 'Updated Blood Sugar Reading',
    type: String,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Document content',
    example:
      'Blood sugar was 120 mg/dL this morning. Feeling better after breakfast.',
    type: String,
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'Document type',
    example: 'test_result',
    enum: [
      'note',
      'symptom',
      'medication',
      'appointment',
      'test_result',
      'treatment',
      'goal',
    ],
  })
  @IsOptional()
  @IsEnum([
    'note',
    'symptom',
    'medication',
    'appointment',
    'test_result',
    'treatment',
    'goal',
  ])
  type?:
    | 'note'
    | 'symptom'
    | 'medication'
    | 'appointment'
    | 'test_result'
    | 'treatment'
    | 'goal';

  @ApiPropertyOptional({
    description: 'Document metadata',
    example: {
      severity: 'low',
      category: 'diabetes',
      date: '2024-01-01T08:00:00.000Z',
      location: 'home',
      intensity: 2,
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: {
    severity?: 'low' | 'medium' | 'high';
    category?: string;
    date?: Date;
    location?: string;
    duration?: string;
    intensity?: number;
  };

  @ApiPropertyOptional({
    description: 'Document tags',
    example: ['blood sugar', 'diabetes', 'morning'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Document status',
    example: 'published',
    enum: ['draft', 'published', 'archived'],
  })
  @IsOptional()
  @IsEnum(['draft', 'published', 'archived'])
  status?: 'draft' | 'published' | 'archived';
}

export class GenerateInsightsDto {
  @ApiProperty({
    description: 'Content to analyze',
    example:
      "I've been experiencing frequent headaches in the morning, usually lasting 2-3 hours. Pain is moderate and located in the front of my head.",
    type: String,
  })
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: 'Document type for context',
    example: 'symptom',
    type: String,
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: 'Additional context for analysis',
    example: {
      healthConditions: ['migraine'],
      medications: ['sumatriptan'],
      age: 35,
      gender: 'female',
    },
  })
  @IsOptional()
  @IsObject()
  context?: {
    healthConditions?: string[];
    medications?: string[];
    age?: number;
    gender?: string;
  };
}

// Response DTOs
export class DocumentMetadataDto {
  @ApiPropertyOptional({
    description: 'Severity level',
    example: 'low',
    enum: ['low', 'medium', 'high'],
  })
  severity?: 'low' | 'medium' | 'high';

  @ApiPropertyOptional({
    description: 'Document category',
    example: 'diabetes',
  })
  category?: string;

  @ApiPropertyOptional({
    description: 'Document date',
    example: '2024-01-01T08:00:00.000Z',
  })
  date?: Date;

  @ApiPropertyOptional({
    description: 'Document location',
    example: 'home',
  })
  location?: string;

  @ApiPropertyOptional({
    description: 'Document duration',
    example: '2 hours',
  })
  duration?: string;

  @ApiPropertyOptional({
    description: 'Intensity level',
    example: 2,
  })
  intensity?: number;
}

export class DocumentAttachmentDto {
  @ApiProperty({
    description: 'Attachment filename',
    example: 'blood_sugar_chart.jpg',
  })
  filename: string;

  @ApiProperty({
    description: 'Attachment URL',
    example: 'https://example.com/chart.jpg',
  })
  url: string;

  @ApiProperty({
    description: 'Attachment type',
    example: 'image/jpeg',
  })
  type: string;

  @ApiProperty({
    description: 'Attachment size in bytes',
    example: 1024000,
  })
  size: number;
}

export class AiInsightsDto {
  @ApiPropertyOptional({
    description: 'AI-generated summary',
    example: 'Normal blood sugar reading with mild fatigue noted',
  })
  summary?: string;

  @ApiPropertyOptional({
    description: 'AI-generated recommendations',
    example: [
      'Continue monitoring',
      'Consider light exercise',
      'Stay hydrated',
    ],
    type: [String],
  })
  recommendations?: string[];

  @ApiPropertyOptional({
    description: 'AI-identified risk factors',
    example: ['Fatigue could indicate need for medication adjustment'],
    type: [String],
  })
  riskFactors?: string[];

  @ApiPropertyOptional({
    description: 'AI-extracted keywords',
    example: ['blood sugar', 'diabetes', 'fatigue', 'monitoring'],
    type: [String],
  })
  keywords?: string[];

  @ApiPropertyOptional({
    description: 'AI-determined sentiment',
    example: 'neutral',
    enum: ['positive', 'negative', 'neutral'],
  })
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export class WellnessDocumentResponseDto {
  @ApiProperty({
    description: 'Document ID',
    example: '507f1f77bcf86cd799439013',
  })
  id: string;

  @ApiProperty({
    description: 'Document title',
    example: 'Morning Blood Sugar Reading',
  })
  title: string;

  @ApiProperty({
    description: 'Document content',
    example:
      'Blood sugar was 120 mg/dL this morning. Feeling slightly tired but otherwise okay.',
  })
  content: string;

  @ApiProperty({
    description: 'Document type',
    example: 'test_result',
  })
  type: string;

  @ApiPropertyOptional({
    description: 'Document metadata',
    type: DocumentMetadataDto,
  })
  metadata?: DocumentMetadataDto;

  @ApiProperty({
    description: 'Document tags',
    example: ['blood sugar', 'diabetes', 'morning'],
    type: [String],
  })
  tags: string[];

  @ApiPropertyOptional({
    description: 'AI-generated insights',
    type: AiInsightsDto,
  })
  aiInsights?: AiInsightsDto;

  @ApiProperty({
    description: 'Document attachments',
    type: [DocumentAttachmentDto],
  })
  attachments: DocumentAttachmentDto[];

  @ApiProperty({
    description: 'Document status',
    example: 'draft',
  })
  status: string;

  @ApiProperty({
    description: 'Word count',
    example: 15,
  })
  wordCount: number;

  @ApiPropertyOptional({
    description: 'Last modification timestamp',
    example: '2024-01-01T08:00:00.000Z',
  })
  lastModifiedAt?: Date;

  @ApiProperty({
    description: 'Document creation timestamp',
    example: '2024-01-01T08:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Document last update timestamp',
    example: '2024-01-01T08:00:00.000Z',
  })
  updatedAt: Date;
}

export class DocumentStatsDto {
  @ApiProperty({
    description: 'Total number of documents',
    example: 25,
  })
  totalDocuments: number;

  @ApiProperty({
    description: 'Total word count across all documents',
    example: 1500,
  })
  totalWords: number;

  @ApiProperty({
    description: 'Documents grouped by type',
    example: {
      note: 10,
      symptom: 5,
      medication: 3,
      test_result: 4,
      appointment: 2,
      treatment: 1,
    },
  })
  byType: Record<string, number>;

  @ApiProperty({
    description: 'Documents grouped by status',
    example: {
      draft: 15,
      published: 8,
      archived: 2,
    },
  })
  byStatus: Record<string, number>;
}

export class InsightsResponseDto {
  @ApiProperty({
    description: 'AI-generated summary',
    example:
      'Morning headaches lasting 2-3 hours with moderate front-head pain',
  })
  summary: string;

  @ApiProperty({
    description: 'AI-generated recommendations',
    example: [
      'Track headache patterns and triggers',
      'Consider sleep hygiene improvements',
      'Monitor medication effectiveness',
      'Consult neurologist if pattern changes',
    ],
    type: [String],
  })
  recommendations: string[];

  @ApiProperty({
    description: 'AI-identified risk factors',
    example: [
      'Potential medication overuse',
      'Sleep quality issues',
      'Stress-related triggers',
    ],
    type: [String],
  })
  riskFactors: string[];

  @ApiProperty({
    description: 'AI-extracted keywords',
    example: ['headache', 'morning', 'migraine', 'pain', 'duration'],
    type: [String],
  })
  keywords: string[];

  @ApiProperty({
    description: 'AI-determined sentiment',
    example: 'negative',
    enum: ['positive', 'negative', 'neutral'],
  })
  sentiment: 'positive' | 'negative' | 'neutral';
}
