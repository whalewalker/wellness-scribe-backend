import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  WellnessGoal,
  WellnessGoalDocument,
} from '../schemas/wellness-goal.schema';
import { AiService } from '../ai/ai.service';

export interface Celebration {
  id: string;
  type:
    | 'milestone'
    | 'goal_completion'
    | 'streak'
    | 'improvement'
    | 'consistency';
  title: string;
  message: string;
  achievement: string;
  goalId: string;
  date: Date;
  personalizedMessage: string;
  encouragementLevel: 'gentle' | 'enthusiastic' | 'motivational';
  rewards: {
    badges: string[];
    points: number;
    suggestions: string[];
  };
  shareableContent?: {
    text: string;
    hashtags: string[];
    image?: string;
  };
}

export interface AdaptiveAdjustment {
  id: string;
  goalId: string;
  type: 'timeline' | 'target' | 'approach' | 'frequency' | 'milestone';
  suggestion: string;
  reasoning: string;
  confidence: number; // 0-1
  impact: 'low' | 'medium' | 'high';
  urgency: 'optional' | 'recommended' | 'important' | 'critical';
  implementation: {
    difficulty: 'easy' | 'moderate' | 'challenging';
    timeRequired: string;
    steps: string[];
  };
  aiAnalysis: {
    successProbability: number;
    riskFactors: string[];
    benefits: string[];
  };
  userFeedback?: {
    accepted: boolean;
    rating?: number;
    comments?: string;
    appliedDate?: Date;
  };
}

interface ProgressEntry {
  id: string;
  value: number;
  date: Date;
  notes?: string;
  mood?: number;
  confidence?: number;
  challenges?: string[];
}

interface ProgressAnalysis {
  progressRate: number;
  consistency: number;
  trendDirection: 'up' | 'down' | 'stable';
  timeOnTrack: boolean;
  moodPattern: { average: number; trend: string };
  confidencePattern: { average: number; trend: string };
  challengeFrequency: { top3: string[]; total: number };
}

@Injectable()
export class CelebrationService {
  private readonly logger = new Logger(CelebrationService.name);

  constructor(
    @InjectModel(WellnessGoal.name)
    private goalModel: Model<WellnessGoalDocument>,
    private readonly aiService: AiService,
  ) {}

  async createCelebration(
    userId: string,
    goalId: string,
    type: Celebration['type'],
    achievement: string,
  ): Promise<Celebration> {
    try {
      this.logger.log(
        `Creating celebration for user ${userId}, goal ${goalId}, type ${type}`,
      );

      const goal = await this.goalModel.findOne({
        _id: goalId,
        userId: new Types.ObjectId(userId),
      });

      if (!goal) {
        throw new Error(`Goal ${goalId} not found for user ${userId}`);
      }

      const personalizedMessage = await this.generatePersonalizedMessage(
        goal,
        type,
        achievement,
      );

      const rewards = this.generateRewards(goal, type);
      const shareableContent = this.generateShareableContent(
        goal,
        achievement,
        type,
      );

      const celebration: Celebration = {
        id: new Types.ObjectId().toString(),
        type,
        title: this.getCelebrationTitle(type),
        message: this.getCelebrationMessage(type, achievement),
        achievement,
        goalId,
        date: new Date(),
        personalizedMessage,
        encouragementLevel: this.determineEncouragementLevel(goal, type),
        rewards,
        shareableContent,
      };

      await this.storeCelebration(goal, celebration);

      this.logger.log(`Celebration created successfully: ${celebration.id}`);
      return celebration;
    } catch (error) {
      this.logger.error(`Error creating celebration:`, error);
      throw error;
    }
  }

  async detectAndCelebrateMilestones(
    userId: string,
    goalId: string,
  ): Promise<Celebration[]> {
    const goal = await this.goalModel.findOne({
      _id: goalId,
      userId: new Types.ObjectId(userId),
    });

    if (!goal) return [];

    const celebrations: Celebration[] = [];
    const now = new Date();

    // Check for newly completed milestones
    const newlyCompletedMilestones =
      goal.milestones?.filter(
        (milestone) =>
          milestone.completed &&
          milestone.completedAt &&
          now.getTime() - milestone.completedAt.getTime() < 24 * 60 * 60 * 1000, // Last 24 hours
      ) || [];

    for (const milestone of newlyCompletedMilestones) {
      const celebration = await this.createCelebration(
        userId,
        goalId,
        'milestone',
        `Completed milestone: ${milestone.title}`,
      );
      celebrations.push(celebration);
    }

    // Check for goal completion
    if (
      goal.status === 'completed' &&
      goal.completedAt &&
      now.getTime() - goal.completedAt.getTime() < 24 * 60 * 60 * 1000
    ) {
      const celebration = await this.createCelebration(
        userId,
        goalId,
        'goal_completion',
        `Completed goal: ${goal.title}`,
      );
      celebrations.push(celebration);
    }

    // Check for consistency streaks
    const streak = this.calculateGoalStreak(goal);
    if (streak >= 7 && streak % 7 === 0) {
      // Weekly streak milestones
      const celebration = await this.createCelebration(
        userId,
        goalId,
        'streak',
        `${streak}-day consistency streak`,
      );
      celebrations.push(celebration);
    }

    // Check for significant improvements
    const improvement = this.detectSignificantImprovement(goal);
    if (improvement) {
      const celebration = await this.createCelebration(
        userId,
        goalId,
        'improvement',
        improvement,
      );
      celebrations.push(celebration);
    }

    return celebrations;
  }

  async generateAdaptiveAdjustments(
    userId: string,
    goalId: string,
  ): Promise<AdaptiveAdjustment[]> {
    try {
      this.logger.log(`Generating adaptive adjustments for goal ${goalId}`);

      const goal = await this.goalModel.findOne({
        _id: goalId,
        userId: new Types.ObjectId(userId),
      });

      if (!goal) {
        throw new Error(`Goal ${goalId} not found for user ${userId}`);
      }

      const adjustments: AdaptiveAdjustment[] = [];

      // Analyze progress patterns
      const progressAnalysis = this.analyzeProgressPatterns(goal);

      // Generate timeline adjustments
      const timelineAdjustments = this.generateTimelineAdjustments(
        goal,
        progressAnalysis,
      );
      adjustments.push(...timelineAdjustments);

      // Generate target adjustments
      const targetAdjustments = this.generateTargetAdjustments(
        goal,
        progressAnalysis,
      );
      adjustments.push(...targetAdjustments);

      // Generate approach adjustments
      const approachAdjustments = await this.generateApproachAdjustments(
        goal,
        progressAnalysis,
      );
      adjustments.push(...approachAdjustments);

      // Generate milestone adjustments
      const milestoneAdjustments = this.generateMilestoneAdjustments(goal);
      adjustments.push(...milestoneAdjustments);

      // Sort by confidence and impact
      return adjustments.sort((a, b) => {
        const scoreA = a.confidence * this.getImpactScore(a.impact);
        const scoreB = b.confidence * this.getImpactScore(b.impact);
        return scoreB - scoreA;
      });
    } catch (error) {
      this.logger.error(`Error generating adaptive adjustments:`, error);
      return [];
    }
  }

  async applyAdaptiveAdjustment(
    userId: string,
    adjustmentId: string,
    userFeedback: { accepted: boolean; rating?: number; comments?: string },
  ): Promise<WellnessGoalDocument> {
    this.logger.log(
      `Applying adaptive adjustment ${adjustmentId} for user ${userId}`,
    );

    // Log user feedback for future ML training
    await this.logUserFeedback(adjustmentId, userFeedback);

    // For now, return a placeholder - implementation would depend on specific adjustment type
    const goal = await this.goalModel.findOne({
      userId: new Types.ObjectId(userId),
    });
    if (!goal) {
      throw new Error('Goal not found');
    }

    return goal;
  }

  private async logUserFeedback(
    adjustmentId: string,
    feedback: { accepted: boolean; rating?: number; comments?: string },
  ): Promise<void> {
    this.logger.log(
      `User feedback for adjustment ${adjustmentId}: accepted=${feedback.accepted}`,
    );
  }

  private async generatePersonalizedMessage(
    goal: WellnessGoalDocument,
    type: Celebration['type'],
    achievement: string,
  ): Promise<string> {
    try {
      const prompt = `
        Generate a personalized celebration message for this wellness achievement:
        
        Goal: ${goal.title}
        Category: ${goal.category}
        Achievement: ${achievement}
        Type: ${type}
        Progress: ${goal.currentValue}/${goal.targetValue} ${goal.unit}
        
        Keep it under 100 words and conversational.
      `;

      const response = await this.aiService.generateChatResponse(prompt, []);
      return response.content || this.getFallbackMessage(type, achievement);
    } catch (error) {
      this.logger.warn(
        'Failed to generate personalized message, using fallback',
      );
      return this.getFallbackMessage(type, achievement);
    }
  }

  private generateRewards(
    goal: WellnessGoalDocument,
    type: Celebration['type'],
  ): Celebration['rewards'] {
    const badges = this.determineBadges(goal, type);
    const points = this.calculatePoints(goal, type);
    const suggestions = this.generateRewardSuggestions();

    return { badges, points, suggestions };
  }

  private generateShareableContent(
    goal: WellnessGoalDocument,
    achievement: string,
    type: Celebration['type'],
  ): Celebration['shareableContent'] {
    const hashtags = [
      '#WellnessJourney',
      '#HealthGoals',
      `#${goal.category.replace(/_/g, '')}`,
      '#Progress',
      '#Motivation',
    ];

    const text = `🎉 Just ${achievement.toLowerCase()}! ${this.getShareableText(type, goal)} #WellnessWins`;

    return { text, hashtags };
  }

  private analyzeProgressPatterns(
    goal: WellnessGoalDocument,
  ): ProgressAnalysis {
    const entries = goal.progressEntries || [];

    return {
      progressRate: this.calculateProgressRate(entries),
      consistency: this.calculateConsistency(entries),
      trendDirection: this.calculateTrendDirection(entries),
      timeOnTrack: this.isTimelineOnTrack(goal),
      moodPattern: this.analyzeMoodPattern(entries),
      confidencePattern: this.analyzeConfidencePattern(entries),
      challengeFrequency: this.analyzeChallengeFrequency(entries),
    };
  }

  private generateTimelineAdjustments(
    goal: WellnessGoalDocument,
    analysis: ProgressAnalysis,
  ): AdaptiveAdjustment[] {
    const adjustments: AdaptiveAdjustment[] = [];

    if (!analysis.timeOnTrack && analysis.progressRate < 0.5) {
      adjustments.push({
        id: new Types.ObjectId().toString(),
        goalId: goal._id.toString(),
        type: 'timeline',
        suggestion:
          'Extend target date by 2-4 weeks to maintain realistic expectations',
        reasoning:
          'Current progress rate suggests the original timeline may be too aggressive',
        confidence: 0.8,
        impact: 'medium',
        urgency: 'recommended',
        implementation: {
          difficulty: 'easy',
          timeRequired: '5 minutes',
          steps: [
            'Review current progress rate',
            'Calculate realistic completion date',
            'Update target date in goal settings',
          ],
        },
        aiAnalysis: {
          successProbability: 0.75,
          riskFactors: ['May reduce urgency', 'Could affect motivation'],
          benefits: [
            'Reduces stress',
            'Improves likelihood of success',
            'Maintains consistency',
          ],
        },
      });
    }

    return adjustments;
  }

  private generateTargetAdjustments(
    goal: WellnessGoalDocument,
    analysis: ProgressAnalysis,
  ): AdaptiveAdjustment[] {
    const adjustments: AdaptiveAdjustment[] = [];

    if (
      analysis.progressRate > 1.5 &&
      goal.currentValue > goal.targetValue * 0.8
    ) {
      adjustments.push({
        id: new Types.ObjectId().toString(),
        goalId: goal._id.toString(),
        type: 'target',
        suggestion: `Increase target from ${goal.targetValue} to ${Math.round(goal.targetValue * 1.2)} ${goal.unit}`,
        reasoning:
          "You're progressing faster than expected - you can achieve more!",
        confidence: 0.7,
        impact: 'high',
        urgency: 'optional',
        implementation: {
          difficulty: 'easy',
          timeRequired: '2 minutes',
          steps: [
            'Assess comfort with increased target',
            'Update target value',
            'Adjust milestones accordingly',
          ],
        },
        aiAnalysis: {
          successProbability: 0.8,
          riskFactors: ['May create pressure', 'Could lead to burnout'],
          benefits: [
            'Maximizes potential',
            'Builds confidence',
            'Creates new challenge',
          ],
        },
      });
    }

    return adjustments;
  }

  private async generateApproachAdjustments(
    goal: WellnessGoalDocument,
    analysis: ProgressAnalysis,
  ): Promise<AdaptiveAdjustment[]> {
    const adjustments: AdaptiveAdjustment[] = [];

    if (analysis.consistency < 0.6) {
      const prompt = `
        Suggest approach modifications for this wellness goal:
        
        Goal: ${goal.title}
        Category: ${goal.category}
        Current approach challenges: Low consistency (${Math.round(analysis.consistency * 100)}%)
        Common challenges: ${analysis.challengeFrequency.top3.join(', ')}
        
        Provide specific strategy adjustments to improve consistency.
      `;

      try {
        const aiResponse = await this.aiService.generateChatResponse(
          prompt,
          [],
        );

        adjustments.push({
          id: new Types.ObjectId().toString(),
          goalId: goal._id.toString(),
          type: 'approach',
          suggestion: aiResponse.content.substring(0, 200),
          reasoning:
            'Low consistency indicates the current approach may need adjustment',
          confidence: 0.6,
          impact: 'high',
          urgency: 'important',
          implementation: {
            difficulty: 'moderate',
            timeRequired: '15-30 minutes',
            steps: [
              'Identify specific barriers to consistency',
              'Implement suggested strategy changes',
              'Track progress for 1 week',
              'Adjust based on results',
            ],
          },
          aiAnalysis: {
            successProbability: 0.65,
            riskFactors: ['Requires behavior change', 'May take time to adapt'],
            benefits: [
              'Improved consistency',
              'Better long-term results',
              'Reduced frustration',
            ],
          },
        });
      } catch (error) {
        this.logger.warn('Failed to generate AI approach adjustment');
      }
    }

    return adjustments;
  }

  private generateMilestoneAdjustments(
    goal: WellnessGoalDocument,
  ): AdaptiveAdjustment[] {
    const adjustments: AdaptiveAdjustment[] = [];

    if (goal.milestones?.length === 0 || !goal.milestones) {
      adjustments.push({
        id: new Types.ObjectId().toString(),
        goalId: goal._id.toString(),
        type: 'milestone',
        suggestion: 'Add 3-4 intermediate milestones to track progress better',
        reasoning:
          'Breaking down the goal into smaller milestones improves motivation and tracking',
        confidence: 0.9,
        impact: 'medium',
        urgency: 'recommended',
        implementation: {
          difficulty: 'easy',
          timeRequired: '10 minutes',
          steps: [
            'Divide goal into 25%, 50%, 75% completion points',
            'Set specific dates for each milestone',
            'Add rewards for milestone completion',
          ],
        },
        aiAnalysis: {
          successProbability: 0.85,
          riskFactors: ['None significant'],
          benefits: [
            'Better progress tracking',
            'Increased motivation',
            'Celebration opportunities',
          ],
        },
      });
    }

    return adjustments;
  }

  // Helper methods
  private getCelebrationTitle(type: Celebration['type']): string {
    const titles = {
      milestone: '🎯 Milestone Achieved!',
      goal_completion: '🏆 Goal Completed!',
      streak: '🔥 Consistency Streak!',
      improvement: '📈 Amazing Progress!',
      consistency: '⭐ Consistency Star!',
    };
    return titles[type];
  }

  private getCelebrationMessage(
    _type: Celebration['type'],
    achievement: string,
  ): string {
    return `Congratulations! You've ${achievement.toLowerCase()}. Your dedication is paying off!`;
  }

  private determineEncouragementLevel(
    goal: WellnessGoalDocument,
    type: Celebration['type'],
  ): Celebration['encouragementLevel'] {
    if (type === 'goal_completion') return 'enthusiastic';
    if (goal.priority === 'high' || goal.priority === 'critical')
      return 'motivational';
    return 'gentle';
  }

  private async storeCelebration(
    goal: WellnessGoalDocument,
    _celebration: Celebration,
  ): Promise<void> {
    if (!goal.aiInsights) {
      goal.aiInsights = {
        suggestions: [],
        predictions: { likelihood: 0, timeframe: '', factors: [] },
        adaptiveAdjustments: [],
      };
    }

    await goal.save();
  }

  private determineBadges(
    goal: WellnessGoalDocument,
    type: Celebration['type'],
  ): string[] {
    const badges: string[] = [];

    if (type === 'goal_completion') badges.push('Goal Achiever');
    if (type === 'milestone') badges.push('Milestone Master');
    if (type === 'streak') badges.push('Consistency Champion');
    if (goal.category === 'physical_activity') badges.push('Fitness Warrior');

    return badges;
  }

  private calculatePoints(
    goal: WellnessGoalDocument,
    type: Celebration['type'],
  ): number {
    const basePoints: Record<Celebration['type'], number> = {
      milestone: 50,
      goal_completion: 200,
      streak: 25,
      improvement: 75,
      consistency: 30,
    };

    const priorityMultiplier: Record<string, number> = {
      low: 1,
      medium: 1.2,
      high: 1.5,
      critical: 2,
    };

    return Math.round(
      basePoints[type] * (priorityMultiplier[goal.priority] || 1),
    );
  }

  private generateRewardSuggestions(): string[] {
    return [
      'Treat yourself to a healthy smoothie',
      'Take a relaxing bath',
      "Buy that workout gear you've been wanting",
      'Share your success with a friend',
      'Plan a fun active weekend activity',
    ];
  }

  private getShareableText(
    type: Celebration['type'],
    goal: WellnessGoalDocument,
  ): string {
    return `Making progress on my ${goal.category.replace(/_/g, ' ')} goal: ${goal.title}!`;
  }

  private getFallbackMessage(
    _type: Celebration['type'],
    achievement: string,
  ): string {
    return `Amazing work! You've ${achievement.toLowerCase()}. Keep up the fantastic progress!`;
  }

  private getImpactScore(impact: 'low' | 'medium' | 'high'): number {
    return { low: 1, medium: 2, high: 3 }[impact];
  }

  // Analysis helper methods
  private calculateProgressRate(entries: ProgressEntry[]): number {
    if (entries.length < 2) return 0;

    const sortedEntries = entries.sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
    const timeSpan =
      (sortedEntries[sortedEntries.length - 1].date.getTime() -
        sortedEntries[0].date.getTime()) /
      (1000 * 60 * 60 * 24);
    const valueChange =
      sortedEntries[sortedEntries.length - 1].value - sortedEntries[0].value;

    return timeSpan > 0 ? valueChange / timeSpan : 0;
  }

  private calculateConsistency(entries: ProgressEntry[]): number {
    if (entries.length === 0) return 0;

    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentEntries = entries.filter((e) => e.date >= last7Days);

    return recentEntries.length / 7;
  }

  private calculateTrendDirection(
    entries: ProgressEntry[],
  ): 'up' | 'down' | 'stable' {
    if (entries.length < 3) return 'stable';

    const recent = entries.slice(-3);
    const values = recent.map((e) => e.value);

    if (values[2] > values[1] && values[1] > values[0]) return 'up';
    if (values[2] < values[1] && values[1] < values[0]) return 'down';
    return 'stable';
  }

  private isTimelineOnTrack(goal: WellnessGoalDocument): boolean {
    const now = new Date();
    const totalTime = goal.targetDate.getTime() - goal.startDate.getTime();
    const elapsedTime = now.getTime() - goal.startDate.getTime();
    const expectedProgress = (elapsedTime / totalTime) * goal.targetValue;

    return goal.currentValue >= expectedProgress * 0.8;
  }

  private analyzeMoodPattern(entries: ProgressEntry[]): {
    average: number;
    trend: string;
  } {
    const moodEntries = entries.filter((e) => e.mood !== undefined);
    const average =
      moodEntries.reduce((sum, e) => sum + (e.mood || 0), 0) /
        moodEntries.length || 0;

    return { average, trend: 'stable' };
  }

  private analyzeConfidencePattern(entries: ProgressEntry[]): {
    average: number;
    trend: string;
  } {
    const confidenceEntries = entries.filter((e) => e.confidence !== undefined);
    const average =
      confidenceEntries.reduce((sum, e) => sum + (e.confidence || 0), 0) /
        confidenceEntries.length || 0;

    return { average, trend: 'stable' };
  }

  private analyzeChallengeFrequency(entries: ProgressEntry[]): {
    top3: string[];
    total: number;
  } {
    const allChallenges = entries.flatMap((e) => e.challenges || []);
    const challengeCounts: Record<string, number> = {};

    allChallenges.forEach((challenge) => {
      challengeCounts[challenge] = (challengeCounts[challenge] || 0) + 1;
    });

    const top3 = Object.entries(challengeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([challenge]) => challenge);

    return { top3, total: allChallenges.length };
  }

  private calculateGoalStreak(goal: WellnessGoalDocument): number {
    const entries = goal.progressEntries || [];
    const today = new Date();
    let streak = 0;

    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const hasEntry = entries.some(
        (entry) => entry.date.toDateString() === checkDate.toDateString(),
      );

      if (hasEntry) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    return streak;
  }

  private detectSignificantImprovement(
    goal: WellnessGoalDocument,
  ): string | null {
    const entries = goal.progressEntries || [];
    if (entries.length < 5) return null;

    const recent = entries.slice(-3);
    const older = entries.slice(-6, -3);

    const recentAvg =
      recent.reduce((sum, e) => sum + e.value, 0) / recent.length;
    const olderAvg = older.reduce((sum, e) => sum + e.value, 0) / older.length;

    const improvement = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (improvement > 20) {
      return `${Math.round(improvement)}% improvement in recent progress`;
    }

    return null;
  }
}
