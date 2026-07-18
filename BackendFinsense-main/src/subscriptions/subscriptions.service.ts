import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from './subscriptions.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.subscription.findMany({
      where: { userId },
      orderBy: { nextBillingDate: 'asc' },
    });
  }

  async create(userId: string, dto: CreateSubscriptionDto) {
    return this.prisma.subscription.create({
      data: {
        userId,
        name: dto.name,
        cost: dto.cost,
        currency: dto.currency || 'MXN',
        billingCycle: dto.billingCycle || 'monthly',
        nextBillingDate: new Date(dto.nextBillingDate),
        category: dto.category || 'other',
        iconUrl: dto.iconUrl,
        status: 'active',
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateSubscriptionDto) {
    const existing = await this.prisma.subscription.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Subscription not found');
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.cost !== undefined) data.cost = dto.cost;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.billingCycle !== undefined) data.billingCycle = dto.billingCycle;
    if (dto.nextBillingDate !== undefined) data.nextBillingDate = new Date(dto.nextBillingDate);
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.iconUrl !== undefined) data.iconUrl = dto.iconUrl;
    if (dto.status !== undefined) data.status = dto.status;

    return this.prisma.subscription.update({
      where: { id },
      data,
    });
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.subscription.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Subscription not found');
    }

    return this.prisma.subscription.delete({
      where: { id },
    });
  }
}
