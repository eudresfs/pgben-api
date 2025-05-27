import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pendencia, StatusPendencia } from '../entities/pendencia.entity';
import { Solicitacao, StatusSolicitacao } from '../entities/solicitacao.entity';
import { TransicaoEstadoService } from './transicao-estado.service';

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
      throw new BadRequestException('Solicitação não encontrada');
    }

    // Verificar se a transição para APROVADA é válida
    if (!this.transicaoEstadoService.isTransicaoValida(solicitacao.status, StatusSolicitacao.APROVADA)) {
      throw new BadRequestException(
        `Não é possível aprovar uma solicitação no estado ${solicitacao.status}`
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
      throw new BadRequestException(
        'Não é possível aprovar a solicitação com pendências não resolvidas. Resolva todas as pendências antes de aprovar.'
      );
    }

    // Verificar se a solicitação tem os campos obrigatórios preenchidos
    if (!solicitacao.parecer_semtas) {
      throw new BadRequestException(
        'O parecer da SEMTAS é obrigatório para aprovar a solicitação'
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
      throw new BadRequestException('Solicitação não encontrada');
    }

    // Verificar se a transição para LIBERADA é válida
    if (!this.transicaoEstadoService.isTransicaoValida(solicitacao.status, StatusSolicitacao.LIBERADA)) {
      throw new BadRequestException(
        `Não é possível liberar uma solicitação no estado ${solicitacao.status}`
      );
    }

    // Verificar se a solicitação foi aprovada
    if (solicitacao.status !== StatusSolicitacao.APROVADA) {
      throw new BadRequestException(
        'Apenas solicitações aprovadas podem ser liberadas'
      );
    }

    // Verificar se a solicitação tem os campos obrigatórios preenchidos
    if (!solicitacao.aprovador_id) {
      throw new BadRequestException(
        'A solicitação precisa ter um aprovador registrado para ser liberada'
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
      throw new BadRequestException('Solicitação não encontrada');
    }

    // Verificar se a transição para CANCELADA é válida
    if (!this.transicaoEstadoService.isTransicaoValida(solicitacao.status, StatusSolicitacao.CANCELADA)) {
      throw new BadRequestException(
        `Não é possível cancelar uma solicitação no estado ${solicitacao.status}`
      );
    }

    // Verificar se a solicitação já está em um estado final
    if (
      solicitacao.status === StatusSolicitacao.CONCLUIDA || 
      solicitacao.status === StatusSolicitacao.ARQUIVADA
    ) {
      throw new BadRequestException(
        'Não é possível cancelar uma solicitação que já foi concluída ou arquivada'
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
      throw new BadRequestException('Solicitação não encontrada');
    }

    // Verificar se a transição para CONCLUIDA é válida
    if (!this.transicaoEstadoService.isTransicaoValida(solicitacao.status, StatusSolicitacao.CONCLUIDA)) {
      throw new BadRequestException(
        `Não é possível concluir uma solicitação no estado ${solicitacao.status}`
      );
    }

    // Verificar se a solicitação está em processamento
    if (solicitacao.status !== StatusSolicitacao.EM_PROCESSAMENTO) {
      throw new BadRequestException(
        'Apenas solicitações em processamento podem ser concluídas'
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
      throw new BadRequestException('Solicitação não encontrada');
    }

    // Verificar se a transição para ARQUIVADA é válida
    if (!this.transicaoEstadoService.isTransicaoValida(solicitacao.status, StatusSolicitacao.ARQUIVADA)) {
      throw new BadRequestException(
        `Não é possível arquivar uma solicitação no estado ${solicitacao.status}`
      );
    }

    // Verificar se a solicitação está em um estado que permite arquivamento
    const estadosPermitidos = [
      StatusSolicitacao.CONCLUIDA,
      StatusSolicitacao.REPROVADA,
      StatusSolicitacao.CANCELADA
    ];

    if (!estadosPermitidos.includes(solicitacao.status)) {
      throw new BadRequestException(
        'Apenas solicitações concluídas, reprovadas ou canceladas podem ser arquivadas'
      );
    }
  }
}
