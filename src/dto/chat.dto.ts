import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({
    description: 'Message content',
    example: 'What should I do to improve my energy levels?',
    type: String,
  })
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description:
      'Chat ID to continue existing conversation. If not provided, a new chat will be created.',
    example: '507f1f77bcf86cd799439012',
    type: String,
  })
  @IsOptional()
  @IsString()
  chatId?: string;

  @ApiPropertyOptional({
    description:
      'Tags for categorizing the chat (only used when creating a new chat)',
    example: ['fatigue', 'wellness'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional({
    description:
      'User context for personalized responses (only used when creating a new chat)',
    example: {
      wellnessGoals: ['better sleep', 'more energy'],
      healthConditions: ['diabetes'],
      medications: ['metformin'],
      lifestyle: 'sedentary',
    },
  })
  @IsOptional()
  context?: {
    wellnessGoals?: string[];
    healthConditions?: string[];
    medications?: string[];
    lifestyle?: string;
  };
}

export class UpdateChatDto {
  @ApiPropertyOptional({
    description: 'Chat title',
    example: 'Updated Chat Title',
    type: String,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Tags for categorizing the chat',
    example: ['fatigue', 'wellness', 'energy'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Chat status',
    example: 'active',
    enum: ['active', 'archived', 'deleted'],
  })
  @IsOptional()
  @IsEnum(['active', 'archived', 'deleted'])
  status?: 'active' | 'archived' | 'deleted';
}

// Response DTOs
export class MessageDto {
  @ApiProperty({
    description: 'Message role',
    example: 'user',
    enum: ['user', 'assistant', 'system'],
  })
  role: 'user' | 'assistant' | 'system';

  @ApiProperty({
    description: 'Message content',
    example: "I'm feeling tired today",
  })
  content: string;

  @ApiProperty({
    description: 'Message timestamp',
    example: '2024-01-01T12:00:00.000Z',
  })
  timestamp: Date;

  @ApiPropertyOptional({
    description: 'Message metadata',
    example: {
      tokens: 150,
      model: 'wellness-scribe-fallback',
      processingTime: 1000,
    },
  })
  metadata?: {
    tokens?: number;
    model?: string;
    processingTime?: number;
  };
}

export class ChatContextDto {
  @ApiPropertyOptional({
    description: 'Wellness goals',
    example: ['better sleep', 'more energy'],
    type: [String],
  })
  wellnessGoals?: string[];

  @ApiPropertyOptional({
    description: 'Health conditions',
    example: ['diabetes'],
    type: [String],
  })
  healthConditions?: string[];

  @ApiPropertyOptional({
    description: 'Current medications',
    example: ['metformin'],
    type: [String],
  })
  medications?: string[];

  @ApiPropertyOptional({
    description: 'Lifestyle information',
    example: 'sedentary',
  })
  lifestyle?: string;
}

export class ChatResponseDto {
  @ApiProperty({
    description: 'Chat ID',
    example: '507f1f77bcf86cd799439012',
  })
  id: string;

  @ApiProperty({
    description: 'Chat title',
    example: 'My Wellness Chat',
  })
  title: string;

  @ApiProperty({
    description: 'Chat messages',
    type: [MessageDto],
  })
  messages: MessageDto[];

  @ApiPropertyOptional({
    description: 'Chat context',
    type: ChatContextDto,
  })
  context?: ChatContextDto;

  @ApiProperty({
    description: 'Chat status',
    example: 'active',
    enum: ['active', 'archived', 'deleted'],
  })
  status: string;

  @ApiProperty({
    description: 'Chat tags',
    example: ['fatigue', 'wellness'],
    type: [String],
  })
  tags: string[];

  @ApiPropertyOptional({
    description: 'Chat summary',
    example: 'Discussion about fatigue and energy improvement strategies',
  })
  summary?: string;

  @ApiProperty({
    description: 'Total tokens used',
    example: 350,
  })
  totalTokens: number;

  @ApiProperty({
    description: 'Chat creation timestamp',
    example: '2024-01-01T12:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Chat last update timestamp',
    example: '2024-01-01T12:05:01.000Z',
  })
  updatedAt: Date;
}

export class ChatListResponseDto {
  @ApiProperty({
    description: 'Chat ID',
    example: '507f1f77bcf86cd799439012',
  })
  id: string;

  @ApiProperty({
    description: 'Chat title',
    example: 'My Wellness Chat',
  })
  title: string;

  @ApiProperty({
    description: 'Chat status',
    example: 'active',
  })
  status: string;

  @ApiProperty({
    description: 'Chat tags',
    example: ['fatigue', 'wellness'],
    type: [String],
  })
  tags: string[];

  @ApiPropertyOptional({
    description: 'Chat summary',
    example: 'Discussion about fatigue and energy improvement strategies',
  })
  summary?: string;

  @ApiProperty({
    description: 'Total tokens used',
    example: 350,
  })
  totalTokens: number;

  @ApiProperty({
    description: 'Chat creation timestamp',
    example: '2024-01-01T12:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Chat last update timestamp',
    example: '2024-01-01T12:05:01.000Z',
  })
  updatedAt: Date;
}

export class SummaryResponseDto {
  @ApiProperty({
    description: 'Generated chat summary',
    example:
      'This conversation focused on fatigue management and energy improvement strategies, including sleep hygiene, exercise recommendations, and dietary considerations for someone with diabetes.',
  })
  summary: string;
}

export class ChatMessageResponseDto {
  @ApiProperty({
    description: 'Response message',
    example: 'Chat deleted successfully',
  })
  message: string;
}

export class StopChatDto {
  @ApiProperty({
    description: 'Chat ID to stop',
    example: '507f1f77bcf86cd799439013',
  })
  @IsString()
  chatId: string;

  @ApiPropertyOptional({
    description: 'Reason for stopping the chat',
    example: 'User requested to stop',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class StopGenerationDto {
  @ApiProperty({
    description: 'Chat ID to stop generation for',
    example: '507f1f77bcf86cd799439013',
  })
  @IsString()
  chatId: string;
}
