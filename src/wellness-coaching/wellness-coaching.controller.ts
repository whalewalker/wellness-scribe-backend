import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UserDocument } from '../schemas/user.schema';
import { WellnessCoachingService } from './wellness-coaching.service';
import { ProgressTrackingService } from './progress-tracking.service';
import { CelebrationService, Celebration } from './celebration.service';
import { WellnessReportsService } from './wellness-reports.service';
import {
  CreateGoalDto,
  UpdateGoalDto,
  AddProgressEntryDto,
  CreateMilestoneDto,
  GoalSuggestionRequestDto,
  GenerateReportDto,
  DashboardFilterDto,
} from '../dto/wellness-coaching.dto';

@ApiTags('Wellness Coaching')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wellness-coaching')
export class WellnessCoachingController {
  private readonly logger = new Logger(WellnessCoachingController.name);

  constructor(
    private readonly wellnessCoachingService: WellnessCoachingService,
    private readonly progressTrackingService: ProgressTrackingService,
    private readonly celebrationService: CelebrationService,
    private readonly wellnessReportsService: WellnessReportsService,
  ) {}

  // Goal Management Endpoints

  @Post('goals')
  @ApiOperation({ summary: 'Create a new SMART wellness goal' })
  @ApiResponse({ status: 201, description: 'Goal created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid goal data' })
  async createGoal(
    @CurrentUser() user: UserDocument,
    @Body() createGoalDto: CreateGoalDto,
  ) {
    try {
      const goal = await this.wellnessCoachingService.createGoal(
        user._id.toString(),
        createGoalDto,
      );

      // Check for initial celebrations (e.g., first goal created)
      const celebrations =
        await this.celebrationService.detectAndCelebrateMilestones(
          user._id.toString(),
          goal._id.toString(),
        );

      return {
        status: HttpStatus.CREATED,
        message: 'Goal created successfully',
        data: { goal, celebrations },
      };
    } catch (error) {
      this.logger.error(
        `Error creating goal for user ${user._id.toString()}:`,
        error,
      );
      throw error;
    }
  }

  @Get('goals')
  @ApiOperation({ summary: 'Get user goals with optional filtering' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by goal status',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by goal category',
  })
  async getUserGoals(
    @CurrentUser() user: UserDocument,
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    const goals = await this.wellnessCoachingService.getUserGoals(
      user._id.toString(),
      status,
      category,
    );

    return {
      status: HttpStatus.OK,
      message: 'Goals retrieved successfully',
      data: { goals, count: goals.length },
    };
  }

  @Get('goals/:goalId')
  @ApiOperation({ summary: 'Get a specific goal by ID' })
  async getGoalById(
    @CurrentUser() user: UserDocument,
    @Param('goalId') goalId: string,
  ) {
    const goal = await this.wellnessCoachingService.getGoalById(
      goalId,
      user._id.toString(),
    );

    return {
      status: HttpStatus.OK,
      message: 'Goal retrieved successfully',
      data: { goal },
    };
  }

  @Put('goals/:goalId')
  @ApiOperation({ summary: 'Update an existing goal' })
  async updateGoal(
    @CurrentUser() user: UserDocument,
    @Param('goalId') goalId: string,
    @Body() updateGoalDto: UpdateGoalDto,
  ) {
    const goal = await this.wellnessCoachingService.updateGoal(
      goalId,
      user._id.toString(),
      updateGoalDto,
    );

    return {
      status: HttpStatus.OK,
      message: 'Goal updated successfully',
      data: { goal },
    };
  }

  @Delete('goals/:goalId')
  @ApiOperation({ summary: 'Delete a goal' })
  async deleteGoal(
    @CurrentUser() user: UserDocument,
    @Param('goalId') goalId: string,
  ) {
    await this.wellnessCoachingService.deleteGoal(goalId, user._id.toString());

    return {
      status: HttpStatus.OK,
      message: 'Goal deleted successfully',
    };
  }

  // Progress Tracking Endpoints

  @Post('goals/:goalId/progress')
  @ApiOperation({ summary: 'Add a progress entry to a goal' })
  async addProgressEntry(
    @CurrentUser() user: UserDocument,
    @Param('goalId') goalId: string,
    @Body() progressDto: AddProgressEntryDto,
  ) {
    const goal = await this.wellnessCoachingService.addProgressEntry(
      goalId,
      user._id.toString(),
      progressDto,
    );

    // Check for celebrations after progress update
    const celebrations =
      await this.celebrationService.detectAndCelebrateMilestones(
        user._id.toString(),
        goalId,
      );

    // Generate adaptive adjustments if needed
    const adaptiveAdjustments =
      await this.celebrationService.generateAdaptiveAdjustments(
        user._id.toString(),
        goalId,
      );

    return {
      status: HttpStatus.OK,
      message: 'Progress entry added successfully',
      data: {
        goal,
        celebrations,
        adaptiveAdjustments: adaptiveAdjustments.slice(0, 3), // Top 3 suggestions
      },
    };
  }

  @Post('goals/:goalId/milestones')
  @ApiOperation({ summary: 'Add a milestone to a goal' })
  async addMilestone(
    @CurrentUser() user: UserDocument,
    @Param('goalId') goalId: string,
    @Body() milestoneDto: CreateMilestoneDto,
  ) {
    const goal = await this.wellnessCoachingService.addMilestone(
      goalId,
      user._id.toString(),
      milestoneDto,
    );

    return {
      status: HttpStatus.OK,
      message: 'Milestone added successfully',
      data: { goal },
    };
  }

  // Dashboard and Analytics Endpoints

  @Get('dashboard')
  @ApiOperation({ summary: 'Get comprehensive dashboard data' })
  async getDashboard(
    @CurrentUser() user: UserDocument,
    @Query() filters?: DashboardFilterDto,
  ) {
    const dashboardData = await this.progressTrackingService.getDashboardData(
      user._id.toString(),
      filters,
    );

    return {
      status: HttpStatus.OK,
      message: 'Dashboard data retrieved successfully',
      data: dashboardData,
    };
  }

  @Get('analytics/progress-chart')
  @ApiOperation({ summary: 'Get progress chart data' })
  @ApiQuery({
    name: 'goalId',
    required: false,
    description: 'Specific goal ID',
  })
  @ApiQuery({
    name: 'timeframe',
    required: false,
    enum: ['week', 'month', 'quarter', 'year'],
  })
  async getProgressChart(
    @CurrentUser() user: UserDocument,
    @Query('goalId') goalId?: string,
    @Query('timeframe')
    timeframe: 'week' | 'month' | 'quarter' | 'year' = 'month',
  ) {
    const chart = await this.progressTrackingService.getProgressChart(
      user._id.toString(),
      goalId,
      timeframe,
    );

    return {
      status: HttpStatus.OK,
      message: 'Progress chart retrieved successfully',
      data: { chart },
    };
  }

  @Get('analytics/category/:category')
  @ApiOperation({ summary: 'Get detailed analytics for a specific category' })
  async getCategoryAnalytics(
    @CurrentUser() user: UserDocument,
    @Param('category') category: string,
  ) {
    const analytics = await this.progressTrackingService.getCategoryAnalytics(
      user._id.toString(),
      category,
    );

    return {
      status: HttpStatus.OK,
      message: 'Category analytics retrieved successfully',
      data: analytics,
    };
  }

  @Get('analytics/streaks')
  @ApiOperation({ summary: 'Get streak analysis' })
  async getStreakAnalysis(@CurrentUser() user: UserDocument) {
    const streakAnalysis = await this.progressTrackingService.getStreakAnalysis(
      user._id.toString(),
    );

    return {
      status: HttpStatus.OK,
      message: 'Streak analysis retrieved successfully',
      data: streakAnalysis,
    };
  }

  // AI-Powered Features

  @Post('ai/goal-suggestions')
  @ApiOperation({ summary: 'Get AI-powered SMART goal suggestions' })
  async getGoalSuggestions(
    @CurrentUser() user: UserDocument,
    @Body() requestDto: GoalSuggestionRequestDto,
  ) {
    const suggestions =
      await this.wellnessCoachingService.generateSmartGoalSuggestions(
        user._id.toString(),
        requestDto,
      );

    return {
      status: HttpStatus.OK,
      message: 'Goal suggestions generated successfully',
      data: { suggestions },
    };
  }

  @Get('ai/adaptive-adjustments/:goalId')
  @ApiOperation({ summary: 'Get AI-powered adaptive adjustments for a goal' })
  async getAdaptiveAdjustments(
    @CurrentUser() user: UserDocument,
    @Param('goalId') goalId: string,
  ) {
    const adjustments =
      await this.celebrationService.generateAdaptiveAdjustments(
        user._id.toString(),
        goalId,
      );

    return {
      status: HttpStatus.OK,
      message: 'Adaptive adjustments generated successfully',
      data: { adjustments },
    };
  }

  @Post('ai/adaptive-adjustments/:adjustmentId/apply')
  @ApiOperation({ summary: 'Apply an adaptive adjustment' })
  async applyAdaptiveAdjustment(
    @CurrentUser() user: UserDocument,
    @Param('adjustmentId') adjustmentId: string,
    @Body() feedback: { accepted: boolean; rating?: number; comments?: string },
  ) {
    const updatedGoal = await this.celebrationService.applyAdaptiveAdjustment(
      user._id.toString(),
      adjustmentId,
      feedback,
    );

    return {
      status: HttpStatus.OK,
      message: 'Adaptive adjustment applied successfully',
      data: { goal: updatedGoal },
    };
  }

  // Celebrations and Rewards

  @Get('celebrations')
  @ApiOperation({ summary: 'Get recent celebrations and achievements' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of celebrations to return',
  })
  async getCelebrations(
    @CurrentUser() user: UserDocument,
    @Query('limit') limit: number = 10,
  ) {
    // This would typically fetch from a celebrations collection or goal metadata
    const goals = await this.wellnessCoachingService.getUserGoals(
      user._id.toString(),
    );
    const allCelebrations: Celebration[] = [];

    for (const goal of goals) {
      const celebrations =
        await this.celebrationService.detectAndCelebrateMilestones(
          user._id.toString(),
          goal._id.toString(),
        );
      allCelebrations.push(...celebrations);
    }

    const recentCelebrations = allCelebrations
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, limit);

    return {
      status: HttpStatus.OK,
      message: 'Celebrations retrieved successfully',
      data: { celebrations: recentCelebrations },
    };
  }

  @Post('celebrations/:goalId')
  @ApiOperation({ summary: 'Manually trigger a celebration' })
  async createCelebration(
    @CurrentUser() user: UserDocument,
    @Param('goalId') goalId: string,
    @Body() celebrationData: { type: string; achievement: string },
  ) {
    const celebration = await this.celebrationService.createCelebration(
      user._id.toString(),
      goalId,
      celebrationData.type as
        | 'milestone'
        | 'goal_completion'
        | 'streak'
        | 'improvement'
        | 'consistency',
      celebrationData.achievement,
    );

    return {
      status: HttpStatus.CREATED,
      message: 'Celebration created successfully',
      data: { celebration },
    };
  }

  // Reports and Insights

  @Post('reports/generate')
  @ApiOperation({ summary: 'Generate a wellness report' })
  async generateReport(
    @CurrentUser() user: UserDocument,
    @Body() reportDto: GenerateReportDto,
  ) {
    const report = await this.wellnessReportsService.generateReport(
      user._id.toString(),
      reportDto,
    );

    return {
      status: HttpStatus.CREATED,
      message: 'Report generated successfully',
      data: { report },
    };
  }

  @Get('reports')
  @ApiOperation({ summary: 'Get recent wellness reports' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of reports to return',
  })
  async getReports(
    @CurrentUser() user: UserDocument,
    @Query('limit') limit: number = 10,
  ) {
    const reports = await this.wellnessReportsService.getRecentReports(
      user._id.toString(),
      limit,
    );

    return {
      status: HttpStatus.OK,
      message: 'Reports retrieved successfully',
      data: { reports },
    };
  }

  @Get('reports/:reportId')
  @ApiOperation({ summary: 'Get a specific report by ID' })
  async getReportById(
    @CurrentUser() user: UserDocument,
    @Param('reportId') reportId: string,
  ) {
    const report = await this.wellnessReportsService.getReportById(
      reportId,
      user._id.toString(),
    );

    return {
      status: HttpStatus.OK,
      message: 'Report retrieved successfully',
      data: { report },
    };
  }

  @Post('reports/weekly')
  @ApiOperation({ summary: 'Generate weekly wellness report' })
  async generateWeeklyReport(@CurrentUser() user: UserDocument) {
    const report = await this.wellnessReportsService.generateWeeklyReport(
      user._id.toString(),
    );

    return {
      status: HttpStatus.CREATED,
      message: 'Weekly report generated successfully',
      data: { report },
    };
  }

  @Post('reports/monthly')
  @ApiOperation({ summary: 'Generate monthly wellness report' })
  async generateMonthlyReport(@CurrentUser() user: UserDocument) {
    const report = await this.wellnessReportsService.generateMonthlyReport(
      user._id.toString(),
    );

    return {
      status: HttpStatus.CREATED,
      message: 'Monthly report generated successfully',
      data: { report },
    };
  }

  @Post('reports/comparison')
  @ApiOperation({ summary: 'Generate comparison report between periods' })
  async generateComparisonReport(
    @CurrentUser() user: UserDocument,
    @Body()
    periods: {
      current: { start: Date; end: Date };
      previous: { start: Date; end: Date };
    },
  ) {
    const comparison =
      await this.wellnessReportsService.generateComparisonReport(
        user._id.toString(),
        periods.current,
        periods.previous,
      );

    return {
      status: HttpStatus.OK,
      message: 'Comparison report generated successfully',
      data: comparison,
    };
  }

  // Utility Endpoints

  @Get('categories')
  @ApiOperation({ summary: 'Get available goal categories' })
  getGoalCategories() {
    const categories = [
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
    ];

    return {
      status: HttpStatus.OK,
      message: 'Goal categories retrieved successfully',
      data: { categories },
    };
  }

  @Get('health-check')
  @ApiOperation({ summary: 'Health check for wellness coaching service' })
  healthCheck() {
    return {
      status: HttpStatus.OK,
      message: 'Wellness coaching service is healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
