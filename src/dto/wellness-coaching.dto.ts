import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  IsBoolean,
  IsDate,
  IsNotEmpty,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SmartCriteriaDto {
  @ApiProperty({ description: 'Specific goal description' })
  @IsString()
  specific: string;

  @ApiProperty({ description: 'How the goal will be measured' })
  @IsString()
  measurable: string;

  @ApiProperty({ description: 'Why this goal is achievable' })
  @IsString()
  achievable: string;

  @ApiProperty({ description: 'Why this goal is relevant' })
  @IsString()
  relevant: string;

  @ApiProperty({ description: 'Time-bound constraints' })
  @IsString()
  timeBound: string;
}

export class CreateGoalDto {
  @ApiProperty({ description: 'Goal title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Detailed goal description' })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Goal category',
    enum: [
      'physical_activity',
      'nutrition',
      'sleep',
      'mental_health',
      'stress_management',
      'weight_management',
      'medical_adherence',
      'habits',
      'mindfulness',
      'social_wellness',
      'preventive_care',
      'recovery',
    ],
  })
  @IsEnum([
    'physical_activity',
    'nutrition',
    'sleep',
    'mental_health',
    'stress_management',
    'weight_management',
    'medical_adherence',
    'habits',
    'mindfulness',
    'social_wellness',
    'preventive_care',
    'recovery',
  ])
  category: string;

  @ApiProperty({
    description: 'Goal priority',
    enum: ['low', 'medium', 'high', 'critical'],
  })
  @IsEnum(['low', 'medium', 'high', 'critical'])
  priority: string;

  @ApiProperty({ description: 'SMART criteria breakdown' })
  @ValidateNested()
  @Type(() => SmartCriteriaDto)
  smartCriteria: SmartCriteriaDto;

  @ApiProperty({ description: 'Target value to achieve' })
  @IsNumber()
  @Min(0)
  targetValue: number;

  @ApiProperty({ description: 'Unit of measurement' })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiProperty({ description: 'Goal start date' })
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @ApiProperty({ description: 'Target completion date' })
  @IsDate()
  @Type(() => Date)
  targetDate: Date;

  @ApiPropertyOptional({ description: 'Goal tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateGoalDto {
  @ApiPropertyOptional({ description: 'Goal title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Goal description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Goal priority' })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  priority?: string;

  @ApiPropertyOptional({ description: 'Target value' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  targetValue?: number;

  @ApiPropertyOptional({ description: 'Unit of measurement' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  unit?: string;

  @ApiPropertyOptional({ description: 'Target completion date' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  targetDate?: Date;

  @ApiPropertyOptional({ description: 'Goal status' })
  @IsOptional()
  @IsEnum(['draft', 'active', 'paused', 'completed', 'abandoned'])
  status?: string;

  @ApiPropertyOptional({ description: 'Goal tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class AddProgressEntryDto {
  @ApiProperty({ description: 'Progress value' })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiProperty({ description: 'Progress entry date' })
  @IsDate()
  @Type(() => Date)
  date: Date;

  @ApiPropertyOptional({ description: 'Progress notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Mood rating (1-5)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  mood?: number;

  @ApiPropertyOptional({ description: 'Confidence rating (1-5)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  confidence?: number;

  @ApiPropertyOptional({ description: 'Challenges faced' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  challenges?: string[];
}

export class CreateMilestoneDto {
  @ApiProperty({ description: 'Milestone title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Milestone description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Target value for milestone' })
  @IsNumber()
  @Min(0)
  targetValue: number;

  @ApiProperty({ description: 'Target date for milestone' })
  @IsDate()
  @Type(() => Date)
  targetDate: Date;

  @ApiPropertyOptional({ description: 'Reward for completing milestone' })
  @IsOptional()
  @IsString()
  reward?: string;
}

export class GoalSuggestionRequestDto {
  @ApiProperty({ description: 'Areas of interest for goal suggestions' })
  @IsArray()
  @IsString({ each: true })
  categories: string[];

  @ApiPropertyOptional({ description: 'Current health conditions' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  healthConditions?: string[];

  @ApiPropertyOptional({ description: 'Current fitness level' })
  @IsOptional()
  @IsEnum(['beginner', 'intermediate', 'advanced'])
  fitnessLevel?: string;

  @ApiPropertyOptional({ description: 'Available time per day (minutes)' })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(1440)
  availableTimePerDay?: number;

  @ApiPropertyOptional({ description: 'Preferred goal duration (weeks)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(52)
  preferredDuration?: number;
}

export class GenerateReportDto {
  @ApiProperty({
    description: 'Report type',
    enum: ['weekly', 'monthly', 'quarterly', 'annual', 'custom'],
  })
  @IsEnum(['weekly', 'monthly', 'quarterly', 'annual', 'custom'])
  type: string;

  @ApiPropertyOptional({
    description: 'Custom start date (for custom reports)',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiPropertyOptional({ description: 'Custom end date (for custom reports)' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @ApiPropertyOptional({ description: 'Include AI insights' })
  @IsOptional()
  @IsBoolean()
  includeAiInsights?: boolean;

  @ApiPropertyOptional({ description: 'Categories to include in report' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];
}

export class DashboardFilterDto {
  @ApiPropertyOptional({ description: 'Filter by goal status' })
  @IsOptional()
  @IsArray()
  @IsEnum(['draft', 'active', 'paused', 'completed', 'abandoned'], {
    each: true,
  })
  statuses?: string[];

  @ApiPropertyOptional({ description: 'Filter by categories' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ description: 'Filter by priority' })
  @IsOptional()
  @IsArray()
  @IsEnum(['low', 'medium', 'high', 'critical'], { each: true })
  priorities?: string[];

  @ApiPropertyOptional({ description: 'Date range start' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiPropertyOptional({ description: 'Date range end' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;
}
