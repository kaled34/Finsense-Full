import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService) {}

  async getBudgets(userId: string, month?: string) {
    const targetMonth = month || new Date().toISOString().slice(0, 7); // "2026-07"
    const [startDate, endDate] = this.getMonthRange(targetMonth);

    const budgets = await this.prisma.budget.findMany({
      where: { userId, month: targetMonth },
      include: { category: true },
    });

    // For each budget, calculate real spending this month
    const result = await Promise.all(
      budgets.map(async (budget) => {
        const spent = await this.prisma.transaction.aggregate({
          where: {
            userId,
            categoryId: budget.categoryId,
            type: 'expense',
            date: { gte: startDate, lte: endDate },
          },
          _sum: { amount: true },
        });
        const spentAmount = Number(spent._sum.amount ?? 0);
        const limit = Number(budget.limitAmount);
        const pct = limit > 0 ? (spentAmount / limit) * 100 : 0;
        return {
          id: budget.id,
          categoryId: budget.categoryId,
          categoryName: budget.category.name,
          categoryIcon: budget.category.icon,
          categoryColor: budget.category.color,
          limit,
          spent: spentAmount,
          pct: Math.min(pct, 100),
          status: pct >= 100 ? 'exceeded' : pct >= 80 ? 'warning' : 'healthy',
          month: budget.month,
        };
      }),
    );

    return result;
  }

  async createBudget(userId: string, body: { categoryId: string; limitAmount: number; month?: string }) {
    const month = body.month || new Date().toISOString().slice(0, 7);
    return this.prisma.budget.upsert({
      where: { userId_categoryId_month: { userId, categoryId: body.categoryId, month } },
      update: { limitAmount: body.limitAmount },
      create: { userId, categoryId: body.categoryId, limitAmount: body.limitAmount, month },
    });
  }

  async updateBudget(userId: string, id: string, body: { limitAmount: number }) {
    return this.prisma.budget.updateMany({
      where: { id, userId },
      data: { limitAmount: body.limitAmount },
    });
  }

  async deleteBudget(userId: string, id: string) {
    return this.prisma.budget.deleteMany({ where: { id, userId } });
  }

  async getCategories() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  private getMonthRange(month: string): [Date, Date] {
    const [year, m] = month.split('-').map(Number);
    const start = new Date(year, m - 1, 1);
    const end = new Date(year, m, 0, 23, 59, 59);
    return [start, end];
  }
}
