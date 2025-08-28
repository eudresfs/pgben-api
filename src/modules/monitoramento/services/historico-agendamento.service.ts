import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  HistoricoMonitoramento,
  TipoAcaoHistorico,
  CategoriaHistorico,
} from '../entities/historico-monitoramento.entity';
import { AgendamentoVisita } from '../entities/agendamento-visita.entity';
import {
  HistoricoAgendamentoRepository,
  HistoricoAgendamentoFilters,
  HistoricoAgendamentoPaginacao,
} from '../repositories/historico-agendamento.repository';

/**
 * Interface para dados de criação de histórico
 */
export interface CriarHistoricoData {
  /** Tipo da ação realizada */
  tipo_acao: TipoAcaoHistorico;
  /** Descrição detalhada da ação */
  descricao: string;
  /** Dados anteriores (antes da mudança) */
  dados_anteriores?: any;
  /** Dados novos (após a mudança) */
  dados_novos?: any;
  /** Metadados adicionais */
  metadados?: any;
  /** Observações complementares */
  observacoes?: string;
  /** Se a operação foi bem-sucedida */
  sucesso: boolean;
  /** Mensagem de erro (se houver) */
  erro?: string;
  /** Duração da operação em milissegundos */
  duracao_ms?: number;
  /** ID do usuário que realizou a ação */
  usuario_id: string;
  /** ID do agendamento relacionado */
  agendamento_id: string;
  /** ID do cidadão relacionado */
  cidadao_id?: string;
}

/**
 * Interface para resposta de histórico paginado
 */
export interface HistoricoAgendamentoResponse {
  /** Lista de registros de histórico */
  data: HistoricoMonitoramento[];
  /** Total de registros encontrados */
  total: number;
  /** Página atual */
  page: number;
  /** Itens por página */
  limit: number;
  /** Total de páginas */
  totalPages: number;
  /** Indica se há próxima página */
  hasNext: boolean;
  /** Indica se há página anterior */
  hasPrev: boolean;
}

/**
 * Serviço responsável por gerenciar o histórico de agendamentos
 * 
 * @description
 * Fornece funcionalidades para registrar, consultar e analisar o histórico
 * de mudanças e eventos relacionados aos agendamentos de visitas domiciliares.
 * Integra com o HistoricoAgendamentoRepository para consultas otimizadas.
 * 
 * @author Sistema PGBEN
 * @since 2025-01-15
 */
@Injectable()
export class HistoricoAgendamentoService {
  private readonly logger = new Logger(HistoricoAgendamentoService.name);

  constructor(
    @InjectRepository(HistoricoMonitoramento)
    private readonly historicoRepository: Repository<HistoricoMonitoramento>,
    @InjectRepository(AgendamentoVisita)
    private readonly agendamentoRepository: Repository<AgendamentoVisita>,
    private readonly historicoAgendamentoRepository: HistoricoAgendamentoRepository,
  ) {}

  /**
   * Registra uma nova entrada no histórico de agendamentos
   * 
   * @param data Dados para criação do histórico
   * @returns Registro de histórico criado
   */
  async registrarHistorico(data: CriarHistoricoData): Promise<HistoricoMonitoramento> {
    try {
      // Validar se o agendamento existe
      const agendamento = await this.agendamentoRepository.findOne({
        where: { id: data.agendamento_id },
        relations: ['pagamento', 'pagamento.solicitacao', 'pagamento.solicitacao.beneficiario'],
      });

      if (!agendamento) {
        throw new NotFoundException(`Agendamento com ID ${data.agendamento_id} não encontrado`);
      }

      // Usar cidadao_id do agendamento se não fornecido
      const cidadaoId = data.cidadao_id || agendamento.pagamento?.solicitacao?.beneficiario?.id;

      // Criar registro de histórico
      const historico = this.historicoRepository.create({
        tipo_acao: data.tipo_acao,
        categoria: CategoriaHistorico.AGENDAMENTO,
        descricao: data.descricao,
        dados_anteriores: data.dados_anteriores,
        dados_novos: data.dados_novos,
        metadados: {
          ...data.metadados,
          timestamp: new Date().toISOString(),
          agendamento_tipo: agendamento.tipo_visita,
          agendamento_status: agendamento.status,
        },
        observacoes: data.observacoes,
        sucesso: data.sucesso,
        erro: data.erro,
        duracao_ms: data.duracao_ms,
        usuario_id: data.usuario_id,
        agendamento_id: data.agendamento_id,
        cidadao_id: cidadaoId,
      });

      const historicoSalvo = await this.historicoRepository.save(historico);

      this.logger.log(
        `Histórico registrado: ${data.tipo_acao} para agendamento ${data.agendamento_id} por usuário ${data.usuario_id}`,
      );

      return historicoSalvo;
    } catch (error) {
      this.logger.error(
        `Erro ao registrar histórico para agendamento ${data.agendamento_id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Busca histórico de um agendamento específico
   * 
   * @param agendamentoId ID do agendamento
   * @param filters Filtros adicionais
   * @param paginacao Parâmetros de paginação
   * @returns Histórico paginado do agendamento
   */
  async buscarHistoricoPorAgendamento(
    agendamentoId: string,
    filters?: Omit<HistoricoAgendamentoFilters, 'agendamento_id'>,
    paginacao?: HistoricoAgendamentoPaginacao,
  ): Promise<HistoricoAgendamentoResponse> {
    try {
      // Validar se o agendamento existe
      const agendamento = await this.agendamentoRepository.findOne({
        where: { id: agendamentoId },
      });

      if (!agendamento) {
        throw new NotFoundException(`Agendamento com ID ${agendamentoId} não encontrado`);
      }

      const resultado = await this.historicoAgendamentoRepository.findByAgendamentoId(
        agendamentoId,
        filters,
        paginacao,
      );

      return this.formatarResposta(resultado, paginacao);
    } catch (error) {
      this.logger.error(
        `Erro ao buscar histórico do agendamento ${agendamentoId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Busca histórico de um cidadão relacionado a agendamentos
   * 
   * @param cidadaoId ID do cidadão
   * @param filters Filtros adicionais
   * @param paginacao Parâmetros de paginação
   * @returns Histórico paginado do cidadão
   */
  async buscarHistoricoPorCidadao(
    cidadaoId: string,
    filters?: Omit<HistoricoAgendamentoFilters, 'cidadao_id'>,
    paginacao?: HistoricoAgendamentoPaginacao,
  ): Promise<HistoricoAgendamentoResponse> {
    try {
      const resultado = await this.historicoAgendamentoRepository.findByCidadaoId(
        cidadaoId,
        filters,
        paginacao,
      );

      return this.formatarResposta(resultado, paginacao);
    } catch (error) {
      this.logger.error(
        `Erro ao buscar histórico do cidadão ${cidadaoId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Busca histórico geral com filtros avançados
   * 
   * @param filters Filtros de consulta
   * @param paginacao Parâmetros de paginação
   * @returns Histórico paginado filtrado
   */
  async buscarHistoricoComFiltros(
    filters?: HistoricoAgendamentoFilters,
    paginacao?: HistoricoAgendamentoPaginacao,
  ): Promise<HistoricoAgendamentoResponse> {
    try {
      const resultado = await this.historicoAgendamentoRepository.findWithFilters(
        filters,
        paginacao,
      );

      return this.formatarResposta(resultado, paginacao);
    } catch (error) {
      this.logger.error(
        `Erro ao buscar histórico com filtros: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Obtém estatísticas do histórico de agendamentos
   * 
   * @param filters Filtros para as estatísticas
   * @returns Estatísticas agregadas
   */
  async obterEstatisticas(filters?: HistoricoAgendamentoFilters) {
    try {
      return await this.historicoAgendamentoRepository.getEstatisticas(filters);
    } catch (error) {
      this.logger.error(
        `Erro ao obter estatísticas do histórico: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Busca as últimas ações de um agendamento
   * 
   * @param agendamentoId ID do agendamento
   * @param limit Número máximo de registros
   * @returns Últimas ações do agendamento
   */
  async buscarUltimasAcoes(
    agendamentoId: string,
    limit: number = 10,
  ): Promise<HistoricoMonitoramento[]> {
    try {
      // Validar se o agendamento existe
      const agendamento = await this.agendamentoRepository.findOne({
        where: { id: agendamentoId },
      });

      if (!agendamento) {
        throw new NotFoundException(`Agendamento com ID ${agendamentoId} não encontrado`);
      }

      return await this.historicoAgendamentoRepository.findUltimasAcoes(
        agendamentoId,
        limit,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao buscar últimas ações do agendamento ${agendamentoId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Registra criação de agendamento
   * 
   * @param agendamento Dados do agendamento criado
   * @param usuarioId ID do usuário que criou
   * @param duracao Duração da operação em ms
   */
  async registrarCriacao(
    agendamento: AgendamentoVisita,
    usuarioId: string,
    duracao?: number,
  ): Promise<void> {
    await this.registrarHistorico({
      tipo_acao: TipoAcaoHistorico.AGENDAMENTO_CRIADO,
      descricao: `Agendamento criado para ${agendamento.tipo_visita} em ${agendamento.data_agendamento}`,
      dados_novos: {
        id: agendamento.id,
        data_agendamento: agendamento.data_agendamento,
        tipo_visita: agendamento.tipo_visita,
        status: agendamento.status,
        prioridade: agendamento.prioridade,
        endereco_visita: agendamento.endereco_visita,
      },
      sucesso: true,
      duracao_ms: duracao,
      usuario_id: usuarioId,
      agendamento_id: agendamento.id,
      cidadao_id: agendamento.pagamento?.solicitacao?.beneficiario?.id,
    });
  }

  /**
   * Registra atualização de agendamento
   * 
   * @param agendamentoAnterior Dados anteriores do agendamento
   * @param agendamentoAtualizado Dados atualizados do agendamento
   * @param usuarioId ID do usuário que atualizou
   * @param duracao Duração da operação em ms
   */
  async registrarAtualizacao(
    agendamentoAnterior: Partial<AgendamentoVisita>,
    agendamentoAtualizado: AgendamentoVisita,
    usuarioId: string,
    duracao?: number,
  ): Promise<void> {
    // Identificar campos alterados
    const camposAlterados = this.identificarCamposAlterados(
      agendamentoAnterior,
      agendamentoAtualizado,
    );

    if (camposAlterados.length === 0) {
      return; // Nenhuma alteração detectada
    }

    const descricao = `Agendamento atualizado: ${camposAlterados.join(', ')}`;

    await this.registrarHistorico({
      tipo_acao: TipoAcaoHistorico.AGENDAMENTO_ATUALIZADO,
      descricao,
      dados_anteriores: agendamentoAnterior,
      dados_novos: {
        id: agendamentoAtualizado.id,
        data_agendamento: agendamentoAtualizado.data_agendamento,
        tipo_visita: agendamentoAtualizado.tipo_visita,
        status: agendamentoAtualizado.status,
        prioridade: agendamentoAtualizado.prioridade,
        endereco_visita: agendamentoAtualizado.endereco_visita,
        observacoes: agendamentoAtualizado.observacoes,
      },
      metadados: {
        campos_alterados: camposAlterados,
      },
      sucesso: true,
      duracao_ms: duracao,
      usuario_id: usuarioId,
      agendamento_id: agendamentoAtualizado.id,
      cidadao_id: agendamentoAtualizado.pagamento?.solicitacao?.beneficiario?.id,
    });
  }

  /**
   * Registra cancelamento de agendamento
   * 
   * @param agendamento Dados do agendamento cancelado
   * @param motivo Motivo do cancelamento
   * @param usuarioId ID do usuário que cancelou
   * @param duracao Duração da operação em ms
   */
  async registrarCancelamento(
    agendamento: AgendamentoVisita,
    motivo: string,
    usuarioId: string,
    duracao?: number,
  ): Promise<void> {
    await this.registrarHistorico({
      tipo_acao: TipoAcaoHistorico.AGENDAMENTO_CANCELADO,
      descricao: `Agendamento cancelado: ${motivo}`,
      dados_anteriores: {
        status: agendamento.status,
      },
      dados_novos: {
        status: 'CANCELADO',
        motivo_cancelamento: motivo,
        data_cancelamento: new Date(),
        cancelado_por: usuarioId,
      },
      observacoes: motivo,
      sucesso: true,
      duracao_ms: duracao,
      usuario_id: usuarioId,
      agendamento_id: agendamento.id,
      cidadao_id: agendamento.pagamento?.solicitacao?.beneficiario?.id,
    });
  }

  /**
   * Formata resposta paginada
   * 
   * @param resultado Resultado da consulta
   * @param paginacao Parâmetros de paginação
   * @returns Resposta formatada
   */
  private formatarResposta(
    resultado: { data: HistoricoMonitoramento[]; total: number },
    paginacao?: HistoricoAgendamentoPaginacao,
  ): HistoricoAgendamentoResponse {
    const page = paginacao?.page || 1;
    const limit = paginacao?.limit || 20;
    const totalPages = Math.ceil(resultado.total / limit);

    return {
      data: resultado.data,
      total: resultado.total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  /**
   * Identifica campos alterados entre duas versões do agendamento
   * 
   * @param anterior Dados anteriores
   * @param atual Dados atuais
   * @returns Lista de campos alterados
   */
  private identificarCamposAlterados(
    anterior: Partial<AgendamentoVisita>,
    atual: AgendamentoVisita,
  ): string[] {
    const camposAlterados: string[] = [];
    const camposMonitorados = [
      'data_agendamento',
      'tipo_visita',
      'status',
      'prioridade',
      'endereco_visita',
      'observacoes',
      'dados_complementares',
    ];

    camposMonitorados.forEach((campo) => {
      if (anterior[campo] !== atual[campo]) {
        camposAlterados.push(campo);
      }
    });

    return camposAlterados;
  }
}