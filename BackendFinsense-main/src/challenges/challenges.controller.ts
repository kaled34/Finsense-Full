import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChallengesService } from './challenges.service';

@Controller('challenges')
@UseGuards(AuthGuard('jwt'))
export class ChallengesController {
  constructor(private challengesService: ChallengesService) {}

  @Get()
  getChallenges(@Req() req: any) {
    return this.challengesService.getChallenges(req.user.id);
  }

  @Post()
  createChallenge(@Req() req: any, @Body() body: {
    groupId: string; title: string; description?: string;
    categoryId?: string; targetAmount: number; startDate: string; endDate: string;
  }) {
    return this.challengesService.createChallenge(req.user.id, body);
  }

  @Patch(':id/accept')
  acceptChallenge(@Req() req: any, @Param('id') id: string) {
    return this.challengesService.acceptChallenge(req.user.id, id);
  }

  @Post('duel')
  createDuel(@Req() req: any, @Body() body: {
    opponentId: string; categoryId?: string; targetAmount: number; startDate: string; endDate: string;
  }) {
    return this.challengesService.createDuel(req.user.id, body);
  }
}
