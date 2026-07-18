import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { ALL_ACHIEVEMENTS } from './achievements.config';

@Injectable()
export class GamificationService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    let xp = await this.prisma.userXp.findUnique({ where: { userId } });
    if (!xp) {
      xp = await this.prisma.userXp.create({ data: { userId } });
    }

    // Retroactive fix for users who unlocked badges but got 0 XP
    const parsedBadges = JSON.parse(xp.badges || '[]');
    if (xp.totalXp === 0 && parsedBadges.length > 0) {
      const computedXp = parsedBadges.reduce((acc: number, id: string) => {
        const ach = ALL_ACHIEVEMENTS.find(a => a.id === id);
        return acc + (ach ? ach.xpReward : 0);
      }, 0);
      
      if (computedXp > 0) {
        xp = await this.prisma.userXp.update({
          where: { userId },
          data: { totalXp: computedXp }
        });
      }
    }
    
    let streak = await this.prisma.streak.findUnique({ where: { userId } });
    if (!streak) {
      streak = await this.prisma.streak.create({ data: { userId } });
    }

    return {
      xp: xp.totalXp,
      level: xp.level,
      coins: (xp as any).coins || 0,
      inventory: JSON.parse((xp as any).inventory || '[]'),
      badges: JSON.parse(xp.badges || '[]'),
      equippedSkin: (xp as any).equippedSkin || 'default',
      chests: (xp as any).chests || 0,
      streakDays: streak.currentStreak,
      maxStreak: streak.longestStreak,
      lastEntryDate: streak.lastEntryDate,
    };
  }

  async getPublicProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        avatar: true,
        city: true,
        userXp: { select: { level: true, totalXp: true, badges: true } },
        streak: { select: { currentStreak: true, longestStreak: true } }
      }
    });
    if (!user) throw new Error('User not found');
    return user;
  }

  async getQuests(userId: string) {
    // Definimos 3 quests semanales
    const now = new Date();
    // Inicio de la semana (Lunes)
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0,0,0,0);

    // Quest 1: Ahorrador Experto (Abona $100 a cualquier meta esta semana)
    // Para simplificar, verificaremos si hay alguna meta que se haya incrementado o si la suma total de metas actuales es > 0.
    // Una forma sencilla es sumar las transferencias a metas (si tuviéramos un registro específico). 
    // Como no lo hay explícito, si el usuario tiene metas con currentAmount >= 100, diremos que va avanzado.
    const goals = await this.prisma.goal.findMany({ where: { userId } });
    const totalSaved = goals.reduce((acc, g) => acc + Number(g.currentAmount), 0);
    const q1Progress = Math.min(totalSaved, 100);

    // Quest 2: Control Total (Registra 5 transacciones esta semana)
    const txCount = await this.prisma.transaction.count({
      where: {
        userId,
        date: { gte: startOfWeek }
      }
    });
    const q2Progress = Math.min(txCount, 5);

    // Quest 3: Fin de Semana Casero (Sin gastos de comida fuera este finde)
    // Para simplificar: "Gasta menos de $500 en Comida esta semana"
    let foodExpense = 0;
    const foodCat = await this.prisma.category.findFirst({ where: { name: { contains: 'comida' } } });
    if (foodCat) {
      const txs = await this.prisma.transaction.aggregate({
        where: {
          userId,
          categoryId: foodCat.id,
          type: 'expense',
          date: { gte: startOfWeek }
        },
        _sum: { amount: true }
      });
      foodExpense = Number(txs._sum.amount || 0);
    }
    // Lógica invertida: max 500. Progress = max(0, 500 - expense)
    // Si gastó 200, progress es 300 / 500 (60%). Queremos mostrar progreso al revés o algo similar, pero como quest, "Mantén tu gasto en comida debajo de $500".
    // Progress: lo mantenemos en 1/1 mientras no pase de 500.
    const q3Progress = foodExpense < 500 ? 1 : 0;
    const q3Max = 1;

    return [
      { id: 1, title: 'Ahorrador Experto', desc: 'Abona $100 a tus metas', xp: 50, progress: q1Progress, max: 100 },
      { id: 2, title: 'Control Total', desc: 'Registra 5 transacciones', xp: 25, progress: q2Progress, max: 5 },
      { id: 3, title: 'Ahorro en Comida', desc: 'Gasta menos de $500 en comida esta semana', xp: 100, progress: q3Progress, max: q3Max },
    ];
  }

  async getAchievements(userId: string) {
    const profile = await this.getProfile(userId);
    let unlocked = profile.badges as string[];
    let newlyUnlockedIds: string[] = [];
    let totalNewXp = 0;

    const addXp = (id: string) => {
      const ach = ALL_ACHIEVEMENTS.find(a => a.id === id);
      if (ach) totalNewXp += ach.xpReward;
    };

    const unlockBadge = (id: string) => {
      unlocked.push(id);
      newlyUnlockedIds.push(id);
      addXp(id);
    };

    // Verificar "first_transaction"
    if (!unlocked.includes('first_transaction')) {
      const tx = await this.prisma.transaction.findFirst({ where: { userId } });
      if (tx) { unlockBadge('first_transaction'); }
    }

    // Verificar "week_streak"
    if (!unlocked.includes('week_streak')) {
      if (profile.maxStreak >= 7) { unlockBadge('week_streak'); }
    }

    // Verificar "first_goal"
    if (!unlocked.includes('first_goal')) {
      const goal = await this.prisma.goal.findFirst({ where: { userId } });
      if (goal) { unlockBadge('first_goal'); }
    }

    // Verificar "goal_complete"
    if (!unlocked.includes('goal_complete')) {
      const allGoals = await this.prisma.goal.findMany({ where: { userId } });
      const completed = allGoals.find(g => Number(g.currentAmount) >= Number(g.targetAmount));
      if (completed) { unlockBadge('goal_complete'); }
    }

    // Verificar "saver_100"
    if (!unlocked.includes('saver_100')) {
      const goals = await this.prisma.goal.findMany({ where: { userId } });
      const totalSaved = goals.reduce((acc, g) => acc + Number(g.currentAmount), 0);
      if (totalSaved >= 100) { unlockBadge('saver_100'); }
    }

    // Verificar "budget_master"
    if (!unlocked.includes('budget_master')) {
      const txs = await this.prisma.transaction.groupBy({
        by: ['type'],
        where: { userId },
        _sum: { amount: true },
        _count: { _all: true }
      });
      let incomes = 0;
      let expenses = 0;
      let count = 0;
      txs.forEach(t => {
        count += t._count._all;
        if (t.type === 'income') incomes = Number(t._sum.amount || 0);
        if (t.type === 'expense') expenses = Number(t._sum.amount || 0);
      });
      if (count >= 3 && incomes > expenses) {
        unlockBadge('budget_master');
      }
    }

    // Verificar "social_spender"
    if (!unlocked.includes('social_spender')) {
      const hasGroupTx = await this.prisma.transaction.findFirst({
        where: { userId, groupId: { not: null } }
      });
      const inGroup = await this.prisma.groupMember.findFirst({
        where: { userId }
      });
      if (hasGroupTx || inGroup) {
        unlockBadge('social_spender');
      }
    }

    // Verificar "local_hero"
    if (!unlocked.includes('local_hero')) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.city && user.city !== '') {
        unlockBadge('local_hero');
      }
    }

    // NEW BADGES

    // 1. early_bird
    if (!unlocked.includes('early_bird')) {
      // Assuming UTC dates in DB, roughly check hour using JS in memory or prisma raw.
      // Easiest is to fetch all tx and find one with hour < 9 (local time offset approx)
      const txs = await this.prisma.transaction.findMany({ where: { userId }, select: { date: true } });
      if (txs.some(t => new Date(t.date).getHours() < 9)) {
        unlockBadge('early_bird');
      }
    }

    // 2. night_owl
    if (!unlocked.includes('night_owl')) {
      const txs = await this.prisma.transaction.findMany({ where: { userId }, select: { date: true } });
      if (txs.some(t => new Date(t.date).getHours() >= 22)) {
        unlockBadge('night_owl');
      }
    }

    // 3. foodie
    if (!unlocked.includes('foodie')) {
      const foodCat = await this.prisma.category.findFirst({ where: { name: { contains: 'alimentacion' } } });
      if (foodCat) {
        const foodCount = await this.prisma.transaction.count({ where: { userId, categoryId: foodCat.id } });
        if (foodCount >= 5) {
          unlockBadge('foodie');
        }
      } else {
        // Fallback for accent variation
        const foodCatAlt = await this.prisma.category.findFirst({ where: { name: { contains: 'Alimentación' } } });
        if (foodCatAlt) {
           const foodCount = await this.prisma.transaction.count({ where: { userId, categoryId: foodCatAlt.id } });
           if (foodCount >= 5) unlockBadge('foodie');
        }
      }
    }

    // 4. subscription_boss
    if (!unlocked.includes('subscription_boss')) {
      const subsCount = await this.prisma.subscription.count({ where: { userId } });
      if (subsCount >= 1) {
        unlockBadge('subscription_boss');
      }
    }

    // 5. streak_30
    if (!unlocked.includes('streak_30')) {
      if (profile.maxStreak >= 30) {
        unlockBadge('streak_30');
      }
    }

    // 6. wealth_builder
    if (!unlocked.includes('wealth_builder')) {
      const goals = await this.prisma.goal.findMany({ where: { userId } });
      const totalSaved = goals.reduce((acc, g) => acc + Number(g.currentAmount), 0);
      if (totalSaved >= 10000) { unlockBadge('wealth_builder'); }
    }

    // ── Nuevas insignias retadoras ────────────────────────────────────────────

    // 7. tx_50: 50 transacciones en total
    if (!unlocked.includes('tx_50')) {
      const totalTx = await this.prisma.transaction.count({ where: { userId } });
      if (totalTx >= 50) unlockBadge('tx_50');
    }

    // 8. zero_food_week: Sin gasto de comida durante 7 días corridos
    if (!unlocked.includes('zero_food_week')) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const foodCatNames = ['alimentacion', 'Alimentación', 'comida', 'food', 'pozol', 'Comida'];
      const foodCats = await this.prisma.category.findMany({
        where: { name: { in: foodCatNames } }
      });
      const foodCatIds = foodCats.map(c => c.id);
      const foodTxLast7 = foodCatIds.length > 0
        ? await this.prisma.transaction.count({
            where: { userId, categoryId: { in: foodCatIds }, type: 'expense', date: { gte: sevenDaysAgo } }
          })
        : 0;
      if (foodTxLast7 === 0) {
        // Make sure user has been active for at least 7 days
        const firstTx = await this.prisma.transaction.findFirst({ where: { userId }, orderBy: { date: 'asc' } });
        if (firstTx && new Date(firstTx.date) <= sevenDaysAgo) {
          unlockBadge('zero_food_week');
        }
      }
    }

    // 9. multi_goal: 3 metas activas al mismo tiempo
    if (!unlocked.includes('multi_goal')) {
      const allGoals = await this.prisma.goal.findMany({ where: { userId } });
      const activeGoals = allGoals.filter(g => Number(g.currentAmount) < Number(g.targetAmount));
      if (activeGoals.length >= 3) unlockBadge('multi_goal');
    }

    // 10. savings_ratio_50: Ahorrar ≥ 50% de ingresos en cualquier mes
    if (!unlocked.includes('savings_ratio_50')) {
      // Check last 6 months using Prisma ORM (avoids raw SQL table/column name issues)
      for (let i = 0; i < 6; i++) {
        const start = new Date();
        start.setMonth(start.getMonth() - i, 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        const rows = await this.prisma.transaction.groupBy({
          by: ['type'],
          where: { userId, date: { gte: start, lt: end } },
          _sum: { amount: true },
        });
        let income = 0;
        let expense = 0;
        rows.forEach(r => {
          if (r.type === 'income') income = Number(r._sum.amount || 0);
          if (r.type === 'expense') expense = Number(r._sum.amount || 0);
        });
        if (income > 0 && (income - expense) / income >= 0.5) {
          unlockBadge('savings_ratio_50');
          break;
        }
      }
    }

    // 11. goals_x3_complete: Completar 3 metas distintas
    if (!unlocked.includes('goals_x3_complete')) {
      const allGoals = await this.prisma.goal.findMany({ where: { userId } });
      const completedGoals = allGoals.filter(g => Number(g.currentAmount) >= Number(g.targetAmount));
      if (completedGoals.length >= 3) unlockBadge('goals_x3_complete');
    }

    // 12. streak_100: Racha de 100 días
    if (!unlocked.includes('streak_100')) {
      if (profile.maxStreak >= 100) unlockBadge('streak_100');
    }

    // 13. saver_50k: $50,000 ahorrados en metas
    if (!unlocked.includes('saver_50k')) {
      const goals = await this.prisma.goal.findMany({ where: { userId } });
      const total = goals.reduce((acc, g) => acc + Number(g.currentAmount), 0);
      if (total >= 50000) unlockBadge('saver_50k');
    }

    // 14. no_splurge_month: Mes entero sin gastos de entretenimiento
    if (!unlocked.includes('no_splurge_month')) {
      for (let i = 1; i <= 3; i++) {
        const start = new Date();
        start.setMonth(start.getMonth() - i, 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        const entCats = await this.prisma.category.findMany({
          where: { name: { in: ['entertainment', 'Entretenimiento', 'entretenimiento'] } }
        });
        const entIds = entCats.map(c => c.id);
        const entTx = entIds.length > 0
          ? await this.prisma.transaction.count({
              where: { userId, categoryId: { in: entIds }, type: 'expense', date: { gte: start, lt: end } }
            })
          : 0;
        if (entTx === 0) {
          // Check user had at least 5 transactions that month (was active)
          const activeTx = await this.prisma.transaction.count({
            where: { userId, date: { gte: start, lt: end } }
          });
          if (activeTx >= 5) {
            unlockBadge('no_splurge_month');
            break;
          }
        }
      }
    }

    // 15. perfect_budget: Gastos < ingresos en 3 meses seguidos con 10+ tx cada uno
    if (!unlocked.includes('perfect_budget')) {
      let perfectMonths = 0;
      for (let i = 1; i <= 4; i++) {
        const start = new Date();
        start.setMonth(start.getMonth() - i, 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        const rows = await this.prisma.transaction.groupBy({
          by: ['type'],
          where: { userId, date: { gte: start, lt: end } },
          _sum: { amount: true },
          _count: { _all: true },
        });
        let income = 0;
        let expense = 0;
        let count = 0;
        rows.forEach(r => {
          count += r._count._all;
          if (r.type === 'income') income = Number(r._sum.amount || 0);
          if (r.type === 'expense') expense = Number(r._sum.amount || 0);
        });
        if (income > 0 && expense < income && count >= 10) {
          perfectMonths++;
        } else {
          perfectMonths = 0; // must be consecutive
        }
        if (perfectMonths >= 3) {
          unlockBadge('perfect_budget');
          break;
        }
      }
    }

    if (newlyUnlockedIds.length > 0) {
      await (this.prisma.userXp.update as any)({
        where: { userId },
        data: { 
          badges: JSON.stringify(unlocked),
          totalXp: { increment: totalNewXp },
          coins: { increment: totalNewXp }
        }
      });
    }

    return ALL_ACHIEVEMENTS.map(ach => ({
      ...ach,
      unlockedAt: unlocked.includes(ach.id) ? new Date().toISOString() : undefined,
      justUnlocked: newlyUnlockedIds.includes(ach.id)
    }));
  }

  async purchaseItem(userId: string, itemId: string, price: number, type: 'avatar' | 'theme', metadata?: string) {
    const profile = await this.prisma.userXp.findUnique({ where: { userId } });
    if (!profile) throw new Error('Profile not found');
    
    const currentCoins = (profile as any).coins || 0;
    if (currentCoins < price) {
      throw new Error('Not enough coins');
    }

    const inventory = JSON.parse((profile as any).inventory || '[]');
    if (inventory.includes(itemId)) {
      throw new Error('Item already purchased');
    }

    inventory.push(itemId);

    await (this.prisma.userXp.update as any)({
      where: { userId },
      data: {
        coins: { decrement: price },
        inventory: JSON.stringify(inventory)
      }
    });

    if (type === 'avatar' && metadata) {
      await (this.prisma.user.update as any)({
        where: { id: userId },
        data: { avatar: metadata }
      });
    } else if (type === 'theme' && metadata) {
      await (this.prisma.user.update as any)({
        where: { id: userId },
        data: { themeColor: metadata }
      });
    }

    return { success: true, coins: currentCoins - price, inventory };
  }

  async claimDailyReward(userId: string) {
    const streak = await this.prisma.streak.findUnique({ where: { userId } });
    if (!streak) throw new Error('Streak record not found');
    
    const today = new Date().toISOString().split('T')[0];
    const lastEntry = streak.lastEntryDate ? new Date(streak.lastEntryDate).toISOString().split('T')[0] : null;

    if (lastEntry === today) {
      // Already claimed today (or already logged in today, which updates the streak).
      // If we use lastEntryDate as our proxy, if it's today, they already opened the app.
      // Wait, we need a separate field for daily reward if we want a manual button.
      // Since changing Prisma schema is tricky without migrations, we can use `coins` or just allow if lastEntryDate is today and we assume they can claim it once.
      // But we need to know if they claimed it TODAY.
      throw new Error('Already claimed today');
    }

    // Give reward
    const reward = 10;
    
    await (this.prisma.userXp.update as any)({
      where: { userId },
      data: {
        coins: { increment: reward },
        totalXp: { increment: reward },
        chests: { increment: Math.random() > 0.7 ? 1 : 0 } // 30% chance to also get a chest on daily claim
      }
    });

    // Update streak to mark as claimed
    await this.prisma.streak.update({
      where: { userId },
      data: { lastEntryDate: new Date() }
    });

    return { success: true, reward };
  }

  async getLeaderboard(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const topUsers = await this.prisma.userXp.findMany({
      orderBy: { totalXp: 'desc' },
      take: 100, // Increased limit to calculate leagues meaningfully
      include: { user: { select: { name: true, avatar: true, city: true } } },
    });

    const totalUsers = topUsers.length;
    
    // Assign leagues based on percentiles: Top 10% Diamond, Next 20% Gold, Next 30% Silver, Rest Bronze
    const getLeague = (index: number) => {
      const percentile = index / (totalUsers || 1);
      if (percentile <= 0.1) return 'Diamante';
      if (percentile <= 0.3) return 'Oro';
      if (percentile <= 0.6) return 'Plata';
      return 'Bronce';
    };

    return topUsers.map((entry, idx) => ({
      rank: idx + 1,
      userId: entry.userId,
      name: entry.user.name,
      avatar: entry.user.avatar,
      city: entry.user.city,
      xp: entry.totalXp,
      level: entry.level,
      league: getLeague(idx),
      isCurrentUser: entry.userId === userId,
    }));
  }

  async equipSkin(userId: string, skinId: string) {
    const profile = await this.prisma.userXp.findUnique({ where: { userId } });
    if (!profile) throw new Error('Profile not found');
    const inventory = JSON.parse((profile as any).inventory || '[]');
    if (skinId !== 'default' && !inventory.includes(skinId)) {
      throw new Error('Skin not owned');
    }
    await (this.prisma.userXp.update as any)({
      where: { userId },
      data: { equippedSkin: skinId }
    });
    return { success: true, equippedSkin: skinId };
  }

  async openChest(userId: string) {
    const profile = await this.prisma.userXp.findUnique({ where: { userId } });
    if (!profile || (profile as any).chests <= 0) {
      throw new Error('No chests available');
    }
    
    // Deduct chest
    await (this.prisma.userXp.update as any)({
      where: { userId },
      data: { chests: { decrement: 1 } }
    });

    const rand = Math.random();
    let rewardType = 'coins';
    let amount = 0;
    let itemId = null;

    if (rand < 0.6) {
      rewardType = 'coins';
      amount = Math.floor(Math.random() * 41) + 10;
      await (this.prisma.userXp.update as any)({
        where: { userId },
        data: { coins: { increment: amount } }
      });
    } else if (rand < 0.9) {
      rewardType = 'xp';
      amount = Math.floor(Math.random() * 81) + 20;
      await (this.prisma.userXp.update as any)({
        where: { userId },
        data: { totalXp: { increment: amount } }
      });
    } else {
      const possiblePets = ['pet_cat', 'pet_dragon', 'pet_fox', 'pet_unicorn'];
      itemId = possiblePets[Math.floor(Math.random() * possiblePets.length)];
      const inventory = JSON.parse((profile as any).inventory || '[]');
      if (!inventory.includes(itemId)) {
        rewardType = 'skin';
        inventory.push(itemId);
        await (this.prisma.userXp.update as any)({
          where: { userId },
          data: { inventory: JSON.stringify(inventory) }
        });
      } else {
        rewardType = 'coins';
        amount = 100;
        await (this.prisma.userXp.update as any)({
          where: { userId },
          data: { coins: { increment: amount } }
        });
      }
    }

    return { success: true, rewardType, amount, itemId };
  }

  async addGameScore(userId: string, gameId: string, xpReward: number) {
    if (!xpReward || xpReward <= 0) return { success: false, reason: 'Invalid XP' };
    
    // Add XP to user
    await (this.prisma.userXp.update as any)({
      where: { userId },
      data: {
        totalXp: { increment: xpReward }
      }
    });

    return { success: true, addedXp: xpReward, gameId };
  }

  async generateTriviaQuestions(userId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const txs = await this.prisma.transaction.findMany({
      where: { userId, type: 'expense', date: { gte: thirtyDaysAgo } },
      include: { category: true }
    });

    const fallbackQuestions = [
      { id: 1, question: '¿Qué porcentaje deberías destinar al ahorro según la regla 50/30/20?', options: ['10%', '20%', '30%', '50%'], correctAnswer: 1 },
      { id: 2, question: '¿Cuál es el mejor momento para empezar a invertir?', options: ['Mañana', 'Hoy', 'Cuando sea rico', 'A los 40 años'], correctAnswer: 1 },
      { id: 3, question: '¿Qué son los gastos hormiga?', options: ['Gastos de mascotas', 'Compras grandes e impulsivas', 'Gastos pequeños y frecuentes', 'Inversiones a largo plazo'], correctAnswer: 2 }
    ];

    if (txs.length < 5) {
      return fallbackQuestions;
    }

    // Q1: Total spent
    const totalSpent = txs.reduce((acc, t) => acc + Number(t.amount), 0);
    const q1Amount = Math.round(totalSpent);
    const q1Opts = [
      `$${q1Amount}`,
      `$${Math.round(q1Amount * 0.7)}`,
      `$${Math.round(q1Amount * 1.3)}`,
      `$${Math.round(q1Amount * 1.5)}`
    ].sort(() => Math.random() - 0.5);
    const q1Correct = q1Opts.indexOf(`$${q1Amount}`);

    // Q2: Top category
    const catMap = new Map<string, number>();
    txs.forEach(t => {
      const name = t.category?.name || 'Otros';
      catMap.set(name, (catMap.get(name) || 0) + Number(t.amount));
    });
    const sortedCats = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);
    const topCat = sortedCats[0][0];
    
    // get other unique categories or fake ones
    const fakeCats = ['Comida', 'Entretenimiento', 'Transporte', 'Ropa', 'Servicios', 'Otros'];
    const otherCats = fakeCats.filter(c => c !== topCat).sort(() => Math.random() - 0.5).slice(0, 3);
    const q2Opts = [topCat, ...otherCats].sort(() => Math.random() - 0.5);
    const q2Correct = q2Opts.indexOf(topCat);

    // Q3: Highest individual transaction
    const highestTx = txs.sort((a, b) => Number(b.amount) - Number(a.amount))[0];
    const highestAmount = Math.round(Number(highestTx.amount));
    const q3Opts = [
      `$${highestAmount}`,
      `$${Math.round(highestAmount * 0.5)}`,
      `$${Math.round(highestAmount * 1.8)}`,
      `$${Math.round(highestAmount * 2.2)}`
    ].sort(() => Math.random() - 0.5);
    const q3Correct = q3Opts.indexOf(`$${highestAmount}`);

    return [
      { id: 1, question: '¿Cuánto gastaste aproximadamente en total durante los últimos 30 días?', options: q1Opts, correctAnswer: q1Correct },
      { id: 2, question: 'De estas opciones, ¿cuál fue la categoría en la que más gastaste en los últimos 30 días?', options: q2Opts, correctAnswer: q2Correct },
      { id: 3, question: '¿De cuánto fue tu gasto individual más alto en los últimos 30 días?', options: q3Opts, correctAnswer: q3Correct }
    ];
  }

  async getBudgetGameData(userId: string) {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const incomes = await this.prisma.transaction.findMany({
      where: { userId, type: 'income', date: { gte: ninetyDaysAgo } }
    });

    if (incomes.length === 0) {
      return { income: 10000 };
    }

    const totalIncome = incomes.reduce((acc, t) => acc + Number(t.amount), 0);
    // Average monthly income over 3 months
    const avgMonthlyIncome = Math.round(totalIncome / 3);

    return { income: avgMonthlyIncome > 0 ? avgMonthlyIncome : 10000 };
  }
}
