export interface ChatMessage {
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
}

export interface ChatCacheData {
  messages: ChatMessage[];
  lastUpdated: Date;
  messageCount: number;
}

export interface ChatMetadata {
  title: string;
  status: 'active' | 'archived' | 'deleted';
  tags: string[];
  summary?: string;
  totalTokens: number;
  context?: {
    wellnessGoals?: string[];
    healthConditions?: string[];
    medications?: string[];
    lifestyle?: string;
  };
}
