import {
  Controller,
  Get,
  Query,
  UseGuards,
  Logger,
  ParseEnumPipe,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { Usuario } from '../../../entities/usuario.entity';
import {
  RelatorioMonitoramentoService,
  MetricasGerais,
  MetricasPeriodo,
  RankingTecnico,
  AnaliseProblemas,
  FiltrosRelatorio,
} from '../services/relatorio-monitoramento.service';
import {
  StatusAgendamento,
  ResultadoVisita,
  TipoVisita,
  PrioridadeVisita,
} from '../../../enums';
import {
  TipoAcaoHistorico,
  CategoriaHistorico,
  HistoricoMonitoramento,
} from '../entities/historico-monitoramento.entity';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { OptionalParseEnumPipe } from '../../../shared/pipes/optional-parse-enum.pipe';

/**
 * DTO para filtros de relatório via query parameters
 */
export class FiltrosRelatorioDto implements FiltrosRelatorio {
  data_inicio?: Date;
  data_fim?: Date;
  tecnico_id?: string;
  unidade_id?: string;
  tipo_visita?: TipoVisita;
  status_agendamento?: StatusAgendamento;
  resultado_visita?: ResultadoVisita;
  prioridade?: PrioridadeVisita;
}

/**
 * Controller responsável pelos relatórios e dashboards do módulo de monitoramento
 */
@ApiTags('Relatórios de Monitoramento')
@Controller('monitoramento/relatorios')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class RelatorioMonitoramentoController {
  private readonly logger = new Logger(RelatorioMonitoramentoController.name);

  constructor(
    private readonly relatorioService: RelatorioMonitoramentoService,
  ) {}

  /**
   * Obtém métricas gerais do dashboard
   */
  @Get('metricas-gerais')
  @RequiresPermission({permissionName: 'monitoramento.metricas'})
  @ApiOperation({
    summary: 'Métricas gerais do dashboard',
    description: 'Retorna métricas consolidadas para o dashboard principal',
  })
  @ApiQuery({ name: 'data_inicio', required: false, type: Date, description: 'Data de início do período', example: '2024-01-01' })
  @ApiQuery({ name: 'data_fim', required: false, type: Date, description: 'Data de fim do período', example: '2024-12-31' })
  @ApiQuery({ name: 'tecnico_id', required: false, type: String, description: 'ID do técnico para filtrar', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiQuery({ name: 'unidade_id', required: false, type: String, description: 'ID da unidade para filtrar', example: '550e8400-e29b-41d4-a716-446655440001' })
  @ApiQuery({ name: 'tipo_visita', required: false, enum: ['inicial', 'acompanhamento', 'revisao'], description: 'Tipo de visita para filtrar' })
  @ApiQuery({ name: 'status_agendamento', required: false, enum: ['pendente', 'confirmado', 'cancelado', 'realizado'], description: 'Status do agendamento para filtrar' })
  @ApiQuery({ name: 'resultado_visita', required: false, enum: ['realizada', 'cancelada', 'reagendada', 'nao_encontrado'], description: 'Resultado da visita para filtrar' })
  @ApiQuery({ name: 'prioridade', required: false, enum: ['baixa', 'media', 'alta', 'urgente'], description: 'Prioridade para filtrar' })
  @ApiResponse({
    status: 200,
    description: 'Métricas obtidas com sucesso',
    example: {
      total_agendamentos: 150,
      agendamentos_pendentes: 25,
      agendamentos_confirmados: 100,
      agendamentos_em_atraso: 10,
      total_visitas: 120,
      visitas_realizadas: 95,
      visitas_canceladas: 15,
      taxa_conclusao: 79.17,
      tempo_medio_visita: 4500,
      avaliacoes_criadas: 85,
      avaliacoes_adequadas: 75,
      taxa_adequacao: 88.24
    }
  })
  async getMetricasGerais(
    @Query() filtrosDto: FiltrosRelatorioDto,
    @GetUser() usuario: Usuario,
  ): Promise<MetricasGerais> {
    try {
      this.logger.log(
        `Usuário ${usuario.id} solicitou métricas gerais com filtros: ${JSON.stringify(filtrosDto)}`,
      );

      const filtros = this.parseFiltros(filtrosDto || {});
      return await this.relatorioService.getMetricasGerais(filtros);
    } catch (error) {
      this.logger.error('Erro ao obter métricas gerais', error);
      throw error;
    }
  }

  /**
   * Obtém métricas por período
   */
  @Get('metricas-periodo')
  @RequiresPermission({permissionName: 'monitoramento.metricas'})
  @ApiOperation({
    summary: 'Métricas por período',
    description: 'Retorna métricas agrupadas por período (dia, semana, mês)',
  })
  @ApiQuery({ name: 'periodo', required: true, enum: ['dia', 'semana', 'mes'], description: 'Tipo de agrupamento por período', example: 'mes' })
  @ApiQuery({ name: 'data_inicio', required: false, type: Date, description: 'Data de início do período', example: '2024-01-01' })
  @ApiQuery({ name: 'data_fim', required: false, type: Date, description: 'Data de fim do período', example: '2024-12-31' })
  @ApiQuery({ name: 'tecnico_id', required: false, type: String, description: 'ID do técnico para filtrar', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiQuery({ name: 'unidade_id', required: false, type: String, description: 'ID da unidade para filtrar', example: '550e8400-e29b-41d4-a716-446655440001' })
  @ApiResponse({
    status: 200,
    description: 'Métricas por período obtidas com sucesso',
    example: [
      {
        periodo: '2024-01',
        agendamentos: 45,
        visitas_realizadas: 38,
        visitas_canceladas: 5,
        avaliacoes: 32,
        tempo_medio: 4200
      },
      {
        periodo: '2024-02',
        agendamentos: 52,
        visitas_realizadas: 47,
        visitas_canceladas: 3,
        avaliacoes: 41,
        tempo_medio: 4100
      }
    ]
  })
  async getMetricasPorPeriodo(
    @Query() filtrosDto: FiltrosRelatorioDto,
    @GetUser() usuario: Usuario,
    @Query('periodo', new OptionalParseEnumPipe(['dia', 'semana', 'mes'], 'período'))
    periodo?: 'dia' | 'semana' | 'mes',
    
    
  ): Promise<MetricasPeriodo[]> {
    try {
      // Definir período padrão se não fornecido
      const periodoFinal = periodo || 'mes';
      
      this.logger.log(
        `Usuário ${usuario.id} solicitou métricas por período: ${periodoFinal}`,
      );

      const filtros = this.parseFiltros(filtrosDto || {});
      return await this.relatorioService.getMetricasPorPeriodo(periodoFinal, filtros);
    } catch (error) {
      this.logger.error('Erro ao obter métricas por período', error);
      throw error;
    }
  }

  /**
   * Obtém ranking de técnicos
   */
  @Get('ranking-tecnicos')
  @RequiresPermission({permissionName: 'monitoramento.metricas'})
  @ApiOperation({
    summary: 'Ranking de técnicos',
    description: 'Retorna ranking de técnicos por performance',
  })
  @ApiQuery({ name: 'data_inicio', required: false, type: Date, description: 'Data de início do período', example: '2024-01-01' })
  @ApiQuery({ name: 'data_fim', required: false, type: Date, description: 'Data de fim do período', example: '2024-12-31' })
  @ApiQuery({ name: 'unidade_id', required: false, type: String, description: 'ID da unidade para filtrar', example: '550e8400-e29b-41d4-a716-446655440001' })
  @ApiQuery({ name: 'tipo_visita', required: false, enum: ['inicial', 'acompanhamento', 'revisao'], description: 'Tipo de visita para filtrar' })
  @ApiResponse({
    status: 200,
    description: 'Ranking obtido com sucesso',
    example: [
      {
        tecnico_id: '550e8400-e29b-41d4-a716-446655440000',
        tecnico_nome: 'João Silva',
        total_visitas: 25,
        visitas_realizadas: 22,
        visitas_canceladas: 3,
        tempo_medio_visita: 4200,
        avaliacoes_adequadas: 18,
        taxa_adequacao: 81.82,
        pontuacao: 87.5
      },
      {
        tecnico_id: '550e8400-e29b-41d4-a716-446655440001',
        tecnico_nome: 'Maria Santos',
        total_visitas: 30,
        visitas_realizadas: 28,
        visitas_canceladas: 2,
        tempo_medio_visita: 3900,
        avaliacoes_adequadas: 25,
        taxa_adequacao: 89.29,
        pontuacao: 92.1
      }
    ]
  })
  async getRankingTecnicos(
    @Query() filtrosDto: FiltrosRelatorioDto,
    @GetUser() usuario: Usuario,
  ): Promise<RankingTecnico[]> {
    try {
      this.logger.log(
        `Usuário ${usuario.id} solicitou ranking de técnicos`,
      );

      const filtros = this.parseFiltros(filtrosDto || {});
      return await this.relatorioService.getRankingTecnicos(filtros);
    } catch (error) {
      this.logger.error('Erro ao obter ranking de técnicos', error);
      throw error;
    }
  }

  /**
   * Obtém análise de problemas
   */
  @Get('analise-problemas')
  @RequiresPermission({permissionName: 'monitoramento.metricas'})
  @ApiOperation({
    summary: 'Análise de problemas',
    description: 'Retorna análise de problemas recorrentes e recomendações',
  })
  @ApiQuery({ name: 'data_inicio', required: false, type: Date, description: 'Data de início do período', example: '2024-01-01' })
  @ApiQuery({ name: 'data_fim', required: false, type: Date, description: 'Data de fim do período', example: '2024-12-31' })
  @ApiQuery({ name: 'tecnico_id', required: false, type: String, description: 'ID do técnico para filtrar', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiQuery({ name: 'unidade_id', required: false, type: String, description: 'ID da unidade para filtrar', example: '550e8400-e29b-41d4-a716-446655440001' })
  @ApiResponse({
    status: 200,
    description: 'Análise obtida com sucesso',
    example: [
      {
        tipo_problema: 'Cancelamentos de Visitas',
        quantidade: 15,
        percentual: 12.5,
        impacto: 'medio',
        recomendacoes: [
          'Revisar processo de confirmação',
          'Implementar lembretes automáticos',
          'Melhorar comunicação com beneficiários'
        ]
      },
      {
        tipo_problema: 'Atrasos em Agendamentos',
        quantidade: 8,
        percentual: 6.7,
        impacto: 'baixo',
        recomendacoes: [
          'Otimizar rotas de visitas',
          'Ajustar tempo estimado por visita'
        ]
      }
    ]
  })
  async getAnaliseProblemas(
    @Query() filtrosDto: FiltrosRelatorioDto,
    @GetUser() usuario: Usuario,
  ): Promise<AnaliseProblemas[]> {
    try {
      this.logger.log(
        `Usuário ${usuario.id} solicitou análise de problemas`,
      );

      const filtros = this.parseFiltros(filtrosDto || {});
      return await this.relatorioService.getAnaliseProblemas(filtros);
    } catch (error) {
      this.logger.error('Erro ao obter análise de problemas', error);
      throw error;
    }
  }

  /**
   * Obtém histórico de auditoria
   */
  @Get('historico-auditoria')
  @RequiresPermission({permissionName: 'monitoramento.auditoria'})
  @ApiOperation({
    summary: 'Histórico de auditoria',
    description: 'Retorna histórico de ações para auditoria',
  })
  @ApiQuery({ name: 'data_inicio', required: false, type: Date, description: 'Data de início do período', example: '2024-01-01' })
  @ApiQuery({ name: 'data_fim', required: false, type: Date, description: 'Data de fim do período', example: '2024-12-31' })
  @ApiQuery({ name: 'tecnico_id', required: false, type: String, description: 'ID do técnico para filtrar', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiQuery({ name: 'unidade_id', required: false, type: String, description: 'ID da unidade para filtrar', example: '550e8400-e29b-41d4-a716-446655440001' })
  @ApiQuery({ name: 'tipo_acao', required: false, description: 'Tipo de ação para filtrar', example: 'agendamento_criado' })
  @ApiQuery({ name: 'categoria', required: false, description: 'Categoria da ação para filtrar', example: 'agendamento' })
  @ApiQuery({ name: 'usuario_id', required: false, type: String, description: 'ID do usuário que executou a ação', example: '550e8400-e29b-41d4-a716-446655440002' })
  @ApiResponse({
    status: 200,
    description: 'Histórico obtido com sucesso',
    example: [
      {
        id: '550e8400-e29b-41d4-a716-446655440010',
        tipo_acao: 'agendamento_criado',
        categoria: 'agendamento',
        descricao: 'Agendamento criado para João Silva em 15/02/2024',
        sucesso: true,
        created_at: '2024-02-15T10:30:00.000Z',
        usuario: {
          id: '550e8400-e29b-41d4-a716-446655440002',
          nome: 'Maria Santos'
        }
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440011',
        tipo_acao: 'visita_registrada',
        categoria: 'visita',
        descricao: 'Visita domiciliar registrada com sucesso',
        sucesso: true,
        created_at: '2024-02-15T14:45:00.000Z',
        usuario: {
          id: '550e8400-e29b-41d4-a716-446655440003',
          nome: 'Carlos Silva'
        }
      }
    ]
  })
  async getHistoricoAuditoria(
    @GetUser() usuario: Usuario,
    @Query() filtrosDto: FiltrosRelatorioDto,
    @Query('tipo_acao') tipoAcao?: TipoAcaoHistorico,
    @Query('categoria') categoria?: CategoriaHistorico,
    @Query('usuario_id', new ParseUUIDPipe({ optional: true }))
    usuarioIdFiltro?: string,
  ): Promise<HistoricoMonitoramento[]> {
    try {
      this.logger.log(
        `Usuário ${usuario.id} solicitou histórico de auditoria`,
      );

      const filtros = {
        ...this.parseFiltros(filtrosDto || {}),
        tipo_acao: tipoAcao,
        categoria: categoria,
        usuario_id: usuarioIdFiltro,
      };

      return await this.relatorioService.getHistoricoAuditoria(filtros);
    } catch (error) {
      this.logger.error('Erro ao obter histórico de auditoria', error);
      throw error;
    }
  }

  /**
   * Exporta relatório em formato CSV
   */
  @Get('exportar-csv')
  @RequiresPermission({permissionName: 'monitoramento.exportar'})
  @ApiOperation({
    summary: 'Exportar relatório CSV',
    description: 'Exporta relatório de métricas em formato CSV',
  })
  @ApiQuery({ name: 'tipo', required: true, enum: ['metricas-gerais', 'ranking-tecnicos', 'analise-problemas'], description: 'Tipo de relatório para exportar', example: 'metricas-gerais' })
  @ApiQuery({ name: 'data_inicio', required: false, type: Date, description: 'Data de início do período', example: '2024-01-01' })
  @ApiQuery({ name: 'data_fim', required: false, type: Date, description: 'Data de fim do período', example: '2024-12-31' })
  @ApiQuery({ name: 'tecnico_id', required: false, type: String, description: 'ID do técnico para filtrar', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiQuery({ name: 'unidade_id', required: false, type: String, description: 'ID da unidade para filtrar', example: '550e8400-e29b-41d4-a716-446655440001' })
  @ApiResponse({
    status: 200,
    description: 'Arquivo CSV gerado com sucesso',
    content: {
      'text/csv': {
        schema: {
          type: 'string',
          example: 'ID,Nome,Total Visitas,Visitas Realizadas,Taxa Adequação\n550e8400-e29b-41d4-a716-446655440000,João Silva,25,22,81.82\n550e8400-e29b-41d4-a716-446655440001,Maria Santos,30,28,89.29'
        }
      }
    },
    headers: {
      'Content-Type': {
        description: 'Tipo do conteúdo',
        schema: { type: 'string', example: 'text/csv; charset=utf-8' }
      },
      'Content-Disposition': {
        description: 'Disposição do conteúdo para download',
        schema: { type: 'string', example: 'attachment; filename="relatorio-monitoramento-2024.csv"' }
      }
    }
  })
  async exportarCSV(
    @GetUser() usuario: Usuario,
    @Query('tipo', new OptionalParseEnumPipe(['metricas-gerais', 'ranking-tecnicos', 'analise-problemas'], 'tipo de relatório'))
    tipo?: 'metricas-gerais' | 'ranking-tecnicos' | 'analise-problemas',
    @Query() filtrosDto?: FiltrosRelatorioDto,
  ): Promise<string> {
    try {
      // Definir tipo padrão se não fornecido
      const tipoFinal = tipo || 'metricas-gerais';
      
      this.logger.log(
        `Usuário ${usuario.id} solicitou exportação CSV: ${tipoFinal}`,
      );

      const filtros = this.parseFiltros(filtrosDto);
      
      // Implementação básica - pode ser expandida
      switch (tipoFinal) {
        case 'metricas-gerais':
          const metricas = await this.relatorioService.getMetricasGerais(filtros);
          return this.convertToCSV([metricas], Object.keys(metricas));
        
        case 'ranking-tecnicos':
          const ranking = await this.relatorioService.getRankingTecnicos(filtros);
          return this.convertToCSV(ranking, [
            'tecnico_nome',
            'total_visitas',
            'visitas_realizadas',
            'taxa_adequacao',
            'pontuacao',
          ]);
        
        case 'analise-problemas':
          const problemas = await this.relatorioService.getAnaliseProblemas(filtros);
          return this.convertToCSV(problemas, [
            'tipo_problema',
            'quantidade',
            'percentual',
            'impacto',
          ]);
        
        default:
          throw new BadRequestException('Tipo de relatório inválido');
      }
    } catch (error) {
      this.logger.error('Erro ao exportar CSV', error);
      throw error;
    }
  }

  // Métodos auxiliares privados

  private parseFiltros(filtrosDto: FiltrosRelatorioDto): FiltrosRelatorio {
    const filtros: FiltrosRelatorio = {};

    if (filtrosDto.data_inicio) {
      filtros.data_inicio = new Date(filtrosDto.data_inicio);
      if (isNaN(filtros.data_inicio.getTime())) {
        throw new BadRequestException('Data de início inválida');
      }
    }

    if (filtrosDto.data_fim) {
      filtros.data_fim = new Date(filtrosDto.data_fim);
      if (isNaN(filtros.data_fim.getTime())) {
        throw new BadRequestException('Data de fim inválida');
      }
    }

    if (filtros.data_inicio && filtros.data_fim && filtros.data_inicio > filtros.data_fim) {
      throw new BadRequestException('Data de início deve ser anterior à data de fim');
    }

    if (filtrosDto.tecnico_id) {
      filtros.tecnico_id = filtrosDto.tecnico_id;
    }

    if (filtrosDto.unidade_id) {
      filtros.unidade_id = filtrosDto.unidade_id;
    }

    if (filtrosDto.tipo_visita) {
      filtros.tipo_visita = filtrosDto.tipo_visita;
    }

    if (filtrosDto.status_agendamento) {
      filtros.status_agendamento = filtrosDto.status_agendamento;
    }

    if (filtrosDto.resultado_visita) {
      filtros.resultado_visita = filtrosDto.resultado_visita;
    }

    if (filtrosDto.prioridade) {
      filtros.prioridade = filtrosDto.prioridade;
    }

    return filtros;
  }

  private convertToCSV(data: any[], headers: string[]): string {
    const csvHeaders = headers.join(',');
    const csvRows = data.map(item => 
      headers.map(header => {
        const value = item[header];
        // Escape aspas duplas e envolve em aspas se contém vírgula
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\n');
  }
}