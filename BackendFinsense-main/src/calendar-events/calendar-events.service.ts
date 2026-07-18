import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';

@Injectable()
export class CalendarEventsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.calendarEvent.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
    });
  }

  async create(userId: string, data: CreateCalendarEventDto) {
    return this.prisma.calendarEvent.create({
      data: {
        userId,
        title: data.title,
        amount: data.amount,
        date: new Date(data.date),
        emoji: data.emoji,
      },
    });
  }

  async remove(userId: string, id: string) {
    return this.prisma.calendarEvent.delete({
      where: {
        id,
        userId,
      },
    });
  }
}
