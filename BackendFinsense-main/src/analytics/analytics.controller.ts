import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnalyticsService } from './analytics.service';

@UseGuards(AuthGuard('jwt'))
@Controller('analytics')
export class AnalyticsController {
  constructor(private svc: AnalyticsService) {}

  @Get('summary')
  summary(@Req() req: any, @Query('period') period?: string) {
    return this.svc.getSummary(req.user.id, period);
  }

  @Get('benchmarks')
  benchmark(@Req() req: any, @Query('city') city?: string) {
    return this.svc.getBenchmarks(req.user.id, city);
  }

  @Get('monthly-comparison')
  monthlyComparison(@Req() req: any, @Query('months') months?: string) {
    return this.svc.getMonthlyComparison(req.user.id, months ? parseInt(months) : 6);
  }

  @Get('predictions')
  predictions(@Req() req: any) {
    return this.svc.getPredictions(req.user.id);
  }

  @Get('anomalies')
  anomalies(@Req() req: any) {
    return this.svc.getAnomalies(req.user.id);
  }

  @Get('heatmap')
  heatmap(@Req() req: any) {
    return this.svc.getHeatmap(req.user.id);
  }

  @Get('fugas')
  fugas(@Req() req: any, @Query('limit') limit?: string) {
    return this.svc.getMicroExpenses(req.user.id, limit ? Number(limit) : 200);
  }
}
