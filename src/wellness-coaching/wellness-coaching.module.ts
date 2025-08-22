import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  WellnessGoal,
  WellnessGoalSchema,
} from '../schemas/wellness-goal.schema';
import {
  WellnessReport,
  WellnessReportSchema,
} from '../schemas/wellness-report.schema';
import { WellnessCoachingController } from './wellness-coaching.controller';
import { WellnessCoachingService } from './wellness-coaching.service';
import { ProgressTrackingService } from './progress-tracking.service';
import { CelebrationService } from './celebration.service';
import { WellnessReportsService } from './wellness-reports.service';
import { AiModule } from '../ai/ai.module';
import { RAGModule } from '../rag/rag.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WellnessGoal.name, schema: WellnessGoalSchema },
      { name: WellnessReport.name, schema: WellnessReportSchema },
    ]),
    AiModule,
    RAGModule,
  ],
  controllers: [WellnessCoachingController],
  providers: [
    WellnessCoachingService,
    ProgressTrackingService,
    CelebrationService,
    WellnessReportsService,
  ],
  exports: [
    WellnessCoachingService,
    ProgressTrackingService,
    CelebrationService,
    WellnessReportsService,
  ],
})
export class WellnessCoachingModule {}
