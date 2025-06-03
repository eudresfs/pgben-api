import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/role.decorator';
import { ROLES } from '../../../shared/constants/roles.constants';

import { MetricasService } from '../services/metricas.service';
import { MetricasColetaService } from '../services/metricas-coleta.service';
import {
  ColetaManualMetricaDto,
  ConsultaValorMetricaDto,
  ConsultaSerieTemporalDto
} from '../dto/metrica-snapshot.dto';

/**
 * Controlador para consulta de valores de métricas
 * 
 * Este controlador fornece endpoints para:
 * 1. Consultar o valor atual de uma métrica
 * 2. Obter séries históricas de valores
 * 3. Comparar valores entre períodos
 * 4. Executar coleta manual de métricas
 */
@ApiTags('Métricas e Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('metricas/valores')
export class MetricasValoresController {
  constructor(
    private readonly metricasService: MetricasService,
    private readonly metricasColetaService: MetricasColetaService,
  ) {}

  /**
   * Obtém o valor atual de uma métrica específica
   */
  @Get(':codigo')
  @Roles(ROLES.ADMIN, ROLES.GESTOR, ROLES.TECNICO)
  @ApiOperation({ summary: 'Obtém o valor atual de uma métrica' })
  @ApiResponse({ status: 200, description: 'Valor da métrica retornado com sucesso' })
  @ApiResponse({ status: 404, description: 'Métrica não encontrada' })
  async obterValorAtual(
    @Param('codigo') codigo: string,
    @Query() query: ConsultaValorMetricaDto,
  ) {
    // Temporariamente retornando dados mockados até que o método seja implementado
    return {
      metrica: codigo,
      valor: 42,
      unidade: '%',
      timestamp: new Date(),
      dimensoes: query.dimensoes || {}
    };
  }

  /**
   * Obtém a série histórica de valores de uma métrica
   */
  @Get(':codigo/historico')
  @Roles(ROLES.ADMIN, ROLES.GESTOR, ROLES.TECNICO)
  @ApiOperation({ summary: 'Obtém série histórica de valores de uma métrica' })
  @ApiResponse({ status: 200, description: 'Série histórica retornada com sucesso' })
  @ApiResponse({ status: 404, description: 'Métrica não encontrada' })
  async obterSerieHistorica(
    @Param('codigo') codigo: string,
    @Query() query: ConsultaSerieTemporalDto,
  ) {
    // Temporariamente retornando dados mockados até que o método seja implementado
    return {
      metrica: codigo,
      dados: [
        { timestamp: new Date(query.data_inicial), valor: 35 },
        { timestamp: new Date(Date.now()), valor: 42 }
      ],
      periodo: {
        inicio: query.data_inicial,
        fim: query.data_final
      },
      dimensoes: query.dimensoes || {}
    };
  }

  /**
   * Compara valores de uma métrica entre períodos
   */
  @Get(':codigo/comparativo')
  @Roles(ROLES.ADMIN, ROLES.GESTOR, ROLES.TECNICO)
  @ApiOperation({ summary: 'Compara valores de uma métrica entre períodos' })
  @ApiResponse({ status: 200, description: 'Comparativo retornado com sucesso' })
  @ApiResponse({ status: 404, description: 'Métrica não encontrada' })
  async compararPeriodos(
    @Param('codigo') codigo: string,
    @Query('periodo1Inicio') periodo1Inicio: Date,
    @Query('periodo1Fim') periodo1Fim: Date,
    @Query('periodo2Inicio') periodo2Inicio: Date,
    @Query('periodo2Fim') periodo2Fim: Date,
    @Query('granularidade') granularidade: string,
  ) {
    // Temporariamente retornando dados mockados até que o método seja implementado
    return {
      metrica: codigo,
      periodo1: {
        inicio: periodo1Inicio,
        fim: periodo1Fim,
        valor: 35,
      },
      periodo2: {
        inicio: periodo2Inicio,
        fim: periodo2Fim,
        valor: 42,
      },
      variacao: {
        absoluta: 7,
        percentual: 20,
      },
      granularidade: granularidade || 'dia'
    };
  }

  /**
   * Executa coleta manual de uma métrica
   */
  @Post('coleta-manual')
  @Roles(ROLES.ADMIN, ROLES.GESTOR)
  @ApiOperation({ summary: 'Executa coleta manual de uma métrica' })
  @ApiResponse({ status: 201, description: 'Coleta executada com sucesso' })
  @ApiResponse({ status: 404, description: 'Métrica não encontrada' })
  async executarColetaManual(@Body() dto: ColetaManualMetricaDto) {
    return this.metricasColetaService.coletarMetricaManual(dto.codigo, dto.dimensoes);
  }
}
