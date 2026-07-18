import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GoalsService } from './goals.service';
import { CreateGoalDto, DepositGoalDto } from './goals.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('goals')
export class GoalsController {
  constructor(private svc: GoalsService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.svc.findAll(req.user.id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateGoalDto) {
    return this.svc.create(req.user.id, dto);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: CreateGoalDto) {
    return this.svc.update(req.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.svc.remove(req.user.id, id);
  }

  @Post(':id/deposit')
  deposit(@Req() req: any, @Param('id') id: string, @Body() dto: DepositGoalDto) {
    return this.svc.deposit(req.user.id, id, dto);
  }
}
