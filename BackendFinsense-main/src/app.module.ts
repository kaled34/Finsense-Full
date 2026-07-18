import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TransactionsModule } from './transactions/transactions.module';
import { GoalsModule } from './goals/goals.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { GroupsModule } from './groups/groups.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ChatModule } from './chat/chat.module';
import { GamificationModule } from './gamification/gamification.module';
import { BudgetsModule } from './budgets/budgets.module';
import { InvestmentsModule } from './investments/investments.module';
import { ChallengesModule } from './challenges/challenges.module';
import { ReportsModule } from './reports/reports.module';
import { CalendarEventsModule } from './calendar-events/calendar-events.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    TransactionsModule,
    GoalsModule,
    AnalyticsModule,
    GroupsModule,
    SubscriptionsModule,
    NotificationsModule,
    ChatModule,
    GamificationModule,
    BudgetsModule,
    InvestmentsModule,
    ChallengesModule,
    ReportsModule,
    CalendarEventsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
