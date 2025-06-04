import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pendencia, StatusPendencia } from '../../../entities';
import { Solicitacao, StatusSolicitacao } from '../../../entities';
import { TransicaoEstadoService } from './transicao-estado.service';
import {
  throwSolicitacaoNotFound,
  throwInvalidStatusTransition,
  throwPendingIssues,
  throwWorkflowStepRequired,
} from '../../../shared/exceptions/error-catalog/domains/solicitacao.errors';

/**
 * Serviço de Validação de Solicitação
 *
 * Responsável por validar as regras de negócio específicas para operações
 * relacionadas a solicitações, como aprovação, liberação, etc.
 */
@Injectable()
export class ValidacaoSolicitacaoService {
  constructor(
    @InjectRepository(Solicitacao)
    private readonly solicitacaoRepository: Repository<Solicitacao>,
    @InjectRepository(Pendencia)
    private readonly pendenciaRepository: Repository<Pendencia>,
    private readonly transicaoEstadoService: TransicaoEstadoService,
  ) {}

  /**
   * Valida se uma solicitação pode ser aprovada
   * @param solicitacaoId ID da solicitação
   * @returns void se validação passar, exception caso contrário
   */
  async validarAprovacao(solicitacaoId: string): Promise<void> {
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id: solicitacaoId },
    });

    if (!solicitacao) {
      throwSolicitacaoNotFound(solicitacaoId, { data: { context: 'validacao_aprovacao' } });
    }

    // Verificar se a transição para APROVADA é válida
    if (
      !this.transicaoEstadoService.isTransicaoValida(
        solicitacao.status,
        StatusSolicitacao.APROVADA,
      )
    ) {
      throwInvalidStatusTransition(
        solicitacao.status,
        StatusSolicitacao.APROVADA,
        { data: { solicitacaoId, context: 'validacao_aprovacao' } }
      );
    }

    // Verificar se existem pendências não resolvidas
    const pendenciasAbertas = await this.pendenciaRepository.find({
      where: {
        solicitacao_id: solicitacaoId,
        status: StatusPendencia.ABERTA,
      },
    });

    if (pendenciasAbertas.length > 0) {
      throwPendingIssues(
        pendenciasAbertas.length,
        { data: { solicitacaoId, context: 'validacao_aprovacao' } }
      );
    }

    // Verificar se a solicitação tem os campos obrigatórios preenchidos
    if (!solicitacao.parecer_semtas) {
      throwWorkflowStepRequired(
        'parecer_semtas',
        { data: { solicitacaoId, context: 'validacao_aprovacao' } }
      );
    }
  }

  /**
   * Valida se uma solicitação pode ser liberada
   * @param solicitacaoId ID da solicitação
   * @returns void se validação passar, exception caso contrário
   */
  async validarLiberacao(solicitacaoId: string): Promise<void> {
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id: solicitacaoId },
    });

    if (!solicitacao) {
      throwSolicitacaoNotFound(solicitacaoId, { data: { context: 'validacao_liberacao' } });
    }

    // Verificar se a transição para LIBERADA é válida
    if (
      !this.transicaoEstadoService.isTransicaoValida(
        solicitacao.status,
        StatusSolicitacao.LIBERADA,
      )
    ) {
      throwInvalidStatusTransition(
        solicitacao.status,
        StatusSolicitacao.LIBERADA,
        { data: { solicitacaoId, context: 'validacao_liberacao' } }
      );
    }

    // Verificar se a solicitação foi aprovada
    if (solicitacao.status !== StatusSolicitacao.APROVADA) {
      throwInvalidStatusTransition(
        solicitacao.status,
        StatusSolicitacao.LIBERADA,
        { data: { solicitacaoId, context: 'validacao_liberacao' } }
      );
    }

    // Verificar se a solicitação tem os campos obrigatórios preenchidos
    if (!solicitacao.aprovador_id) {
      throwWorkflowStepRequired(
        'aprovador_id',
        { data: { solicitacaoId, context: 'validacao_liberacao' } }
      );
    }
  }

  /**
   * Valida se uma solicitação pode ser cancelada
   * @param solicitacaoId ID da solicitação
   * @returns void se validação passar, exception caso contrário
   */
  async validarCancelamento(solicitacaoId: string): Promise<void> {
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id: solicitacaoId },
    });

    if (!solicitacao) {
      throwSolicitacaoNotFound(solicitacaoId, { data: { context: 'validacao_cancelamento' } });
    }

    // Verificar se a transição para CANCELADA é válida
    if (
      !this.transicaoEstadoService.isTransicaoValida(
        solicitacao.status,
        StatusSolicitacao.CANCELADA,
      )
    ) {
      throwInvalidStatusTransition(
        solicitacao.status,
        StatusSolicitacao.CANCELADA,
        { data: { solicitacaoId, context: 'validacao_cancelamento' } }
      );
    }

    // Verificar se a solicitação já está em um estado final
    if (
      solicitacao.status === StatusSolicitacao.CONCLUIDA ||
      solicitacao.status === StatusSolicitacao.ARQUIVADA
    ) {
      throwInvalidStatusTransition(
        solicitacao.status,
        StatusSolicitacao.CANCELADA,
        { data: { solicitacaoId, context: 'validacao_cancelamento' } }
      );
    }
  }

  /**
   * Valida se uma solicitação pode ser concluída
   * @param solicitacaoId ID da solicitação
   * @returns void se validação passar, exception caso contrário
   */
  async validarConclusao(solicitacaoId: string): Promise<void> {
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id: solicitacaoId },
    });

    if (!solicitacao) {
      throwSolicitacaoNotFound(solicitacaoId, { data: { context: 'validacao_conclusao' } });
    }

    // Verificar se a transição para CONCLUIDA é válida
    if (
      !this.transicaoEstadoService.isTransicaoValida(
        solicitacao.status,
        StatusSolicitacao.CONCLUIDA,
      )
    ) {
      throwInvalidStatusTransition(
        solicitacao.status,
        StatusSolicitacao.CONCLUIDA,
        { data: { solicitacaoId, context: 'validacao_conclusao' } }
      );
    }

    // Verificar se a solicitação está em processamento
    if (solicitacao.status !== StatusSolicitacao.EM_PROCESSAMENTO) {
      throwInvalidStatusTransition(
        solicitacao.status,
        StatusSolicitacao.CONCLUIDA,
        { data: { solicitacaoId, context: 'validacao_conclusao' } }
      );
    }
  }

  /**
   * Valida se uma solicitação pode ser arquivada
   * @param solicitacaoId ID da solicitação
   * @returns void se validação passar, exception caso contrário
   */
  async validarArquivamento(solicitacaoId: string): Promise<void> {
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id: solicitacaoId },
    });

    if (!solicitacao) {
      throwSolicitacaoNotFound(solicitacaoId, { data: { context: 'validacao_arquivamento' } });
    }

    // Verificar se a transição para ARQUIVADA é válida
    if (
      !this.transicaoEstadoService.isTransicaoValida(
        solicitacao.status,
        StatusSolicitacao.ARQUIVADA,
      )
    ) {
      throwInvalidStatusTransition(
        solicitacao.status,
        StatusSolicitacao.ARQUIVADA,
        { data: { solicitacaoId, context: 'validacao_arquivamento' } }
      );
    }

    // Verificar se a solicitação está em um estado que permite arquivamento
    const estadosPermitidos = [
      StatusSolicitacao.CONCLUIDA,
      StatusSolicitacao.INDEFERIDA,
      StatusSolicitacao.CANCELADA,
    ];

    if (!estadosPermitidos.includes(solicitacao.status)) {
      throwInvalidStatusTransition(
        solicitacao.status,
        StatusSolicitacao.ARQUIVADA,
        { data: { solicitacaoId, context: 'validacao_arquivamento' } }
      );
    }
  }
}
