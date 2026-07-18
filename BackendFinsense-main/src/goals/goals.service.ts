import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGoalDto, DepositGoalDto } from './goals.dto';

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.goal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  create(userId: string, dto: CreateGoalDto) {
    return this.prisma.goal.create({
      data: { userId, ...dto, deadline: dto.deadline ? new Date(dto.deadline) : undefined },
    });
  }

  async update(userId: string, id: string, dto: Partial<CreateGoalDto>) {
    await this.findOne(userId, id);
    return this.prisma.goal.update({
      where: { id },
      data: { ...dto, deadline: dto.deadline ? new Date(dto.deadline) : undefined } as any,
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.goal.delete({ where: { id } });
  }

  async deposit(userId: string, id: string, dto: DepositGoalDto) {
    const goal = await this.findOne(userId, id);
    const newAmount = Number(goal.currentAmount) + dto.amount;
    const completed = newAmount >= Number(goal.targetAmount);

    const updated = await this.prisma.goal.update({
      where: { id },
      data: { currentAmount: Math.min(newAmount, Number(goal.targetAmount)) },
    });

    // Award XP for deposit
    const xpGain = completed ? 100 : 20;
    await this.prisma.userXp.updateMany({
      where: { userId },
      data: { totalXp: { increment: xpGain } },
    });

    if (completed) {
      await this.addBadge(userId, `goal_${id}`);
    }

    return { goal: updated, completed, xpGained: xpGain };
  }

  private async findOne(userId: string, id: string) {
    const g = await this.prisma.goal.findFirst({ where: { id, userId } });
    if (!g) throw new NotFoundException('Goal not found');
    return g;
  }

  private async addBadge(userId: string, badge: string) {
    const xp = await this.prisma.userXp.findUnique({ where: { userId } });
    if (xp) {
      const badgesList = JSON.parse(xp.badges || '[]') as string[];
      if (!badgesList.includes(badge)) {
        const newLevel = Math.floor(xp.totalXp / 500) + 1;
        await this.prisma.userXp.update({
          where: { userId },
          data: { badges: JSON.stringify([...badgesList, badge]), level: newLevel },
        });
        await this.prisma.notification.create({
          data: {
            userId,
            type: 'badge_earned',
            title: '¡Nueva insignia ganada!',
            body: `Has desbloqueado una nueva insignia por tus metas de ahorro.`,
          },
        });
      }
    }
  }
}
