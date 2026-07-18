import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto, UpdateTransactionDto } from './transactions.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('transactions')
export class TransactionsController {
  constructor(private svc: TransactionsService) {}

  @Get()
  findAll(@Req() req: any, @Query() query: any) {
    return this.svc.findAll(req.user.id, query);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateTransactionDto) {
    return this.svc.create(req.user.id, dto);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateTransactionDto) {
    return this.svc.update(req.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.svc.remove(req.user.id, id);
  }
}
