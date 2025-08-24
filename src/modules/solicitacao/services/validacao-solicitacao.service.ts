import { ConflictException, Injectable } from '@nestjs/common';
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
      throwSolicitacaoNotFound(solicitacaoId, {
        data: { context: 'validacao_aprovacao' },
      });
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
        { data: { solicitacaoId, context: 'validacao_aprovacao' } },
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
      throwPendingIssues(pendenciasAbertas.length, {
        data: { solicitacaoId, context: 'validacao_aprovacao' },
      });
    }

    // Verificar se a solicitação tem os campos obrigatórios preenchidos
    if (!solicitacao.parecer_semtas) {
      throwWorkflowStepRequired('parecer_semtas', {
        data: { solicitacaoId, context: 'validacao_aprovacao' },
      });
    }
  }

  // Método validarLiberacao removido - no novo ciclo de vida simplificado,
  // APROVADA é um status final e não há necessidade de liberação separada

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
      throwSolicitacaoNotFound(solicitacaoId, {
        data: { context: 'validacao_cancelamento' },
      });
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
        { data: { solicitacaoId, context: 'validacao_cancelamento' } },
      );
    }
  }
}
