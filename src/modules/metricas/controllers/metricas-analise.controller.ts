import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/role.decorator';
import { ROLES } from '../../../shared/constants/roles.constants';

import { MetricasService } from '../services/metricas.service';
import { MetricasAnomaliasService } from '../services/metricas-anomalia.service';

/**
 * Controlador para análise de métricas
 * 
 * Este controlador fornece endpoints para:
 * 1. Analisar tendências de métricas
 * 2. Detectar anomalias em séries históricas
 * 3. Gerar previsões baseadas em dados históricos
 */
@ApiTags('Métricas e Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/metricas/analise')
export class MetricasAnaliseController {
  constructor(
    private readonly metricasService: MetricasService,
    private readonly metricasAnomaliasService: MetricasAnomaliasService,
  ) {}

  /**
   * Analisa a tendência de uma métrica específica
   */
  @Get(':codigo/tendencia')
  @Roles(ROLES.ADMIN, ROLES.GESTOR, ROLES.TECNICO)
  @ApiOperation({ summary: 'Analisa tendência de uma métrica' })
  @ApiResponse({ status: 200, description: 'Análise de tendência realizada com sucesso' })
  @ApiResponse({ status: 404, description: 'Métrica não encontrada' })
  async analisarTendencia(
    @Param('codigo') codigo: string,
    @Query('dataInicio') dataInicio: Date,
    @Query('dataFim') dataFim: Date,
    @Query('granularidade') granularidade: string,
  ) {
    return this.metricasAnomaliasService.analisarTendencias(
      codigo,
      dataInicio,
      dataFim,
      { granularidade: granularidade || 'diaria' }
    );
  }

  /**
   * Detecta anomalias em uma série histórica de métrica
   */
  @Get(':codigo/anomalias')
  @Roles(ROLES.ADMIN, ROLES.GESTOR, ROLES.TECNICO)
  @ApiOperation({ summary: 'Detecta anomalias em série histórica de métrica' })
  @ApiResponse({ status: 200, description: 'Detecção de anomalias realizada com sucesso' })
  @ApiResponse({ status: 404, description: 'Métrica não encontrada' })
  async detectarAnomalias(
    @Param('codigo') codigo: string,
    @Query('dataInicio') dataInicio: Date,
    @Query('dataFim') dataFim: Date,
    @Query('sensibilidade') sensibilidade: number,
  ) {
    return this.metricasAnomaliasService.detectarAnomaliasPorCodigo(
      codigo,
      dataInicio,
      dataFim
    );
  }

  /**
   * Gera previsão baseada em dados históricos de uma métrica
   */
  @Get(':codigo/previsao')
  @Roles(ROLES.ADMIN, ROLES.GESTOR, ROLES.TECNICO)
  @ApiOperation({ summary: 'Gera previsão baseada em dados históricos' })
  @ApiResponse({ status: 200, description: 'Previsão gerada com sucesso' })
  @ApiResponse({ status: 404, description: 'Métrica não encontrada' })
  async gerarPrevisao(
    @Param('codigo') codigo: string,
    @Query('horizonte') horizonte: number,
    @Query('intervaloConfianca') intervaloConfianca: number,
    @Query('modelo') modelo: string,
  ) {
    // Implementação temporária até que o método seja adicionado ao serviço
    return {
      codigo,
      horizonte,
      intervaloConfianca,
      modelo,
      previsao: [
        { data: new Date(), valor: 0 }
      ],
      mensagem: 'Funcionalidade em desenvolvimento'
    };
  }
}
