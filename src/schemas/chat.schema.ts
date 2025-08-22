import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export interface ChatDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    metadata?: {
      tokens?: number;
      model?: string;
      processingTime?: number;
      action?: string;
      reason?: string;
      generationCancelled?: boolean;
    };
  }>;
  context?: {
    wellnessGoals?: string[];
    healthConditions?: string[];
    medications?: string[];
    lifestyle?: string;
  };
  status: 'active' | 'archived' | 'deleted';
  tags: string[];
  summary?: string;
  totalTokens: number;
  createdAt: Date;
  updatedAt: Date;
}

@Schema({ timestamps: true, collection: 'chats' })
export class Chat {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ type: Array, default: [] })
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    metadata?: {
      tokens?: number;
      model?: string;
      processingTime?: number;
      action?: string;
      reason?: string;
      generationCancelled?: boolean;
    };
  }>;

  @Prop({ type: Object })
  context?: {
    wellnessGoals?: string[];
    healthConditions?: string[];
    medications?: string[];
    lifestyle?: string;
  };

  @Prop({ default: 'active' })
  status: 'active' | 'archived' | 'deleted';

  @Prop({ type: Array, default: [] })
  tags: string[];

  @Prop()
  summary?: string;

  @Prop({ type: Number, default: 0 })
  totalTokens: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ChatSchema = SchemaFactory.createForClass(Chat);
