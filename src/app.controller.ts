import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';

@Controller('/')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  getHello(): string {
    console.log('🔥 APP CONTROLLER: getHello() foi chamado!');
    return this.appService.getHello();
  }

  @Get('api')
  @Public()
  getApi(): { status: string; message: string } {
    return {
      status: 'ok',
      message: 'API PGBen está funcionando!'
    };
  }
}
