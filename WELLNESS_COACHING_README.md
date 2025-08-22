# Wellness Coaching & Goal Tracking Features

## Overview

This implementation provides comprehensive wellness coaching and goal tracking features including:

- **SMART Goal Setting Wizard** with AI-powered suggestions
- **Progress Dashboards & Charts** with real-time analytics
- **Milestone Celebrations** and adaptive adjustments
- **Weekly/Monthly Wellness Reports** with AI insights

## Features Implemented

### 1. SMART Goal Setting Wizard
- **Location**: `src/wellness-coaching/wellness-coaching.service.ts`
- **AI-Powered Suggestions**: Generate personalized SMART goals based on user context
- **Categories**: Physical activity, nutrition, sleep, mental health, stress management, etc.
- **Smart Criteria**: Specific, Measurable, Achievable, Relevant, Time-bound validation

### 2. Progress Dashboards & Charts
- **Location**: `src/wellness-coaching/progress-tracking.service.ts`
- **Dashboard Metrics**: Goal completion rates, consistency scores, mood/confidence trends
- **Chart Types**: Progress over time, category breakdown, mood/confidence tracking
- **Real-time Analytics**: Streak analysis, category performance, upcoming deadlines

### 3. Milestone Celebrations & Adaptive Adjustments
- **Location**: `src/wellness-coaching/celebration.service.ts`
- **Celebration Types**: Goal completion, milestone achievements, consistency streaks
- **Adaptive AI**: Timeline adjustments, target modifications, approach suggestions
- **Rewards System**: Badges, points, personalized suggestions

### 4. Weekly/Monthly Wellness Reports
- **Location**: `src/wellness-coaching/wellness-reports.service.ts`
- **Report Types**: Weekly, monthly, quarterly, annual, custom periods
- **AI Insights**: Pattern recognition, achievement summaries, recommendations
- **Comparison Reports**: Period-over-period progress analysis

## API Endpoints

### Goal Management
- `POST /wellness-coaching/goals` - Create new SMART goal
- `GET /wellness-coaching/goals` - Get user goals with filtering
- `PUT /wellness-coaching/goals/:goalId` - Update existing goal
- `DELETE /wellness-coaching/goals/:goalId` - Delete goal

### Progress Tracking
- `POST /wellness-coaching/goals/:goalId/progress` - Add progress entry
- `POST /wellness-coaching/goals/:goalId/milestones` - Add milestone
- `GET /wellness-coaching/dashboard` - Get comprehensive dashboard data
- `GET /wellness-coaching/analytics/progress-chart` - Get progress charts

### AI-Powered Features
- `POST /wellness-coaching/ai/goal-suggestions` - Get SMART goal suggestions
- `GET /wellness-coaching/ai/adaptive-adjustments/:goalId` - Get adaptive adjustments
- `POST /wellness-coaching/ai/adaptive-adjustments/:adjustmentId/apply` - Apply adjustment

### Reports & Analytics
- `POST /wellness-coaching/reports/generate` - Generate custom report
- `GET /wellness-coaching/reports` - Get recent reports
- `POST /wellness-coaching/reports/weekly` - Generate weekly report
- `POST /wellness-coaching/reports/monthly` - Generate monthly report

### Celebrations
- `GET /wellness-coaching/celebrations` - Get recent celebrations
- `POST /wellness-coaching/celebrations/:goalId` - Create celebration

## Database Schemas

### WellnessGoal Schema
```typescript
{
  userId: ObjectId,
  title: string,
  description: string,
  category: enum,
  smartCriteria: {
    specific: string,
    measurable: string,
    achievable: string,
    relevant: string,
    timeBound: string
  },
  targetValue: number,
  currentValue: number,
  milestones: Array,
  progressEntries: Array,
  aiInsights: Object
}
```

### WellnessReport Schema
```typescript
{
  userId: ObjectId,
  type: enum,
  period: { start: Date, end: Date },
  metrics: Object,
  insights: Object,
  categoryBreakdown: Array,
  celebrations: Array
}
```

## Integration

The wellness coaching module is integrated into the main application:

1. **Module Registration**: Added to `src/app.module.ts`
2. **Authentication**: Uses existing JWT authentication
3. **AI Integration**: Leverages existing AI and RAG services
4. **Database**: Uses existing MongoDB connection

## Key Features

### SMART Goal Wizard
- AI analyzes user context and health conditions
- Generates personalized goal suggestions
- Validates SMART criteria completeness
- Provides difficulty assessment and prerequisites

### Progress Dashboard
- Real-time progress tracking with charts
- Category-wise performance analysis
- Streak tracking and consistency scoring
- Mood and confidence trend analysis

### Milestone Celebrations
- Automatic detection of achievements
- Personalized celebration messages
- Badge and point reward system
- Shareable achievement content

### Adaptive Adjustments
- AI-powered goal modification suggestions
- Timeline and target adjustments
- Approach strategy recommendations
- User feedback integration

### Wellness Reports
- Comprehensive period analysis
- AI-generated insights and patterns
- Comparison between time periods
- Actionable recommendations

## Future Enhancements

1. **Mobile Push Notifications** for milestone celebrations
2. **Social Features** for sharing achievements
3. **Integration with Wearables** for automatic progress tracking
4. **Advanced ML Models** for better predictions
5. **Group Challenges** and community features
6. **Personalized Coaching Plans** based on user patterns

## Usage Examples

### Creating a SMART Goal
```typescript
const goal = await wellnessCoachingService.createGoal(userId, {
  title: "Daily Walking Goal",
  description: "Walk 10,000 steps daily for better health",
  category: "physical_activity",
  priority: "high",
  smartCriteria: {
    specific: "Walk 10,000 steps every day",
    measurable: "Track steps using phone/fitness tracker",
    achievable: "Gradually increase from current 6,000 steps",
    relevant: "Improves cardiovascular health and weight management",
    timeBound: "Achieve consistent 10,000 steps within 4 weeks"
  },
  targetValue: 10000,
  unit: "steps",
  startDate: new Date(),
  targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  tags: ["fitness", "cardio", "daily"]
});
```

### Adding Progress
```typescript
await wellnessCoachingService.addProgressEntry(goalId, userId, {
  value: 8500,
  date: new Date(),
  notes: "Great walk in the park today!",
  mood: 4,
  confidence: 4,
  challenges: ["rain", "time_constraints"]
});
```

### Generating AI Suggestions
```typescript
const suggestions = await wellnessCoachingService.generateSmartGoalSuggestions(userId, {
  categories: ["physical_activity", "nutrition"],
  healthConditions: ["diabetes"],
  fitnessLevel: "beginner",
  availableTimePerDay: 60,
  preferredDuration: 8
});
```

This comprehensive wellness coaching system provides users with AI-powered goal setting, progress tracking, and adaptive coaching to help them achieve their health and wellness objectives.
