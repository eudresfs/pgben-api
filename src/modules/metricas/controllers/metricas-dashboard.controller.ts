import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/role.decorator';
import { Role } from '../../../shared/enums/role.enum';

import { MetricasService, MetricasAnomaliasService } from '../services';

/**
 * Controlador para endpoints específicos de dashboard
 * 
 * Este controlador fornece endpoints otimizados para:
 * 1. Obter resumo das métricas principais
 * 2. Listar alertas ativos de anomalias
 * 3. Obter KPIs configurados para dashboard
 */
@ApiTags('métricas-dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/metricas/dashboard')
export class MetricasDashboardController {
  constructor(
    private readonly metricasService: MetricasService,
    private readonly metricasAnomaliasService: MetricasAnomaliasService,
  ) {}

  /**
   * Obtém resumo das métricas principais para dashboard
   */
  @Get('resumo')
  @Roles(Role.ADMIN, Role.GESTOR_SEMTAS, Role.TECNICO_SEMTAS)
  @ApiOperation({ summary: 'Obtém resumo das métricas principais' })
  @ApiResponse({ status: 200, description: 'Resumo obtido com sucesso' })
  async obterResumo(
    @Query('categorias') categorias?: string[],
    @Query('limite') limite?: number,
  ) {
    // Implementação temporária até que o método seja adicionado ao serviço
    return {
      total: 0,
      categorias: categorias || [],
      limite,
      metricas: []
    };
  }

  /**
   * Lista alertas ativos de anomalias
   */
  @Get('alertas')
  @Roles(Role.ADMIN, Role.GESTOR_SEMTAS, Role.TECNICO_SEMTAS)
  @ApiOperation({ summary: 'Lista alertas ativos de anomalias' })
  @ApiResponse({ status: 200, description: 'Alertas listados com sucesso' })
  async listarAlertas(
    @Query('prioridade') prioridade?: string,
    @Query('limite') limite?: number,
  ) {
    // Implementação temporária até que o método seja adicionado ao serviço
    return {
      total: 0,
      prioridade: prioridade || 'todas',
      alertas: []
    };
  }

  /**
   * Obtém KPIs configurados para dashboard
   */
  @Get('kpis')
  @Roles(Role.ADMIN, Role.GESTOR_SEMTAS, Role.TECNICO_SEMTAS)
  @ApiOperation({ summary: 'Obtém KPIs configurados para dashboard' })
  @ApiResponse({ status: 200, description: 'KPIs obtidos com sucesso' })
  async obterKPIs(
    @Query('grupo') grupo?: string,
    @Query('visibilidade') visibilidade?: string,
  ) {
    // Implementação temporária até que o método seja adicionado ao serviço
    return {
      total: 0,
      grupo: grupo || 'todos',
      visibilidade: visibilidade || 'todos',
      kpis: []
    };
  }
}
