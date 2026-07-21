import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto, UpdateTransactionDto } from './transactions.dto';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, filters: any) {
    const { category, type, startDate, endDate, groupId, q, limit = 50, page = 1 } = filters;
    const where: any = { userId };
    if (type) where.type = type;
    if (groupId) where.groupId = groupId;
    if (category) where.category = { name: category };
    if (q) {
      where.OR = [
        { description: { contains: q } },
        { category: { name: { contains: q } } },
      ];
    }
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: { category: true },
        orderBy: { date: 'desc' },
        take: Number(limit),
        skip: (Number(page) - 1) * Number(limit),
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { data, total, page: Number(page), limit: Number(limit) };
  }


  /** Maps frontend category slugs → DB category name fragments for lookup */
  private readonly SLUG_TO_NAME: Record<string, string> = {
    food:          'Alimentacion',
    transport:     'Transporte',
    university:    'Educacion',
    entertainment: 'Entretenimiento',
    services:      'Servicios',
    health:        'Salud',
    clothing:      'Ropa',
    savings:       'Ahorro',
    colectivo:     'Colectivo',
    pozol:         'Pozol',
    copias:        'Copias',
    renta:         'Renta',
    // Income slugs — map to "Otros" or the closest match
    salary:        'Sueldo',
    allowance:     'Mesada',
    scholarship:   'Beca',
    freelance:     'Negocio',
    gift:          'Regalo',
    other:         'Otro',
  };

  /** Returns a valid DB categoryId from a slug, a UUID, or a name fragment */
  private async resolveCategoryId(raw: string | undefined): Promise<string | undefined> {
    if (!raw) return undefined;

    // Already a UUID → check it actually exists
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(raw)) {
      const exists = await this.prisma.category.findUnique({ where: { id: raw } });
      return exists ? raw : undefined;
    }

    // Slug → name mapping
    const nameHint = this.SLUG_TO_NAME[raw] ?? raw;
    const cat = await this.prisma.category.findFirst({
      where: { name: { contains: nameHint } },
    });
    return cat?.id;
  }

  async create(userId: string, dto: CreateTransactionDto) {
    // Resolve the incoming categoryId (slug or UUID) to a real DB UUID
    let categoryId = await this.resolveCategoryId(dto.categoryId);

    // Fallback: try categoryName field
    if (!categoryId && dto.categoryName) {
      categoryId = await this.resolveCategoryId(dto.categoryName);
    }

    // Fallback: keyword-based auto-categorisation from description
    if (!categoryId && dto.description) {
      const categories = await this.prisma.category.findMany();
      const desc = dto.description.toLowerCase();
      const matched = categories.find(c => {
        const kws: string[] = JSON.parse(c.keywords || '[]');
        return kws.some(kw => desc.includes(kw.toLowerCase()));
      });
      if (matched) categoryId = matched.id;
    }

    const txDateStr = dto.date ? dto.date.split('T')[0] : null;
    const txDate = txDateStr ? new Date(`${txDateStr}T12:00:00Z`) : new Date();
    
    if (isNaN(txDate.getTime())) {
      throw new BadRequestException('La fecha proporcionada es inválida.');
    }

    const now = new Date();
    const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    


    const transaction = await this.prisma.transaction.create({
      data: {
        userId,
        amount: dto.amount,
        type: dto.type as any,
        categoryId,
        description: dto.description,
        date: txDate,
        groupId: dto.groupId,
      },
      include: { category: true },
    });

    // Update streak using the transaction date
    const streakResult = await this.updateStreak(userId, txDate);

    // Check if category limit exceeded
    try {
      if (transaction.type === 'expense' && transaction.categoryId) {
        const cat = await this.prisma.category.findUnique({ where: { id: transaction.categoryId } });
        
        const now = new Date();
        const currentMonth = now.toISOString().slice(0, 7); // "2026-07"
        
        const budget = await this.prisma.budget.findUnique({
          where: {
            userId_categoryId_month: {
              userId,
              categoryId: transaction.categoryId,
              month: currentMonth,
            },
          },
        });

        if (budget && cat) {
          const limit = Number(budget.limitAmount);
          const start = new Date(now.getFullYear(), now.getMonth(), 1);
          const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

          const total = await this.prisma.transaction.aggregate({
            where: {
              userId,
              categoryId: transaction.categoryId,
              type: 'expense',
              date: { gte: start, lte: end },
            },
            _sum: { amount: true },
          });
          
          const currentSum = Number(total._sum.amount || 0);
          
          if (currentSum > limit) {
            await this.prisma.notification.create({
              data: {
                userId,
                type: 'budget_exceeded',
                title: 'Límite de presupuesto excedido',
                body: `Has gastado $${currentSum.toFixed(2)} en ${cat.name}, superando tu presupuesto de $${limit.toFixed(2)}.`,
              },
            });
          } else if (currentSum >= limit * 0.9) {
            await this.prisma.notification.create({
              data: {
                userId,
                type: 'budget_warning',
                title: 'Alerta de presupuesto',
                body: `Has consumido el ${(currentSum / limit * 100).toFixed(0)}% de tu presupuesto para ${cat.name}.`,
              },
            });
          }
        }
      }
    } catch {}

    return { ...transaction, streakResult };
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    await this.findOne(userId, id);



    // Resolve slug → UUID if categoryId was provided
    const resolvedCategoryId = dto.categoryId
      ? await this.resolveCategoryId(dto.categoryId)
      : undefined;

    return this.prisma.transaction.update({
      where: { id },
      data: {
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.type !== undefined && { type: dto.type as any }),
        ...(resolvedCategoryId !== undefined && { categoryId: resolvedCategoryId }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.date && { date: new Date(`${dto.date.split('T')[0]}T12:00:00Z`) }),
      },
      include: { category: true },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.transaction.delete({ where: { id } });
  }

  async findOne(userId: string, id: string) {
    const t = await this.prisma.transaction.findFirst({ where: { id, userId } });
    if (!t) throw new NotFoundException('Transaction not found');
    return t;
  }

  private async updateStreak(userId: string, transactionDate: Date) {
    const txDay = new Date(transactionDate);
    txDay.setHours(0, 0, 0, 0);

    let streak = await this.prisma.streak.findUnique({ where: { userId } });
    if (!streak) {
      streak = await this.prisma.streak.create({ data: { userId } });
    }

    const last = streak.lastEntryDate ? new Date(streak.lastEntryDate) : null;
    let newStreak = streak.currentStreak;
    let longest = streak.longestStreak;
    let xpAwarded = 0;

    if (last) {
      last.setHours(0, 0, 0, 0);
      const diff = (txDay.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
      
      if (diff === 0) {
        // already registered on this day, no streak change
        if (newStreak === 0) {
          newStreak = 1;
          longest = Math.max(longest, 1);
        }
      } else if (diff === 1) {
        // next consecutive day
        newStreak = streak.currentStreak + 1;
        longest = Math.max(newStreak, streak.longestStreak);
      } else if (diff > 1) {
        // missed one or more days, streak resets to 1 (if the transaction is newer than last entry)
        newStreak = 1;
      }
      // If diff < 0 (entering past transaction), we don't update the streak or lastEntryDate
    } else {
      newStreak = 1;
      longest = 1;
    }

    // Only update if the transaction is on or after the last entry date
    if (!last || txDay >= last) {
      if (newStreak !== streak.currentStreak || !last) {
        streak = await this.prisma.streak.update({
          where: { userId },
          data: { currentStreak: newStreak, longestStreak: longest, lastEntryDate: txDay },
        });
        
        if (newStreak > streak.currentStreak || !last) {
          // Award XP
          xpAwarded = 10;
          await this.prisma.userXp.updateMany({
            where: { userId },
            data: { totalXp: { increment: xpAwarded } },
          });
        }
      }
    }

    // Fetch the updated XP state
    const userXp = await this.prisma.userXp.findUnique({ where: { userId } });
    
    return {
      currentStreak: newStreak,
      longestStreak: longest,
      xpAwarded,
      totalXp: userXp?.totalXp || 0,
      level: userXp?.level || 1,
    };
  }
}
