import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AiService } from './ai.service';
import { MistralApiService } from './services/mistral-api.service';
import { RAGModule } from '../rag/rag.module';

@Module({
  imports: [HttpModule, ConfigModule, RAGModule],
  providers: [AiService, MistralApiService],
  exports: [AiService],
})
export class AiModule {}
