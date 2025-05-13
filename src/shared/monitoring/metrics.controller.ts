import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { MetricsService } from './metrics.service';
import { Public } from '../../modules/auth/decorators/public.decorator';

/**
 * Controlador de Métricas
 * 
 * Expõe endpoints para acesso às métricas da aplicação
 * no formato do Prometheus
 */
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Retorna todas as métricas no formato do Prometheus
   */
  @Get()
  @Public()
  async getMetrics(@Res() response: Response) {
    const metrics = await this.metricsService.getMetrics();
    response.setHeader('Content-Type', 'text/plain');
    return response.send(metrics);
  }
}
