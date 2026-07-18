import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private chatService: ChatService,
  ) {}

  async generateSmartNotification(userId: string) {
    const tip = await this.chatService.getAdvisorTip(userId);
    return this.create(userId, 'alert', '💡 Consejo de tu Asesor IA', tip);
  }

  findAll(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async create(userId: string, type: string, title: string, body: string) {
    return this.prisma.notification.create({
      data: { userId, type: type as any, title, body },
    });
  }

  async remove(userId: string, id: string) {
    return this.prisma.notification.deleteMany({
      where: { id, userId },
    });
  }
}
