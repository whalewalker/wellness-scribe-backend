import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  WellnessGoal,
  WellnessGoalDocument,
} from '../schemas/wellness-goal.schema';
import { DashboardFilterDto } from '../dto/wellness-coaching.dto';

export interface DashboardMetrics {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  overallProgress: number;
  streakDays: number;
  averageConfidence: number;
  averageMood: number;
  upcomingMilestones: number;
}

export interface CategoryProgress {
  category: string;
  goals: number;
  completedGoals: number;
  completionRate: number;
  averageProgress: number;
  trend: 'improving' | 'declining' | 'stable';
}

export interface GoalProgress {
  goalId: string;
  title: string;
  category: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  progressPercentage: number;
  daysRemaining: number;
  onTrack: boolean;
  recentTrend: 'positive' | 'negative' | 'stable';
  nextMilestone?: {
    title: string;
    targetValue: number;
    daysUntilTarget: number;
  };
}

export interface ProgressChart {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
    type?: string;
  }>;
}

export interface Insight {
  type: 'success' | 'warning' | 'info' | 'celebration';
  title: string;
  message: string;
  actionable?: boolean;
  action?: string;
  goalId?: string;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  categoryProgress: CategoryProgress[];
  goalProgress: GoalProgress[];
  progressCharts: {
    overall: ProgressChart;
    byCategory: ProgressChart;
    mood: ProgressChart;
    confidence: ProgressChart;
  };
  insights: Insight[];
  upcomingDeadlines: Array<{
    goalId: string;
    title: string;
    type: 'goal' | 'milestone';
    daysRemaining: number;
    urgency: 'low' | 'medium' | 'high' | 'critical';
  }>;
  recentAchievements: Array<{
    type:
      | 'goal_completed'
      | 'milestone_reached'
      | 'streak_achieved'
      | 'improvement';
    title: string;
    date: Date;
    goalId?: string;
  }>;
}

@Injectable()
export class ProgressTrackingService {
  private readonly logger = new Logger(ProgressTrackingService.name);

  constructor(
    @InjectModel(WellnessGoal.name)
    private goalModel: Model<WellnessGoalDocument>,
  ) {}

  async getDashboardData(
    userId: string,
    filters?: DashboardFilterDto,
  ): Promise<DashboardData> {
    try {
      this.logger.log(`Generating dashboard data for user ${userId}`);

      const goals = await this.getUserGoals(userId, filters);

      const metrics = this.calculateDashboardMetrics(goals);
      const categoryProgress = this.calculateCategoryProgress(goals);
      const goalProgress = this.calculateGoalProgress(goals);
      const progressCharts = this.generateProgressCharts(goals);
      const insights = this.generateInsights(goals, metrics);
      const upcomingDeadlines = this.getUpcomingDeadlines(goals);
      const recentAchievements = this.getRecentAchievements(goals);

      return {
        metrics,
        categoryProgress,
        goalProgress,
        progressCharts,
        insights,
        upcomingDeadlines,
        recentAchievements,
      };
    } catch (error) {
      this.logger.error(
        `Error generating dashboard data for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async getProgressChart(
    userId: string,
    goalId?: string,
    timeframe: 'week' | 'month' | 'quarter' | 'year' = 'month',
  ): Promise<ProgressChart> {
    let goals: WellnessGoalDocument[];
    if (goalId) {
      const goal = await this.goalModel.findOne({
        _id: goalId,
        userId: new Types.ObjectId(userId),
      });
      goals = goal ? [goal] : [];
    } else {
      goals = await this.goalModel.find({
        userId: new Types.ObjectId(userId),
        status: 'active',
      });
    }

    return this.generateTimeframeChart(goals, timeframe);
  }

  async getCategoryAnalytics(
    userId: string,
    category: string,
  ): Promise<{
    overview: CategoryProgress;
    trends: ProgressChart;
    topPerformingGoals: GoalProgress[];
    suggestions: string[];
  }> {
    const goals = await this.goalModel.find({
      userId: new Types.ObjectId(userId),
      category,
    });

    const overview = this.calculateCategoryProgress(goals)[0];
    const trends = this.generateCategoryTrendsChart(goals);
    const topPerformingGoals = this.calculateGoalProgress(goals)
      .sort((a, b) => b.progressPercentage - a.progressPercentage)
      .slice(0, 3);

    const suggestions = this.generateCategorySuggestions(goals, category);

    return {
      overview,
      trends,
      topPerformingGoals,
      suggestions,
    };
  }

  async getStreakAnalysis(userId: string): Promise<{
    currentStreak: number;
    longestStreak: number;
    streakGoals: Array<{
      goalId: string;
      title: string;
      currentStreak: number;
      category: string;
    }>;
    breakdownRisk: 'low' | 'medium' | 'high';
  }> {
    const goals = await this.goalModel.find({
      userId: new Types.ObjectId(userId),
      status: 'active',
    });

    return this.calculateStreakAnalysis(goals);
  }

  private async getUserGoals(
    userId: string,
    filters?: DashboardFilterDto,
  ): Promise<WellnessGoalDocument[]> {
    const query: Record<string, any> = { userId: new Types.ObjectId(userId) };

    if (filters?.statuses?.length) {
      query.status = { $in: filters.statuses };
    }
    if (filters?.categories?.length) {
      query.category = { $in: filters.categories };
    }
    if (filters?.priorities?.length) {
      query.priority = { $in: filters.priorities };
    }
    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};
      if (filters.startDate)
        (query.createdAt as Record<string, any>).$gte = filters.startDate;
      if (filters.endDate)
        (query.createdAt as Record<string, any>).$lte = filters.endDate;
    }

    return await this.goalModel.find(query).sort({ createdAt: -1 });
  }

  private calculateDashboardMetrics(
    goals: WellnessGoalDocument[],
  ): DashboardMetrics {
    const totalGoals = goals.length;
    const activeGoals = goals.filter((g) => g.status === 'active').length;
    const completedGoals = goals.filter((g) => g.status === 'completed').length;

    const overallProgress =
      goals.length > 0
        ? goals.reduce((sum, goal) => {
            const progress = Math.min(
              (goal.currentValue / goal.targetValue) * 100,
              100,
            );
            return sum + progress;
          }, 0) / goals.length
        : 0;

    const allProgressEntries = goals.flatMap((g) => g.progressEntries || []);
    const averageConfidence = this.calculateAverage(
      allProgressEntries
        .map((e) => e.confidence)
        .filter((conf): conf is number => conf !== undefined),
    );
    const averageMood = this.calculateAverage(
      allProgressEntries
        .map((e) => e.mood)
        .filter((mood): mood is number => mood !== undefined),
    );

    const streakDays = this.calculateCurrentStreak(goals);
    const upcomingMilestones = goals.reduce((count, goal) => {
      return count + (goal.milestones?.filter((m) => !m.completed).length || 0);
    }, 0);

    return {
      totalGoals,
      activeGoals,
      completedGoals,
      overallProgress: Math.round(overallProgress),
      streakDays,
      averageConfidence: Math.round(averageConfidence * 10) / 10,
      averageMood: Math.round(averageMood * 10) / 10,
      upcomingMilestones,
    };
  }

  private calculateCategoryProgress(
    goals: WellnessGoalDocument[],
  ): CategoryProgress[] {
    const categoryMap = new Map<string, WellnessGoalDocument[]>();

    goals.forEach((goal) => {
      if (!categoryMap.has(goal.category)) {
        categoryMap.set(goal.category, []);
      }
      categoryMap.get(goal.category)!.push(goal);
    });

    return Array.from(categoryMap.entries()).map(
      ([category, categoryGoals]) => {
        const totalGoals = categoryGoals.length;
        const completedGoals = categoryGoals.filter(
          (g) => g.status === 'completed',
        ).length;
        const completionRate =
          totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

        const averageProgress =
          categoryGoals.reduce((sum, goal) => {
            return (
              sum + Math.min((goal.currentValue / goal.targetValue) * 100, 100)
            );
          }, 0) / totalGoals;

        const trend = this.calculateCategoryTrend(categoryGoals);

        return {
          category,
          goals: totalGoals,
          completedGoals,
          completionRate: Math.round(completionRate),
          averageProgress: Math.round(averageProgress),
          trend,
        };
      },
    );
  }

  private calculateGoalProgress(goals: WellnessGoalDocument[]): GoalProgress[] {
    return goals.map((goal) => {
      const progressPercentage = Math.min(
        (goal.currentValue / goal.targetValue) * 100,
        100,
      );
      const now = new Date();
      const daysRemaining = Math.ceil(
        (goal.targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      const onTrack = this.isGoalOnTrack(goal);
      const recentTrend = this.calculateRecentTrend(goal);
      const nextMilestone = this.getNextMilestone(goal);

      return {
        goalId: goal._id.toString(),
        title: goal.title,
        category: goal.category,
        currentValue: goal.currentValue,
        targetValue: goal.targetValue,
        unit: goal.unit,
        progressPercentage: Math.round(progressPercentage),
        daysRemaining,
        onTrack,
        recentTrend,
        nextMilestone,
      };
    });
  }

  private generateProgressCharts(goals: WellnessGoalDocument[]): {
    overall: ProgressChart;
    byCategory: ProgressChart;
    mood: ProgressChart;
    confidence: ProgressChart;
  } {
    const overall = this.generateOverallProgressChart(goals);
    const byCategory = this.generateCategoryChart(goals);
    const mood = this.generateMoodChart(goals);
    const confidence = this.generateConfidenceChart(goals);

    return { overall, byCategory, mood, confidence };
  }

  private generateOverallProgressChart(
    goals: WellnessGoalDocument[],
  ): ProgressChart {
    const last30Days = this.getLast30Days();
    const progressData = last30Days.map((date) => {
      const dayProgress = goals.reduce((sum, goal) => {
        const relevantEntries =
          goal.progressEntries?.filter(
            (entry) => entry.date.toDateString() === date.toDateString(),
          ) || [];

        if (relevantEntries.length > 0) {
          const dayValue = relevantEntries[relevantEntries.length - 1].value;
          return sum + Math.min((dayValue / goal.targetValue) * 100, 100);
        }
        return sum;
      }, 0);

      return goals.length > 0 ? dayProgress / goals.length : 0;
    });

    return {
      labels: last30Days.map((d) =>
        d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      ),
      datasets: [
        {
          label: 'Overall Progress',
          data: progressData,
          borderColor: '#4F46E5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          type: 'line',
        },
      ],
    };
  }

  private generateCategoryChart(goals: WellnessGoalDocument[]): ProgressChart {
    const categoryProgress = this.calculateCategoryProgress(goals);

    return {
      labels: categoryProgress.map((cp) => cp.category.replace(/_/g, ' ')),
      datasets: [
        {
          label: 'Completion Rate (%)',
          data: categoryProgress.map((cp) => cp.completionRate),
          backgroundColor: '#EF4444',
        },
      ],
    };
  }

  private generateMoodChart(goals: WellnessGoalDocument[]): ProgressChart {
    const last7Days = this.getLast7Days();
    const moodData = last7Days.map((date) => {
      const dayEntries = goals.flatMap(
        (goal) =>
          goal.progressEntries?.filter(
            (entry) =>
              entry.date.toDateString() === date.toDateString() && entry.mood,
          ) || [],
      );

      if (dayEntries.length > 0) {
        return (
          dayEntries.reduce((sum, entry) => sum + (entry.mood || 0), 0) /
          dayEntries.length
        );
      }
      return null;
    });

    return {
      labels: last7Days.map((d) =>
        d.toLocaleDateString('en-US', { weekday: 'short' }),
      ),
      datasets: [
        {
          label: 'Average Mood',
          data: moodData.map((val) => val || 0),
          borderColor: '#22C55E',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          type: 'line',
        },
      ],
    };
  }

  private generateConfidenceChart(
    goals: WellnessGoalDocument[],
  ): ProgressChart {
    const last7Days = this.getLast7Days();
    const confidenceData = last7Days.map((date) => {
      const dayEntries = goals.flatMap(
        (goal) =>
          goal.progressEntries?.filter(
            (entry) =>
              entry.date.toDateString() === date.toDateString() &&
              entry.confidence,
          ) || [],
      );

      if (dayEntries.length > 0) {
        return (
          dayEntries.reduce((sum, entry) => sum + (entry.confidence || 0), 0) /
          dayEntries.length
        );
      }
      return null;
    });

    return {
      labels: last7Days.map((d) =>
        d.toLocaleDateString('en-US', { weekday: 'short' }),
      ),
      datasets: [
        {
          label: 'Confidence Level',
          data: confidenceData.map((val) => val || 0),
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          type: 'line',
        },
      ],
    };
  }

  private generateInsights(
    goals: WellnessGoalDocument[],
    metrics: DashboardMetrics,
  ): Insight[] {
    const insights: Insight[] = [];

    // Success insights
    if (metrics.completedGoals > 0) {
      insights.push({
        type: 'celebration',
        title: 'Goals Completed!',
        message: `You've completed ${metrics.completedGoals} goal${metrics.completedGoals > 1 ? 's' : ''}. Great work!`,
        actionable: false,
      });
    }

    // Warning insights
    const overdueGoals = goals.filter(
      (g) => g.status === 'active' && g.targetDate < new Date(),
    );
    if (overdueGoals.length > 0) {
      insights.push({
        type: 'warning',
        title: 'Overdue Goals',
        message: `${overdueGoals.length} goal${overdueGoals.length > 1 ? 's are' : ' is'} past the target date. Consider adjusting or refocusing.`,
        actionable: true,
        action: 'Review overdue goals',
      });
    }

    // Streak insights
    if (metrics.streakDays >= 7) {
      insights.push({
        type: 'success',
        title: 'Consistency Streak!',
        message: `You're on a ${metrics.streakDays}-day consistency streak. Keep it up!`,
        actionable: false,
      });
    }

    // Progress insights
    if (metrics.overallProgress < 30) {
      insights.push({
        type: 'info',
        title: 'Getting Started',
        message: 'Focus on building daily habits to accelerate your progress.',
        actionable: true,
        action: 'View goal suggestions',
      });
    }

    return insights;
  }

  private getUpcomingDeadlines(goals: WellnessGoalDocument[]): Array<{
    goalId: string;
    title: string;
    type: 'goal' | 'milestone';
    daysRemaining: number;
    urgency: 'low' | 'medium' | 'high' | 'critical';
  }> {
    const deadlines: Array<{
      goalId: string;
      title: string;
      type: 'goal' | 'milestone';
      daysRemaining: number;
      urgency: 'low' | 'medium' | 'high' | 'critical';
    }> = [];
    const now = new Date();

    // Goal deadlines
    goals
      .filter((g) => g.status === 'active')
      .forEach((goal) => {
        const daysRemaining = Math.ceil(
          (goal.targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysRemaining <= 30) {
          deadlines.push({
            goalId: goal._id.toString(),
            title: goal.title,
            type: 'goal' as const,
            daysRemaining,
            urgency: this.calculateUrgency(daysRemaining),
          });
        }
      });

    // Milestone deadlines
    goals.forEach((goal) => {
      goal.milestones
        ?.filter((m) => !m.completed)
        .forEach((milestone) => {
          const daysRemaining = Math.ceil(
            (milestone.targetDate.getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24),
          );

          if (daysRemaining <= 14) {
            deadlines.push({
              goalId: goal._id.toString(),
              title: milestone.title,
              type: 'milestone' as const,
              daysRemaining,
              urgency: this.calculateUrgency(daysRemaining),
            });
          }
        });
    });

    return deadlines.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }

  private getRecentAchievements(goals: WellnessGoalDocument[]): Array<{
    type:
      | 'goal_completed'
      | 'milestone_reached'
      | 'streak_achieved'
      | 'improvement';
    title: string;
    date: Date;
    goalId?: string;
  }> {
    const achievements: Array<{
      type:
        | 'goal_completed'
        | 'milestone_reached'
        | 'streak_achieved'
        | 'improvement';
      title: string;
      date: Date;
      goalId?: string;
    }> = [];
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Recently completed goals
    goals
      .filter(
        (g) =>
          g.status === 'completed' &&
          g.completedAt &&
          g.completedAt >= last7Days,
      )
      .forEach((goal) => {
        achievements.push({
          type: 'goal_completed' as const,
          title: `Completed: ${goal.title}`,
          date: goal.completedAt!,
          goalId: goal._id.toString(),
        });
      });

    // Recently completed milestones
    goals.forEach((goal) => {
      goal.milestones
        ?.filter(
          (m) => m.completed && m.completedAt && m.completedAt >= last7Days,
        )
        .forEach((milestone) => {
          achievements.push({
            type: 'milestone_reached' as const,
            title: `Milestone: ${milestone.title}`,
            date: milestone.completedAt!,
            goalId: goal._id.toString(),
          });
        });
    });

    return achievements
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10);
  }

  // Helper methods
  private calculateAverage(values: number[]): number {
    return values.length > 0
      ? values.reduce((sum, val) => sum + val, 0) / values.length
      : 0;
  }

  private calculateCurrentStreak(goals: WellnessGoalDocument[]): number {
    const today = new Date();
    let streakDays = 0;

    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const hadActivity = goals.some((goal) =>
        goal.progressEntries?.some(
          (entry) => entry.date.toDateString() === checkDate.toDateString(),
        ),
      );

      if (hadActivity) {
        streakDays++;
      } else if (i > 0) {
        break;
      }
    }

    return streakDays;
  }

  private calculateCategoryTrend(
    goals: WellnessGoalDocument[],
  ): 'improving' | 'declining' | 'stable' {
    // Implementation for category trend calculation
    const recentProgress = goals.map((goal) => {
      const recentEntries = goal.progressEntries?.slice(-5) || [];
      if (recentEntries.length < 2) return 0;

      const oldValue = recentEntries[0].value;
      const newValue = recentEntries[recentEntries.length - 1].value;
      return newValue - oldValue;
    });

    const averageTrend = this.calculateAverage(recentProgress);

    if (averageTrend > 0.1) return 'improving';
    if (averageTrend < -0.1) return 'declining';
    return 'stable';
  }

  private isGoalOnTrack(goal: WellnessGoalDocument): boolean {
    const now = new Date();
    const totalDays =
      (goal.targetDate.getTime() - goal.startDate.getTime()) /
      (1000 * 60 * 60 * 24);
    const elapsedDays =
      (now.getTime() - goal.startDate.getTime()) / (1000 * 60 * 60 * 24);
    const expectedProgress = (elapsedDays / totalDays) * goal.targetValue;

    return goal.currentValue >= expectedProgress * 0.8; // 80% threshold
  }

  private calculateRecentTrend(
    goal: WellnessGoalDocument,
  ): 'positive' | 'negative' | 'stable' {
    const recentEntries = goal.progressEntries?.slice(-5) || [];
    if (recentEntries.length < 2) return 'stable';

    const oldValue = recentEntries[0].value;
    const newValue = recentEntries[recentEntries.length - 1].value;
    const trend = newValue - oldValue;

    if (trend > goal.targetValue * 0.05) return 'positive';
    if (trend < -goal.targetValue * 0.05) return 'negative';
    return 'stable';
  }

  private getNextMilestone(goal: WellnessGoalDocument) {
    const incompleteMilestones =
      goal.milestones?.filter((m) => !m.completed) || [];
    if (incompleteMilestones.length === 0) return undefined;

    const nextMilestone = incompleteMilestones
      .sort((a, b) => a.targetValue - b.targetValue)
      .find((m) => m.targetValue > goal.currentValue);

    if (!nextMilestone) return undefined;

    const daysUntilTarget = Math.ceil(
      (nextMilestone.targetDate.getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24),
    );

    return {
      title: nextMilestone.title,
      targetValue: nextMilestone.targetValue,
      daysUntilTarget,
    };
  }

  private calculateUrgency(
    daysRemaining: number,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (daysRemaining < 0) return 'critical';
    if (daysRemaining <= 3) return 'high';
    if (daysRemaining <= 7) return 'medium';
    return 'low';
  }

  private getLast30Days(): Date[] {
    const dates: Date[] = [];
    for (let i = 29; i >= 0; i--) {
      dates.push(new Date(Date.now() - i * 24 * 60 * 60 * 1000));
    }
    return dates;
  }

  private getLast7Days(): Date[] {
    const dates: Date[] = [];
    for (let i = 6; i >= 0; i--) {
      dates.push(new Date(Date.now() - i * 24 * 60 * 60 * 1000));
    }
    return dates;
  }

  private generateTimeframeChart(
    goals: WellnessGoalDocument[],
    _timeframe: string,
  ): ProgressChart {
    // Implementation specific to timeframe
    return this.generateOverallProgressChart(goals);
  }

  private generateCategoryTrendsChart(
    goals: WellnessGoalDocument[],
  ): ProgressChart {
    return this.generateOverallProgressChart(goals);
  }

  private generateCategorySuggestions(
    goals: WellnessGoalDocument[],
    category: string,
  ): string[] {
    return [
      `Consider adding more variety to your ${category} goals`,
      'Set smaller, more frequent milestones for better tracking',
      'Review your most successful strategies and apply them to other goals',
    ];
  }

  private calculateStreakAnalysis(goals: WellnessGoalDocument[]) {
    return {
      currentStreak: this.calculateCurrentStreak(goals),
      longestStreak: 0, // Implementation needed
      streakGoals: [],
      breakdownRisk: 'low' as const,
    };
  }
}
