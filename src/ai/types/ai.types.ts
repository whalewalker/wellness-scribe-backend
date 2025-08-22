export interface UserContext {
  userId?: string;
  wellnessGoals?: string[];
  healthConditions?: string[];
  medications?: string[];
  lifestyle?: string;
  recentSymptoms?: string[];
  moodHistory?: Array<{ date: Date; mood: string; intensity: number }>;
  sleepPatterns?: Array<{ date: Date; hours: number; quality: number }>;
  activityLevel?: Array<{ date: Date; type: string; duration: number }>;
  preferences?: {
    communicationStyle?: 'professional' | 'friendly' | 'direct';
    focusAreas?: string[];
    previousTopics?: string[];
  };
}

export interface MistralResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ChatResponse {
  content: string;
  usage: { total_tokens: number };
  model: string;
  sources: string[];
  confidence: number;
  memory: {
    topics: string[];
    sentiment: string;
    followUpQuestions: string[];
  };
}

export interface WellnessInsights {
  summary: string;
  recommendations: string[];
  riskFactors: string[];
  keywords: string[];
  sentiment: string;
}

export interface ConversationHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}
