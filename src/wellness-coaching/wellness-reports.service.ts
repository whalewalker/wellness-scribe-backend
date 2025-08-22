import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  WellnessGoal,
  WellnessGoalDocument,
} from '../schemas/wellness-goal.schema';
import {
  WellnessReport,
  WellnessReportDocument,
} from '../schemas/wellness-report.schema';
import { AiService } from '../ai/ai.service';
import { GenerateReportDto } from '../dto/wellness-coaching.dto';

export interface ReportInsights {
  achievements: string[];
  challenges: string[];
  patterns: string[];
  recommendations: string[];
  aiSummary: string;
}

export interface CategoryAnalysis {
  category: string;
  goalsCount: number;
  completionRate: number;
  averageProgress: number;
  trends: string[];
  keyMetrics: {
    totalTime: number;
    averageConfidence: number;
    averageMood: number;
    consistencyScore: number;
  };
}

export interface ReportMetrics {
  goalsCompleted: number;
  goalsInProgress: number;
  goalsOverdue: number;
  totalProgressPoints: number;
  averageConfidence: number;
  averageMood: number;
  consistencyScore: number;
  improvementRate: number;
}

@Injectable()
export class WellnessReportsService {
  private readonly logger = new Logger(WellnessReportsService.name);

  constructor(
    @InjectModel(WellnessGoal.name)
    private goalModel: Model<WellnessGoalDocument>,
    @InjectModel(WellnessReport.name)
    private reportModel: Model<WellnessReportDocument>,
    private readonly aiService: AiService,
  ) {}

  async generateReport(
    userId: string,
    reportDto: GenerateReportDto,
  ): Promise<WellnessReportDocument> {
    try {
      this.logger.log(`Generating ${reportDto.type} report for user ${userId}`);

      const period = this.calculateReportPeriod(reportDto);
      const goals = await this.getGoalsForPeriod(
        userId,
        period,
        reportDto.categories,
      );

      const metrics = this.calculateReportMetrics(goals, period);
      const insights = await this.generateReportInsights(
        goals,
        period,
        reportDto.includeAiInsights,
      );
      const categoryBreakdown = this.analyzeCategoryBreakdown(goals);
      const celebrations = this.identifyCelebrations(goals, period);

      const report = new this.reportModel({
        userId: new Types.ObjectId(userId),
        type: reportDto.type,
        period,
        metrics,
        insights,
        categoryBreakdown,
        celebrations,
        generatedAt: new Date(),
        isPublic: false,
      });

      const savedReport = await report.save();
      this.logger.log(
        `Report generated successfully with ID: ${savedReport._id}`,
      );

      return savedReport;
    } catch (error) {
      this.logger.error(`Error generating report for user ${userId}:`, error);
      throw error;
    }
  }

  async getRecentReports(
    userId: string,
    limit: number = 10,
  ): Promise<WellnessReportDocument[]> {
    return await this.reportModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ generatedAt: -1 })
      .limit(limit)
      .exec();
  }

  async getReportById(
    reportId: string,
    userId: string,
  ): Promise<WellnessReportDocument> {
    const report = await this.reportModel.findOne({
      _id: reportId,
      userId: new Types.ObjectId(userId),
    });

    if (!report) {
      throw new Error(`Report with ID ${reportId} not found`);
    }

    return report;
  }

  async generateWeeklyReport(userId: string): Promise<WellnessReportDocument> {
    return this.generateReport(userId, {
      type: 'weekly',
      includeAiInsights: true,
    });
  }

  async generateMonthlyReport(userId: string): Promise<WellnessReportDocument> {
    return this.generateReport(userId, {
      type: 'monthly',
      includeAiInsights: true,
    });
  }

  async generateComparisonReport(
    userId: string,
    currentPeriod: { start: Date; end: Date },
    previousPeriod: { start: Date; end: Date },
  ): Promise<{
    current: ReportMetrics;
    previous: ReportMetrics;
    comparisons: {
      metric: string;
      change: number;
      changeType: 'improvement' | 'decline' | 'stable';
      significance: 'minor' | 'moderate' | 'significant';
    }[];
    insights: string[];
  }> {
    const currentGoals = await this.getGoalsForPeriod(userId, currentPeriod);
    const previousGoals = await this.getGoalsForPeriod(userId, previousPeriod);

    const currentMetrics = this.calculateReportMetrics(
      currentGoals,
      currentPeriod,
    );
    const previousMetrics = this.calculateReportMetrics(
      previousGoals,
      previousPeriod,
    );

    const comparisons = this.generateMetricComparisons(
      currentMetrics,
      previousMetrics,
    );
    const insights = this.generateComparisonInsights(
      comparisons,
      currentGoals,
      previousGoals,
    );

    return {
      current: currentMetrics,
      previous: previousMetrics,
      comparisons,
      insights,
    };
  }

  scheduleAutomaticReports(userId: string): void {
    // This would typically integrate with a job scheduler
    this.logger.log(`Scheduling automatic reports for user ${userId}`);

    // Implementation would depend on your job scheduling system
    // For example, using Bull Queue, Cron, or similar
  }

  private calculateReportPeriod(reportDto: GenerateReportDto): {
    start: Date;
    end: Date;
  } {
    const now = new Date();
    const start = new Date();
    const end = new Date(now);

    if (
      reportDto.type === 'custom' &&
      reportDto.startDate &&
      reportDto.endDate
    ) {
      return {
        start: reportDto.startDate,
        end: reportDto.endDate,
      };
    }

    switch (reportDto.type) {
      case 'weekly':
        start.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'quarterly':
        start.setMonth(now.getMonth() - 3);
        break;
      case 'annual':
        start.setFullYear(now.getFullYear() - 1);
        break;
      default:
        start.setDate(now.getDate() - 7); // Default to weekly
    }

    return { start, end };
  }

  private async getGoalsForPeriod(
    userId: string,
    period: { start: Date; end: Date },
    categories?: string[],
  ): Promise<WellnessGoalDocument[]> {
    const query: Record<string, any> = {
      userId: new Types.ObjectId(userId),
      $or: [
        { createdAt: { $gte: period.start, $lte: period.end } },
        { updatedAt: { $gte: period.start, $lte: period.end } },
        { 'progressEntries.date': { $gte: period.start, $lte: period.end } },
      ],
    };

    if (categories?.length) {
      query.category = { $in: categories };
    }

    return await this.goalModel.find(query).exec();
  }

  private calculateReportMetrics(
    goals: WellnessGoalDocument[],
    period: { start: Date; end: Date },
  ): ReportMetrics {
    const goalsCompleted = goals.filter(
      (g) =>
        g.status === 'completed' &&
        g.completedAt &&
        g.completedAt >= period.start &&
        g.completedAt <= period.end,
    ).length;

    const goalsInProgress = goals.filter((g) => g.status === 'active').length;

    const goalsOverdue = goals.filter(
      (g) => g.status === 'active' && g.targetDate < new Date(),
    ).length;

    // Calculate total progress points (sum of all progress made in period)
    const totalProgressPoints = goals.reduce((sum, goal) => {
      const periodEntries =
        goal.progressEntries?.filter(
          (entry) => entry.date >= period.start && entry.date <= period.end,
        ) || [];

      const progressInPeriod = periodEntries.reduce(
        (entrySum, entry) => entrySum + entry.value,
        0,
      );
      return sum + progressInPeriod;
    }, 0);

    // Calculate averages from progress entries in the period
    const allPeriodEntries = goals.flatMap(
      (goal) =>
        goal.progressEntries?.filter(
          (entry) => entry.date >= period.start && entry.date <= period.end,
        ) || [],
    );

    const averageConfidence = this.calculateAverage(
      allPeriodEntries
        .map((e) => e.confidence)
        .filter((conf): conf is number => conf !== undefined),
    );

    const averageMood = this.calculateAverage(
      allPeriodEntries
        .map((e) => e.mood)
        .filter((mood): mood is number => mood !== undefined),
    );

    const consistencyScore = this.calculateConsistencyScore(goals, period);
    const improvementRate = this.calculateImprovementRate(goals, period);

    return {
      goalsCompleted,
      goalsInProgress,
      goalsOverdue,
      totalProgressPoints: Math.round(totalProgressPoints),
      averageConfidence: Math.round(averageConfidence * 10) / 10,
      averageMood: Math.round(averageMood * 10) / 10,
      consistencyScore: Math.round(consistencyScore),
      improvementRate: Math.round(improvementRate),
    };
  }

  private async generateReportInsights(
    goals: WellnessGoalDocument[],
    period: { start: Date; end: Date },
    includeAi: boolean = true,
  ): Promise<ReportInsights> {
    const achievements = this.identifyAchievements(goals, period);
    const challenges = this.identifyChallenges(goals, period);
    const patterns = this.identifyPatterns(goals, period);
    const recommendations = this.generateRecommendations(goals, period);

    let aiSummary = '';

    if (includeAi) {
      try {
        aiSummary = await this.generateAiSummary(goals, period, {
          achievements,
          challenges,
          patterns,
          recommendations,
        });
      } catch (error) {
        this.logger.warn('Failed to generate AI summary for report');
        aiSummary = 'Summary unavailable - analysis completed successfully.';
      }
    }

    return {
      achievements,
      challenges,
      patterns,
      recommendations,
      aiSummary,
    };
  }

  private analyzeCategoryBreakdown(
    goals: WellnessGoalDocument[],
  ): CategoryAnalysis[] {
    const categoryMap = new Map<string, WellnessGoalDocument[]>();

    goals.forEach((goal) => {
      if (!categoryMap.has(goal.category)) {
        categoryMap.set(goal.category, []);
      }
      categoryMap.get(goal.category)!.push(goal);
    });

    return Array.from(categoryMap.entries()).map(
      ([category, categoryGoals]) => {
        const goalsCount = categoryGoals.length;
        const completedGoals = categoryGoals.filter(
          (g) => g.status === 'completed',
        ).length;
        const completionRate =
          goalsCount > 0 ? (completedGoals / goalsCount) * 100 : 0;

        const averageProgress =
          categoryGoals.reduce((sum, goal) => {
            return (
              sum + Math.min((goal.currentValue / goal.targetValue) * 100, 100)
            );
          }, 0) / goalsCount;

        const trends = this.analyzeCategoryTrends(categoryGoals);
        const keyMetrics = this.calculateCategoryMetrics(categoryGoals);

        return {
          category,
          goalsCount,
          completionRate: Math.round(completionRate),
          averageProgress: Math.round(averageProgress),
          trends,
          keyMetrics,
        };
      },
    );
  }

  private identifyCelebrations(
    goals: WellnessGoalDocument[],
    period: { start: Date; end: Date },
  ): Array<{
    type: string;
    title: string;
    description: string;
    date: Date;
    goalId?: Types.ObjectId;
  }> {
    const celebrations: Array<{
      type: string;
      title: string;
      description: string;
      date: Date;
      goalId?: Types.ObjectId;
    }> = [];

    // Goal completions
    goals
      .filter(
        (g) =>
          g.status === 'completed' &&
          g.completedAt &&
          g.completedAt >= period.start &&
          g.completedAt <= period.end,
      )
      .forEach((goal) => {
        celebrations.push({
          type: 'goal_completion',
          title: `Goal Completed: ${goal.title}`,
          description: `Successfully achieved ${goal.targetValue} ${goal.unit}`,
          date: goal.completedAt!,
          goalId: goal._id,
        });
      });

    // Milestone completions
    goals.forEach((goal) => {
      goal.milestones
        ?.filter(
          (m) =>
            m.completed &&
            m.completedAt &&
            m.completedAt >= period.start &&
            m.completedAt <= period.end,
        )
        .forEach((milestone) => {
          celebrations.push({
            type: 'milestone',
            title: `Milestone Reached: ${milestone.title}`,
            description: milestone.description,
            date: milestone.completedAt!,
            goalId: goal._id,
          });
        });
    });

    // Consistency achievements
    const consistentGoals = goals.filter(
      (goal) => this.calculateGoalConsistency(goal, period) >= 0.8,
    );

    consistentGoals.forEach((goal) => {
      celebrations.push({
        type: 'consistency',
        title: `Consistency Achievement: ${goal.title}`,
        description: 'Maintained excellent consistency throughout the period',
        date: period.end,
        goalId: goal._id,
      });
    });

    return celebrations.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  private identifyAchievements(
    goals: WellnessGoalDocument[],
    period: { start: Date; end: Date },
  ): string[] {
    const achievements: string[] = [];

    const completedGoals = goals.filter(
      (g) =>
        g.status === 'completed' &&
        g.completedAt &&
        g.completedAt >= period.start &&
        g.completedAt <= period.end,
    ).length;

    if (completedGoals > 0) {
      achievements.push(
        `Completed ${completedGoals} goal${completedGoals > 1 ? 's' : ''}`,
      );
    }

    const totalMilestones = goals.reduce((sum, goal) => {
      return (
        sum +
        (goal.milestones?.filter(
          (m) =>
            m.completed &&
            m.completedAt &&
            m.completedAt >= period.start &&
            m.completedAt <= period.end,
        ).length || 0)
      );
    }, 0);

    if (totalMilestones > 0) {
      achievements.push(
        `Reached ${totalMilestones} milestone${totalMilestones > 1 ? 's' : ''}`,
      );
    }

    const highConsistencyGoals = goals.filter(
      (goal) => this.calculateGoalConsistency(goal, period) >= 0.8,
    ).length;

    if (highConsistencyGoals > 0) {
      achievements.push(
        `Maintained high consistency in ${highConsistencyGoals} goal${highConsistencyGoals > 1 ? 's' : ''}`,
      );
    }

    return achievements;
  }

  private identifyChallenges(
    goals: WellnessGoalDocument[],
    period: { start: Date; end: Date },
  ): string[] {
    const challenges: string[] = [];

    const overdueGoals = goals.filter(
      (g) => g.status === 'active' && g.targetDate < period.end,
    ).length;

    if (overdueGoals > 0) {
      challenges.push(
        `${overdueGoals} goal${overdueGoals > 1 ? 's are' : ' is'} overdue`,
      );
    }

    const lowProgressGoals = goals.filter((goal) => {
      const progressRate = goal.currentValue / goal.targetValue;
      return progressRate < 0.3 && goal.status === 'active';
    }).length;

    if (lowProgressGoals > 0) {
      challenges.push(
        `${lowProgressGoals} goal${lowProgressGoals > 1 ? 's have' : ' has'} low progress`,
      );
    }

    const inconsistentGoals = goals.filter(
      (goal) => this.calculateGoalConsistency(goal, period) < 0.5,
    ).length;

    if (inconsistentGoals > 0) {
      challenges.push(
        `Inconsistent tracking in ${inconsistentGoals} goal${inconsistentGoals > 1 ? 's' : ''}`,
      );
    }

    return challenges;
  }

  private identifyPatterns(
    goals: WellnessGoalDocument[],
    period: { start: Date; end: Date },
  ): string[] {
    const patterns: string[] = [];

    // Analyze mood patterns
    const allEntries = goals.flatMap(
      (goal) =>
        goal.progressEntries?.filter(
          (entry) => entry.date >= period.start && entry.date <= period.end,
        ) || [],
    );

    const moodEntries = allEntries.filter((e) => e.mood !== undefined);
    if (moodEntries.length > 0) {
      const averageMood =
        moodEntries.reduce((sum, e) => sum + (e.mood || 0), 0) /
        moodEntries.length;
      if (averageMood >= 4) {
        patterns.push('Consistently positive mood during wellness activities');
      } else if (averageMood <= 2) {
        patterns.push('Lower mood levels during wellness activities');
      }
    }

    // Analyze confidence patterns
    const confidenceEntries = allEntries.filter(
      (e) => e.confidence !== undefined,
    );
    if (confidenceEntries.length > 0) {
      const averageConfidence =
        confidenceEntries.reduce((sum, e) => sum + (e.confidence || 0), 0) /
        confidenceEntries.length;
      if (averageConfidence >= 4) {
        patterns.push('High confidence levels in achieving goals');
      } else if (averageConfidence <= 2) {
        patterns.push('Low confidence levels may be affecting progress');
      }
    }

    // Analyze day-of-week patterns
    const dayPatterns = this.analyzeDayOfWeekPatterns(allEntries);
    if (dayPatterns) {
      patterns.push(dayPatterns);
    }

    return patterns;
  }

  private generateRecommendations(
    goals: WellnessGoalDocument[],
    period: { start: Date; end: Date },
  ): string[] {
    const recommendations: string[] = [];

    const overdueGoals = goals.filter(
      (g) => g.status === 'active' && g.targetDate < period.end,
    );

    if (overdueGoals.length > 0) {
      recommendations.push('Review and adjust timelines for overdue goals');
    }

    const lowProgressGoals = goals.filter((goal) => {
      const progressRate = goal.currentValue / goal.targetValue;
      return progressRate < 0.3 && goal.status === 'active';
    });

    if (lowProgressGoals.length > 0) {
      recommendations.push(
        'Break down goals with low progress into smaller, actionable steps',
      );
    }

    const categoriesWithLowProgress = this.identifyLowProgressCategories(goals);
    if (categoriesWithLowProgress.length > 0) {
      recommendations.push(
        `Focus more attention on: ${categoriesWithLowProgress.join(', ')}`,
      );
    }

    if (goals.filter((g) => g.status === 'active').length > 5) {
      recommendations.push(
        'Consider focusing on fewer goals to improve success rate',
      );
    }

    return recommendations;
  }

  private async generateAiSummary(
    goals: WellnessGoalDocument[],
    period: { start: Date; end: Date },
    insights: {
      achievements: string[];
      challenges: string[];
      patterns: string[];
      recommendations: string[];
    },
  ): Promise<string> {
    const prompt = `
      Generate a personalized wellness report summary based on this data:
      
      Period: ${period.start.toDateString()} to ${period.end.toDateString()}
      Total Goals: ${goals.length}
      Active Goals: ${goals.filter((g) => g.status === 'active').length}
      Completed Goals: ${goals.filter((g) => g.status === 'completed').length}
      
      Key Achievements:
      ${insights.achievements.map((a) => `- ${a}`).join('\n')}
      
      Challenges:
      ${insights.challenges.map((c) => `- ${c}`).join('\n')}
      
      Patterns Observed:
      ${insights.patterns.map((p) => `- ${p}`).join('\n')}
      
      Please provide:
      1. A motivational summary of progress
      2. Key insights about wellness journey
      3. Encouragement for continued progress
      
      Keep it personal, positive, and under 200 words.
    `;

    const response = await this.aiService.generateChatResponse(prompt, []);
    return (
      response.content ||
      'Your wellness journey continues to show positive progress. Keep up the great work!'
    );
  }

  private generateMetricComparisons(
    current: ReportMetrics,
    previous: ReportMetrics,
  ): Array<{
    metric: string;
    change: number;
    changeType: 'improvement' | 'decline' | 'stable';
    significance: 'minor' | 'moderate' | 'significant';
  }> {
    const comparisons: Array<{
      metric: string;
      change: number;
      changeType: 'improvement' | 'decline' | 'stable';
      significance: 'minor' | 'moderate' | 'significant';
    }> = [];
    const metrics = [
      { key: 'goalsCompleted', name: 'Goals Completed' },
      { key: 'averageConfidence', name: 'Average Confidence' },
      { key: 'averageMood', name: 'Average Mood' },
      { key: 'consistencyScore', name: 'Consistency Score' },
      { key: 'improvementRate', name: 'Improvement Rate' },
    ];

    metrics.forEach(({ key, name }) => {
      const currentValue = current[key];
      const previousValue = previous[key];

      if (previousValue === 0) return; // Skip if no previous data

      const change = ((currentValue - previousValue) / previousValue) * 100;
      const changeType =
        change > 5 ? 'improvement' : change < -5 ? 'decline' : 'stable';
      const significance =
        Math.abs(change) > 20
          ? 'significant'
          : Math.abs(change) > 10
            ? 'moderate'
            : 'minor';

      comparisons.push({
        metric: name,
        change: Math.round(change),
        changeType,
        significance,
      });
    });

    return comparisons;
  }

  private generateComparisonInsights(
    comparisons: Array<{
      metric: string;
      change: number;
      changeType: 'improvement' | 'decline' | 'stable';
      significance: 'minor' | 'moderate' | 'significant';
    }>,
    currentGoals: WellnessGoalDocument[],
    previousGoals: WellnessGoalDocument[],
  ): string[] {
    const insights: string[] = [];

    const significantImprovements = comparisons.filter(
      (c) => c.changeType === 'improvement' && c.significance !== 'minor',
    );

    if (significantImprovements.length > 0) {
      insights.push(
        `Significant improvements in: ${significantImprovements.map((c) => c.metric).join(', ')}`,
      );
    }

    const concerningDeclines = comparisons.filter(
      (c) => c.changeType === 'decline' && c.significance === 'significant',
    );

    if (concerningDeclines.length > 0) {
      insights.push(
        `Areas needing attention: ${concerningDeclines.map((c) => c.metric).join(', ')}`,
      );
    }

    return insights;
  }

  // Helper methods
  private calculateAverage(values: number[]): number {
    return values.length > 0
      ? values.reduce((sum, val) => sum + val, 0) / values.length
      : 0;
  }

  private calculateConsistencyScore(
    goals: WellnessGoalDocument[],
    period: { start: Date; end: Date },
  ): number {
    if (goals.length === 0) return 0;

    const totalConsistency = goals.reduce((sum, goal) => {
      return sum + this.calculateGoalConsistency(goal, period);
    }, 0);

    return (totalConsistency / goals.length) * 100;
  }

  private calculateGoalConsistency(
    goal: WellnessGoalDocument,
    period: { start: Date; end: Date },
  ): number {
    const periodDays = Math.ceil(
      (period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24),
    );
    const entriesInPeriod =
      goal.progressEntries?.filter(
        (entry) => entry.date >= period.start && entry.date <= period.end,
      ) || [];

    return entriesInPeriod.length / periodDays;
  }

  private calculateImprovementRate(
    goals: WellnessGoalDocument[],
    period: { start: Date; end: Date },
  ): number {
    if (goals.length === 0) return 0;

    const improvementRates = goals.map((goal) => {
      const entriesInPeriod =
        goal.progressEntries?.filter(
          (entry) => entry.date >= period.start && entry.date <= period.end,
        ) || [];

      if (entriesInPeriod.length < 2) return 0;

      const sortedEntries = entriesInPeriod.sort(
        (a, b) => a.date.getTime() - b.date.getTime(),
      );
      const firstValue = sortedEntries[0].value;
      const lastValue = sortedEntries[sortedEntries.length - 1].value;

      return firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
    });

    return this.calculateAverage(improvementRates);
  }

  private analyzeCategoryTrends(goals: WellnessGoalDocument[]): string[] {
    const trends: string[] = [];

    const completionRate =
      goals.filter((g) => g.status === 'completed').length / goals.length;
    if (completionRate > 0.8) {
      trends.push('High completion rate');
    } else if (completionRate < 0.3) {
      trends.push('Low completion rate');
    }

    const averageProgress =
      goals.reduce((sum, goal) => {
        return (
          sum + Math.min((goal.currentValue / goal.targetValue) * 100, 100)
        );
      }, 0) / goals.length;

    if (averageProgress > 80) {
      trends.push('Excellent progress');
    } else if (averageProgress < 30) {
      trends.push('Needs attention');
    }

    return trends;
  }

  private calculateCategoryMetrics(goals: WellnessGoalDocument[]) {
    const allEntries = goals.flatMap((goal) => goal.progressEntries || []);

    return {
      totalTime: allEntries.length,
      averageConfidence: this.calculateAverage(
        allEntries
          .map((e) => e.confidence)
          .filter((conf): conf is number => conf !== undefined),
      ),
      averageMood: this.calculateAverage(
        allEntries
          .map((e) => e.mood)
          .filter((mood): mood is number => mood !== undefined),
      ),
      consistencyScore:
        this.calculateAverage(
          goals.map((goal) =>
            this.calculateGoalConsistency(goal, {
              start: new Date(0),
              end: new Date(),
            }),
          ),
        ) * 100,
    };
  }

  private analyzeDayOfWeekPatterns(entries: Array<{ date: Date }>): string | null {
    const dayCount = Array(7).fill(0);

    entries.forEach((entry) => {
      const dayOfWeek = entry.date.getDay();
      dayCount[dayOfWeek]++;
    });

    const totalEntries = entries.length;
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    const bestDay = dayCount.indexOf(Math.max(...dayCount));
    const worstDay = dayCount.indexOf(Math.min(...dayCount));

    if (totalEntries > 7 && dayCount[bestDay] > dayCount[worstDay] * 2) {
      return `Most active on ${dayNames[bestDay]}s, least active on ${dayNames[worstDay]}s`;
    }

    return null;
  }

  private identifyLowProgressCategories(
    goals: WellnessGoalDocument[],
  ): string[] {
    const categoryProgress = new Map<
      string,
      { total: number; completed: number }
    >();

    goals.forEach((goal) => {
      if (!categoryProgress.has(goal.category)) {
        categoryProgress.set(goal.category, { total: 0, completed: 0 });
      }

      const stats = categoryProgress.get(goal.category)!;
      stats.total++;
      if (goal.status === 'completed') {
        stats.completed++;
      }
    });

    return Array.from(categoryProgress.entries())
      .filter(
        ([_, stats]) => stats.total > 0 && stats.completed / stats.total < 0.3,
      )
      .map(([category]) => category.replace(/_/g, ' '));
  }
}
