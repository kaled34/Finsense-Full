import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BudgetsService } from './budgets.service';

@Controller('budgets')
@UseGuards(AuthGuard('jwt'))
export class BudgetsController {
  constructor(private budgetsService: BudgetsService) {}

  @Get()
  getBudgets(@Req() req: any, @Query('month') month?: string) {
    return this.budgetsService.getBudgets(req.user.id, month);
  }

  @Get('categories')
  getCategories() {
    return this.budgetsService.getCategories();
  }

  @Post()
  createBudget(@Req() req: any, @Body() body: { categoryId: string; limitAmount: number; month?: string }) {
    return this.budgetsService.createBudget(req.user.id, body);
  }

  @Put(':id')
  updateBudget(@Req() req: any, @Param('id') id: string, @Body() body: { limitAmount: number }) {
    return this.budgetsService.updateBudget(req.user.id, id, body);
  }

  @Delete(':id')
  deleteBudget(@Req() req: any, @Param('id') id: string) {
    return this.budgetsService.deleteBudget(req.user.id, id);
  }
}
