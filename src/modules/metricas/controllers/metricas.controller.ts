import { Controller, Get, Header } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MetricasService } from '../services/metricas.service';
import { HealthService } from '../services/health.service';
import { Public } from '../../../shared/decorators/public.decorator';

/**
 * Controlador responsável por expor endpoints para coleta de métricas
 * pelo Prometheus.
 */
@ApiTags('Métricas')
@Controller('metricas')
export class MetricasController {
  constructor(
    private readonly metricasService: MetricasService,
    private readonly healthService: HealthService
  ) {}

  /**
   * Endpoint para o Prometheus coletar métricas
   * @returns Métricas no formato do Prometheus
   */
  @Get()
  @Public() // Endpoint público para permitir a coleta pelo Prometheus
  @Header('Content-Type', 'text/plain')
  @ApiOperation({ summary: 'Obter métricas do sistema' })
  @ApiResponse({
    status: 200,
    description: 'Métricas no formato do Prometheus',
  })
  async getMetrics(): Promise<string> {
    return this.metricasService.obterMetricas();
  }

  /**
   * Endpoint para verificar a saúde do sistema
   * @returns Status de saúde do sistema com detalhes dos componentes
   */
  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Verificar a saúde do sistema' })
  @ApiResponse({
    status: 200,
    description: 'Status de saúde do sistema',
  })
  async getHealth(): Promise<any> {
    return this.healthService.checkHealth();
  }
}
