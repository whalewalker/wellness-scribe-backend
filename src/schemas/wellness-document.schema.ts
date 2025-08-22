import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export interface WellnessDocumentDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  content: string;
  type:
    | 'note'
    | 'symptom'
    | 'medication'
    | 'appointment'
    | 'test_result'
    | 'treatment'
    | 'goal';
  metadata?: {
    severity?: 'low' | 'medium' | 'high';
    category?: string;
    date?: Date;
    location?: string;
    duration?: string;
    intensity?: number;
  };
  tags: string[];
  aiInsights?: {
    summary?: string;
    recommendations?: string[];
    riskFactors?: string[];
    keywords?: string[];
    sentiment?: 'positive' | 'negative' | 'neutral';
  };
  attachments: Array<{
    filename: string;
    url: string;
    type: string;
    size: number;
  }>;
  status: 'draft' | 'published' | 'archived';
  wordCount: number;
  lastModifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

@Schema({ timestamps: true, collection: 'wellness_documents' })
export class WellnessDocument {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  type:
    | 'note'
    | 'symptom'
    | 'medication'
    | 'appointment'
    | 'test_result'
    | 'treatment'
    | 'goal';

  @Prop({ type: Object })
  metadata?: {
    severity?: 'low' | 'medium' | 'high';
    category?: string;
    date?: Date;
    location?: string;
    duration?: string;
    intensity?: number;
  };

  @Prop({ type: Array, default: [] })
  tags: string[];

  @Prop({ type: Object })
  aiInsights?: {
    summary?: string;
    recommendations?: string[];
    riskFactors?: string[];
    keywords?: string[];
    sentiment?: 'positive' | 'negative' | 'neutral';
  };

  @Prop({ type: Array, default: [] })
  attachments: Array<{
    filename: string;
    url: string;
    type: string;
    size: number;
  }>;

  @Prop({ default: 'draft' })
  status: 'draft' | 'published' | 'archived';

  @Prop({ type: Number, default: 0 })
  wordCount: number;

  @Prop({ type: Date })
  lastModifiedAt?: Date;
}

export const WellnessDocumentSchema =
  SchemaFactory.createForClass(WellnessDocument);
