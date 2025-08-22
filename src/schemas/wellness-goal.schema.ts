import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AdaptiveAdjustment } from '../types/common.types';

export interface WellnessGoalDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  description: string;
  category: string;
  priority: string;
  smartCriteria: {
    specific: string;
    measurable: string;
    achievable: string;
    relevant: string;
    timeBound: string;
  };
  targetValue: number;
  currentValue: number;
  unit: string;
  startDate: Date;
  targetDate: Date;
  status: string;
  milestones: Array<{
    id: string;
    title: string;
    description: string;
    targetValue: number;
    targetDate: Date;
    completed: boolean;
    completedAt?: Date;
    reward?: string;
  }>;
  progressEntries: Array<{
    id: string;
    value: number;
    date: Date;
    notes?: string;
    mood?: number;
    confidence?: number;
    challenges?: string[];
  }>;
  aiInsights: {
    suggestions: string[];
    predictions: {
      likelihood: number;
      timeframe: string;
      factors: string[];
    };
    adaptiveAdjustments: Array<{
      date: Date;
      type: string;
      originalValue: string | number | boolean;
      newValue: string | number | boolean;
      reason: string;
    }>;
  };
  tags: string[];
  isActive: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

@Schema({ timestamps: true, collection: 'wellness_goals' })
export class WellnessGoal {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({
    required: true,
    enum: [
      'physical_activity',
      'nutrition',
      'sleep',
      'mental_health',
      'stress_management',
      'weight_management',
      'medical_adherence',
      'habits',
      'mindfulness',
      'social_wellness',
      'preventive_care',
      'recovery',
    ],
  })
  category: string;

  @Prop({
    required: true,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  })
  priority: string;

  @Prop({ type: Object, required: true })
  smartCriteria: {
    specific: string;
    measurable: string;
    achievable: string;
    relevant: string;
    timeBound: string;
  };

  @Prop({ required: true })
  targetValue: number;

  @Prop({ default: 0 })
  currentValue: number;

  @Prop({ required: true })
  unit: string;

  @Prop({ required: true, type: Date })
  startDate: Date;

  @Prop({ required: true, type: Date })
  targetDate: Date;

  @Prop({
    enum: ['draft', 'active', 'paused', 'completed', 'abandoned'],
    default: 'draft',
  })
  status: string;

  @Prop({ type: Array, default: [] })
  milestones: Array<{
    id: string;
    title: string;
    description: string;
    targetValue: number;
    targetDate: Date;
    completed: boolean;
    completedAt?: Date;
    reward?: string;
  }>;

  @Prop({ type: Array, default: [] })
  progressEntries: Array<{
    id: string;
    value: number;
    date: Date;
    notes?: string;
    mood?: number; // 1-5 scale
    confidence?: number; // 1-5 scale
    challenges?: string[];
  }>;

  @Prop({ type: Object })
  aiInsights?: {
    suggestions: string[];
    predictions: {
      likelihood: number; // 0-1 probability
      timeframe: string;
      factors: string[];
    };
    adaptiveAdjustments: Array<{
      date: Date;
      type: string;
      originalValue: string | number | boolean;
      newValue: string | number | boolean;
      reason: string;
    }>;
  };

  @Prop({ type: Array, default: [] })
  tags: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date })
  completedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const WellnessGoalSchema = SchemaFactory.createForClass(WellnessGoal);

// Indexes for performance
WellnessGoalSchema.index({ userId: 1, status: 1 });
WellnessGoalSchema.index({ userId: 1, category: 1 });
WellnessGoalSchema.index({ userId: 1, targetDate: 1 });
WellnessGoalSchema.index({ userId: 1, priority: 1 });
