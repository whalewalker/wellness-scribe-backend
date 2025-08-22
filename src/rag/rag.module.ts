import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import {
  RAGWellnessDocument,
  RAGWellnessDocumentSchema,
} from './schemas/wellness-document.schema';
import {
  ConversationContext,
  ConversationContextSchema,
} from './schemas/conversation-context.schema';
import { RAGService } from './services/rag.service';
import { VectorSearchService } from './services/vector-search.service';
import { EmbeddingService } from './services/embedding.service';
import { CacheService } from './services/cache.service';
import { RAGController } from './rag.controller';
import { MistralApiService } from '../ai/services/mistral-api.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RAGWellnessDocument.name, schema: RAGWellnessDocumentSchema },
      { name: ConversationContext.name, schema: ConversationContextSchema },
    ]),
    HttpModule,
    ConfigModule,
  ],
  controllers: [RAGController],
  providers: [
    RAGService,
    VectorSearchService,
    EmbeddingService,
    CacheService,
    MistralApiService,
  ],
  exports: [RAGService],
})
export class RAGModule {}
