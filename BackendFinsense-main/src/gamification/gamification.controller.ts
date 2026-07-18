import { Controller, Get, Post, Body, UseGuards, Req, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GamificationService } from './gamification.service';

@UseGuards(AuthGuard('jwt'))
@Controller('gamification')
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('profile')
  getProfile(@Req() req: any) {
    return this.gamificationService.getProfile(req.user.id);
  }

  @Get('users/:id/profile')
  getPublicProfile(@Param('id') id: string) {
    return this.gamificationService.getPublicProfile(id);
  }

  @Get('quests')
  getQuests(@Req() req: any) {
    return this.gamificationService.getQuests(req.user.id);
  }

  @Get('achievements')
  async getAchievements(@Req() req: any) {
    try {
      return await this.gamificationService.getAchievements(req.user.id);
    } catch (error: any) {
      console.error('[GamificationController] getAchievements error:', error?.message, error?.stack);
      throw error;
    }
  }

  @Post('purchase')
  purchaseItem(@Req() req: any, @Body() body: any) {
    const { itemId, price, type, metadata } = body;
    return this.gamificationService.purchaseItem(req.user.id, itemId, price, type, metadata);
  }

  @Post('daily-reward')
  async claimDailyReward(@Req() req: any) {
    try {
      return await this.gamificationService.claimDailyReward(req.user.id);
    } catch (error: any) {
      if (error.message === 'Already claimed today') {
        return { success: false, reason: 'already_claimed' };
      }
      throw error;
    }
  }

  @Get('leaderboard')
  getLeaderboard(@Req() req: any) {
    return this.gamificationService.getLeaderboard(req.user.id);
  }

  @Post('equip-skin')
  equipSkin(@Req() req: any, @Body() body: any) {
    const { skinId } = body;
    return this.gamificationService.equipSkin(req.user.id, skinId);
  }

  @Post('open-chest')
  openChest(@Req() req: any) {
    return this.gamificationService.openChest(req.user.id);
  }

  @Post('game-score')
  async submitGameScore(@Req() req: any, @Body() body: any) {
    const { xpReward, gameId } = body;
    return this.gamificationService.addGameScore(req.user.id, gameId, xpReward);
  }

  @Get('trivia-questions')
  getTriviaQuestions(@Req() req: any) {
    return this.gamificationService.generateTriviaQuestions(req.user.id);
  }

  @Get('budget-game-data')
  getBudgetGameData(@Req() req: any) {
    return this.gamificationService.getBudgetGameData(req.user.id);
  }
}
