import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import yahooFinance from 'yahoo-finance2';

@Injectable()
export class InvestmentsService {
  constructor(private prisma: PrismaService) {}

  async getInvestments(userId: string) {
    const investments = await this.prisma.investment.findMany({
      where: { userId },
      orderBy: { purchaseDate: 'desc' },
    });

    const totalInvested = investments.reduce((acc, i) => acc + Number(i.initialAmount), 0);
    const totalCurrentValue = investments.reduce((acc, i) => acc + Number(i.currentValue), 0);
    const totalGainLoss = totalCurrentValue - totalInvested;
    const totalGainLossPct = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

    return {
      investments: investments.map((i) => ({
        id: i.id,
        name: i.name,
        type: i.type,
        initialAmount: Number(i.initialAmount),
        currentValue: Number(i.currentValue),
        gainLoss: Number(i.currentValue) - Number(i.initialAmount),
        gainLossPct: Number(i.initialAmount) > 0
          ? ((Number(i.currentValue) - Number(i.initialAmount)) / Number(i.initialAmount)) * 100
          : 0,
        purchaseDate: i.purchaseDate,
        notes: i.notes,
        createdAt: i.createdAt,
        ticker: i.ticker,
        shares: i.shares ? Number(i.shares) : null,
      })),
      summary: {
        totalInvested,
        totalCurrentValue,
        totalGainLoss,
        totalGainLossPct,
        count: investments.length,
      },
    };
  }

  async createInvestment(userId: string, body: {
    name: string;
    type: string;
    initialAmount: number;
    currentValue: number;
    purchaseDate: string;
    notes?: string;
    ticker?: string;
    shares?: number;
  }) {
    let finalInitialAmount = body.initialAmount;
    let finalCurrentValue = body.currentValue;

    // If ticker and shares are provided, try to fetch real-time price for better accuracy
    if (body.ticker && body.shares) {
      try {
        const quote = await yahooFinance.quote(body.ticker) as any;
        if (quote && quote.regularMarketPrice) {
          finalInitialAmount = quote.regularMarketPrice * body.shares;
          finalCurrentValue = finalInitialAmount;
        }
      } catch (err) {
        Logger.warn(`Could not fetch quote for ${body.ticker} on creation`, 'InvestmentsService');
      }
    }

    return this.prisma.investment.create({
      data: {
        userId,
        name: body.name,
        type: body.type,
        ticker: body.ticker,
        shares: body.shares,
        initialAmount: finalInitialAmount,
        currentValue: finalCurrentValue,
        purchaseDate: new Date(body.purchaseDate),
        notes: body.notes,
      },
    });
  }

  async searchTicker(query: string) {
    if (!query || query.length < 2) return [];
    try {
      const results = await yahooFinance.search(query) as any;
      return (results.quotes || [])
        .filter((q: any) => ['EQUITY', 'CRYPTOCURRENCY', 'ETF', 'CURRENCY', 'MUTUALFUND'].includes(q.quoteType))
        .map((q: any) => ({
          symbol: q.symbol,
          name: q.shortname || q.longname || q.symbol,
          exchange: q.exchange,
          type: q.quoteType,
        }));
    } catch (err) {
      Logger.error(`Error searching ticker ${query}`, err, 'InvestmentsService');
      return [];
    }
  }

  async syncInvestments(userId: string) {
    const investments = await this.prisma.investment.findMany({
      where: { userId, ticker: { not: null }, shares: { not: null } },
    });

    if (investments.length === 0) return { synced: 0 };

    let syncedCount = 0;
    for (const inv of investments) {
      if (!inv.ticker || !inv.shares) continue;
      try {
        const quote = await yahooFinance.quote(inv.ticker) as any;
        if (quote && quote.regularMarketPrice) {
          const newCurrentValue = Number(inv.shares) * quote.regularMarketPrice;
          await this.prisma.investment.update({
            where: { id: inv.id },
            data: { currentValue: newCurrentValue, updatedAt: new Date() },
          });
          syncedCount++;
        }
      } catch (err) {
        Logger.warn(`Failed to sync ${inv.ticker}`, 'InvestmentsService');
      }
    }

    return { synced: syncedCount };
  }

  async updateInvestment(userId: string, id: string, body: { currentValue?: number; name?: string; notes?: string }) {
    const existing = await this.prisma.investment.findFirst({ where: { id, userId } });
    if (!existing) throw new Error('Investment not found');

    return this.prisma.investment.update({
      where: { id },
      data: {
        ...(body.currentValue !== undefined && { currentValue: body.currentValue }),
        ...(body.name !== undefined && { name: body.name }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
    });
  }

  async deleteInvestment(userId: string, id: string) {
    return this.prisma.investment.deleteMany({ where: { id, userId } });
  }
}
