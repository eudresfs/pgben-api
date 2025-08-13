import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpStatus,
  Logger,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { AuditInterceptor } from '../../auditoria/interceptors/audit.interceptor';
import { AprovacaoService } from '../services/aprovacao.service';
import { EscalacaoAprovacaoService } from '../services/escalacao-aprovacao.service';
import { NotificacaoAprovacaoService } from '../services/notificacao-aprovacao.service';
import { HistoricoAprovacaoService } from '../services/historico-aprovacao.service';
import {
  EstrategiaAprovacao,
  TipoAcaoCritica,
  StatusSolicitacaoAprovacao,
  PrioridadeAprovacao,
} from '../enums';
import { RequerAprovacao, AcaoCritica } from '../decorators/requer-aprovacao.decorator';
import { AprovacaoInterceptor } from '../interceptors/aprovacao.interceptor';
import { Usuario } from '../../../entities/usuario.entity';

/**
 * Controlador para gerenciamento de workflows de aprovação
 * 
 * Este controlador expõe endpoints para:
 * - Gerenciar workflows e estratégias de aprovação
 * - Monitorar métricas e performance do sistema
 * - Configurar escalações automáticas
 * - Gerar relatórios e dashboards
 * - Administrar o sistema de aprovação
 */
@ApiTags('Workflow de Aprovação')
@Controller('aprovacao/workflow')
@UseGuards(JwtAuthGuard, PermissionGuard)
@UseInterceptors(AuditInterceptor, AprovacaoInterceptor)
@ApiBearerAuth()
export class WorkflowAprovacaoController {
  private readonly logger = new Logger(WorkflowAprovacaoController.name);

  constructor(
    private readonly aprovacaoService: AprovacaoService,
    private readonly escalacaoService: EscalacaoAprovacaoService,
    private readonly notificacaoService: NotificacaoAprovacaoService,
    private readonly historicoService: HistoricoAprovacaoService,
  ) {}

  // ==================== MÉTRICAS E DASHBOARDS ====================

  /**
   * Obter métricas gerais do sistema de aprovação
   */
  @Get('metricas/geral')
  @RequiresPermission({ permissionName: 'aprovacao.workflow.visualizar' })
  @ApiOperation({ summary: 'Obter métricas gerais do sistema de aprovação' })
  @ApiQuery({ name: 'periodo', type: String, required: false, description: 'Período (7d, 30d, 90d, 1y)' })
  @ApiQuery({ name: 'unidade_id', type: String, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Métricas gerais do sistema',
    schema: {
      type: 'object',
      properties: {
        periodo: { type: 'string' },
        total_solicitacoes: { type: 'number' },
        aprovadas: { type: 'number' },
        rejeitadas: { type: 'number' },
        pendentes: { type: 'number' },
        expiradas: { type: 'number' },
        canceladas: { type: 'number' },
        taxa_aprovacao: { type: 'number' },
        tempo_medio_aprovacao: { type: 'number' },
        tempo_medio_resposta: { type: 'number' },
        solicitacoes_por_dia: { type: 'array' },
        top_acoes_criticas: { type: 'array' },
        aprovadores_mais_ativos: { type: 'array' },
        distribuicao_por_status: { type: 'object' },
      },
    },
  })
  async obterMetricasGerais(
    @GetUser() usuario: Usuario,
    @Query('periodo') periodo: string = '30d',
    @Query('unidade_id') unidadeId?: string,
  ) {
    this.logger.log('Obtendo métricas gerais', { periodo, unidadeId, usuarioId: usuario.id });
    
    // Converte período para datas
    const agora = new Date();
    const diasAtras = parseInt(periodo.replace('d', '')) || 30;
    const dataInicio = new Date(agora.getTime() - (diasAtras * 24 * 60 * 60 * 1000));
    const dataFim = agora;
    
    return this.aprovacaoService.obterMetricasGerais({ data_inicio: dataInicio, data_fim: dataFim }, unidadeId);
  }

  /**
   * Obter métricas de performance dos aprovadores
   */
  @Get('metricas/aprovadores')
  @RequiresPermission({ permissionName: 'aprovacao.metricas.aprovadores.visualizar' })
  @ApiOperation({ summary: 'Obter métricas de performance dos aprovadores' })
  @ApiQuery({ name: 'periodo', type: String, required: false })
  @ApiQuery({ name: 'unidade_id', type: String, required: false })
  @ApiQuery({ name: 'top', type: Number, required: false, description: 'Número de top aprovadores' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Métricas de performance dos aprovadores',
    schema: {
      type: 'object',
      properties: {
        aprovadores: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              aprovador_id: { type: 'string' },
              nome: { type: 'string' },
              total_aprovacoes: { type: 'number' },
              total_rejeicoes: { type: 'number' },
              tempo_medio_resposta: { type: 'number' },
              taxa_aprovacao: { type: 'number' },
              solicitacoes_pendentes: { type: 'number' },
              ultima_atividade: { type: 'string' },
            },
          },
        },
        estatisticas_gerais: {
          type: 'object',
          properties: {
            total_aprovadores_ativos: { type: 'number' },
            tempo_medio_resposta_geral: { type: 'number' },
            aprovador_mais_rapido: { type: 'object' },
            aprovador_mais_ativo: { type: 'object' },
          },
        },
      },
    },
  })
  async obterMetricasAprovadores(
    @GetUser() usuario: Usuario,
    @Query('periodo') periodo: string = '30d',
    @Query('unidade_id') unidadeId?: string,
    @Query('top') top: number = 10,
  ) {
    this.logger.log('Obtendo métricas de aprovadores', { periodo, unidadeId, top, usuarioId: usuario.id });
    
    // Converte período para datas
    const agora = new Date();
    const diasAtras = parseInt(periodo.replace('d', '')) || 30;
    const dataInicio = new Date(agora.getTime() - (diasAtras * 24 * 60 * 60 * 1000));
    const dataFim = agora;
    
    return this.aprovacaoService.obterMetricasAprovadores({ data_inicio: dataInicio, data_fim: dataFim }, unidadeId, top);
  }

  /**
   * Obter métricas de escalação
   */
  @Get('metricas/escalacao')
  @RequiresPermission({ permissionName: 'aprovacao.metricas.escalacao.visualizar' })
  @ApiOperation({ summary: 'Obter métricas de escalação automática' })
  @ApiQuery({ name: 'periodo', type: String, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Métricas de escalação',
    schema: {
      type: 'object',
      properties: {
        total_escalacoes: { type: 'number' },
        escalacoes_automaticas: { type: 'number' },
        escalacoes_manuais: { type: 'number' },
        tempo_medio_ate_escalacao: { type: 'number' },
        taxa_resolucao_pos_escalacao: { type: 'number' },
        motivos_escalacao: { type: 'array' },
        escalacoes_por_dia: { type: 'array' },
      },
    },
  })
  async obterMetricasEscalacao(
    @Query('periodo') periodo: string = '30d',
    @GetUser() usuario: Usuario,
  ) {
    this.logger.log('Obtendo métricas de escalação', { periodo, usuarioId: usuario.id });
    
    // Converte período para datas
    const agora = new Date();
    const diasAtras = parseInt(periodo.replace('d', '')) || 30;
    const dataInicio = new Date(agora.getTime() - (diasAtras * 24 * 60 * 60 * 1000));
    const dataFim = agora;
    
    return this.escalacaoService.obterMetricasEscalacao({ data_inicio: dataInicio, data_fim: dataFim });
  }

  // ==================== RELATÓRIOS ====================

  /**
   * Gerar relatório detalhado de aprovações
   */
  @Post('relatorios/aprovacoes')
  @RequiresPermission({ permissionName: 'aprovacao.relatorios.gerar' })
  @ApiOperation({ summary: 'Gerar relatório detalhado de aprovações' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        data_inicio: { type: 'string', format: 'date' },
        data_fim: { type: 'string', format: 'date' },
        unidades: { type: 'array', items: { type: 'string' } },
        acoes_criticas: { type: 'array', items: { type: 'string' } },
        aprovadores: { type: 'array', items: { type: 'string' } },
        status: { type: 'array', items: { type: 'string' } },
        formato: { type: 'string', enum: ['json', 'csv', 'excel'] },
        incluir_detalhes: { type: 'boolean' },
        incluir_historico: { type: 'boolean' },
      },
      required: ['data_inicio', 'data_fim'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Relatório gerado com sucesso',
    schema: {
      type: 'object',
      properties: {
        relatorio_id: { type: 'string' },
        url_download: { type: 'string' },
        formato: { type: 'string' },
        total_registros: { type: 'number' },
        data_geracao: { type: 'string' },
        valido_ate: { type: 'string' },
      },
    },
  })
  async gerarRelatorioAprovacoes(
    @Body() parametros: {
      data_inicio: string;
      data_fim: string;
      unidades?: string[];
      acoes_criticas?: string[];
      aprovadores?: string[];
      status?: string[];
      formato?: 'json' | 'csv' | 'excel';
      incluir_detalhes?: boolean;
      incluir_historico?: boolean;
    },
    @GetUser() usuario: Usuario,
  ) {
    this.logger.log('Gerando relatório de aprovações', { parametros, usuarioId: usuario.id });
    
    const parametrosConvertidos = {
      ...parametros,
      data_inicio: new Date(parametros.data_inicio),
      data_fim: new Date(parametros.data_fim),
    };
    
    return this.aprovacaoService.gerarRelatorioAprovacoes(parametrosConvertidos, usuario);
  }

  /**
   * Gerar relatório de auditoria
   */
  @Post('relatorios/auditoria')
  @RequiresPermission({ permissionName: 'aprovacao.workflow.gerenciar' })
  @ApiOperation({ summary: 'Gerar relatório de auditoria do sistema de aprovação' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        data_inicio: { type: 'string', format: 'date' },
        data_fim: { type: 'string', format: 'date' },
        tipos_evento: { type: 'array', items: { type: 'string' } },
        usuarios: { type: 'array', items: { type: 'string' } },
        entidades: { type: 'array', items: { type: 'string' } },
        formato: { type: 'string', enum: ['json', 'csv', 'excel'] },
        incluir_dados_sensíveis: { type: 'boolean' },
      },
      required: ['data_inicio', 'data_fim'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Relatório de auditoria gerado com sucesso',
  })
  async gerarRelatorioAuditoria(
    @Body() parametros: {
      data_inicio: string;
      data_fim: string;
      tipos_evento?: string[];
      usuarios?: string[];
      entidades?: string[];
      formato?: 'json' | 'csv' | 'excel';
      incluir_dados_sensíveis?: boolean;
    },
    @GetUser() usuario: Usuario,
  ) {
    this.logger.log('Gerando relatório de auditoria', { parametros, usuarioId: usuario.id });
    
    const dataInicio = new Date(parametros.data_inicio);
    const dataFim = new Date(parametros.data_fim);
    const formato = (parametros.formato === 'excel' ? 'csv' : parametros.formato) || 'json';
    
    return this.historicoService.gerarRelatorioAuditoria(dataInicio, dataFim, formato as 'json' | 'csv');
  }

  // ==================== CONFIGURAÇÃO DE ESCALAÇÃO ====================

  /**
   * Configurar regras de escalação automática
   */
  @Post('escalacao/configurar')
  @RequiresPermission({ permissionName: 'aprovacao.escalacao.configurar' })
  @AcaoCritica(TipoAcaoCritica.CONFIGURAR_ESCALACAO_AUTOMATICA, 'ConfiguracaoEscalacao')
  @ApiOperation({ summary: 'Configurar regras de escalação automática' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        acao_critica_id: { type: 'string', format: 'uuid' },
        estrategia: { type: 'string', enum: Object.values(EstrategiaAprovacao) },
        prazo_inicial_horas: { type: 'number' },
        niveis_escalacao: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              nivel: { type: 'number' },
              prazo_horas: { type: 'number' },
              aprovadores: { type: 'array', items: { type: 'string' } },
              notificar_superiores: { type: 'boolean' },
              acao_automatica: { type: 'string' },
            },
          },
        },
        ativo: { type: 'boolean' },
      },
      required: ['acao_critica_id', 'estrategia', 'prazo_inicial_horas', 'niveis_escalacao'],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Configuração de escalação criada com sucesso',
  })
  async configurarEscalacao(
    @Body() configuracao: {
      acao_critica_id: string;
      estrategia: EstrategiaAprovacao;
      prazo_inicial_horas: number;
      niveis_escalacao: Array<{
        nivel: number;
        prazo_horas: number;
        aprovadores: string[];
        notificar_superiores: boolean;
        acao_automatica?: string;
      }>;
      ativo: boolean;
    },
    @GetUser() usuario: Usuario,
  ) {
    this.logger.log('Configurando escalação automática', { configuracao, usuarioId: usuario.id });
    return this.escalacaoService.configurarEscalacao(configuracao, usuario);
  }

  /**
   * Listar configurações de escalação
   */
  @Get('escalacao/configuracoes')
  @RequiresPermission({ permissionName: 'aprovacao.escalacao.visualizar' })
  @ApiOperation({ summary: 'Listar configurações de escalação' })
  @ApiQuery({ name: 'acao_critica_id', type: String, required: false })
  @ApiQuery({ name: 'ativo', type: Boolean, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de configurações de escalação',
  })
  async listarConfiguracoes(
    @Query('acao_critica_id') acaoCriticaId?: string,
    @Query('ativo') ativo?: boolean,
  ) {
    this.logger.log('Listando configurações de escalação', { acaoCriticaId, ativo });
    return this.escalacaoService.listarConfiguracoes({ acaoCriticaId, ativo });
  }

  // ==================== MONITORAMENTO EM TEMPO REAL ====================

  /**
   * Obter status em tempo real do sistema
   */
  @Get('status/tempo-real')
  @RequiresPermission({ permissionName: 'aprovacao.monitoramento.visualizar' })
  @ApiOperation({ summary: 'Obter status em tempo real do sistema de aprovação' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Status em tempo real',
    schema: {
      type: 'object',
      properties: {
        timestamp: { type: 'string' },
        solicitacoes_pendentes: { type: 'number' },
        solicitacoes_vencendo: { type: 'number' },
        aprovadores_online: { type: 'number' },
        tempo_medio_fila: { type: 'number' },
        alertas_ativos: { type: 'array' },
        performance: {
          type: 'object',
          properties: {
            cpu_usage: { type: 'number' },
            memory_usage: { type: 'number' },
            response_time: { type: 'number' },
            throughput: { type: 'number' },
          },
        },
      },
    },
  })
  async obterStatusTempoReal() {
    this.logger.log('Obtendo status em tempo real');
    return this.aprovacaoService.obterStatusTempoReal();
  }

  /**
   * Obter alertas ativos
   */
  @Get('alertas/ativos')
  @RequiresPermission({ permissionName: 'aprovacao.alertas.visualizar' })
  @ApiOperation({ summary: 'Obter alertas ativos do sistema' })
  @ApiQuery({ name: 'severidade', type: String, required: false })
  @ApiQuery({ name: 'tipo', type: String, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de alertas ativos',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          tipo: { type: 'string' },
          severidade: { type: 'string' },
          titulo: { type: 'string' },
          descricao: { type: 'string' },
          data_criacao: { type: 'string' },
          entidade_relacionada: { type: 'object' },
          acao_recomendada: { type: 'string' },
        },
      },
    },
  })
  async obterAlertasAtivos(
    @Query('severidade') severidade?: string,
    @Query('tipo') tipo?: string,
  ) {
    this.logger.log('Obtendo alertas ativos', { severidade, tipo });
    return this.aprovacaoService.obterAlertasAtivos({ severidade, tipo });
  }

  // ==================== ADMINISTRAÇÃO DO SISTEMA ====================

  /**
   * Executar limpeza de dados antigos
   */
  @Post('admin/limpeza')
  @RequiresPermission({ permissionName: 'aprovacao.admin.limpeza' })
  @AcaoCritica(TipoAcaoCritica.EXECUTAR_LIMPEZA_DADOS, 'SistemaAprovacao')
  @ApiOperation({ summary: 'Executar limpeza de dados antigos do sistema' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        dias_retencao: { type: 'number', description: 'Dias de retenção dos dados' },
        tipos_dados: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tipos de dados para limpeza',
        },
        modo_teste: { type: 'boolean', description: 'Executar em modo de teste (sem deletar)' },
      },
      required: ['dias_retencao'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Limpeza executada com sucesso',
    schema: {
      type: 'object',
      properties: {
        registros_removidos: { type: 'number' },
        espaco_liberado: { type: 'string' },
        tempo_execucao: { type: 'number' },
        detalhes: { type: 'object' },
      },
    },
  })
  async executarLimpeza(
    @Body() parametros: {
      dias_retencao: number;
      tipos_dados?: string[];
      modo_teste?: boolean;
    },
    @GetUser() usuario: Usuario,
  ) {
    this.logger.log('Executando limpeza de dados', { parametros, usuarioId: usuario.id });
    return this.aprovacaoService.executarLimpezaDados(parametros, usuario);
  }

  /**
   * Reprocessar solicitações com erro
   */
  @Post('admin/reprocessar')
  @RequiresPermission({ permissionName: 'aprovacao.admin.reprocessar' })
  @AcaoCritica(TipoAcaoCritica.REPROCESSAR_SOLICITACOES, 'SistemaAprovacao')
  @ApiOperation({ summary: 'Reprocessar solicitações que falharam' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        solicitacao_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'IDs específicos para reprocessar',
        },
        filtros: {
          type: 'object',
          properties: {
            data_inicio: { type: 'string' },
            data_fim: { type: 'string' },
            tipos_erro: { type: 'array', items: { type: 'string' } },
          },
        },
        modo_teste: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reprocessamento iniciado com sucesso',
  })
  async reprocessarSolicitacoes(
    @Body() parametros: {
      solicitacao_ids?: string[];
      filtros?: {
        data_inicio?: string;
        data_fim?: string;
        tipos_erro?: string[];
      };
      modo_teste?: boolean;
    },
    @GetUser() usuario: Usuario,
  ) {
    this.logger.log('Reprocessando solicitações', { parametros, usuarioId: usuario.id });
    return this.aprovacaoService.reprocessarSolicitacoes(parametros, usuario);
  }

  /**
   * Obter health check do sistema
   */
  @Get('health')
  @RequiresPermission({ permissionName: 'aprovacao.health.visualizar' })
  @ApiOperation({ summary: 'Verificar saúde do sistema de aprovação' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Status de saúde do sistema',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
        timestamp: { type: 'string' },
        componentes: {
          type: 'object',
          properties: {
            database: { type: 'object' },
            cache: { type: 'object' },
            queue: { type: 'object' },
            notifications: { type: 'object' },
            escalation: { type: 'object' },
          },
        },
        metricas: {
          type: 'object',
          properties: {
            uptime: { type: 'number' },
            requests_per_minute: { type: 'number' },
            error_rate: { type: 'number' },
            response_time_avg: { type: 'number' },
          },
        },
      },
    },
  })
  async healthCheck() {
    this.logger.log('Executando health check');
    return this.aprovacaoService.healthCheck();
  }
}