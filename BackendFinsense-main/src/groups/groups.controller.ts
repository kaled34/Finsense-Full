import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GroupsService } from './groups.service';
import { CreateGroupDto, AddMemberDto, AddExpenseDto } from './groups.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('groups')
export class GroupsController {
  constructor(private svc: GroupsService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.svc.findAll(req.user.id);
  }

  @Post()
  async create(@Req() req: any, @Body() dto: CreateGroupDto) {
    try {
      const result = await this.svc.create(req.user.id, dto);
      return result;
    } catch (error) {
      console.error('ERROR IN GROUPS CREATE:', error);
      throw error;
    }
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.svc.findOne(req.user.id, id);
  }

  @Get(':id/expenses')
  getExpenses(@Req() req: any, @Param('id') id: string) {
    return this.svc.getExpenses(req.user.id, id);
  }

  @Post(':id/members')
  addMember(@Req() req: any, @Param('id') id: string, @Body() dto: AddMemberDto) {
    return this.svc.addMember(req.user.id, id, dto.userId);
  }

  @Post(':id/invites')
  inviteMember(@Req() req: any, @Param('id') id: string, @Body() dto: AddMemberDto) {
    return this.svc.inviteMember(req.user.id, id, dto.userId);
  }

  @Post(':id/expenses')
  addExpense(@Req() req: any, @Param('id') id: string, @Body() dto: AddExpenseDto) {
    return this.svc.addExpense(req.user.id, id, dto);
  }

  @Get(':id/balances')
  getBalances(@Req() req: any, @Param('id') id: string) {
    return this.svc.getBalances(req.user.id, id);
  }

  @Get(':id/debts/simplified')
  getSimplifiedDebts(@Req() req: any, @Param('id') id: string) {
    return this.svc.getSimplifiedDebts(req.user.id, id);
  }

  @Get(':id/messages')
  getMessages(@Req() req: any, @Param('id') id: string) {
    return this.svc.getMessages(req.user.id, id);
  }
}
