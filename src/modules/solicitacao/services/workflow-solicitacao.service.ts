import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ForbiddenException,
  InternalServerErrorException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  Solicitacao,
  StatusSolicitacao,
  HistoricoSolicitacao,
  Pendencia,
  StatusPendencia,
  DadosNatalidade,
} from '../../../entities';
import { DadosNatalidadeRepository } from '../../beneficio/repositories/dados-natalidade.repository';
import { TipoDocumentoEnum, TipoContextoNatalidade } from '../../../enums';
import { TransicaoEstadoService } from './transicao-estado.service';
import { ValidacaoSolicitacaoService } from './validacao-solicitacao.service';
import { PrazoSolicitacaoService } from './prazo-solicitacao.service';
import { ConcessaoService } from '../../beneficio/services/concessao.service';
import { EventosService } from './eventos.service';
import { DadosBeneficioFactoryService } from '../../beneficio/services/dados-beneficio-factory.service';
import { BeneficioService } from '../../beneficio/services/beneficio.service';
import { DocumentoService } from '../../documento/services/documento.service';
import { AuditEventEmitter } from '../../auditoria/events/emitters/audit-event.emitter';
import {
  throwWorkflowStepRequired,
  throwSolicitacaoNotFound,
} from '../../../shared/exceptions/error-catalog/domains/solicitacao.errors';

/**
 * Interface para o resultado da transição de estado
 */
export interface ResultadoTransicaoEstado {
  sucesso: boolean;
  mensagem: string;
  status_anterior?: StatusSolicitacao;
  status_atual?: StatusSolicitacao;
  solicitacao?: Solicitacao;
  concessao?: any; // Dados da concessão criada (quando aplicável)
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

  constructor(
    private readonly concessaoService: ConcessaoService,
    @InjectRepository(Solicitacao)
    private readonly solicitacaoRepository: Repository<Solicitacao>,
    @InjectRepository(HistoricoSolicitacao)
    private readonly historicoRepository: Repository<HistoricoSolicitacao>,
    @InjectRepository(Pendencia)
    private readonly pendenciaRepository: Repository<Pendencia>,
    private readonly dadosNatalidadeRepository: DadosNatalidadeRepository,
    private readonly dataSource: DataSource,
    private readonly transicaoEstadoService: TransicaoEstadoService,
    private readonly validacaoService: ValidacaoSolicitacaoService,
    private readonly prazoService: PrazoSolicitacaoService,
    private readonly eventosService: EventosService,
    @Inject(forwardRef(() => DadosBeneficioFactoryService))
    private readonly dadosBeneficioFactoryService: DadosBeneficioFactoryService,
    @Inject(forwardRef(() => BeneficioService))
    private readonly beneficioService: BeneficioService,
    private readonly documentoService: DocumentoService,
    private readonly auditEventEmitter: AuditEventEmitter,
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
    return this.transicaoEstadoService.isTransicaoValida(
      estadoAtual,
      novoEstado,
    );
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
      observacao:
        observacao || `Transição de ${estadoAtual} para ${novoEstado}`,
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

      // Emitir evento de mudança de status usando EventosService
      if (resultado.sucesso && resultado.solicitacao) {
        try {
          this.eventosService.emitirEventoAlteracaoStatus(
            resultado.solicitacao,
            estadoAtual,
            usuarioId,
            observacao
          );
          this.logger.debug(
            `Evento de mudança de status emitido para solicitação ${solicitacaoId}: ${estadoAtual} -> ${novoEstado}`
          );
        } catch (eventError) {
          this.logger.error(
            `Erro ao emitir evento de mudança de status: ${eventError.message}`,
            eventError.stack,
          );
        }
      }

      // Atualizar os prazos com base no novo estado da solicitação
      try {
        await this.prazoService.atualizarPrazosTransicao(
          solicitacaoId,
          novoEstado,
        );
        this.logger.log(
          `Prazos atualizados para a solicitação ${solicitacaoId}`,
        );
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
  async getEstadosPossiveis(
    solicitacaoId: string,
  ): Promise<StatusSolicitacao[]> {
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
  async criarRascunho(
    solicitacaoData: Partial<Solicitacao>,
  ): Promise<Solicitacao> {
    const solicitacao = this.solicitacaoRepository.create({
      ...solicitacaoData,
      status: StatusSolicitacao.RASCUNHO,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const solicitacaoSalva = await this.solicitacaoRepository.save(solicitacao);

    // Emitir evento de rascunho criado usando EventosService
    try {
      this.eventosService.emitirEventoCriacao(solicitacaoSalva);
      this.logger.debug(
        `Evento de rascunho criado emitido para solicitação ${solicitacaoSalva.id}`
      );
    } catch (eventError) {
      this.logger.error(
        `Erro ao emitir evento de rascunho criado: ${eventError.message}`,
        eventError.stack,
      );
    }

    return solicitacaoSalva;
  }

  /**
   * Busca documentos históricos do cidadão (solicitações anteriores + documentos reutilizáveis)
   * @param cidadaoId ID do cidadão
   * @param solicitacaoAtualId ID da solicitação atual (para excluir da busca)
   * @returns Lista de tipos de documentos já apresentados pelo cidadão
   * @private
   */
  private async buscarDocumentosHistoricosCidadao(
    cidadaoId: string,
    solicitacaoAtualId: string,
  ): Promise<TipoDocumentoEnum[]> {
    this.logger.debug(
      `Buscando histórico documental do cidadão ${cidadaoId} (excluindo solicitação ${solicitacaoAtualId})`,
    );

    // 1. Buscar documentos de solicitações anteriores do cidadão
    const documentosHistoricos =
      await this.documentoService.findByCidadao(cidadaoId);

    // Filtrar documentos que não sejam da solicitação atual
    const documentosOutrasSolicitacoes = documentosHistoricos.filter(
      (doc) => doc.solicitacao_id !== solicitacaoAtualId,
    );

    // 2. Buscar documentos reutilizáveis válidos do cidadão
    const documentosReutilizaveis =
      await this.documentoService.findReutilizaveis(cidadaoId);

    // Combinar todos os documentos e extrair tipos únicos
    const todosDocumentos = [
      ...documentosOutrasSolicitacoes,
      ...documentosReutilizaveis,
    ];

    // Filtrar apenas documentos válidos (não vencidos)
    const agora = new Date();
    const documentosValidos = todosDocumentos.filter((doc) => {
      // Se não tem data de validade, considera válido
      if (!doc.data_validade) return true;
      // Se tem data de validade, verifica se não venceu
      return new Date(doc.data_validade) >= agora;
    });

    const tiposDocumentosHistoricos: TipoDocumentoEnum[] = [
      ...new Set(documentosValidos.map((doc) => doc.tipo)),
    ];

    this.logger.debug(
      `Encontrados ${tiposDocumentosHistoricos.length} tipos de documentos no histórico do cidadão: [${tiposDocumentosHistoricos.join(', ')}]`,
    );

    return tiposDocumentosHistoricos;
  }

  /**
   * Verifica se a solicitação possui prioridade máxima (nível 0) que permite bypass de validações
   * @param solicitacaoId ID da solicitação a ser verificada
   * @returns Promise<boolean> true se a solicitação tem prioridade 0, false caso contrário
   * @private
   */
  private async verificarBypassPrioridadeMaxima(solicitacaoId: string): Promise<boolean> {
    this.logger.debug(
      `Verificando bypass de prioridade máxima para solicitação ${solicitacaoId}`,
    );

    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id: solicitacaoId },
      select: ['id', 'prioridade', 'protocolo'],
    });

    if (!solicitacao) {
      this.logger.warn(
        `Solicitação ${solicitacaoId} não encontrada durante verificação de bypass`,
      );
      return false;
    }

    const temBypass = solicitacao.prioridade === 0;
    
    if (temBypass) {
      this.logger.warn(
        `BYPASS ATIVADO: Solicitação ${solicitacaoId} (protocolo: ${solicitacao.protocolo}) possui prioridade máxima (0) - validações padrão serão ignoradas`,
      );
    }

    return temBypass;
  }

  /**
   * Valida se uma solicitação pode ser enviada para análise
   * Verifica se todos os requisitos obrigatórios foram atendidos
   * Considera documentos já apresentados pelo cidadão em solicitações anteriores
   * @param solicitacaoId ID da solicitação a ser validada
   * @throws {AppError} Se algum requisito obrigatório não foi atendido
   * @private
   */
  private async validarEnvioParaAnalise(solicitacaoId: string): Promise<void> {
    this.logger.debug(
      `Iniciando validação de envio para análise da solicitação ${solicitacaoId}`,
    );

    // Buscar a solicitação com suas relações
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id: solicitacaoId },
      relations: ['tipo_beneficio', 'beneficiario'],
    });

    if (!solicitacao) {
      this.logger.error(
        `Solicitação ${solicitacaoId} não encontrada durante validação de envio para análise`,
      );
      throwSolicitacaoNotFound(solicitacaoId, {
        data: {
          context: 'validacao_envio_analise',
          action: 'enviar_para_analise',
        },
      });
    }

    const tipoBeneficio = solicitacao.tipo_beneficio;
    const beneficiario = solicitacao.beneficiario;

    this.logger.debug(
      `Validando solicitação ${solicitacaoId} do benefício '${tipoBeneficio.nome}' para beneficiário '${beneficiario?.nome}'`,
    );

    // 1. Validar se existem dados específicos do benefício
    try {
      const possuiDadosBeneficio =
        await this.dadosBeneficioFactoryService.existsBySolicitacao(
          tipoBeneficio.codigo,
          solicitacaoId,
        );

      if (!possuiDadosBeneficio) {
        this.logger.warn(
          `Dados específicos do benefício '${tipoBeneficio.nome}' não preenchidos para solicitação ${solicitacaoId}`,
        );

        throwWorkflowStepRequired('dados_especificos_beneficio', {
          data: {
            solicitacaoId,
            tipoBeneficio: tipoBeneficio.nome,
            codigoBeneficio: tipoBeneficio.codigo,
            beneficiario: beneficiario?.nome,
            context: 'validacao_envio_analise',
            action: 'preencher_dados_beneficio',
          },
        });
      }
    } catch (error) {
      if (error.code === 'SOLICITACAO_WORKFLOW_STEP_REQUIRED') {
        throw error;
      }
      this.logger.error(
        `Erro ao verificar dados específicos do benefício para solicitação ${solicitacaoId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }

    // 2. Validar se todos os requisitos documentais obrigatórios foram atendidos
    // Agora considera documentos já apresentados pelo cidadão anteriormente
    try {
      const requisitosObrigatorios =
        await this.beneficioService.findRequisitosByBeneficioId(
          tipoBeneficio.id,
        );

      const tiposDocumentosObrigatorios = requisitosObrigatorios
        .filter((requisito) => requisito.isObrigatorio())
        .map((requisito) => requisito.tipo_documento);

      this.logger.debug(
        `Encontrados ${tiposDocumentosObrigatorios.length} tipos de documentos obrigatórios para benefício '${tipoBeneficio.nome}'`,
      );

      if (tiposDocumentosObrigatorios.length > 0) {
        // Buscar documentos da solicitação atual
        const documentosEnviados =
          await this.documentoService.findBySolicitacao(solicitacaoId);
        const tiposDocumentosEnviados = documentosEnviados.map(
          (doc) => doc.tipo,
        );

        // Buscar documentos históricos do cidadão
        const tiposDocumentosHistoricos =
          await this.buscarDocumentosHistoricosCidadao(
            beneficiario.id,
            solicitacaoId,
          );

        // Combinar documentos da solicitação atual + histórico
        const todosDocumentosDisponiveis = [
          ...new Set([
            ...tiposDocumentosEnviados,
            ...tiposDocumentosHistoricos,
          ]),
        ];

        this.logger.debug(
          `Documentos enviados na solicitação atual ${solicitacaoId}: [${tiposDocumentosEnviados.join(', ')}]`,
        );
        this.logger.debug(
          `Documentos disponíveis no histórico: [${tiposDocumentosHistoricos.join(', ')}]`,
        );
        this.logger.debug(
          `Total de documentos disponíveis (atual + histórico): [${todosDocumentosDisponiveis.join(', ')}]`,
        );

        // Verificar quais documentos obrigatórios ainda estão faltando
        let tiposFaltantes = tiposDocumentosObrigatorios.filter(
          (tipoObrigatorio) =>
            !todosDocumentosDisponiveis.includes(tipoObrigatorio),
        );

        // Validação específica para benefício de natalidade
        if (tipoBeneficio.codigo === 'NATALIDADE') {
          tiposFaltantes = await this.validarDocumentosNatalidade(
            solicitacaoId,
            tiposFaltantes,
            todosDocumentosDisponiveis,
          );
        }

        if (tiposFaltantes.length > 0) {
          this.logger.warn(
            `Documentos obrigatórios ainda faltantes para solicitação ${solicitacaoId}: [${tiposFaltantes.join(', ')}]`,
          );

          throwWorkflowStepRequired('documentos_obrigatorios', {
            data: {
              solicitacaoId,
              tipoBeneficio: tipoBeneficio.nome,
              codigoBeneficio: tipoBeneficio.codigo,
              beneficiario: beneficiario?.nome,
              context: 'validacao_envio_analise',
              action: 'anexar_documentos_obrigatorios',
              documentosFaltantes: tiposFaltantes,
              totalDocumentosFaltantes: tiposFaltantes.length,
              documentosEnviados: tiposDocumentosEnviados,
              totalDocumentosEnviados: tiposDocumentosEnviados.length,
              documentosHistoricos: tiposDocumentosHistoricos,
              totalDocumentosHistoricos: tiposDocumentosHistoricos.length,
            },
          });
        } else {
          this.logger.debug(
            `Todos os documentos obrigatórios estão disponíveis para solicitação ${solicitacaoId}`,
          );
        }
      } else {
        this.logger.debug(
          `Nenhum documento obrigatório configurado para benefício '${tipoBeneficio.nome}'`,
        );
      }
    } catch (error) {
      if (error.code === 'SOLICITACAO_WORKFLOW_STEP_REQUIRED') {
        throw error;
      }
      this.logger.error(
        `Erro ao validar requisitos documentais para solicitação ${solicitacaoId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }

    this.logger.debug(
      `Validação de envio para análise concluída com sucesso para solicitação ${solicitacaoId}`,
    );
  }

  /**
   * Envia uma solicitação para análise
   * 
   * FUNCIONALIDADE DE BYPASS:
   * - Solicitações com prioridade 0 (máxima) ignoram todas as validações padrão
   * - Permite envio direto para análise mesmo sem dados específicos ou documentos
   * - Mantém todas as validações para solicitações com prioridade diferente de 0
   * - Registra logs de auditoria específicos quando o bypass é utilizado
   * 
   * @param solicitacaoId ID da solicitação
   * @param usuarioId ID do usuário
   * @returns Resultado da transição
   */
  async enviarParaAnalise(
    solicitacaoId: string,
    usuarioId: string,
  ): Promise<ResultadoTransicaoEstado> {
    this.logger.log(
      `Enviando solicitação ${solicitacaoId} para análise por usuário ${usuarioId}`,
    );

    try {
      // Verificar se a solicitação possui prioridade máxima (0) para bypass
      const temBypassPrioridadeMaxima = await this.verificarBypassPrioridadeMaxima(solicitacaoId);
      
      if (temBypassPrioridadeMaxima) {
        // BYPASS ATIVADO: Pular validações padrão para prioridade máxima
        this.logger.warn(
          `Solicitação ${solicitacaoId} com prioridade máxima (0) - enviando diretamente para análise`,
        );
        
        // Emitir evento de auditoria específico para bypass
        await this.auditEventEmitter.emitEntityUpdated(
          'Solicitacao',
          solicitacaoId,
          {
            status: StatusSolicitacao.ABERTA,
            observacao: 'Bypass de validações ativado por prioridade máxima'
          },
          {
            status: StatusSolicitacao.EM_ANALISE,
            observacao: 'Enviado para análise com bypass de prioridade máxima (nível 0)'
          },
          usuarioId,
        );
      } else {
        // Executar validações padrão para solicitações com prioridade diferente de 0
        await this.validarEnvioParaAnalise(solicitacaoId);
      }

      // Realizar a transição de estado
      const observacaoTransicao = temBypassPrioridadeMaxima 
        ? 'Solicitação enviada para análise com bypass de prioridade máxima (nível 0)'
        : 'Solicitação enviada para análise';
        
      const resultado = await this.realizarTransicao(
        solicitacaoId,
        StatusSolicitacao.EM_ANALISE,
        usuarioId,
        observacaoTransicao,
      );

      if (resultado.sucesso) {
        // Emitir evento de auditoria padrão apenas se não foi bypass (para evitar duplicação)
        if (!temBypassPrioridadeMaxima) {
          await this.auditEventEmitter.emitEntityUpdated(
            'Solicitacao',
            solicitacaoId,
            {
              status: StatusSolicitacao.ABERTA,
            },
            {
              status: StatusSolicitacao.EM_ANALISE,
            },
            usuarioId,
          );
        }
      } else {
        this.logger.error(
          `Falha ao enviar solicitação ${solicitacaoId} para análise: ${resultado.mensagem}`,
        );
      }

      return resultado;
    } catch (error) {
      this.logger.error(
        `Erro ao enviar solicitação ${solicitacaoId} para análise: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Inicia a análise de uma solicitação
   * @param solicitacaoId ID da solicitação
   * @param usuarioId ID do usuário
   * @returns Resultado da transição
   */
  async iniciarAnalise(
    solicitacaoId: string,
    usuarioId: string,
  ): Promise<ResultadoTransicaoEstado> {
    const resultado = await this.realizarTransicao(
      solicitacaoId,
      StatusSolicitacao.EM_ANALISE,
      usuarioId,
      'Análise iniciada',
    );

    if (resultado.sucesso) {
      // Emitir evento de auditoria
      await this.auditEventEmitter.emitEntityUpdated(
        'Solicitacao',
        solicitacaoId,
        {
          status: StatusSolicitacao.PENDENTE,
        },
        {
          status: StatusSolicitacao.EM_ANALISE,
        },
        usuarioId,
      );
    }

    return resultado;
  }

  /**
   * Aprova uma solicitação
   * @param solicitacaoId ID da solicitação
   * @param usuarioId ID do usuário
   * @param observacao Observação da aprovação
   * @param parecerSemtas Parecer da SEMTAS
   * @returns Resultado da transição
   */
  async aprovarSolicitacao(
    solicitacaoId: string,
    usuarioId: string,
    observacao: string,
    parecerSemtas: string,
  ): Promise<ResultadoTransicaoEstado> {
    // Buscar a solicitação para obter informações necessárias
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id: solicitacaoId },
      relations: ['tipo_beneficio'],
    });

    if (!solicitacao) {
      throw new NotFoundException('Solicitação não encontrada');
    }

    // Atualizar o parecer SEMTAS antes da transição
    await this.solicitacaoRepository.update(solicitacaoId, {
      parecer_semtas: parecerSemtas,
      data_aprovacao: new Date(),
      aprovador_id: usuarioId,
    });

    const resultado = await this.realizarTransicao(
      solicitacaoId,
      StatusSolicitacao.APROVADA,
      usuarioId,
      observacao,
    );

    if (resultado.sucesso) {
      try {
        // Criar a concessão automaticamente
        const concessao = await this.concessaoService.criarSeNaoExistir(
          solicitacao,
        );
        resultado.concessao = concessao;
      } catch (concessaoErr) {
        this.logger.error(
          `Erro ao criar concessão para solicitação ${solicitacaoId}: ${concessaoErr.message}`,
          concessaoErr.stack,
        );
        // Não falhar a aprovação por erro na concessão
      }

      // Emitir evento de aprovação processada usando EventosService
      if (resultado.sucesso && resultado.solicitacao) {
        try {
          this.eventosService.emitirEventoAlteracaoStatus(
            resultado.solicitacao,
            resultado.solicitacao.status,
            usuarioId,
            observacao
          );
          this.logger.debug(
            `Evento de aprovação emitido para solicitação ${solicitacaoId}`
          );
        } catch (eventError) {
          this.logger.error(
            `Erro ao emitir evento de aprovação processada: ${eventError.message}`,
            eventError.stack,
          );
        }
      }

      // Emitir evento de auditoria
      if (resultado.sucesso) {
        await this.auditEventEmitter.emitEntityUpdated(
          'Solicitacao',
          solicitacaoId,
          {
            status: StatusSolicitacao.EM_ANALISE,
          },
          {
            status: StatusSolicitacao.APROVADA,
            parecer_semtas: parecerSemtas,
          },
          usuarioId,
        );
      }
    }

    return resultado;
  }

  /**
   * Rejeita uma solicitação
   * @param solicitacaoId ID da solicitação
   * @param usuarioId ID do usuário
   * @param motivo Motivo da rejeição
   * @returns Resultado da transição
   */
  async rejeitarSolicitacao(
    solicitacaoId: string,
    usuarioId: string,
    motivo: string,
  ): Promise<ResultadoTransicaoEstado> {
    // Buscar a solicitação para obter informações necessárias
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id: solicitacaoId },
      relations: ['tipo_beneficio'],
    });

    if (!solicitacao) {
      throw new NotFoundException('Solicitação não encontrada');
    }

    const resultado = await this.realizarTransicao(
      solicitacaoId,
      StatusSolicitacao.INDEFERIDA,
      usuarioId,
      motivo,
    );

    // Emitir evento de rejeição processada usando EventosService
    if (resultado.sucesso && resultado.solicitacao) {
      try {
        this.eventosService.emitirEventoAlteracaoStatus(
          resultado.solicitacao,
          resultado.solicitacao.status,
          usuarioId,
          motivo
        );
        this.logger.debug(
          `Evento de rejeição emitido para solicitação ${solicitacaoId}`
        );
      } catch (eventError) {
        this.logger.error(
          `Erro ao emitir evento de rejeição processada: ${eventError.message}`,
          eventError.stack,
        );
      }
    }

    // Emitir evento de auditoria
    if (resultado.sucesso) {
      await this.auditEventEmitter.emitEntityUpdated(
        'Solicitacao',
        solicitacaoId,
        {
          status: StatusSolicitacao.EM_ANALISE,
        },
        {
          status: StatusSolicitacao.INDEFERIDA,
        },
        usuarioId,
      );
    }

    return resultado;
  }

  /**
   * Cancela uma solicitação
   * @param solicitacaoId ID da solicitação
   * @param usuarioId ID do usuário
   * @param motivo Motivo do cancelamento
   * @returns Resultado da transição
   */
  async cancelarSolicitacao(
    solicitacaoId: string,
    usuarioId: string,
    motivo: string,
  ): Promise<ResultadoTransicaoEstado> {
    // Buscar a solicitação para obter informações necessárias
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id: solicitacaoId },
      relations: ['tipo_beneficio'],
    });

    if (!solicitacao) {
      throw new NotFoundException('Solicitação não encontrada');
    }

    const resultado = await this.realizarTransicao(
      solicitacaoId,
      StatusSolicitacao.CANCELADA,
      usuarioId,
      motivo,
    );

    // Emitir evento de cancelamento processado usando EventosService
    if (resultado.sucesso && resultado.solicitacao) {
      try {
        this.eventosService.emitirEventoAlteracaoStatus(
          resultado.solicitacao,
          resultado.solicitacao.status,
          usuarioId,
          motivo
        );
        this.logger.debug(
          `Evento de cancelamento emitido para solicitação ${solicitacaoId}`
        );
      } catch (eventError) {
        this.logger.error(
          `Erro ao emitir evento de cancelamento processado: ${eventError.message}`,
          eventError.stack,
        );
      }
    }

    // Emitir evento de auditoria
    if (resultado.sucesso) {
      await this.auditEventEmitter.emitEntityUpdated(
        'Solicitacao',
        solicitacaoId,
        {
          status: solicitacao.status,
        },
        {
          status: StatusSolicitacao.CANCELADA,
        },
        usuarioId,
      );
    }

    return resultado;
  }

  /**
   * Atualiza o status de uma solicitação com dados adicionais
   * @param solicitacaoId ID da solicitação
   * @param novoStatus Novo status
   * @param usuarioId ID do usuário
   * @param dadosAdicionais Dados adicionais opcionais
   * @returns Resultado da transição
   */
  async atualizarStatus(
    solicitacaoId: string,
    novoStatus: StatusSolicitacao,
    usuarioId: string,
    dadosAdicionais?: {
      observacao?: string;
      processo_judicial_id?: string;
      determinacao_judicial_id?: string;
      justificativa?: string;
    },
  ): Promise<ResultadoTransicaoEstado> {
    this.logger.log(
      `Atualizando status da solicitação ${solicitacaoId} para ${novoStatus}`,
    );

    try {
      // Buscar a solicitação
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: solicitacaoId },
      });

      if (!solicitacao) {
        throw new NotFoundException('Solicitação não encontrada');
      }

      if (!this.isTransicaoPermitida(solicitacao.status, novoStatus)) {
        throw new BadRequestException(
          `Transição de ${solicitacao.status} para ${novoStatus} não é permitida`,
        );
      }

      // Preparar observação
      const observacao =
        dadosAdicionais?.observacao ||
        dadosAdicionais?.justificativa ||
        `Status atualizado para ${novoStatus}`;

      if (dadosAdicionais?.processo_judicial_id) {
        observacao.concat(` - Processo Judicial: ${dadosAdicionais.processo_judicial_id}`);
      }

      if (dadosAdicionais?.determinacao_judicial_id) {
        observacao.concat(` - Determinação Judicial: ${dadosAdicionais.determinacao_judicial_id}`);
      }

      // Preparar dados para atualização
      const updateData: any = {
        status: novoStatus,
        updated_at: new Date(),
      };

      // Adicionar campos específicos se fornecidos
      if (dadosAdicionais?.processo_judicial_id) {
        updateData.processo_judicial_id = dadosAdicionais.processo_judicial_id;
        updateData.determinacao_judicial_flag = true;
      }

      if (dadosAdicionais?.determinacao_judicial_id) {
        updateData.determinacao_judicial_id =
          dadosAdicionais.determinacao_judicial_id;
        updateData.determinacao_judicial_flag = true;
      }

      // Atualizar a solicitação
      await this.solicitacaoRepository.update(solicitacaoId, updateData);

      // Registrar no histórico
      await this.historicoRepository.save({
        solicitacao_id: solicitacaoId,
        status_anterior: solicitacao.status,
        status_atual: novoStatus,
        usuario_id: usuarioId,
        observacao,
        dados_alterados: {
          status: {
            de: solicitacao.status,
            para: novoStatus,
          },
          ...dadosAdicionais,
        },
      });

      // Buscar a solicitação atualizada
      const solicitacaoAtualizada = await this.solicitacaoRepository.findOne({
        where: { id: solicitacaoId },
      });

      return {
        sucesso: true,
        mensagem: `Status atualizado com sucesso para ${novoStatus}`,
        status_anterior: solicitacao.status,
        status_atual: novoStatus,
        solicitacao: solicitacaoAtualizada,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar status da solicitação ${solicitacaoId}: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      // Atualizar prazos independentemente do resultado
      try {
        await this.prazoService.atualizarPrazosTransicao(
          solicitacaoId,
          novoStatus,
        );
      } catch (prazoError) {
        this.logger.error(
          `Erro ao atualizar prazos: ${prazoError.message}`,
          prazoError.stack,
        );
      }
    }
  }

  /**
   * Valida documentos específicos para benefício de natalidade
   * @param solicitacaoId ID da solicitação
   * @param tiposFaltantes Lista atual de tipos de documentos faltantes
   * @param todosDocumentosDisponiveis Lista de todos os documentos disponíveis
   * @returns Lista atualizada de tipos de documentos faltantes
   * @private
   */
  private async validarDocumentosNatalidade(
    solicitacaoId: string,
    tiposFaltantes: TipoDocumentoEnum[],
    todosDocumentosDisponiveis: TipoDocumentoEnum[],
  ): Promise<TipoDocumentoEnum[]> {
    this.logger.debug(
      `Iniciando validação específica de documentos de natalidade para solicitação ${solicitacaoId}`,
    );

    try {
      // Buscar dados específicos de natalidade
      const dadosNatalidade = await this.dadosNatalidadeRepository.findOne({
        where: { solicitacao_id: solicitacaoId },
      });

      if (!dadosNatalidade) {
        this.logger.warn(
          `Dados de natalidade não encontrados para solicitação ${solicitacaoId}`,
        );
        return tiposFaltantes;
      }

      // Se for contexto pós-natal, certidão de nascimento é obrigatória
      if (dadosNatalidade.tipo_contexto === TipoContextoNatalidade.POS_NATAL) {
        const temCertidaoNascimento = todosDocumentosDisponiveis.includes(
          TipoDocumentoEnum.CERTIDAO_NASCIMENTO,
        );

        if (!temCertidaoNascimento) {
          // Adicionar certidão de nascimento aos documentos faltantes se não estiver presente
          if (!tiposFaltantes.includes(TipoDocumentoEnum.CERTIDAO_NASCIMENTO)) {
            tiposFaltantes.push(TipoDocumentoEnum.CERTIDAO_NASCIMENTO);
            this.logger.debug(
              `Contexto pós-natal detectado para solicitação ${solicitacaoId}. ` +
                `Adicionando certidão de nascimento como documento obrigatório.`,
            );
          }
        } else {
          this.logger.debug(
            `Contexto pós-natal detectado para solicitação ${solicitacaoId}. ` +
              `Certidão de nascimento já está presente nos documentos.`,
          );
        }

        this.logger.debug(
          `Documentos faltantes após validação pós-natal: [${tiposFaltantes.join(', ')}]`,
        );
      } else {
        this.logger.debug(
          `Contexto pré-natal detectado para solicitação ${solicitacaoId}. ` +
            `Mantendo validação padrão de documentos.`,
        );
      }

      return tiposFaltantes;
    } catch (error) {
      this.logger.error(
        `Erro ao validar documentos específicos de natalidade para solicitação ${solicitacaoId}: ${error.message}`,
        error.stack,
      );
      // Em caso de erro, retornar a lista original sem modificações
      return tiposFaltantes;
    }
  }

  /**
   * Determina a prioridade de uma transição de estado
   * @param novoEstado Novo estado da solicitação
   * @returns Prioridade da transição (high, medium, low)
   */
  private determinarPrioridadeTransicao(novoEstado: StatusSolicitacao): string {
    const estadosAlta = [
      StatusSolicitacao.APROVADA,
      StatusSolicitacao.INDEFERIDA,
      StatusSolicitacao.CANCELADA,
    ];
    const estadosMedia = [
      StatusSolicitacao.EM_ANALISE,
      StatusSolicitacao.PENDENTE,
    ];

    if (estadosAlta.includes(novoEstado)) return 'high';
    if (estadosMedia.includes(novoEstado)) return 'medium';
    return 'low';
  }
}
