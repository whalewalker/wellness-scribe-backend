import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { Chat, ChatSchema } from '../schemas/chat.schema';
import {
  ConversationContext,
  ConversationContextSchema,
} from '../rag/schemas/conversation-context.schema';
import { AiModule } from '../ai/ai.module';
import { ChatCacheService } from './services/chat-cache.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Chat.name, schema: ChatSchema },
      { name: ConversationContext.name, schema: ConversationContextSchema },
    ]),
    CacheModule.register(),
    AiModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatCacheService],
  exports: [ChatService],
})
export class ChatModule {}
