import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WellnessDocumentsController } from './wellness-documents.controller';
import { WellnessDocumentsService } from './wellness-documents.service';
import {
  WellnessDocument,
  WellnessDocumentSchema,
} from '../schemas/wellness-document.schema';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WellnessDocument.name, schema: WellnessDocumentSchema },
    ]),
    AiModule,
  ],
  controllers: [WellnessDocumentsController],
  providers: [WellnessDocumentsService],
  exports: [WellnessDocumentsService],
})
export class WellnessDocumentsModule {}
