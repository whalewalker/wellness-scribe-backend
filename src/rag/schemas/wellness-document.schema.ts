import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RAGWellnessDocumentDocument = RAGWellnessDocument & Document;

@Schema({ timestamps: true, collection: 'wellness_documents' })
export class RAGWellnessDocument {
  @Prop({
    type: String,
    unique: true,
    required: true,
    default: () => new Types.ObjectId().toString(),
  })
  id: string;

  @Prop({ required: true, index: true })
  title: string;

  @Prop({ required: true, type: String })
  content: string;

  @Prop({
    required: true,
    enum: [
      'condition',
      'symptom',
      'treatment',
      'lifestyle',
      'medication',
      'prevention',
    ],
    index: true,
  })
  category: string;

  @Prop({ type: [String], index: true })
  keywords: string[];

  @Prop({
    required: true,
    enum: ['high', 'medium', 'low'],
    index: true,
  })
  evidence_level: string;

  @Prop({ required: true, index: true })
  source: string;

  @Prop({ required: true, default: Date.now })
  last_updated: Date;

  @Prop({ type: [Number], sparse: true })
  embedding?: number[];

  @Prop({
    type: {
      author: String,
      publication_date: Date,
      doi: String,
      journal: String,
      page_count: Number,
      language: String,
      userId: String,
      addedAt: Date,
    },
    default: {},
  })
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

  @Prop({ type: [String], index: true })
  tags?: string[];

  @Prop({ type: Number, default: 0 })
  usage_count: number;

  @Prop({ type: Date, default: Date.now })
  created_at: Date;

  @Prop({ type: Date, default: Date.now })
  updated_at: Date;
}

export const RAGWellnessDocumentSchema =
  SchemaFactory.createForClass(RAGWellnessDocument);

// Create compound indexes for efficient querying
RAGWellnessDocumentSchema.index({ category: 1, evidence_level: 1 });
RAGWellnessDocumentSchema.index({ keywords: 1, category: 1 });
RAGWellnessDocumentSchema.index({ source: 1, evidence_level: 1 });
RAGWellnessDocumentSchema.index({ 'metadata.journal': 1, evidence_level: 1 });

// Text index for full-text search
RAGWellnessDocumentSchema.index(
  {
    title: 'text',
    content: 'text',
    keywords: 'text',
  },
  {
    weights: {
      title: 10,
      keywords: 5,
      content: 1,
    },
  },
);
