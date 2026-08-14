import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHealth() {
    return { status: 'ok', service: 'QuickBite NestJS Backend' };
  }

  @Get('health')
  getHealthCheck() {
    return { status: 'ok', service: 'QuickBite NestJS Backend' };
  }
}
