import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AblyService } from '../services/ably.service';

@ApiTags('Métricas – Notificações')
@Controller('notificacao/metricas')
export class NotificationMetricsController {
  constructor(
    private readonly ablyService: AblyService,
  ) {}

  @Get('resumo')
  @ApiOperation({ summary: 'Resumo de métricas de Ably' })
  @ApiResponse({ status: 200, description: 'Métricas retornadas com sucesso' })
  getMetrics() {
    return {
      ably: this.ablyService.getMetrics(),
    };
  }
}
