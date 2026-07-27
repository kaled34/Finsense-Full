import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const CATEGORY_META: Record<string, { label: string; emoji: string; color: string }> = {
  'Comida':           { label: 'Comida',         emoji: '🍽️', color: '#FF6B6B' },
  'Alimentacion':     { label: 'Alimentación',   emoji: '🍽️', color: '#FF6B6B' },
  'Transporte':       { label: 'Transporte',      emoji: '🚌', color: '#4ECDC4' },
  'Universidad':      { label: 'Universidad',     emoji: '📚', color: '#45B7D1' },
  'Educacion':        { label: 'Educación',       emoji: '📚', color: '#45B7D1' },
  'Entretenimiento':  { label: 'Entretenimiento', emoji: '🎮', color: '#A855F7' },
  'Servicios':        { label: 'Servicios',       emoji: '⚡', color: '#FFB800' },
  'Salud':            { label: 'Salud',           emoji: '💊', color: '#00C896' },
  'Ropa':             { label: 'Ropa',            emoji: '👕', color: '#FF8C00' },
  'Ahorro':           { label: 'Ahorro',          emoji: '🏦', color: '#0057FF' },
  'Otro':             { label: 'Otro',            emoji: '📦', color: '#6B7280' },
};

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getSummary(userId: string, period?: string) {
    const now = new Date();
    let start: Date;
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    if (period === 'week') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0);
    } else if (period === 'quarter') {
      start = new Date(now.getFullYear(), now.getMonth() - 3, 1, 0, 0, 0);
    } else if (period === 'year') {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    } else {
      // month (default)
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    }

    const transactions = await this.prisma.transaction.findMany({
      where: { userId, date: { gte: start, lte: end } },
      include: { category: true },
      orderBy: { date: 'asc' },
    });

    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((s, t) => s + Number(t.amount), 0);

    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0);

    const balance = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

    // topCategories
    const byCategory: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const key = t.category?.name || 'Otro';
        byCategory[key] = (byCategory[key] || 0) + Number(t.amount);
      });

    const topCategories = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount]) => {
        const meta = CATEGORY_META[name] || { label: name, emoji: '📦', color: '#6B7280' };
        return {
          categoryId: name.toLowerCase().replace(/\s/g, '_'),
          label: meta.label,
          emoji: meta.emoji,
          color: meta.color,
          amount,
          percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
          trend: 0,
        };
      });

    // Group based on period
    const weeklyData: Array<{ week: string; income: number; expenses: number }> = [];
    
    if (period === 'week') {
      const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const dailyMap: Record<string, { income: number; expenses: number }> = {};
      
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dayLabel = days[d.getDay()];
        dailyMap[dayLabel] = { income: 0, expenses: 0 };
      }
      
      transactions.forEach(t => {
        const d = new Date(t.date);
        const dayLabel = days[d.getDay()];
        if (dailyMap[dayLabel]) {
          if (t.type === 'income') dailyMap[dayLabel].income += Number(t.amount);
          else dailyMap[dayLabel].expenses += Number(t.amount);
        }
      });
      
      Object.entries(dailyMap).forEach(([day, v]) => {
        weeklyData.push({ week: day, ...v });
      });
    } else if (period === 'quarter') {
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const monthlyMap: Record<string, { income: number; expenses: number }> = {};
      
      for (let i = 2; i >= 0; i--) {
        const d = new Date(now);
        d.setMonth(now.getMonth() - i);
        const monthLabel = months[d.getMonth()];
        monthlyMap[monthLabel] = { income: 0, expenses: 0 };
      }
      
      transactions.forEach(t => {
        const d = new Date(t.date);
        const monthLabel = months[d.getMonth()];
        if (monthlyMap[monthLabel]) {
          if (t.type === 'income') monthlyMap[monthLabel].income += Number(t.amount);
          else monthlyMap[monthLabel].expenses += Number(t.amount);
        }
      });
      
      Object.entries(monthlyMap).forEach(([month, v]) => {
        weeklyData.push({ week: month, ...v });
      });
    } else {
      // month (default): S1 to S5
      const weeklyMap: Record<string, { income: number; expenses: number }> = {
        'S1': { income: 0, expenses: 0 },
        'S2': { income: 0, expenses: 0 },
        'S3': { income: 0, expenses: 0 },
        'S4': { income: 0, expenses: 0 },
        'S5': { income: 0, expenses: 0 },
      };
      
      transactions.forEach(t => {
        const d = new Date(t.date);
        const week = `S${Math.ceil(d.getDate() / 7)}`;
        if (weeklyMap[week]) {
          if (t.type === 'income') weeklyMap[week].income += Number(t.amount);
          else weeklyMap[week].expenses += Number(t.amount);
        }
      });
      
      Object.entries(weeklyMap).forEach(([week, v]) => {
        weeklyData.push({ week, ...v });
      });
    }

    // dailyData (last 30 days)
    const dailyMap: Record<string, { income: number; expenses: number }> = {};
    transactions.forEach(t => {
      const date = new Date(t.date).toISOString().split('T')[0];
      if (!dailyMap[date]) dailyMap[date] = { income: 0, expenses: 0 };
      if (t.type === 'income') dailyMap[date].income += Number(t.amount);
      else dailyMap[date].expenses += Number(t.amount);
    });
    const dailyData = Object.entries(dailyMap).map(([date, v]) => ({ date, ...v }));

    const daysInPeriod = period === 'week' ? 7 : period === 'quarter' ? 90 : period === 'year' ? 365 : new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dailyAverage = totalExpenses / daysInPeriod;

    return { period: period || 'month', totalIncome, totalExpenses, balance, savingsRate, dailyAverage, topCategories, weeklyData, dailyData };
  }

  async getBenchmarks(userId: string, city?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const targetCity = city || user?.city || 'Tuxtla Gutiérrez';
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let cityBenchmarks = await this.prisma.cityBenchmark.findMany({ where: { city: targetCity, month } });
    let resolvedMonth = month;
    if (cityBenchmarks.length === 0) {
      const latest = await this.prisma.cityBenchmark.findFirst({
        where: { city: targetCity },
        orderBy: { month: 'desc' },
      });
      if (latest) {
        resolvedMonth = latest.month;
        cityBenchmarks = await this.prisma.cityBenchmark.findMany({ where: { city: targetCity, month: resolvedMonth } });
      }
    }

    // User spending this month per category
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const txs = await this.prisma.transaction.findMany({
      where: { userId, type: 'expense', date: { gte: start, lte: end } },
      include: { category: true },
    });
    const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    const userByCategory: Record<string, number> = {};
    txs.forEach(t => {
      const key = normalize(t.category?.name || 'Otro');
      userByCategory[key] = (userByCategory[key] || 0) + Number(t.amount);
    });

    const benchmarks = cityBenchmarks.map(b => {
      const meta = CATEGORY_META[b.category] || { label: b.category, emoji: '📦', color: '#6B7280' };
      const normalizedKey = normalize(b.category);
      const userAmount = userByCategory[normalizedKey] || 0;
      const cityAverage = Number(b.avgAmount);
      const percentageDiff = cityAverage > 0 ? ((userAmount - cityAverage) / cityAverage) * 100 : 0;
      return { categoryId: b.category.toLowerCase(), label: meta.label, emoji: meta.emoji, userAmount, cityAverage, city: targetCity, percentageDiff };
    });

    const totalUser = txs.reduce((s, t) => s + Number(t.amount), 0);
    const totalAvg = cityBenchmarks.reduce((s, b) => s + Number(b.avgAmount), 0);
    const overallSavingsComparison = totalAvg > 0 ? ((totalUser - totalAvg) / totalAvg) * 100 : 0;

    const worstCategory = benchmarks.sort((a, b) => b.percentageDiff - a.percentageDiff)[0];
    const suggestion = worstCategory && worstCategory.percentageDiff > 10
      ? `Estás gastando ${worstCategory.percentageDiff.toFixed(0)}% más que el promedio en ${worstCategory.label}. ¡Considera reducir este gasto!`
      : 'Tus gastos están bien alineados con el promedio de Tuxtla. ¡Sigue así!';

    return { city: targetCity, period: resolvedMonth, benchmarks, overallSavingsComparison, suggestion };
  }

  async getMonthlyComparison(userId: string, months = 6) {
    const now = new Date();
    const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const result: Array<{ month: string; income: number; expenses: number; balance: number }> = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const agg = await this.prisma.transaction.groupBy({
        by: ['type'],
        where: { userId, date: { gte: start, lte: end } },
        _sum: { amount: true },
      });

      const income = Number(agg.find(r => r.type === 'income')?._sum?.amount ?? 0);
      const expenses = Number(agg.find(r => r.type === 'expense')?._sum?.amount ?? 0);
      result.push({ month: monthLabels[d.getMonth()], income, expenses, balance: income - expenses });
    }

    return result;
  }

  async getPredictions(userId: string) {
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    // Current month spending so far
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const txs = await this.prisma.transaction.findMany({
      where: { userId, type: 'expense', date: { gte: start, lte: now } },
      include: { category: true },
    });

    const spentSoFar = txs.reduce((acc, t) => acc + Number(t.amount), 0);
    const dailyAvg = dayOfMonth > 0 ? spentSoFar / dayOfMonth : 0;
    const projectedMonthTotal = dailyAvg * daysInMonth;
    const remainingDays = daysInMonth - dayOfMonth;
    const projectedRemaining = dailyAvg * remainingDays;

    // Historical average (last 3 months)
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const historicalTxs = await this.prisma.transaction.findMany({
      where: { userId, type: 'expense', date: { gte: threeMonthsAgo, lt: start } },
    });
    const historicalTotal = historicalTxs.reduce((acc, t) => acc + Number(t.amount), 0);
    const historicalMonthlyAvg = historicalTotal / 3;

    const trend = historicalMonthlyAvg > 0
      ? ((projectedMonthTotal - historicalMonthlyAvg) / historicalMonthlyAvg) * 100
      : 0;

    return {
      spentSoFar,
      dailyAvg,
      projectedMonthTotal,
      projectedRemaining,
      remainingDays,
      historicalMonthlyAvg,
      trend,
      isOverBudget: projectedMonthTotal > historicalMonthlyAvg,
    };
  }

  async getAnomalies(userId: string) {
    const now = new Date();
    // Current month
    const curStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const curEnd = now;
    // Last 3 months for baseline
    const histStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const histEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [curTxs, histTxs] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId, type: 'expense', date: { gte: curStart, lte: curEnd } },
        include: { category: true },
      }),
      this.prisma.transaction.findMany({
        where: { userId, type: 'expense', date: { gte: histStart, lte: histEnd } },
        include: { category: true },
      }),
    ]);

    // Aggregate by category
    const curByCategory: Record<string, { name: string; icon: string; total: number }> = {};
    curTxs.forEach(t => {
      const key = t.categoryId || 'other';
      if (!curByCategory[key]) curByCategory[key] = { name: t.category?.name ?? 'Otro', icon: t.category?.icon ?? '📦', total: 0 };
      curByCategory[key].total += Number(t.amount);
    });

    const histByCategory: Record<string, number> = {};
    histTxs.forEach(t => {
      const key = t.categoryId || 'other';
      histByCategory[key] = (histByCategory[key] || 0) + Number(t.amount);
    });

    const anomalies = Object.entries(curByCategory)
      .map(([catId, cur]) => {
        const histAvg = (histByCategory[catId] || 0) / 3;
        const multiple = histAvg > 0 ? cur.total / histAvg : 0;
        return { categoryId: catId, categoryName: cur.name, categoryIcon: cur.icon, currentAmount: cur.total, historicalAvg: histAvg, multiple };
      })
      .filter(a => a.multiple >= 1.5 && a.historicalAvg > 0)
      .sort((a, b) => b.multiple - a.multiple);

    return anomalies;
  }

  async getHeatmap(userId: string) {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - 365); // Last 365 days

    const transactions = await this.prisma.transaction.findMany({
      where: { userId, type: 'expense', date: { gte: start, lte: end } },
      select: { date: true, amount: true },
    });

    const dailyTotals: Record<string, number> = {};
    for (const t of transactions) {
      const dateStr = new Date(t.date).toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
      dailyTotals[dateStr] = (dailyTotals[dateStr] || 0) + Number(t.amount);
    }

    // Determine max to calculate relative intensity
    let maxSpend = 1;
    for (const amount of Object.values(dailyTotals)) {
      if (amount > maxSpend) maxSpend = amount;
    }

    const heatmap = [];
    const curr = new Date(start);
    while (curr <= end) {
      const dateStr = curr.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
      const amount = dailyTotals[dateStr] || 0;
      
      let level = 0;
      if (amount > 0) {
        const ratio = amount / maxSpend;
        if (ratio < 0.25) level = 1;
        else if (ratio < 0.5) level = 2;
        else if (ratio < 0.75) level = 3;
        else level = 4;
      }

      heatmap.push({ date: dateStr, amount, level });
      curr.setDate(curr.getDate() + 1);
    }

    return heatmap;
  }

  async getMicroExpenses(userId: string, limit: number) {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - 30); // Last 30 days for relevance

    const microExpenses = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: 'expense',
        amount: { lte: limit },
        date: { gte: start, lte: end }
      },
      include: { category: true },
      orderBy: { date: 'desc' }
    });

    const grouped: Record<string, { count: number; total: number; categoryId: string; categoryName: string; emoji: string; color: string }> = {};

    let totalLeaked = 0;

    for (const t of microExpenses) {
      // Group by description or category name if description is missing
      const key = (t.description || t.category?.name || 'Desconocido').toLowerCase().trim();
      
      if (!grouped[key]) {
        grouped[key] = {
          count: 0,
          total: 0,
          categoryId: t.category?.id || 'unknown',
          categoryName: t.category?.name || 'Varios',
          emoji: t.category?.icon || '🛒',
          color: t.category?.color || '#94a3b8'
        };
      }
      
      grouped[key].count += 1;
      grouped[key].total += Number(t.amount);
      totalLeaked += Number(t.amount);
    }

    // Convert to array and filter out things that only happened once
    const leaks = Object.entries(grouped)
      .map(([name, data]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        ...data
      }))
      .filter(leak => leak.count >= 2) // Must be recurring to be considered a "leak"
      .sort((a, b) => b.total - a.total);

    return {
      periodDays: 30,
      totalLeaked,
      limitApplied: limit,
      leaks
    };
  }
}
