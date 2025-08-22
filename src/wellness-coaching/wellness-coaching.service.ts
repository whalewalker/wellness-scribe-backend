import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  WellnessGoal,
  WellnessGoalDocument,
} from '../schemas/wellness-goal.schema';
import { AiService } from '../ai/ai.service';
import { RAGService } from '../rag/services/rag.service';
import { UserContext } from '../ai/types/ai.types';
import {
  CreateGoalDto,
  UpdateGoalDto,
  AddProgressEntryDto,
  CreateMilestoneDto,
  GoalSuggestionRequestDto,
} from '../dto/wellness-coaching.dto';

export interface GoalSuggestion {
  title: string;
  description: string;
  category: string;
  smartCriteria: {
    specific: string;
    measurable: string;
    achievable: string;
    relevant: string;
    timeBound: string;
  };
  targetValue: number;
  unit: string;
  suggestedDuration: number; // weeks
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  benefits: string[];
  prerequisites: string[];
  aiReasoning: string;
}

export interface AdaptiveAdjustment {
  type: 'timeline' | 'target' | 'approach' | 'milestone';
  suggestion: string;
  reasoning: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
}

@Injectable()
export class WellnessCoachingService {
  private readonly logger = new Logger(WellnessCoachingService.name);

  constructor(
    @InjectModel(WellnessGoal.name)
    private goalModel: Model<WellnessGoalDocument>,
    private readonly aiService: AiService,
    private readonly ragService: RAGService,
  ) {}

  async createGoal(
    userId: string,
    createGoalDto: CreateGoalDto,
  ): Promise<WellnessGoalDocument> {
    try {
      this.logger.log(
        `Creating new goal for user ${userId}: ${createGoalDto.title}`,
      );

      // Validate dates
      if (createGoalDto.startDate >= createGoalDto.targetDate) {
        throw new BadRequestException('Target date must be after start date');
      }

      // Validate unit field
      if (!createGoalDto.unit || createGoalDto.unit.trim() === '') {
        throw new BadRequestException(
          'Unit of measurement is required and cannot be empty',
        );
      }

      // Generate initial AI insights
      const aiInsights = await this.generateGoalInsights(createGoalDto, userId);

      const goal = new this.goalModel({
        ...createGoalDto,
        userId: new Types.ObjectId(userId),
        aiInsights,
        status: 'active',
      });

      const savedGoal = await goal.save();
      this.logger.log(`Goal created successfully with ID: ${savedGoal._id}`);

      return savedGoal;
    } catch (error) {
      this.logger.error(`Error creating goal for user ${userId}:`, error);
      throw error;
    }
  }

  async updateGoal(
    goalId: string,
    userId: string,
    updateGoalDto: UpdateGoalDto,
  ): Promise<WellnessGoalDocument> {
    const goal = await this.goalModel.findOne({
      _id: goalId,
      userId: new Types.ObjectId(userId),
    });

    if (!goal) {
      throw new NotFoundException(`Goal with ID ${goalId} not found`);
    }

    // Validate unit field if it's being updated
    if (
      updateGoalDto.unit !== undefined &&
      (!updateGoalDto.unit || updateGoalDto.unit.trim() === '')
    ) {
      throw new BadRequestException('Unit of measurement cannot be empty');
    }

    // Check if significant changes were made that require AI re-evaluation
    const significantChanges = ['targetValue', 'targetDate', 'category'].some(
      (field) => updateGoalDto[field] !== undefined,
    );

    if (significantChanges) {
      const adaptiveAdjustment = {
        date: new Date(),
        type: 'goal_update',
        originalValue: {
          targetValue: goal.targetValue,
          targetDate: goal.targetDate,
        },
        newValue: {
          targetValue: updateGoalDto.targetValue || goal.targetValue,
          targetDate: updateGoalDto.targetDate || goal.targetDate,
        },
        reason: 'User-initiated goal modification',
      };

      goal.aiInsights = goal.aiInsights || {
        suggestions: [],
        predictions: { likelihood: 0, timeframe: '', factors: [] },
        adaptiveAdjustments: [],
      };
      const safeAdaptiveAdjustment = {
        ...adaptiveAdjustment,
        originalValue: JSON.stringify(adaptiveAdjustment.originalValue),
        newValue: JSON.stringify(adaptiveAdjustment.newValue),
      };
      goal.aiInsights.adaptiveAdjustments.push(safeAdaptiveAdjustment);
    }

    Object.assign(goal, updateGoalDto);
    return await goal.save();
  }

  async addProgressEntry(
    goalId: string,
    userId: string,
    progressDto: AddProgressEntryDto,
  ): Promise<WellnessGoalDocument> {
    const goal = await this.goalModel.findOne({
      _id: goalId,
      userId: new Types.ObjectId(userId),
    });

    if (!goal) {
      throw new NotFoundException(`Goal with ID ${goalId} not found`);
    }

    const progressEntry = {
      id: new Types.ObjectId().toString(),
      ...progressDto,
    };

    goal.progressEntries.push(progressEntry);
    goal.currentValue = progressDto.value;

    // Check for milestone completions
    this.checkMilestoneCompletions(goal);

    // Generate adaptive suggestions based on progress
    const adaptiveSuggestions = await this.generateAdaptiveSuggestions(goal);

    if (adaptiveSuggestions.length > 0) {
      goal.aiInsights = goal.aiInsights || {
        suggestions: [],
        predictions: { likelihood: 0, timeframe: '', factors: [] },
        adaptiveAdjustments: [],
      };
      goal.aiInsights.suggestions = adaptiveSuggestions;
    }

    // Check if goal is completed
    if (goal.currentValue >= goal.targetValue && goal.status === 'active') {
      goal.status = 'completed';
      goal.completedAt = new Date();
      this.logger.log(`Goal ${goalId} completed by user ${userId}`);
    }

    return await goal.save();
  }

  async addMilestone(
    goalId: string,
    userId: string,
    milestoneDto: CreateMilestoneDto,
  ): Promise<WellnessGoalDocument> {
    const goal = await this.goalModel.findOne({
      _id: goalId,
      userId: new Types.ObjectId(userId),
    });

    if (!goal) {
      throw new NotFoundException(`Goal with ID ${goalId} not found`);
    }

    const milestone = {
      id: new Types.ObjectId().toString(),
      ...milestoneDto,
      completed: false,
    };

    goal.milestones.push(milestone);
    return await goal.save();
  }

  async generateSmartGoalSuggestions(
    userId: string,
    requestDto: GoalSuggestionRequestDto,
  ): Promise<GoalSuggestion[]> {
    try {
      this.logger.log(`Generating SMART goal suggestions for user ${userId}`);

      // Get user context from RAG
      const userContext = await this.getUserContext(userId);

      // Build AI prompt for goal suggestions
      const prompt = this.buildGoalSuggestionPrompt(requestDto, userContext);

      // Get AI response
      const aiResponse = await this.aiService.generateChatResponse(
        prompt,
        [],
        userContext,
      );

      // Parse AI response into structured goal suggestions
      const suggestions = this.parseGoalSuggestions(aiResponse.content);

      this.logger.log(
        `Generated ${suggestions.length} goal suggestions for user ${userId}`,
      );
      return suggestions;
    } catch (error) {
      this.logger.error(
        `Error generating goal suggestions for user ${userId}:`,
        error,
      );

      // Return fallback suggestions
      return this.getFallbackGoalSuggestions(requestDto);
    }
  }

  async getUserGoals(
    userId: string,
    status?: string,
    category?: string,
  ): Promise<WellnessGoalDocument[]> {
    const filter: Record<string, any> = { userId: new Types.ObjectId(userId) };

    if (status) filter.status = status;
    if (category) filter.category = category;

    return await this.goalModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async getGoalById(
    goalId: string,
    userId: string,
  ): Promise<WellnessGoalDocument> {
    const goal = await this.goalModel.findOne({
      _id: goalId,
      userId: new Types.ObjectId(userId),
    });

    if (!goal) {
      throw new NotFoundException(`Goal with ID ${goalId} not found`);
    }

    return goal;
  }

  async deleteGoal(goalId: string, userId: string): Promise<void> {
    const result = await this.goalModel.deleteOne({
      _id: goalId,
      userId: new Types.ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Goal with ID ${goalId} not found`);
    }
  }

  private async generateGoalInsights(
    goalDto: CreateGoalDto,
    userId: string,
  ): Promise<{
    suggestions: string[];
    predictions: { likelihood: number; timeframe: string; factors: string[] };
  }> {
    try {
      const userContext = await this.getUserContext(userId);

      const prompt = `
        Analyze this wellness goal and provide insights:
        
        Goal: ${goalDto.title}
        Description: ${goalDto.description}
        Category: ${goalDto.category}
        Target: ${goalDto.targetValue} ${goalDto.unit}
        Timeline: ${goalDto.startDate} to ${goalDto.targetDate}
        
        SMART Criteria:
        - Specific: ${goalDto.smartCriteria.specific}
        - Measurable: ${goalDto.smartCriteria.measurable}
        - Achievable: ${goalDto.smartCriteria.achievable}
        - Relevant: ${goalDto.smartCriteria.relevant}
        - Time-bound: ${goalDto.smartCriteria.timeBound}
        
        Please provide:
        1. 3-5 actionable suggestions for achieving this goal
        2. Success probability assessment (0-1) with timeframe
        3. Key factors that will influence success
        
        Format as JSON with suggestions, predictions (likelihood, timeframe, factors).
      `;

      const response = await this.aiService.generateChatResponse(
        prompt,
        [],
        userContext,
      );

      return this.parseAiInsights(response.content);
    } catch (error) {
      this.logger.warn('Failed to generate AI insights, using defaults');
      return {
        suggestions: [
          'Break down the goal into smaller daily actions',
          'Track progress regularly and celebrate small wins',
          'Identify potential obstacles and plan solutions',
        ],
        predictions: {
          likelihood: 0.7,
          timeframe: 'Within target timeline',
          factors: ['consistency', 'motivation', 'external support'],
        },
      };
    }
  }

  private async generateAdaptiveSuggestions(
    goal: WellnessGoalDocument,
  ): Promise<string[]> {
    try {
      // Analyze progress pattern
      const recentEntries = goal.progressEntries.slice(-5);
      const progressRate = this.calculateProgressRate(recentEntries);
      const moodTrend = this.calculateMoodTrend(recentEntries);
      const confidenceTrend = this.calculateConfidenceTrend(recentEntries);

      const prompt = `
        Analyze this goal progress and provide adaptive suggestions:
        
        Goal: ${goal.title} (${goal.category})
        Target: ${goal.targetValue} ${goal.unit}
        Current: ${goal.currentValue} ${goal.unit}
        Progress Rate: ${progressRate}% per week
        Mood Trend: ${moodTrend}
        Confidence Trend: ${confidenceTrend}
        
        Recent challenges: ${recentEntries
          .map((e) => e.challenges)
          .flat()
          .join(', ')}
        
        Provide 3-5 specific, actionable suggestions to improve progress.
      `;

      const response = await this.aiService.generateChatResponse(prompt, []);
      return this.parseSuggestions(response.content);
    } catch (error) {
      this.logger.warn('Failed to generate adaptive suggestions');
      return [
        'Consider adjusting your daily routine to better accommodate this goal',
        "Review what's working well and do more of it",
        'Identify the biggest obstacle and create a specific plan to overcome it',
      ];
    }
  }

  private checkMilestoneCompletions(goal: WellnessGoalDocument): void {
    goal.milestones.forEach((milestone) => {
      if (!milestone.completed && goal.currentValue >= milestone.targetValue) {
        milestone.completed = true;
        milestone.completedAt = new Date();
        this.logger.log(
          `Milestone completed: ${milestone.title} for goal ${goal._id.toString()}`,
        );
      }
    });
  }

  private async getUserContext(userId: string): Promise<UserContext> {
    try {
      // Get user context from existing goals and wellness documents
      const existingGoals = await this.goalModel
        .find({ userId: new Types.ObjectId(userId) })
        .limit(10)
        .exec();

      return {
        userId,
        wellnessGoals: existingGoals.map((g) => g.title),
        preferences: {
          focusAreas: existingGoals.map((g) => g.category),
          previousTopics: existingGoals.map((g) => g.tags).flat(),
        },
      };
    } catch (error) {
      this.logger.warn('Failed to get user context, using defaults');
      return { userId };
    }
  }

  private buildGoalSuggestionPrompt(
    request: GoalSuggestionRequestDto,
    userContext: UserContext,
  ): string {
    return `
      Generate personalized SMART wellness goal suggestions based on:
      
      Categories of interest: ${request.categories.join(', ')}
      Health conditions: ${request.healthConditions?.join(', ') || 'None specified'}
      Fitness level: ${request.fitnessLevel || 'Not specified'}
      Available time per day: ${request.availableTimePerDay || 'Not specified'} minutes
      Preferred duration: ${request.preferredDuration || 'Not specified'} weeks
      
      User's current goals: ${userContext.wellnessGoals?.join(', ') || 'None'}
      
      For each suggestion, provide:
      1. Title and description
      2. Complete SMART criteria breakdown
      3. Specific target value and unit
      4. Suggested timeline
      5. Difficulty level
      6. Key benefits
      7. Prerequisites
      8. AI reasoning for the suggestion
      
      Generate 3-5 diverse, actionable goals that complement existing goals without overlap.
    `;
  }

  private parseGoalSuggestions(aiResponse: string): GoalSuggestion[] {
    try {
      // Try to parse structured response
      const parsed = JSON.parse(aiResponse);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (error) {
      // Fallback to text parsing
      this.logger.warn(
        'Failed to parse structured AI response, using fallback',
      );
    }

    // Return fallback suggestions
    return this.getFallbackGoalSuggestions({
      categories: ['physical_activity'],
      fitnessLevel: 'beginner',
    });
  }

  private getFallbackGoalSuggestions(
    request: GoalSuggestionRequestDto,
  ): GoalSuggestion[] {
    const suggestions: GoalSuggestion[] = [];

    if (request.categories.includes('physical_activity')) {
      suggestions.push({
        title: 'Daily Walking Goal',
        description:
          'Establish a consistent daily walking routine to improve cardiovascular health',
        category: 'physical_activity',
        smartCriteria: {
          specific: 'Walk for at least 30 minutes every day',
          measurable: 'Track daily walking time in minutes',
          achievable: 'Start with current fitness level and gradually increase',
          relevant: 'Improves cardiovascular health and mental wellbeing',
          timeBound: 'Achieve consistent 30-minute daily walks within 4 weeks',
        },
        targetValue: 30,
        unit: 'minutes',
        suggestedDuration: 4,
        difficulty: 'beginner',
        benefits: [
          'Improved cardiovascular health',
          'Better mood',
          'Weight management',
        ],
        prerequisites: ['Comfortable walking shoes', 'Safe walking route'],
        aiReasoning:
          'Walking is a low-impact, accessible form of exercise suitable for all fitness levels',
      });
    }

    return suggestions.slice(0, 3);
  }

  private parseAiInsights(content: string): {
    suggestions: string[];
    predictions: { likelihood: number; timeframe: string; factors: string[] };
  } {
    try {
      return JSON.parse(content);
    } catch {
      return {
        suggestions: [
          'Track your progress daily',
          'Set reminders for goal-related activities',
          'Celebrate small wins along the way',
        ],
        predictions: {
          likelihood: 0.75,
          timeframe: 'Within target timeline',
          factors: ['consistency', 'motivation'],
        },
      };
    }
  }

  private parseSuggestions(content: string): string[] {
    // Extract suggestions from AI response
    const lines = content.split('\n').filter((line) => line.trim().length > 0);
    return lines
      .slice(0, 5)
      .map((line) => line.replace(/^\d+\.\s*/, '').trim());
  }

  private calculateProgressRate(
    entries: Array<{
      value: number;
      date: Date;
      mood?: number;
      confidence?: number;
    }>,
  ): number {
    if (entries.length < 2) return 0;

    const firstEntry = entries[0];
    const lastEntry = entries[entries.length - 1];
    const timeDiff =
      (lastEntry.date.getTime() - firstEntry.date.getTime()) /
      (1000 * 60 * 60 * 24 * 7); // weeks
    const progressDiff = lastEntry.value - firstEntry.value;

    return timeDiff > 0 ? progressDiff / timeDiff : 0;
  }

  private calculateMoodTrend(entries: Array<{ mood?: number }>): string {
    const moodEntries = entries.filter((e) => e.mood !== undefined);
    if (moodEntries.length < 2) return 'stable';

    const recentMood =
      moodEntries.slice(-3).reduce((sum, e) => sum + (e.mood ?? 0), 0) /
      Math.min(3, moodEntries.length);
    const olderMood =
      moodEntries.slice(0, 3).reduce((sum, e) => sum + (e.mood ?? 0), 0) /
      Math.min(3, moodEntries.length);

    if (recentMood > olderMood + 0.5) return 'improving';
    if (recentMood < olderMood - 0.5) return 'declining';
    return 'stable';
  }

  private calculateConfidenceTrend(
    entries: Array<{ confidence?: number }>,
  ): string {
    const confidenceEntries = entries.filter((e) => e.confidence !== undefined);
    if (confidenceEntries.length < 2) return 'stable';

    const recent =
      confidenceEntries.slice(-3).reduce((sum, e) => sum + (e.confidence ?? 0), 0) /
      Math.min(3, confidenceEntries.length);
    const older =
      confidenceEntries.slice(0, 3).reduce((sum, e) => sum + (e.confidence ?? 0), 0) /
      Math.min(3, confidenceEntries.length);

    if (recent > older + 0.5) return 'increasing';
    if (recent < older - 0.5) return 'decreasing';
    return 'stable';
  }
}
