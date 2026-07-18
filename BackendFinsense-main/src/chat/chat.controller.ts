import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';

@UseGuards(AuthGuard('jwt'))
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post()
  async chat(@Req() req: any, @Body('prompt') prompt: string) {
    const reply = await this.chatService.getResponse(req.user.id, prompt);
    return { reply };
  }

  @Get('advisor-tip')
  async getAdvisorTip(@Req() req: any) {
    const tip = await this.chatService.getAdvisorTip(req.user.id);
    return { tip };
  }

  @Get('suggestions')
  async getSuggestedPrompts(@Req() req: any) {
    const suggestions = await this.chatService.getSuggestedPrompts(req.user.id);
    return { suggestions };
  }

  @Post('ocr-receipt')
  async ocrReceipt(@Body('imageBase64') imageBase64: string) {
    return this.chatService.scanReceipt(imageBase64);
  }

  @Post('analyze-chart')
  async analyzeChart(@Req() req: any, @Body('chartData') chartData: any[]) {
    const summary = await this.chatService.analyzeChart(req.user.id, chartData || []);
    return { summary };
  }
}
