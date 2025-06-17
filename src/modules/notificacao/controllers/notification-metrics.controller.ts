import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AblyService } from '../services/ably.service';
import { SseService } from '../services/sse.service';

@ApiTags('Métricas – Notificações')
@Controller('notificacao/metricas')
export class NotificationMetricsController {
  constructor(
    private readonly ablyService: AblyService,
    private readonly sseService: SseService,
  ) {}

  @Get('resumo')
  @ApiOperation({ summary: 'Resumo de métricas de Ably e SSE' })
  @ApiResponse({ status: 200, description: 'Métricas retornadas com sucesso' })
  getMetrics() {
    return {
      ably: this.ablyService.getMetrics(),
      sse: this.sseService.getLocalConnectionStats(),
    };
  }
}
