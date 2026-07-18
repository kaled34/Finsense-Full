import { Controller, Get, Post, Patch, Delete, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';

@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationsController {
  constructor(private svc: NotificationsService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.svc.findAll(req.user.id);
  }

  @Post('generate')
  generateSmartNotification(@Req() req: any) {
    return this.svc.generateSmartNotification(req.user.id);
  }

  @Patch(':id/read')
  markRead(@Req() req: any, @Param('id') id: string) {
    return this.svc.markRead(req.user.id, id);
  }

  @Patch('read-all')
  markAllRead(@Req() req: any) {
    return this.svc.markAllRead(req.user.id);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.svc.remove(req.user.id, id);
  }
}
