import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Req, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InvestmentsService } from './investments.service';

@Controller('investments')
@UseGuards(AuthGuard('jwt'))
export class InvestmentsController {
  constructor(private investmentsService: InvestmentsService) {}

  @Get()
  getInvestments(@Req() req: any) {
    return this.investmentsService.getInvestments(req.user.id);
  }

  @Get('search')
  searchTicker(@Query('q') query: string) {
    return this.investmentsService.searchTicker(query);
  }

  @Post('sync')
  syncInvestments(@Req() req: any) {
    return this.investmentsService.syncInvestments(req.user.id);
  }

  @Post()
  createInvestment(@Req() req: any, @Body() body: {
    name: string; type: string; initialAmount: number; currentValue: number; purchaseDate: string; notes?: string; ticker?: string; shares?: number;
  }) {
    return this.investmentsService.createInvestment(req.user.id, body);
  }

  @Put(':id')
  updateInvestment(@Req() req: any, @Param('id') id: string, @Body() body: { currentValue?: number; name?: string; notes?: string }) {
    return this.investmentsService.updateInvestment(req.user.id, id, body);
  }

  @Delete(':id')
  deleteInvestment(@Req() req: any, @Param('id') id: string) {
    return this.investmentsService.deleteInvestment(req.user.id, id);
  }
}
