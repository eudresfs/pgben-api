import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';

import { MetricasAnomaliasService, NivelConfiancaAnomalia } from '../services';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Role } from '../../../shared/enums/role.enum'
import { Roles } from '@/auth';

/**
 * Controlador para detecção de anomalias e análise de tendências
 */
@ApiTags('Métricas - Anomalias e Tendências')
@Controller('metricas/analise')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MetricasAnomaliasController {
  constructor(
    private readonly anomaliasService: MetricasAnomaliasService,
  ) {}

  /**
   * Detecta anomalias para um snapshot específico
   */
  @Post('anomalias/snapshot/:id')
  @Roles(Role.ADMIN, Role.GESTOR_SEMTAS, Role.COORDENADOR_UNIDADE)
  @ApiOperation({ summary: 'Detectar anomalias para um snapshot específico' })
  @ApiParam({ name: 'id', description: 'ID do snapshot' })
  @ApiQuery({ 
    name: 'nivel_confianca', 
    description: 'Nível de confiança para detecção', 
    enum: NivelConfiancaAnomalia,
    required: false 
  })
  @ApiQuery({ 
    name: 'janela_temporal', 
    description: 'Número de dias a considerar para o histórico', 
    required: false 
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Resultado da detecção de anomalias' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Snapshot não encontrado' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Não autorizado' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Acesso negado' })
  async detectarAnomalias(
    @Param('id') id: string,
    @Query('nivel_confianca') nivelConfianca?: NivelConfiancaAnomalia,
    @Query('janela_temporal') janelaTemporal?: number,
  ) {
    return this.anomaliasService.detectarAnomaliasPorSnapshot(
      id,
      nivelConfianca || NivelConfiancaAnomalia.MEDIO,
      janelaTemporal ? Number(janelaTemporal) : 30,
    );
  }

  /**
   * Executa detecção de anomalias em lote para todas as métricas
   */
  @Post('anomalias/batch')
  @Roles(Role.ADMIN, Role.COORDENADOR_UNIDADE)
  @ApiOperation({ summary: 'Detectar anomalias em lote para todas as métricas' })
  @ApiQuery({ 
    name: 'nivel_confianca', 
    description: 'Nível de confiança para detecção', 
    enum: NivelConfiancaAnomalia,
    required: false 
  })
  @ApiQuery({ 
    name: 'janela_temporal', 
    description: 'Número de dias a considerar para o histórico', 
    required: false 
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lista de anomalias detectadas' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Não autorizado' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Acesso negado' })
  async detectarAnomaliasBatch(
    @Query('nivel_confianca') nivelConfianca?: NivelConfiancaAnomalia,
    @Query('janela_temporal') janelaTemporal?: number,
  ) {
    return this.anomaliasService.detectarAnomaliasBatch(
      janelaTemporal ? Number(janelaTemporal) : 7,
      nivelConfianca || NivelConfiancaAnomalia.MEDIO,
    );
  }

  /**
   * Analisa tendências para uma métrica
   */
  @Post('tendencias/metrica/:id')
  @Roles(Role.ADMIN, Role.GESTOR_SEMTAS, Role.COORDENADOR_UNIDADE)
  @ApiOperation({ summary: 'Analisar tendências para uma métrica' })
  @ApiParam({ name: 'id', description: 'ID da métrica' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Resultado da análise de tendências' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Métrica não encontrada' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Não autorizado' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Acesso negado' })
  async analisarTendencias(
    @Param('id') id: string,
    @Body() body: {
      data_inicial: string;
      data_final: string;
      dimensoes?: Record<string, any>;
    },
  ) {
    return this.anomaliasService.analisarTendencias(
      id,
      new Date(body.data_inicial),
      new Date(body.data_final),
      body.dimensoes || {},
    );
  }
}
