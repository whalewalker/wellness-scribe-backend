import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export interface WellnessReportDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    goalsCompleted: number;
    goalsInProgress: number;
    goalsOverdue: number;
    totalProgressPoints: number;
    averageConfidence: number;
    averageMood: number;
    consistencyScore: number;
    improvementRate: number;
  };
  insights: {
    achievements: string[];
    challenges: string[];
    patterns: string[];
    recommendations: string[];
    aiSummary: string;
  };
  categoryBreakdown: Array<{
    category: string;
    goalsCount: number;
    completionRate: number;
    averageProgress: number;
    trends: string[];
  }>;
  celebrations: Array<{
    type: string;
    title: string;
    description: string;
    date: Date;
    goalId?: Types.ObjectId;
  }>;
  generatedAt: Date;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Schema({ timestamps: true, collection: 'wellness_reports' })
export class WellnessReport {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['weekly', 'monthly', 'quarterly', 'annual', 'custom'],
  })
  type: string;

  @Prop({ type: Object, required: true })
  period: {
    start: Date;
    end: Date;
  };

  @Prop({ type: Object, required: true })
  metrics: {
    goalsCompleted: number;
    goalsInProgress: number;
    goalsOverdue: number;
    totalProgressPoints: number;
    averageConfidence: number;
    averageMood: number;
    consistencyScore: number; // 0-100
    improvementRate: number; // percentage
  };

  @Prop({ type: Object, required: true })
  insights: {
    achievements: string[];
    challenges: string[];
    patterns: string[];
    recommendations: string[];
    aiSummary: string;
  };

  @Prop({ type: Array, default: [] })
  categoryBreakdown: Array<{
    category: string;
    goalsCount: number;
    completionRate: number; // 0-100
    averageProgress: number; // 0-100
    trends: string[];
  }>;

  @Prop({ type: Array, default: [] })
  celebrations: Array<{
    type: string; // 'milestone', 'goal_completion', 'streak', 'improvement'
    title: string;
    description: string;
    date: Date;
    goalId?: Types.ObjectId;
  }>;

  @Prop({ required: true, type: Date })
  generatedAt: Date;

  @Prop({ default: false })
  isPublic: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const WellnessReportSchema =
  SchemaFactory.createForClass(WellnessReport);

// Indexes for performance
WellnessReportSchema.index({ userId: 1, type: 1 });
WellnessReportSchema.index({ userId: 1, 'period.start': 1, 'period.end': 1 });
WellnessReportSchema.index({ userId: 1, generatedAt: -1 });
