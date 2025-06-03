import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { 
  Solicitacao, 
  StatusSolicitacao, 
  HistoricoSolicitacao,
  Pendencia,
  StatusPendencia
} from '../../../entities';
import { TransicaoEstadoService } from './transicao-estado.service';
import { ValidacaoSolicitacaoService } from './validacao-solicitacao.service';
import { PrazoSolicitacaoService } from './prazo-solicitacao.service';

/**
 * Interface para o resultado da transição de estado
 */
export interface ResultadoTransicaoEstado {
  sucesso: boolean;
  mensagem: string;
  status_anterior?: StatusSolicitacao;
  status_atual?: StatusSolicitacao;
  solicitacao?: Solicitacao;
}

/**
 * Serviço de Workflow de Solicitação
 *
 * Responsável por gerenciar as transições de estado das solicitações,
 * garantindo que as regras de negócio sejam respeitadas.
 */
@Injectable()
export class WorkflowSolicitacaoService {
  private readonly logger = new Logger(WorkflowSolicitacaoService.name);

  // As transições permitidas agora são gerenciadas pelo TransicaoEstadoService

  constructor(
    @InjectRepository(Solicitacao)
    private readonly solicitacaoRepository: Repository<Solicitacao>,
    @InjectRepository(HistoricoSolicitacao)
    private readonly historicoRepository: Repository<HistoricoSolicitacao>,
    @InjectRepository(Pendencia)
    private readonly pendenciaRepository: Repository<Pendencia>,
    private readonly dataSource: DataSource,
    private readonly transicaoEstadoService: TransicaoEstadoService,
    private readonly validacaoService: ValidacaoSolicitacaoService,
    private readonly prazoService: PrazoSolicitacaoService,
  ) {}

  /**
   * Verifica se uma transição de estado é permitida
   * @param estadoAtual Estado atual da solicitação
   * @param novoEstado Novo estado desejado
   * @returns Boolean indicando se a transição é permitida
   */
  isTransicaoPermitida(
    estadoAtual: StatusSolicitacao,
    novoEstado: StatusSolicitacao,
  ): boolean {
    return this.transicaoEstadoService.isTransicaoValida(estadoAtual, novoEstado);
  }

  /**
   * Realiza a transição de estado de uma solicitação
   * @param solicitacaoId ID da solicitação
   * @param novoEstado Novo estado da solicitação
   * @param usuarioId ID do usuário que está realizando a transição
   * @param observacao Observação sobre a transição (opcional)
   * @returns Resultado da transição, incluindo a solicitação atualizada
   * @throws BadRequestException se a transição não for permitida
   * @throws NotFoundException se a solicitação não for encontrada
   */
  async realizarTransicao(
    solicitacaoId: string,
    novoEstado: StatusSolicitacao,
    usuarioId: string,
    observacao?: string,
  ): Promise<ResultadoTransicaoEstado> {
    this.logger.log(
      `Iniciando transição da solicitação ${solicitacaoId} para o estado ${novoEstado}`,
    );

    // Buscar a solicitação para validar a transição
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id: solicitacaoId },
    });

    if (!solicitacao) {
      throw new NotFoundException(
        `Solicitação com ID ${solicitacaoId} não encontrada`,
      );
    }

    const estadoAtual = solicitacao.status;
    this.logger.log(`Estado atual: ${estadoAtual}, Novo estado: ${novoEstado}`);

    // Verificar se a transição é permitida
    try {
      await this.transicaoEstadoService.verificarTransicaoPermitida(
        estadoAtual,
        novoEstado,
        usuarioId,
      );
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw new ForbiddenException(
          `Usuário não tem permissão para realizar esta transição: ${error.message}`,
        );
      }
      throw new BadRequestException(
        `Transição inválida de ${estadoAtual} para ${novoEstado}: ${error.message}`,
      );
    }

    // Preparar o registro de histórico
    const historicoRegistro = {
      solicitacao_id: solicitacaoId,
      status_anterior: estadoAtual,
      status_atual: novoEstado,
      usuario_id: usuarioId,
      observacao: observacao || `Transição de ${estadoAtual} para ${novoEstado}`,
      dados_alterados: {
        status: {
          de: estadoAtual,
          para: novoEstado,
        },
      },
    };

    // Iniciar transação para garantir consistência
    let resultado: ResultadoTransicaoEstado = {
      sucesso: false,
      mensagem: '',
    };

    try {
      // Executar a transação
      await this.dataSource.transaction(async (transactionalEntityManager) => {
        // 1. Atualizar o status da solicitação
        // Controle de versão otimista - verifica a versão atual antes de atualizar
        const solicitacaoAtualizada = await transactionalEntityManager
          .createQueryBuilder()
          .update(Solicitacao)
          .set({
            status: novoEstado,
            // Incrementar a versão
            version: () => '"version" + 1',
          })
          .where('id = :id AND version = :version', {
            id: solicitacaoId,
            version: solicitacao.version,
          })
          .returning('*')
          .execute();

        if (solicitacaoAtualizada.affected === 0) {
          throw new BadRequestException(
            'A solicitação foi modificada por outro usuário. Por favor, recarregue e tente novamente.',
          );
        }

        // 2. Registrar a mudança no histórico
        await transactionalEntityManager
          .getRepository(HistoricoSolicitacao)
          .save(historicoRegistro);

        // Buscar a solicitação atualizada para retornar
        const solicitacaoFinal = await transactionalEntityManager
          .getRepository(Solicitacao)
          .findOne({ where: { id: solicitacaoId } });

        if (!solicitacaoFinal) {
          throw new InternalServerErrorException(
            'Erro ao buscar solicitação após atualização',
          );
        }

        resultado = {
          sucesso: true,
          solicitacao: solicitacaoFinal,
          mensagem: `Solicitação alterada com sucesso para ${novoEstado}`,
        };
      });

      this.logger.log(
        `Transição da solicitação ${solicitacaoId} para ${novoEstado} concluída com sucesso`,
      );

      // Atualizar os prazos com base no novo estado da solicitação
      try {
        await this.prazoService.atualizarPrazosTransicao(solicitacaoId, novoEstado);
        this.logger.log(`Prazos atualizados para a solicitação ${solicitacaoId}`);
      } catch (prazoError) {
        // Apenas logar o erro sem interromper o fluxo principal
        this.logger.error(
          `Erro ao atualizar prazos para a solicitação ${solicitacaoId}: ${prazoError.message}`,
          prazoError.stack,
        );
      }

      return resultado;
    } catch (error) {
      this.logger.error(
        `Erro na transição da solicitação ${solicitacaoId}: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Erro ao realizar transição: ${error.message}`,
      );
    }
  }

  /**
   * Obtém os estados possíveis para uma solicitação
   * @param solicitacaoId ID da solicitação
   * @returns Lista de estados possíveis
   */
  async getEstadosPossiveis(solicitacaoId: string): Promise<StatusSolicitacao[]> {
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id: solicitacaoId },
    });

    if (!solicitacao) {
      throw new NotFoundException('Solicitação não encontrada');
    }

    return this.transicaoEstadoService.getEstadosPossiveis(solicitacao.status);
  }

  /**
   * Cria uma nova solicitação no estado RASCUNHO
   * @param solicitacaoData Dados da solicitação
   * @returns Solicitação criada
   */
  async criarRascunho(solicitacaoData: Partial<Solicitacao>): Promise<Solicitacao> {
    const solicitacao = this.solicitacaoRepository.create({
      ...solicitacaoData,
      status: StatusSolicitacao.RASCUNHO,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return this.solicitacaoRepository.save(solicitacao);
  }

  /**
   * Submete um rascunho de solicitação, alterando seu estado para PENDENTE
   * @param solicitacaoId ID da solicitação
   * @param usuarioId ID do usuário que está submetendo o rascunho
   * @returns Resultado da transição
   */
  async submeterRascunho(
    solicitacaoId: string,
    usuarioId: string,
  ): Promise<ResultadoTransicaoEstado> {
    return this.realizarTransicao(
      solicitacaoId,
      StatusSolicitacao.ABERTA,
      usuarioId,
      'Solicitação submetida',
    );
  }

  /**
   * Envia uma solicitação para análise, alterando seu estado para EM_ANALISE
   * @param solicitacaoId ID da solicitação
   * @param usuarioId ID do usuário que está enviando a solicitação
   * @returns Resultado da transição
   */
  async enviarParaAnalise(
    solicitacaoId: string,
    usuarioId: string,
  ): Promise<ResultadoTransicaoEstado> {
    return this.realizarTransicao(
      solicitacaoId,
      StatusSolicitacao.EM_ANALISE,
      usuarioId,
      'Solicitação enviada para análise',
    );
  }

  /**
   * Inicia a análise de uma solicitação, alterando seu estado para EM_ANALISE
   * @param solicitacaoId ID da solicitação
   * @param usuarioId ID do usuário que está iniciando a análise
   * @returns Resultado da transição
   */
  async iniciarAnalise(
    solicitacaoId: string,
    usuarioId: string,
  ): Promise<ResultadoTransicaoEstado> {
    return this.realizarTransicao(
      solicitacaoId,
      StatusSolicitacao.EM_ANALISE,
      usuarioId,
      'Análise iniciada',
    );
  }

  /**
   * Aprova uma solicitação, alterando seu estado para APROVADA
   * @param solicitacaoId ID da solicitação
   * @param usuarioId ID do usuário que está aprovando a solicitação
   * @param observacao Observação sobre a aprovação
   * @returns Resultado da transição
   */
  async aprovarSolicitacao(
    solicitacaoId: string,
    usuarioId: string,
    observacao: string,
    parecerSemtas: string,
  ): Promise<ResultadoTransicaoEstado> {
    // Primeiro, atualizar o parecer SEMTAS na solicitação
    await this.solicitacaoRepository.update(solicitacaoId, {
      parecer_semtas: parecerSemtas,
      aprovador_id: usuarioId,
      data_aprovacao: new Date(),
    });

    // Validar se a solicitação pode ser aprovada (regras de negócio)
    await this.validacaoService.validarAprovacao(solicitacaoId);
    
    // Se passar na validação, realizar a transição
    return this.realizarTransicao(
      solicitacaoId,
      StatusSolicitacao.APROVADA,
      usuarioId,
      observacao,
    );
  }

  /**
   * Libera uma solicitação aprovada, alterando seu estado para LIBERADA
   * @param solicitacaoId ID da solicitação
   * @param usuarioId ID do usuário que está liberando a solicitação
   * @returns Resultado da transição
   */
  async liberarSolicitacao(
    solicitacaoId: string,
    usuarioId: string,
  ): Promise<ResultadoTransicaoEstado> {
    // Validar se a solicitação pode ser liberada (regras de negócio)
    await this.validacaoService.validarLiberacao(solicitacaoId);
    
    // Registrar o liberador da solicitação e a data de liberação
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id: solicitacaoId },
    });
    
    if (solicitacao) {
      solicitacao.liberador_id = usuarioId;
      solicitacao.data_liberacao = new Date();
      await this.solicitacaoRepository.save(solicitacao);
    } else {
      throw new NotFoundException('Solicitação não encontrada');
    }
    
    // Se passar na validação, realizar a transição
    return this.realizarTransicao(
      solicitacaoId,
      StatusSolicitacao.LIBERADA,
      usuarioId,
      'Solicitação liberada',
    );
  }

  /**
   * Rejeita uma solicitação, alterando seu estado para INDEFERIDA
   * @param solicitacaoId ID da solicitação
   * @param usuarioId ID do usuário que está rejeitando a solicitação
   * @param motivo Motivo da rejeição
   * @returns Resultado da transição
   */
  async rejeitarSolicitacao(
    solicitacaoId: string,
    usuarioId: string,
    motivo: string,
  ): Promise<ResultadoTransicaoEstado> {
    return this.realizarTransicao(
      solicitacaoId,
      StatusSolicitacao.INDEFERIDA,
      usuarioId,
      motivo || 'Solicitação reprovada',
    );
  }

  /**
   * Cancela uma solicitação, alterando seu estado para CANCELADA
   * @param solicitacaoId ID da solicitação
   * @param usuarioId ID do usuário que está cancelando a solicitação
   * @param motivo Motivo do cancelamento
   * @returns Resultado da transição
   */
  async cancelarSolicitacao(
    solicitacaoId: string,
    usuarioId: string,
    motivo: string,
  ): Promise<ResultadoTransicaoEstado> {
    // Validar se a solicitação pode ser cancelada (regras de negócio)
    await this.validacaoService.validarCancelamento(solicitacaoId);
    
    // Se passar na validação, realizar a transição
    return this.realizarTransicao(
      solicitacaoId,
      StatusSolicitacao.CANCELADA,
      usuarioId,
      motivo || 'Solicitação cancelada',
    );
  }

  /**
   * Inicia o processamento de uma solicitação, alterando seu estado para EM_PROCESSAMENTO
   * @param solicitacaoId ID da solicitação
   * @param usuarioId ID do usuário que está iniciando o processamento
   * @returns Resultado da transição
   */
  async iniciarProcessamento(
    solicitacaoId: string,
    usuarioId: string,
  ): Promise<ResultadoTransicaoEstado> {
    return this.realizarTransicao(
      solicitacaoId,
      StatusSolicitacao.EM_PROCESSAMENTO,
      usuarioId,
      'Processamento iniciado',
    );
  }

  /**
   * Conclui uma solicitação, alterando seu estado para CONCLUIDA
   * @param solicitacaoId ID da solicitação
   * @param usuarioId ID do usuário que está concluindo a solicitação
   * @returns Resultado da transição
   */
  async concluirSolicitacao(
    solicitacaoId: string,
    usuarioId: string,
  ): Promise<ResultadoTransicaoEstado> {
    // Validar se a solicitação pode ser concluída (regras de negócio)
    await this.validacaoService.validarConclusao(solicitacaoId);
    
    // Se passar na validação, realizar a transição
    return this.realizarTransicao(
      solicitacaoId,
      StatusSolicitacao.CONCLUIDA,
      usuarioId,
      'Solicitação concluída',
    );
  }

  /**
   * Arquiva uma solicitação, alterando seu estado para ARQUIVADA
   * @param solicitacaoId ID da solicitação
   * @param usuarioId ID do usuário que está arquivando a solicitação
   * @returns Resultado da transição
   */
  async arquivarSolicitacao(
    solicitacaoId: string,
    usuarioId: string,
  ): Promise<ResultadoTransicaoEstado> {
    // Validar se a solicitação pode ser arquivada (regras de negócio)
    await this.validacaoService.validarArquivamento(solicitacaoId);
    
    // Se passar na validação, realizar a transição
    return this.realizarTransicao(
      solicitacaoId,
      StatusSolicitacao.ARQUIVADA,
      usuarioId,
      'Solicitação arquivada',
    );
  }

  /**
   * Atualiza o status de uma solicitação com informações adicionais para conformidade
   * @param solicitacaoId ID da solicitação
   * @param novoStatus Novo status desejado
   * @param usuarioId ID do usuário que está atualizando o status
   * @param dadosAdicionais Dados adicionais para a atualização
   * @returns Resultado da transição
   */
  async atualizarStatus(
    solicitacaoId: string,
    novoStatus: StatusSolicitacao,
    usuarioId: string,
    dadosAdicionais: {
      observacao?: string;
      processo_judicial_id?: string;
      determinacao_judicial_id?: string;
      justificativa?: string;
    },
  ): Promise<ResultadoTransicaoEstado> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Buscar a solicitação
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: solicitacaoId },
      });

      if (!solicitacao) {
        throw new NotFoundException('Solicitação não encontrada');
      }

      // Verificar se a transição é permitida
      if (!this.isTransicaoPermitida(solicitacao.status, novoStatus)) {
        throw new ForbiddenException(
          `Transição de estado de ${solicitacao.status} para ${novoStatus} não é permitida`,
        );
      }

      // Construir a observação com os dados adicionais
      let observacaoCompleta = dadosAdicionais.observacao || '';
      
      if (dadosAdicionais.justificativa) {
        observacaoCompleta += `\nJustificativa: ${dadosAdicionais.justificativa}`;
      }
      
      if (dadosAdicionais.processo_judicial_id) {
        observacaoCompleta += `\nProcesso Judicial ID: ${dadosAdicionais.processo_judicial_id}`;
      }
      
      if (dadosAdicionais.determinacao_judicial_id) {
        observacaoCompleta += `\nDeterminação Judicial ID: ${dadosAdicionais.determinacao_judicial_id}`;
      }

      // Salvar o estado anterior para o retorno
      const statusAnterior = solicitacao.status;

      // Preparar dados adicionais para atualização
      const updateData: any = {
        status: novoStatus,
        updated_at: new Date()
      };
      
      // Adicionar dados adicionais, se existirem
      if (dadosAdicionais.processo_judicial_id) {
        updateData.processo_judicial_id = dadosAdicionais.processo_judicial_id;
        updateData.determinacao_judicial_flag = true;
      }
      
      if (dadosAdicionais.determinacao_judicial_id) {
        updateData.determinacao_judicial_id = dadosAdicionais.determinacao_judicial_id;
        updateData.determinacao_judicial_flag = true;
      }

      // Atualizar a solicitação usando o queryRunner
      await queryRunner.manager.update(Solicitacao, { id: solicitacaoId }, updateData);

      // Registrar a transição no histórico
      const historico = new HistoricoSolicitacao();
      historico.solicitacao_id = solicitacaoId;
      historico.status_anterior = statusAnterior;
      historico.status_atual = novoStatus;
      historico.usuario_id = usuarioId;
      historico.observacao = observacaoCompleta || `Status atualizado de ${statusAnterior} para ${novoStatus}`;
      historico.created_at = new Date();

      await queryRunner.manager.save(HistoricoSolicitacao, historico);

      await queryRunner.commitTransaction();

      return {
        sucesso: true,
        mensagem: `Status atualizado com sucesso de ${statusAnterior} para ${novoStatus}`,
        status_anterior: statusAnterior,
        status_atual: novoStatus,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();

      // Verificar se é um erro de versão (conflito de concorrência)
      if (error.name === 'QueryFailedError' && 
          (error.message.includes('version') || error.message.includes('version mismatch'))) {
        throw new BadRequestException(
          'A solicitação foi modificada por outro usuário enquanto você a editava. ' +
          'Por favor, atualize a página e tente novamente.'
        );
      }

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(
        `Erro ao atualizar status da solicitação: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro ao atualizar status da solicitação',
      );
    } finally {
      await queryRunner.release();
    }
  }
}
