import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { MetricsService } from './metrics.service';
import { Public } from '../../auth/decorators/public.decorator';
import { ApiTags } from '@nestjs/swagger';

/**
 * Controlador de Métricas
 *
 * Expõe endpoints para acesso às métricas da aplicação
 * no formato do Prometheus
 */
@ApiTags('Métricas e Dashboard')
@Controller({ path: 'metrics', version: '1' })
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
