export interface AdaptiveAdjustment {
  date: Date;
  type: string;
  originalValue: string | number | boolean;
  newValue: string | number | boolean;
  reason: string;
}

import { Types } from 'mongoose';

export interface MongoQuery {
  [key: string]:
    | string
    | number
    | boolean
    | Date
    | RegExp
    | Types.ObjectId
    | MongoQuery
    | MongoQuery[]
    | {
        $in?: (string | number | Date | RegExp | Types.ObjectId)[];
        $gte?: string | number | Date;
        $lte?: string | number | Date;
        $or?: MongoQuery[];
        $regex?: string | RegExp;
        $options?: string;
      };
}

export interface DocumentFilters {
  type?: string;
  status?: string;
  tags?: string[];
}

export interface ChatMetadata {
  participantCount?: number;
  lastMessageTime?: Date;
  isGroup?: boolean;
  title?: string;
  description?: string;
  settings?: {
    notifications?: boolean;
    archived?: boolean;
  };
}

export interface ChatListItem {
  id: string;
  title: string;
  lastMessage?: string;
  lastMessageTime: Date;
  participantCount: number;
  unreadCount: number;
  isGroup: boolean;
}

export interface CacheFilters {
  type?: string;
  category?: string;
  userId?: string;
  timeRange?: {
    start: Date;
    end: Date;
  };
}

export interface ActionRecommendation {
  id: string;
  type: 'pattern_based' | 'prediction_based' | 'personalized';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  category?: string;
  timeframe?: string;
  requirements?: string[];
  benefits?: string[];
}

export interface RiskAssessment {
  immediate: string[];
  short_term: string[];
  long_term: string[];
  risk_factors: string[];
}

export interface OpportunityAnalysis {
  immediate: string[];
  short_term: string[];
  long_term: string[];
  optimization: string[];
}

export interface AnalysisResult {
  confidence: number;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
  insights?: string[];
  recommendations?: string[];
}

export interface PatternAnalysis extends AnalysisResult {
  peak_days?: string[];
  duration_weeks?: number;
  insights?: string[];
}

export interface CorrelationAnalysis extends AnalysisResult {
  coefficient: number;
  direction: 'positive' | 'negative';
  frequency: number;
}

export interface TriggerAnalysis extends AnalysisResult {
  consistency: number;
  primary_effect: string;
  frequency: number;
  delay_hours: number;
  effect_magnitude: 'low' | 'moderate' | 'high';
}

export interface DocumentUpdateData {
  title?: string;
  content?: string;
  type?: string;
  metadata?: Record<string, any>;
  tags?: string[];
  status?: string;
  wordCount?: number;
  lastModifiedAt: Date;
}

export interface JwtPayload {
  sub: string; // user ID
  email: string;
  iat: number;
  exp: number;
}

export interface UserProfile {
  id: string;
  age?: number;
  gender?: string;
  healthConditions?: string[];
  preferences?: {
    units?: 'metric' | 'imperial';
    language?: string;
    timezone?: string;
  };
  goals?: string[];
  interests?: string[];
}
