import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { ScopeType } from '../../../entities/user-permission.entity';

import { MetricasService, MetricasAnomaliasService } from '../services';
import { DashboardService } from '../services/dashboard.service';

/**
 * Controlador para endpoints específicos de dashboard
 * 
 * Este controlador fornece endpoints otimizados para:
 * 1. Obter resumo das métricas principais
 * 2. Listar alertas ativos de anomalias
 * 3. Obter KPIs configurados para dashboard
 * 4. Obter dados para gráficos e visualizações
 * 5. Exportar dados para relatórios
 */
@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('v1/dashboard')
export class MetricasDashboardController {
  constructor(
    private readonly metricasService: MetricasService,
    private readonly metricasAnomaliasService: MetricasAnomaliasService,
    private readonly dashboardService: DashboardService,
  ) {}

  /**
   * Obtém resumo das métricas principais para dashboard
   */
  @Get('resumo')
  @RequiresPermission(
    
    {
      permissionName: 'dashboard.visualizar',
      scopeType: ScopeType.GLOBAL,
    }
  )
  @ApiOperation({ summary: 'Obtém resumo das métricas principais' })
  @ApiResponse({ status: 200, description: 'Resumo obtido com sucesso' })
  async obterResumo() {
    return this.dashboardService.obterResumo();
  }

  /**
   * Obtém KPIs para o dashboard
   */
  @Get('kpis')
  @RequiresPermission(
    
    {
      permissionName: 'dashboard.visualizar',
      scopeType: ScopeType.GLOBAL,
    }
  )
  @ApiOperation({ summary: 'Obtém KPIs para o dashboard' })
  @ApiResponse({ status: 200, description: 'KPIs obtidos com sucesso' })
  async obterKPIs() {
    return this.dashboardService.obterKPIs();
  }

  /**
   * Obtém dados para gráficos do dashboard
   */
  @Get('graficos')
  @RequiresPermission(
    
    {
      permissionName: 'dashboard.visualizar',
      scopeType: ScopeType.GLOBAL,
    }
  )
  @ApiOperation({ summary: 'Obtém dados para gráficos do dashboard' })
  @ApiResponse({ status: 200, description: 'Dados obtidos com sucesso' })
  @ApiQuery({
    name: 'periodo',
    required: false,
    type: Number,
    description: 'Período em dias para filtrar os dados',
  })
  async obterGraficos(@Query('periodo') periodo?: number) {
    return this.dashboardService.obterGraficos(periodo ? +periodo : 30);
  }

  /**
   * Lista alertas ativos de anomalias
   */
  @Get('alertas')
  @RequiresPermission(
    
    {
      permissionName: 'dashboard.visualizar',
      scopeType: ScopeType.GLOBAL,
    }
  )
  @ApiOperation({ summary: 'Lista alertas ativos de anomalias' })
  @ApiResponse({ status: 200, description: 'Alertas listados com sucesso' })
  @ApiQuery({
    name: 'prioridade',
    required: false,
    type: String,
    description: 'Filtro por prioridade (alta, media, baixa)',
  })
  @ApiQuery({
    name: 'limite',
    required: false,
    type: Number,
    description: 'Limite de alertas a serem retornados',
  })
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
}
