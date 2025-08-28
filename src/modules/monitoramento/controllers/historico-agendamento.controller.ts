import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { HistoricoAgendamentoService } from '../services/historico-agendamento.service';
import {
  HistoricoMonitoramentoResponseDto,
  EstatisticasHistoricoDto,
} from '../dtos/historico-agendamento.dto';
import { TipoAcaoHistorico } from '../entities/historico-monitoramento.entity';
import { PaginationParamsDto } from '../../../shared/dtos/pagination-params.dto';
import { PaginatedResponseDto } from '../../../shared/dtos/pagination.dto';
import { PaginationHelper } from '../helpers/pagination.helper';

/**
 * Controller para gerenciamento do histórico de agendamentos
 * Responsável por consultas e estatísticas do histórico de alterações
 */
@ApiTags('Histórico de Agendamentos')
@Controller('monitoramento/historico')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class HistoricoAgendamentoController {
  constructor(
    private readonly historicoAgendamentoService: HistoricoAgendamentoService,
  ) {}

  /**
   * Obtém histórico completo de um agendamento específico
   */
  @Get('agendamento/:id')
  @RequiresPermission({ permissionName: 'monitoramento.agendamento.historico' })
  @ApiOperation({
    summary: 'Obter histórico de agendamento',
    description: 'Obtém o histórico completo de alterações de um agendamento específico'
  })
  @ApiParam({ name: 'id', description: 'ID do agendamento' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Histórico do agendamento retornado com sucesso',
    type: [HistoricoMonitoramentoResponseDto],
    example: {
      data: [
        {
          id: '550e8400-e29b-41d4-a716-446655440010',
          agendamento_id: '550e8400-e29b-41d4-a716-446655440006',
          acao: 'criacao',
          status_anterior: null,
          status_novo: 'agendado',
          data_hora_anterior: null,
          data_hora_nova: '2024-02-15T14:30:00.000Z',
          observacoes: 'Agendamento criado',
          usuario_id: '550e8400-e29b-41d4-a716-446655440001',
          created_at: '2024-02-10T10:00:00.000Z'
        }
      ]
    }
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Agendamento não encontrado'
  })
  async obterHistoricoAgendamento(
    @Param('id', ParseUUIDPipe) agendamentoId: string
  ): Promise<HistoricoMonitoramentoResponseDto[]> {
    try {
      const resultado = await this.historicoAgendamentoService.buscarHistoricoPorAgendamento(
        agendamentoId
      );

      // Mapear HistoricoMonitoramento[] para HistoricoMonitoramentoResponseDto[]
      const historicoFormatado = resultado.data.map(item => ({
        id: item.id,
        tipo_acao: item.tipo_acao,
        categoria: item.categoria,
        descricao: item.descricao,
        dados_anteriores: item.dados_anteriores,
        dados_novos: item.dados_novos,
        metadados: item.metadados,
        observacoes: item.observacoes,
        sucesso: item.sucesso,
        erro: item.erro,
        duracao_ms: item.duracao_ms,
        created_at: item.created_at,
        usuario: item.usuario ? {
          id: item.usuario.id,
          nome: item.usuario.nome,
          email: item.usuario.email
        } : undefined,
        cidadao: item.cidadao ? {
          id: item.cidadao.id,
          nome: item.cidadao.nome,
          cpf: item.cidadao.cpf
        } : undefined,
        agendamento: item.agendamento ? {
          id: item.agendamento.id,
          data_agendamento: item.agendamento.data_agendamento,
          tipo_visita: item.agendamento.tipo_visita,
          status: item.agendamento.status
        } : undefined
      }));

      return historicoFormatado;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtém histórico de agendamentos de um cidadão
   */
  @Get('cidadao/:cidadaoId')
  @RequiresPermission({ permissionName: 'monitoramento.agendamento.historico' })
  @ApiOperation({
    summary: 'Obter histórico de agendamentos por cidadão',
    description: 'Obtém o histórico de todos os agendamentos de um cidadão específico'
  })
  @ApiParam({ name: 'cidadaoId', description: 'ID do cidadão/beneficiário' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (padrão: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página (padrão: 10)' })
  @ApiQuery({ name: 'data_inicio', required: false, type: String, description: 'Data de início (YYYY-MM-DD)' })
  @ApiQuery({ name: 'data_fim', required: false, type: String, description: 'Data de fim (YYYY-MM-DD)' })
  @ApiQuery({ name: 'acao', required: false, type: String, description: 'Tipo de ação (criacao, reagendamento, cancelamento, etc.)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Histórico de agendamentos do cidadão retornado com sucesso',
    type: PaginatedResponseDto
  })
  async obterHistoricoPorCidadao(
    @Param('cidadaoId', ParseUUIDPipe) cidadaoId: string,
    @Query() paginationParams: PaginationParamsDto,
    @Query('data_inicio') dataInicio?: string,
    @Query('data_fim') dataFim?: string,
    @Query('acao') acao?: string
  ): Promise<PaginatedResponseDto<HistoricoMonitoramentoResponseDto>> {
    try {
      const validatedParams = PaginationHelper.applyDefaults(paginationParams);

      const filtros = {
        data_inicio: dataInicio ? new Date(dataInicio) : undefined,
        data_fim: dataFim ? new Date(dataFim) : undefined,
        tipos_acao: acao ? [acao as TipoAcaoHistorico] : undefined
      };

      // Remove filtros undefined
      Object.keys(filtros).forEach(key => 
        filtros[key] === undefined && delete filtros[key]
      );

      const resultado = await this.historicoAgendamentoService.buscarHistoricoPorCidadao(
         cidadaoId,
         filtros,
         validatedParams
       );

      // Mapear HistoricoMonitoramento[] para HistoricoMonitoramentoResponseDto[]
      const historicoFormatado = resultado.data.map(item => ({
        id: item.id,
        tipo_acao: item.tipo_acao,
        categoria: item.categoria,
        descricao: item.descricao,
        dados_anteriores: item.dados_anteriores,
        dados_novos: item.dados_novos,
        metadados: item.metadados,
        observacoes: item.observacoes,
        sucesso: item.sucesso,
        erro: item.erro,
        duracao_ms: item.duracao_ms,
        created_at: item.created_at,
        usuario: item.usuario ? {
          id: item.usuario.id,
          nome: item.usuario.nome,
          email: item.usuario.email
        } : undefined,
        cidadao: item.cidadao ? {
          id: item.cidadao.id,
          nome: item.cidadao.nome,
          cpf: item.cidadao.cpf
        } : undefined,
        agendamento: item.agendamento ? {
          id: item.agendamento.id,
          data_agendamento: item.agendamento.data_agendamento,
          tipo_visita: item.agendamento.tipo_visita,
          status: item.agendamento.status
        } : undefined
      }));

      return {
         items: historicoFormatado,
         meta: {
           total: resultado.total,
           page: resultado.page,
           limit: resultado.limit,
           pages: resultado.totalPages,
           hasNext: resultado.hasNext,
           hasPrev: resultado.hasPrev
         }
       };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtém histórico geral de agendamentos com filtros
   */
  @Get('geral')
  @RequiresPermission({ permissionName: 'monitoramento.agendamento.historico' })
  @ApiOperation({
    summary: 'Obter histórico geral de agendamentos',
    description: 'Obtém histórico geral de agendamentos com filtros avançados'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (padrão: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página (padrão: 10)' })
  @ApiQuery({ name: 'data_inicio', required: false, type: String, description: 'Data de início (YYYY-MM-DD)' })
  @ApiQuery({ name: 'data_fim', required: false, type: String, description: 'Data de fim (YYYY-MM-DD)' })
  @ApiQuery({ name: 'acao', required: false, type: String, description: 'Tipo de ação' })
  @ApiQuery({ name: 'usuario_id', required: false, type: String, description: 'ID do usuário que realizou a ação' })
  @ApiQuery({ name: 'unidade_id', required: false, type: String, description: 'ID da unidade' })
  @ApiQuery({ name: 'tecnico_id', required: false, type: String, description: 'ID do técnico' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Histórico geral retornado com sucesso',
    type: PaginatedResponseDto
  })
  async obterHistoricoGeral(
    @Query() paginationParams: PaginationParamsDto,
    @Query('data_inicio') dataInicio?: string,
    @Query('data_fim') dataFim?: string,
    @Query('acao') acao?: string,
    @Query('usuario_id') usuarioId?: string,
    @Query('unidade_id') unidadeId?: string,
    @Query('tecnico_id') tecnicoId?: string
  ): Promise<PaginatedResponseDto<HistoricoMonitoramentoResponseDto>> {
    try {
      const validatedParams = PaginationHelper.applyDefaults(paginationParams);

      const filtros = {
        data_inicio: dataInicio ? new Date(dataInicio) : undefined,
        data_fim: dataFim ? new Date(dataFim) : undefined,
        tipos_acao: acao ? [acao as TipoAcaoHistorico] : undefined,
        usuario_id: usuarioId,
        unidade_id: unidadeId,
        tecnico_id: tecnicoId
      };

      // Remove filtros undefined
      Object.keys(filtros).forEach(key => 
        filtros[key] === undefined && delete filtros[key]
      );

      const resultado = await this.historicoAgendamentoService.buscarHistoricoComFiltros(
         filtros,
         validatedParams
       );

      // Mapear HistoricoMonitoramento[] para HistoricoMonitoramentoResponseDto[]
      const historicoFormatado = resultado.data.map(item => ({
        id: item.id,
        tipo_acao: item.tipo_acao,
        categoria: item.categoria,
        descricao: item.descricao,
        dados_anteriores: item.dados_anteriores,
        dados_novos: item.dados_novos,
        metadados: item.metadados,
        observacoes: item.observacoes,
        sucesso: item.sucesso,
        erro: item.erro,
        duracao_ms: item.duracao_ms,
        created_at: item.created_at,
        usuario: item.usuario ? {
          id: item.usuario.id,
          nome: item.usuario.nome,
          email: item.usuario.email
        } : undefined,
        cidadao: item.cidadao ? {
          id: item.cidadao.id,
          nome: item.cidadao.nome,
          cpf: item.cidadao.cpf
        } : undefined,
        agendamento: item.agendamento ? {
          id: item.agendamento.id,
          data_agendamento: item.agendamento.data_agendamento,
          tipo_visita: item.agendamento.tipo_visita,
          status: item.agendamento.status
        } : undefined
      }));

      return {
         items: historicoFormatado,
         meta: {
           total: resultado.total,
           page: resultado.page,
           limit: resultado.limit,
           pages: resultado.totalPages,
           hasNext: resultado.hasNext,
           hasPrev: resultado.hasPrev
         }
       };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtém estatísticas do histórico de agendamentos
   */
  @Get('estatisticas')
  @RequiresPermission({ permissionName: 'monitoramento.agendamento.estatisticas' })
  @ApiOperation({
    summary: 'Obter estatísticas do histórico',
    description: 'Obtém estatísticas consolidadas do histórico de agendamentos'
  })
  @ApiQuery({ name: 'data_inicio', required: false, type: String, description: 'Data de início (YYYY-MM-DD)' })
  @ApiQuery({ name: 'data_fim', required: false, type: String, description: 'Data de fim (YYYY-MM-DD)' })
  @ApiQuery({ name: 'unidade_id', required: false, type: String, description: 'ID da unidade' })
  @ApiQuery({ name: 'tecnico_id', required: false, type: String, description: 'ID do técnico' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estatísticas do histórico retornadas com sucesso',
    type: EstatisticasHistoricoDto,
    example: {
      data: {
        total_acoes: 150,
        acoes_por_tipo: {
          criacao: 50,
          reagendamento: 30,
          cancelamento: 20,
          confirmacao: 40,
          conclusao: 10
        },
        periodo_analise: {
          data_inicio: '2024-01-01',
          data_fim: '2024-02-29'
        },
        agendamentos_unicos: 75,
        usuarios_ativos: 15
      }
    }
  })
  async obterEstatisticasHistorico(
    @Query('data_inicio') dataInicio?: string,
    @Query('data_fim') dataFim?: string,
    @Query('unidade_id') unidadeId?: string,
    @Query('tecnico_id') tecnicoId?: string
  ): Promise<{ data: EstatisticasHistoricoDto }> {
    try {
      const filtros = {
        data_inicio: dataInicio ? new Date(dataInicio) : undefined,
        data_fim: dataFim ? new Date(dataFim) : undefined,
        unidade_id: unidadeId,
        tecnico_id: tecnicoId
      };

      // Remove filtros undefined
      Object.keys(filtros).forEach(key => 
        filtros[key] === undefined && delete filtros[key]
      );

      const estatisticas = await this.historicoAgendamentoService.obterEstatisticas(filtros);

      return {
        data: estatisticas
      };
    } catch (error) {
      throw error;
    }
  }
}