import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChallengesService {
  constructor(private prisma: PrismaService) {}

  async getChallenges(userId: string) {
    const participations = await this.prisma.challengeParticipant.findMany({
      where: { userId },
      include: {
        challenge: {
          include: {
            group: { select: { name: true } },
            creator: { select: { name: true, avatar: true } },
            category: { select: { name: true, icon: true, color: true } },
            participants: {
              include: { user: { select: { id: true, name: true, avatar: true } } },
            },
          },
        },
      },
      orderBy: { challenge: { createdAt: 'desc' } },
    });

    // Enrich with user spending for each challenge
    const result = await Promise.all(
      participations.map(async (p) => {
        const ch = p.challenge;
        const userSpent = await this.prisma.transaction.aggregate({
          where: {
            userId,
            type: 'expense',
            ...(ch.categoryId && { categoryId: ch.categoryId }),
            date: { gte: ch.startDate, lte: ch.endDate },
          },
          _sum: { amount: true },
        });
        const spentAmount = Number(userSpent._sum.amount ?? 0);
        const targetAmount = Number(ch.targetAmount);
        return {
          id: ch.id,
          title: ch.title,
          description: ch.description,
          targetAmount,
          startDate: ch.startDate,
          endDate: ch.endDate,
          status: ch.status,
          groupName: ch.group.name,
          creatorName: ch.creator.name,
          category: ch.category,
          userSpent: spentAmount,
          userProgress: targetAmount > 0 ? Math.min((spentAmount / targetAmount) * 100, 100) : 0,
          accepted: p.accepted,
          won: p.won,
          participants: ch.participants.map((pp) => ({
            userId: pp.userId,
            name: pp.user.name,
            avatar: pp.user.avatar,
            accepted: pp.accepted,
            won: pp.won,
          })),
        };
      }),
    );

    return result;
  }

  async createChallenge(userId: string, body: {
    groupId: string;
    title: string;
    description?: string;
    categoryId?: string;
    targetAmount: number;
    startDate: string;
    endDate: string;
  }) {
    // Get group members to auto-add as participants
    const members = await this.prisma.groupMember.findMany({ where: { groupId: body.groupId } });

    const challenge = await this.prisma.challenge.create({
      data: {
        groupId: body.groupId,
        createdBy: userId,
        title: body.title,
        description: body.description,
        categoryId: body.categoryId,
        targetAmount: body.targetAmount,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        participants: {
          create: members.map((m) => ({
            userId: m.userId,
            accepted: m.userId === userId, // creator auto-accepts
          })),
        },
      },
      include: { participants: true },
    });
    return challenge;
  }

  async acceptChallenge(userId: string, challengeId: string) {
    return this.prisma.challengeParticipant.updateMany({
      where: { challengeId, userId },
      data: { accepted: true },
    });
  }

  async createDuel(userId: string, body: { opponentId: string; categoryId?: string; targetAmount: number; startDate: string; endDate: string }) {
    const opponent = await this.prisma.user.findUnique({ where: { id: body.opponentId } });
    if (!opponent) throw new Error('Opponent not found');

    // Create a dedicated group for this duel
    const group = await this.prisma.group.create({
      data: {
        name: `Duelo vs ${opponent.name}`,
        createdBy: userId,
        members: {
          create: [
            { userId: userId },
            { userId: body.opponentId }
          ]
        }
      }
    });

    // Create the challenge in that group
    const challenge = await this.prisma.challenge.create({
      data: {
        groupId: group.id,
        createdBy: userId,
        title: `Batalla contra ${opponent.name}`,
        description: 'Duelo Financiero 1v1',
        categoryId: body.categoryId,
        targetAmount: body.targetAmount,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        participants: {
          create: [
            { userId: userId, accepted: true }, // Creator accepts
            { userId: body.opponentId, accepted: false } // Opponent needs to accept
          ]
        }
      },
      include: { participants: true }
    });

    return challenge;
  }
}
