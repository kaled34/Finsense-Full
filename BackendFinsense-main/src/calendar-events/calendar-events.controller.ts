import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CalendarEventsService } from './calendar-events.service';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('calendar-events')
export class CalendarEventsController {
  constructor(private readonly calendarEventsService: CalendarEventsService) {}

  @Get()
  findAll(@Request() req) {
    return this.calendarEventsService.findAll(req.user.id);
  }

  @Post()
  create(@Request() req, @Body() createCalendarEventDto: CreateCalendarEventDto) {
    return this.calendarEventsService.create(req.user.id, createCalendarEventDto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.calendarEventsService.remove(req.user.id, id);
  }
}
