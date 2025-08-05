import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { ScopeType } from '../../../entities/user-permission.entity';
import { DashboardFiltrosDto } from '../dto/dashboard-filtros.dto';

import { MetricasService, MetricasAnomaliasService } from '../services';
import { DashboardService } from '../services/dashboard.service';
import {
  DashboardIndicadoresCompletos,
  ImpactoSocialIndicadores,
  EficienciaOperacionalIndicadores,
  GestaoOrcamentariaIndicadores,
  PerformanceUnidadesIndicadores,
  AnaliseTerritorialIndicadores,
  PerfilBeneficiariosIndicadores,
  ConformidadeQualidadeIndicadores,
  ComunicacaoCampanhasIndicadores,
} from '../interfaces/dashboard-indicadores.interface';

/**
 * Controlador para endpoints específicos de dashboard
 *
 * Este controlador fornece endpoints otimizados para:
 * 1. Obter resumo das métricas principais
 * 2. Listar alertas ativos de anomalias
 * 3. Obter KPIs configurados para dashboard
 * 4. Obter dados para gráficos e visualizações
 * 5. Exportar dados para relatórios
 * 6. Obter contagem de solicitações por status
 */
@ApiTags('Métricas e Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('dashboard')
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
  @RequiresPermission({
    permissionName: 'dashboard.visualizar',
    scopeType: ScopeType.GLOBAL,
  })
  @ApiOperation({ summary: 'Obtém resumo das métricas principais' })
  @ApiResponse({ status: 200, description: 'Resumo obtido com sucesso' })
  async obterResumo() {
    return this.dashboardService.obterResumo();
  }

  /**
   * Obtém KPIs para o dashboard
   */
  @Get('kpis')
  @RequiresPermission({
    permissionName: 'dashboard.visualizar',
    scopeType: ScopeType.GLOBAL,
  })
  @ApiOperation({ summary: 'Obtém KPIs para o dashboard' })
  @ApiResponse({ status: 200, description: 'KPIs obtidos com sucesso' })
  async obterKPIs() {
    return this.dashboardService.obterKPIs();
  }

  /**
   * Obtém dados para gráficos do dashboard
   */
  @Get('graficos')
  @RequiresPermission({
    permissionName: 'dashboard.visualizar',
  })
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
   * Obtém contagem de solicitações por status
   */
  @Get('solicitacoes/status')
  @RequiresPermission({
    permissionName: 'dashboard.visualizar',
  })
  @ApiOperation({
    summary: 'Obtém contagem de solicitações por status',
    description:
      'Retorna a quantidade de solicitações agrupadas por status para exibição no dashboard',
  })
  @ApiResponse({
    status: 200,
    description: 'Contagem por status obtida com sucesso',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number', description: 'Total de solicitações' },
        porStatus: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              status: { type: 'string', description: 'Nome do status' },
              quantidade: {
                type: 'number',
                description: 'Quantidade de solicitações neste status',
              },
              percentual: {
                type: 'number',
                description: 'Percentual em relação ao total',
              },
            },
          },
        },
      },
    },
  })
  async obterContagemPorStatus() {
    return this.dashboardService.obterContagemSolicitacoesPorStatus();
  }

  /**
   * Obtém todos os indicadores organizados por segmentos
   */
  @Get('indicadores/completos')
  @RequiresPermission({
    permissionName: 'dashboard.visualizar',
  })
  @ApiOperation({
    summary: 'Indicadores completos do dashboard',
    description:
      'Retorna todos os indicadores organizados em 8 segmentos: Impacto Social, Eficiência Operacional, Gestão Orçamentária, Performance das Unidades, Análise Territorial, Perfil dos Beneficiários, Conformidade e Qualidade, e Comunicação e Campanhas',
  })
  @ApiResponse({
    status: 200,
    description: 'Indicadores completos obtidos com sucesso',
  })
  async obterIndicadoresCompletos(
    @Query() filtros: DashboardFiltrosDto,
  ): Promise<DashboardIndicadoresCompletos> {
    return this.dashboardService.obterIndicadoresCompletos(filtros);
  }

  /**
   * IMPACTO SOCIAL
   */
  @Get('indicadores/impacto-social')
  @RequiresPermission({
    permissionName: 'dashboard.visualizar',
  })
  @ApiOperation({
    summary: 'Impacto Social',
    description:
      'Métricas de impacto social e narrativa de sucesso: famílias beneficiadas, pessoas impactadas, investimento social total, evolução mensal, distribuição por tipo de benefício',
  })
  @ApiResponse({
    status: 200,
    description: 'Indicadores de impacto social obtidos com sucesso',
  })
  async obterIndicadoresImpactoSocial(
    @Query() filtros: DashboardFiltrosDto,
  ): Promise<ImpactoSocialIndicadores> {
    return this.dashboardService.obterIndicadoresImpactoSocial(filtros);
  }

  /**
   * EFICIÊNCIA OPERACIONAL
   */
  @Get('indicadores/eficiencia-operacional')
  @RequiresPermission({
    permissionName: 'dashboard.visualizar',
  })
  @ApiOperation({
    summary: 'Eficiência Operacional',
    description:
      'Métricas de melhoria de processos e produtividade: tempo médio de processamento, taxa de aprovação, pendências ativas, produtividade por técnico',
  })
  @ApiResponse({
    status: 200,
    description: 'Indicadores de eficiência operacional obtidos com sucesso',
  })
  async obterIndicadoresEficienciaOperacional(
    @Query() filtros: DashboardFiltrosDto,
  ): Promise<EficienciaOperacionalIndicadores> {
    return this.dashboardService.obterIndicadoresEficienciaOperacional(filtros);
  }

  /**
   * GESTÃO ORÇAMENTÁRIA
   */
  @Get('indicadores/gestao-orcamentaria')
  @RequiresPermission({
    permissionName: 'dashboard.visualizar',
  })
  @ApiOperation({
    summary: 'Gestão Orçamentária',
    description:
      'Métricas de controle financeiro e execução: execução orçamentária, valor total investido, custo médio por benefício, projeção vs realizado',
  })
  @ApiResponse({
    status: 200,
    description: 'Indicadores de gestão orçamentária obtidos com sucesso',
  })
  async obterIndicadoresGestaoOrcamentaria(
    @Query() filtros: DashboardFiltrosDto,
  ): Promise<GestaoOrcamentariaIndicadores> {
    return this.dashboardService.obterIndicadoresGestaoOrcamentaria(filtros);
  }

  /**
   * PERFORMANCE DAS UNIDADES
   */
  @Get('indicadores/performance-unidades')
  @RequiresPermission({
    permissionName: 'dashboard.visualizar',
  })
  @ApiOperation({
    summary: 'Performance das Unidades',
    description:
      'Métricas de gestão de equipes e recursos: solicitações por unidade, tempo médio por unidade, taxa de aprovação por unidade, utilização orçamentária',
  })
  @ApiResponse({
    status: 200,
    description: 'Indicadores de performance das unidades obtidos com sucesso',
  })
  async obterIndicadoresPerformanceUnidades(
    @Query() filtros: DashboardFiltrosDto,
  ): Promise<PerformanceUnidadesIndicadores> {
    return this.dashboardService.obterIndicadoresPerformanceUnidades(filtros);
  }

  /**
   * ANÁLISE TERRITORIAL
   */
  @Get('indicadores/analise-territorial')
  @RequiresPermission({
    permissionName: 'dashboard.visualizar',
  })
  @ApiOperation({
    summary: 'Análise Territorial',
    description:
      'Métricas de distribuição geográfica e vulnerabilidade: densidade de demanda, mapa de vulnerabilidade, cobertura territorial, acessibilidade',
  })
  @ApiResponse({
    status: 200,
    description: 'Indicadores de análise territorial obtidos com sucesso',
  })
  async obterIndicadoresAnaliseTerritorial(
    @Query() filtros: DashboardFiltrosDto,
  ): Promise<AnaliseTerritorialIndicadores> {
    return this.dashboardService.obterIndicadoresAnaliseTerritorial(filtros);
  }

  /**
   * PERFIL DOS BENEFICIÁRIOS
   */
  @Get('indicadores/perfil-beneficiarios')
  @RequiresPermission({
    permissionName: 'dashboard.visualizar',
  })
  @ApiOperation({
    summary: 'Perfil dos Beneficiários',
    description:
      'Métricas de características socioeconômicas: composição familiar média, renda familiar média, faixa etária predominante, situações de vulnerabilidade',
  })
  @ApiResponse({
    status: 200,
    description: 'Indicadores de perfil dos beneficiários obtidos com sucesso',
  })
  async obterIndicadoresPerfilBeneficiarios(
    @Query() filtros: DashboardFiltrosDto,
  ): Promise<PerfilBeneficiariosIndicadores> {
    return this.dashboardService.obterIndicadoresPerfilBeneficiarios(filtros);
  }



  /**
   * COMUNICAÇÃO E CAMPANHAS
   */
  @Get('indicadores/comunicacao-campanhas')
  @RequiresPermission({
    permissionName: 'dashboard.visualizar',
  })
  @ApiOperation({
    summary: 'Comunicação e Campanhas',
    description:
      'Métricas para narrativas de mídia e comunicação externa: mensagens formatadas, comparativos temporais, impacto consolidado, cases de sucesso',
  })
  @ApiResponse({
    status: 200,
    description: 'Indicadores de comunicação e campanhas obtidos com sucesso',
  })
  async obterIndicadoresComunicacaoCampanhas(
    @Query() filtros: DashboardFiltrosDto,
  ): Promise<ComunicacaoCampanhasIndicadores> {
    return this.dashboardService.obterIndicadoresComunicacaoCampanhas(filtros);
  }

  /**
   * Lista alertas ativos de anomalias
   */
  @Get('alertas')
  @RequiresPermission({
    permissionName: 'dashboard.visualizar',
    scopeType: ScopeType.GLOBAL,
  })
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
      alertas: [],
    };
  }
}
