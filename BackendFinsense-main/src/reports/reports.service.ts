import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getTransactionsCsv(userId: string, period?: string, startDate?: string, endDate?: string): Promise<string> {
    const { start, end } = this.getPeriodRange(period, startDate, endDate);

    const transactions = await this.prisma.transaction.findMany({
      where: { userId, date: { gte: start, lte: end } },
      include: { category: true },
      orderBy: { date: 'desc' },
    });

    const headers = ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto'];
    const rows = transactions.map((t) => [
      new Date(t.date).toLocaleDateString('es-MX'),
      t.type === 'income' ? 'Ingreso' : 'Gasto',
      t.category?.name ?? 'Sin categoría',
      t.description ?? '',
      t.type === 'income' ? `+${t.amount}` : `-${t.amount}`,
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    return csv;
  }

  async getSummaryReport(userId: string, period?: string, startDate?: string, endDate?: string) {
    const { start, end } = this.getPeriodRange(period, startDate, endDate);

    const [transactions, investments] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId, date: { gte: start, lte: end } },
        include: { category: true },
        orderBy: { date: 'desc' },
      }),
      this.prisma.investment.findMany({ where: { userId } }),
    ]);

    const income = transactions.filter((t) => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
    const expenses = transactions.filter((t) => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);

    const byCategory: Record<string, { name: string; icon: string; color: string; total: number }> = {};
    transactions.filter((t) => t.type === 'expense').forEach((t) => {
      const key = t.categoryId ?? 'other';
      if (!byCategory[key]) {
        byCategory[key] = { name: t.category?.name ?? 'Otro', icon: t.category?.icon ?? '💰', color: t.category?.color ?? '#888', total: 0 };
      }
      byCategory[key].total += Number(t.amount);
    });

    const investmentSummary = {
      totalInvested: investments.reduce((acc, i) => acc + Number(i.initialAmount), 0),
      totalCurrentValue: investments.reduce((acc, i) => acc + Number(i.currentValue), 0),
    };

    return {
      period,
      dateRange: { start, end },
      income,
      expenses,
      balance: income - expenses,
      savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0,
      byCategory: Object.values(byCategory).sort((a, b) => b.total - a.total),
      transactions: transactions.map((t) => ({
        date: t.date,
        type: t.type,
        category: t.category?.name ?? 'Sin categoría',
        description: t.description,
        amount: Number(t.amount),
      })),
      investments: investmentSummary,
    };
  }

  private getPeriodRange(period?: string, startDateStr?: string, endDateStr?: string): { start: Date; end: Date } {
    if (startDateStr && endDateStr) {
      // Si recibimos un string, agregamos 'T00:00:00' para que start sea el inicio del día y end el final del día
      const start = new Date(`${startDateStr}T00:00:00`);
      const end = new Date(`${endDateStr}T23:59:59`);
      return { start, end };
    }

    const now = new Date();
    let start: Date;
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    if (period === 'day') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (period === 'week') {
      const day = now.getDay() || 7; 
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1, 0, 0, 0);
    } else if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'quarter') {
      const q = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), q * 3, 1);
    } else if (period === 'year') {
      start = new Date(now.getFullYear(), 0, 1);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { start, end };
  }
}
