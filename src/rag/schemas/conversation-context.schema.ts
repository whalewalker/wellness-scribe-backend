import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ConversationContextDocument = ConversationContext & Document;

@Schema({ timestamps: true, collection: 'conversation_messages' })
export class ConversationMessage {
  @Prop({ required: true, enum: ['user', 'assistant', 'system'] })
  role: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true, default: Date.now })
  timestamp: Date;

  @Prop({
    type: {
      topics: [String],
      sentiment: String,
      confidence: Number,
    },
    default: {},
  })
  metadata?: {
    topics?: string[];
    sentiment?: string;
    confidence?: number;
  };
}

@Schema({ timestamps: true, collection: 'conversation_contexts' })
export class ConversationContext {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, unique: true })
  sessionId: string;

  @Prop({ type: [ConversationMessage], default: [] })
  messages: ConversationMessage[];

  @Prop({
    type: {
      healthConditions: [String],
      medications: [String],
      wellnessGoals: [String],
      recentTopics: [String],
      communicationStyle: {
        type: String,
        enum: ['professional', 'friendly', 'direct'],
        default: 'professional',
      },
    },
    default: {},
  })
  context: {
    healthConditions?: string[];
    medications?: string[];
    wellnessGoals?: string[];
    recentTopics?: string[];
    communicationStyle?: 'professional' | 'friendly' | 'direct';
  };

  @Prop({ required: true, default: Date.now })
  lastUpdated: Date;

  @Prop({ type: Number, default: 0 })
  messageCount: number;

  @Prop({ type: Date, default: Date.now })
  created_at: Date;

  @Prop({ type: Date, default: Date.now })
  updated_at: Date;
}

export const ConversationContextSchema =
  SchemaFactory.createForClass(ConversationContext);

// Create indexes for efficient querying
ConversationContextSchema.index({ userId: 1, lastUpdated: -1 });
ConversationContextSchema.index({ sessionId: 1 });
ConversationContextSchema.index({ 'context.healthConditions': 1 });
ConversationContextSchema.index({ 'context.medications': 1 });
