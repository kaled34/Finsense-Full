import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto, AddExpenseDto } from './groups.dto';
import { GroupsGateway } from './groups.gateway';

@Injectable()
export class GroupsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => GroupsGateway))
    private gateway: GroupsGateway
  ) {}

  async findAll(userId: string) {
    const groups = await this.prisma.group.findMany({
      where: { members: { some: { userId } } },
      include: {
        members: { include: { user: { select: { id: true, name: true } } } },
        expenses: true,
      },
    });

    // Calculate balances and totalExpenses for each group
    return groups.map(group => {
      const totalExpenses = group.expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
      
      const balances: Record<string, number> = {};
      for (const exp of group.expenses) {
        const splitList = JSON.parse(exp.splitBetween || '[]') as string[];
        const share = Number(exp.amount) / (splitList.length || 1);
        for (const uid of splitList) {
          balances[uid] = (balances[uid] || 0) - share;
        }
        balances[exp.paidBy] = (balances[exp.paidBy] || 0) + Number(exp.amount);
      }

      const membersWithBalance = group.members.map(m => ({
        ...m,
        balance: Math.round((balances[m.userId] || 0) * 100) / 100,
      }));

      return {
        ...group,
        totalExpenses,
        members: membersWithBalance,
      };
    });
  }

  async findOne(userId: string, groupId: string) {
    await this.assertMember(userId, groupId);
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: { include: { user: { select: { id: true, name: true } } } },
        expenses: true,
      },
    });

    if (!group) throw new NotFoundException('Group not found');

    const totalExpenses = group.expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    
    const balances: Record<string, number> = {};
    for (const exp of group.expenses) {
      const splitList = JSON.parse(exp.splitBetween || '[]') as string[];
      const share = Number(exp.amount) / (splitList.length || 1);
      for (const uid of splitList) {
        balances[uid] = (balances[uid] || 0) - share;
      }
      balances[exp.paidBy] = (balances[exp.paidBy] || 0) + Number(exp.amount);
    }

    const membersWithBalance = group.members.map(m => ({
      ...m,
      balance: Math.round((balances[m.userId] || 0) * 100) / 100,
    }));

    return {
      ...group,
      totalExpenses,
      members: membersWithBalance,
    };
  }

  async getExpenses(userId: string, groupId: string) {
    await this.assertMember(userId, groupId);
    return this.prisma.groupExpense.findMany({
      where: { groupId },
      include: {
        user: { select: { id: true, name: true } }
      },
      orderBy: { date: 'desc' },
    });
  }

  async create(userId: string, dto: CreateGroupDto) {
    const group = await this.prisma.group.create({
      data: {
        name: dto.name,
        createdBy: userId,
        members: { create: [{ userId }] },
      },
      include: { members: { include: { user: { select: { id: true, name: true } } } } },
    });

    if (dto.memberIds && dto.memberIds.length > 0) {
      await Promise.all(
        dto.memberIds.map(async (id) => {
          if (id !== userId) {
            return this.inviteMember(userId, group.id, id);
          }
        })
      );
    }

    return {
      ...group,
      totalExpenses: 0,
      members: group.members.map(m => ({ ...m, balance: 0 })),
    };
  }

  async inviteMember(userId: string, groupId: string, targetUserId: string) {
    await this.assertMember(userId, groupId);
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');

    const inviter = await this.prisma.user.findUnique({ where: { id: userId } });

    // Check if already member
    const existing = await this.prisma.groupMember.findFirst({
      where: { groupId, userId: targetUserId }
    });
    if (existing) return null;

    return this.prisma.notification.create({
      data: {
        userId: targetUserId,
        type: 'group_invite',
        title: 'Invitación a grupo',
        body: JSON.stringify({ 
          groupId, 
          groupName: group.name, 
          senderId: userId, 
          senderName: inviter?.name || 'Alguien' 
        }),
      },
    });
  }

  async addMember(userId: string, groupId: string, memberId: string) {
    if (userId !== memberId) {
      await this.assertMember(userId, groupId);
    }
    return this.prisma.groupMember.create({
      data: { groupId, userId: memberId },
      include: { user: { select: { id: true, name: true } } }
    });
  }

  async addExpense(userId: string, groupId: string, dto: AddExpenseDto) {
    await this.assertMember(userId, groupId);
    
    let payerId = userId;
    if (dto.paidBy) {
      const isMember = await this.prisma.groupMember.findFirst({ where: { userId: dto.paidBy, groupId } });
      if (isMember) {
        payerId = dto.paidBy;
      }
    }

    const expense = await this.prisma.groupExpense.create({
      data: {
        groupId,
        paidBy: payerId,
        amount: dto.amount,
        description: dto.description,
        splitBetween: JSON.stringify(dto.splitBetween),
        date: new Date(),
      },
    });

    // Enviar notificación si es una liquidación
    if (dto.description.startsWith('Liquidación de deuda')) {
      // El acreedor es el que está en splitBetween[0]
      const creditorId = dto.splitBetween[0];
      const payer = await this.prisma.user.findUnique({ where: { id: payerId } });
      const group = await this.prisma.group.findUnique({ where: { id: groupId } });
      
      if (creditorId && payer && group && creditorId !== payerId) {
        // Crear notificación en base de datos
        await this.prisma.notification.create({
          data: {
            userId: creditorId,
            type: 'system',
            title: 'Deuda Saldada',
            body: `${payer.name} ha saldado su deuda de $${dto.amount} en el grupo "${group.name}".`
          }
        });
        
        // Emitir evento en tiempo real
        if (this.gateway) {
          try {
            this.gateway.emitGlobalNotification(creditorId, 'debt_settled', {
              groupId,
              groupName: group.name,
              payerName: payer.name,
              amount: dto.amount
            });
          } catch (e) {
            console.error('Error emitting debt_settled', e);
          }
        }
      }
    }

    return expense;
  }

  async getBalances(userId: string, groupId: string) {
    await this.assertMember(userId, groupId);
    const expenses = await this.prisma.groupExpense.findMany({ where: { groupId } });

    const balances: Record<string, number> = {};
    for (const exp of expenses) {
      const splitList = JSON.parse(exp.splitBetween || '[]') as string[];
      const share = Number(exp.amount) / (splitList.length || 1);
      for (const uid of splitList) {
        balances[uid] = (balances[uid] || 0) - share;
      }
      balances[exp.paidBy] = (balances[exp.paidBy] || 0) + Number(exp.amount);
    }

    return Object.entries(balances).map(([uid, amount]) => ({ userId: uid, balance: amount }));
  }

  async getSimplifiedDebts(userId: string, groupId: string) {
    // 1. Obtener los balances base
    const balances = await this.getBalances(userId, groupId);
    
    // 2. Separar en deudores y acreedores
    const debtors = balances.filter(b => b.balance < -0.01).map(b => ({ ...b, balance: Math.abs(b.balance) })).sort((a, b) => b.balance - a.balance);
    const creditors = balances.filter(b => b.balance > 0.01).sort((a, b) => b.balance - a.balance);

    const transactions: Array<{ from: string; to: string; amount: number }> = [];

    // 3. Algoritmo Greedy para simplificar deudas
    let i = 0; // index for debtors
    let j = 0; // index for creditors

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      
      const amount = Math.min(debtor.balance, creditor.balance);
      const roundedAmount = Math.round(amount * 100) / 100;
      
      if (roundedAmount > 0) {
        transactions.push({
          from: debtor.userId,
          to: creditor.userId,
          amount: roundedAmount,
        });
      }

      debtor.balance -= amount;
      creditor.balance -= amount;

      if (debtor.balance < 0.01) i++;
      if (creditor.balance < 0.01) j++;
    }

    // 4. Enriquecer con nombres de usuario para facilitar el frontend
    const userIds = [...new Set(transactions.flatMap(t => [t.from, t.to]))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, avatar: true }
    });
    
    const userMap = new Map(users.map(u => [u.id, u]));

    return transactions.map(t => ({
      from: userMap.get(t.from),
      to: userMap.get(t.to),
      amount: t.amount
    }));
  }

  async getMessages(userId: string, groupId: string) {
    await this.assertMember(userId, groupId);
    return this.prisma.groupMessage.findMany({
      where: { groupId },
      include: {
        sender: { select: { id: true, name: true, avatar: true } }
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async saveMessage(userId: string, groupId: string, content: string) {
    await this.assertMember(userId, groupId);
    return this.prisma.groupMessage.create({
      data: {
        groupId,
        senderId: userId,
        content
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } }
      }
    });
  }

  private async assertMember(userId: string, groupId: string) {
    const m = await this.prisma.groupMember.findFirst({ where: { userId, groupId } });
    if (!m) throw new ForbiddenException('Not a group member');
    return m;
  }
}
