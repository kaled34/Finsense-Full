import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      message: 'FinSense API is running successfully',
      status: 'online',
      version: '1.0.0',
      documentation: '/api/health',
    };
  }

  @Get('health')
  checkHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'FinSense API',
    };
  }
}
