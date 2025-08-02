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
} from '../../../entities';
import { TransicaoEstadoService } from './transicao-estado.service';
import { ValidacaoSolicitacaoService } from './validacao-solicitacao.service';
import { PrazoSolicitacaoService } from './prazo-solicitacao.service';
import { NotificacaoService } from '../../notificacao/services/notificacao.service';
import { TemplateMappingService } from './template-mapping.service';
import { ConcessaoService } from '../../beneficio/services/concessao.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DadosBeneficioFactoryService } from '../../beneficio/services/dados-beneficio-factory.service';
import { BeneficioService } from '../../beneficio/services/beneficio.service';
import { DocumentoService } from '../../documento/services/documento.service';
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
    private readonly dataSource: DataSource,
    private readonly transicaoEstadoService: TransicaoEstadoService,
    private readonly validacaoService: ValidacaoSolicitacaoService,
    private readonly prazoService: PrazoSolicitacaoService,
    private readonly notificacaoService: NotificacaoService,
    private readonly templateMappingService: TemplateMappingService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => DadosBeneficioFactoryService))
    private readonly dadosBeneficioFactoryService: DadosBeneficioFactoryService,
    @Inject(forwardRef(() => BeneficioService))
    private readonly beneficioService: BeneficioService,
    private readonly documentoService: DocumentoService,
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

      // Emitir notificação SSE para transição de estado
      if (resultado.sucesso && resultado.solicitacao) {
        try {
          this.eventEmitter.emit('sse.notificacao', {
            userId: resultado.solicitacao.tecnico_id,
            tipo: 'transicao_estado',
            dados: {
              solicitacaoId: resultado.solicitacao.id,
              protocolo: resultado.solicitacao.protocolo,
              statusAnterior: estadoAtual,
              statusAtual: novoEstado,
              observacao:
                observacao || `Transição de ${estadoAtual} para ${novoEstado}`,
              prioridade: this.determinarPrioridadeTransicao(novoEstado),
              dataTransicao: new Date(),
            },
          });
        } catch (sseError) {
          this.logger.error(
            `Erro ao emitir notificação SSE para transição ${solicitacaoId}: ${sseError.message}`,
            sseError.stack,
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

    // Emitir notificação SSE para criação de rascunho
    if (solicitacaoSalva.tecnico_id) {
      try {
        this.eventEmitter.emit('sse.notificacao', {
          userId: solicitacaoSalva.tecnico_id,
          tipo: 'rascunho_criado',
          dados: {
            solicitacaoId: solicitacaoSalva.id,
            protocolo: solicitacaoSalva.protocolo,
            status: StatusSolicitacao.RASCUNHO,
            prioridade: 'low',
            dataCriacao: new Date(),
          },
        });
      } catch (sseError) {
        this.logger.error(
          `Erro ao emitir notificação SSE para criação de rascunho ${solicitacaoSalva.id}: ${sseError.message}`,
          sseError.stack,
        );
      }
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
  ): Promise<string[]> {
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

    const tiposDocumentosHistoricos = [
      ...new Set(documentosValidos.map((doc) => doc.tipo)),
    ];

    this.logger.debug(
      `Encontrados ${tiposDocumentosHistoricos.length} tipos de documentos no histórico do cidadão: [${tiposDocumentosHistoricos.join(', ')}]`,
    );

    return tiposDocumentosHistoricos;
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
        const tiposFaltantes = tiposDocumentosObrigatorios.filter(
          (tipoObrigatorio) =>
            !todosDocumentosDisponiveis.includes(tipoObrigatorio),
        );

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
              todosDocumentosDisponiveis,
              totalDocumentosDisponiveis: todosDocumentosDisponiveis.length,
              totalDocumentosObrigatorios: tiposDocumentosObrigatorios.length,
            },
          });
        } else {
          this.logger.log(
            `Todos os documentos obrigatórios foram atendidos para solicitação ${solicitacaoId}. ` +
              `Documentos na solicitação atual: ${tiposDocumentosEnviados.length}, ` +
              `Documentos do histórico: ${tiposDocumentosHistoricos.length}`,
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
        `Erro ao validar documentos obrigatórios para solicitação ${solicitacaoId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }

    this.logger.log(
      `Validação de envio para análise concluída com sucesso para solicitação ${solicitacaoId} do benefício '${tipoBeneficio.nome}'`,
    );
  }

  /**
   * Envia uma solicitação para análise, alterando seu estado para EM_ANALISE
   * @param solicitacaoId ID da solicitação
   * @param usuarioId ID do usuário que está enviando a solicitação
   * @returns Resultado da transição
   * @throws {AppError} Se a validação falhar ou ocorrer erro na transição
   */
  async enviarParaAnalise(
    solicitacaoId: string,
    usuarioId: string,
  ): Promise<ResultadoTransicaoEstado> {
    this.logger.log(
      `Iniciando processo de envio para análise da solicitação ${solicitacaoId} pelo usuário ${usuarioId}`,
    );

    try {
      // Validar se a solicitação pode ser enviada para análise
      await this.validarEnvioParaAnalise(solicitacaoId);

      this.logger.debug(
        `Validação concluída com sucesso para solicitação ${solicitacaoId}. Iniciando transição de estado.`,
      );

      // Se passou na validação, realizar a transição
      const resultado = await this.realizarTransicao(
        solicitacaoId,
        StatusSolicitacao.EM_ANALISE,
        usuarioId,
        'Solicitação enviada para análise após validação completa',
      );

      if (resultado.sucesso) {
        this.logger.log(
          `Solicitação ${solicitacaoId} enviada para análise com sucesso. Status alterado de '${resultado.status_anterior}' para '${resultado.status_atual}'`,
        );
      } else {
        this.logger.warn(
          `Falha ao enviar solicitação ${solicitacaoId} para análise. Motivo: ${resultado.mensagem || 'Não especificado'}`,
        );
      }

      return resultado;
    } catch (error) {
      // Log detalhado do erro para debugging
      this.logger.error(
        `Erro ao enviar solicitação ${solicitacaoId} para análise: ${error.message}`,
        {
          solicitacaoId,
          usuarioId,
          errorCode: error.code,
          errorStack: error.stack,
          context: 'enviarParaAnalise',
        },
      );

      // Re-propagar o erro para que seja tratado pelo filtro de exceções
      throw error;
    }
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
    // Buscar a solicitação para obter dados do criador
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id: solicitacaoId },
      relations: ['beneficiario', 'tipo_beneficio'],
    });

    if (!solicitacao) {
      throw new NotFoundException(
        `Solicitação com ID ${solicitacaoId} não encontrada`,
      );
    }

    // Primeiro, atualizar o parecer SEMTAS na solicitação
    await this.solicitacaoRepository.update(solicitacaoId, {
      parecer_semtas: parecerSemtas,
      aprovador_id: usuarioId,
      data_aprovacao: new Date(),
    });

    // Validar se a solicitação pode ser aprovada (regras de negócio)
    await this.validacaoService.validarAprovacao(solicitacaoId);

    // Se passar na validação, realizar a transição
    const resultado = await this.realizarTransicao(
      solicitacaoId,
      StatusSolicitacao.APROVADA,
      usuarioId,
      observacao,
    );

    // Criação automática de concessão vinculada à solicitação aprovada
    if (resultado.sucesso) {
      try {
        const concessao =
          await this.concessaoService.criarSeNaoExistir(solicitacao);
        resultado.concessao = concessao; // Incluir dados da concessão no retorno
        this.logger.debug(
          `Concessão criada/recuperada para solicitação ${solicitacao.id}`,
        );
      } catch (concessaoErr) {
        this.logger.error(
          `Erro ao criar concessão automática para solicitação ${solicitacao.id}: ${concessaoErr.message}`,
          concessaoErr.stack,
        );
      }
    }

    // Enviar notificação para o criador da solicitação
    if (resultado.sucesso && solicitacao.tecnico_id) {
      try {
        // Buscar o template de aprovação usando o serviço de mapeamento
        const templateData =
          await this.templateMappingService.prepararDadosTemplate('APROVACAO');

        await this.notificacaoService.criarEBroadcast({
          destinatario_id: solicitacao.tecnico_id,
          titulo: 'Solicitação Aprovada',
          conteudo: `Sua solicitação de ${solicitacao.tipo_beneficio.nome || 'benefício'} foi aprovada. ${observacao ? `Observação: ${observacao}` : ''}`,
          tipo: 'aprovacao',
          prioridade: 'high',
          template_id: templateData.template_id,
          dados: {
            solicitacao_id: solicitacao.id,
            tipo_beneficio: solicitacao.tipo_beneficio?.nome || 'Benefício',
            beneficiario_nome: solicitacao.beneficiario?.nome || 'Beneficiário',
            status_anterior: resultado.status_anterior,
            status_novo: resultado.status_atual,
            parecer_semtas: parecerSemtas,
            observacao: observacao || 'Nenhuma observação',
            data_aprovacao: new Date().toLocaleDateString('pt-BR'),
            url_sistema:
              process.env.FRONTEND_URL || 'https://pgben-front.kemosoft.com.br',
          },
        });

        if (templateData.templateEncontrado) {
          this.logger.log(
            `Notificação de aprovação enviada com template ${templateData.codigoTemplate} para usuário ${solicitacao.tecnico_id}`,
          );
        } else {
          this.logger.warn(
            `Template para APROVACAO não encontrado. Notificação enviada sem template.`,
          );
        }
      } catch (notificationError) {
        this.logger.error(
          `Erro ao enviar notificação de aprovação da solicitação ${solicitacaoId}: ${notificationError.message}`,
          notificationError.stack,
        );
      }

      // Emitir notificação SSE específica para aprovação
      try {
        this.eventEmitter.emit('sse.notificacao', {
          userId: solicitacao.tecnico_id,
          tipo: 'solicitacao_aprovada',
          dados: {
            solicitacaoId: solicitacao.id,
            protocolo: solicitacao.protocolo,
            tipoBeneficio: solicitacao.tipo_beneficio?.nome || 'Benefício',
            beneficiarioNome: solicitacao.beneficiario?.nome || 'Beneficiário',
            parecerSemtas: parecerSemtas,
            observacao: observacao,
            prioridade: 'high',
            dataAprovacao: new Date(),
          },
        });
      } catch (sseError) {
        this.logger.error(
          `Erro ao emitir notificação SSE para aprovação ${solicitacaoId}: ${sseError.message}`,
          sseError.stack,
        );
      }
    }

    return resultado;
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
    // Buscar a solicitação para obter dados do criador
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id: solicitacaoId },
      relations: ['beneficiario', 'tipo_beneficio'],
    });

    if (!solicitacao) {
      throw new NotFoundException(
        `Solicitação com ID ${solicitacaoId} não encontrada`,
      );
    }

    const resultado = await this.realizarTransicao(
      solicitacaoId,
      StatusSolicitacao.INDEFERIDA,
      usuarioId,
      motivo || 'Solicitação indeferida',
    );

    // Enviar notificação para o criador da solicitação
    if (resultado.sucesso && solicitacao.tecnico_id) {
      try {
        // Buscar o template de rejeição usando o serviço de mapeamento
        const templateData =
          await this.templateMappingService.prepararDadosTemplate(
            'INDEFERIMENTO',
          );

        await this.notificacaoService.criarEBroadcast({
          destinatario_id: solicitacao.tecnico_id,
          titulo: 'Solicitação Rejeitada',
          conteudo: `Sua solicitação de ${solicitacao.tipo_beneficio.nome || 'benefício'} foi indeferida. ${motivo ? `Motivo: ${motivo}` : ''}`,
          tipo: 'REJEICAO',
          prioridade: 'high',
          template_id: templateData.template_id,
          dados: {
            solicitacao_id: solicitacao.id,
            tipo_beneficio: solicitacao.tipo_beneficio?.nome || 'Benefício',
            beneficiario_nome: solicitacao.beneficiario?.nome || 'Beneficiário',
            status_anterior: resultado.status_anterior,
            status_novo: resultado.status_atual,
            motivo: motivo || 'Não informado',
            data_rejeicao: new Date().toLocaleDateString('pt-BR'),
            url_sistema:
              process.env.FRONTEND_URL || 'https://pgben-front.kemosoft.com.br',
          },
        });

        if (templateData.templateEncontrado) {
          this.logger.log(
            `Notificação de rejeição enviada com template ${templateData.codigoTemplate} para usuário ${solicitacao.tecnico_id}`,
          );
        } else {
          this.logger.warn(
            `Template para REJEICAO não encontrado. Notificação enviada sem template.`,
          );
        }
      } catch (notificationError) {
        this.logger.error(
          `Erro ao enviar notificação de rejeição da solicitação ${solicitacaoId}: ${notificationError.message}`,
          notificationError.stack,
        );
      }

      // Emitir notificação SSE específica para rejeição
      try {
        this.eventEmitter.emit('sse.notificacao', {
          userId: solicitacao.tecnico_id,
          tipo: 'solicitacao_rejeitada',
          dados: {
            solicitacaoId: solicitacao.id,
            protocolo: solicitacao.protocolo,
            tipoBeneficio: solicitacao.tipo_beneficio?.nome || 'Benefício',
            beneficiarioNome: solicitacao.beneficiario?.nome || 'Beneficiário',
            motivo: motivo,
            prioridade: 'high',
            dataRejeicao: new Date(),
          },
        });
      } catch (sseError) {
        this.logger.error(
          `Erro ao emitir notificação SSE para rejeição ${solicitacaoId}: ${sseError.message}`,
          sseError.stack,
        );
      }
    }

    return resultado;
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
    // Buscar a solicitação para obter dados do criador
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id: solicitacaoId },
      relations: ['beneficiario', 'tipo_beneficio'],
    });

    if (!solicitacao) {
      throw new NotFoundException(
        `Solicitação com ID ${solicitacaoId} não encontrada`,
      );
    }

    // Se passar na validação, realizar a transição
    const resultado = await this.realizarTransicao(
      solicitacaoId,
      StatusSolicitacao.CANCELADA,
      usuarioId,
      motivo || 'Solicitação cancelada',
    );

    // Enviar notificação para o criador da solicitação
    if (resultado.sucesso && solicitacao.tecnico_id) {
      try {
        // Buscar o template de cancelamento usando o serviço de mapeamento
        const templateData =
          await this.templateMappingService.prepararDadosTemplate(
            'CANCELAMENTO',
          );

        await this.notificacaoService.criarEBroadcast({
          destinatario_id: solicitacao.tecnico_id,
          titulo: 'Solicitação Cancelada',
          conteudo: `Sua solicitação de ${solicitacao.tipo_beneficio.nome || 'benefício'} foi cancelada. ${motivo ? `Motivo: ${motivo}` : ''}`,
          tipo: 'CANCELAMENTO',
          prioridade: 'medium',
          template_id: templateData.template_id,
          dados: {
            solicitacao_id: solicitacao.id,
            tipo_beneficio: solicitacao.tipo_beneficio?.nome || 'Benefício',
            beneficiario_nome: solicitacao.beneficiario?.nome || 'Beneficiário',
            status_anterior: resultado.status_anterior,
            status_novo: resultado.status_atual,
            motivo: motivo || 'Não informado',
            data_cancelamento: new Date().toLocaleDateString('pt-BR'),
            url_sistema:
              process.env.FRONTEND_URL || 'https://pgben-front.kemosoft.com.br',
          },
        });

        if (templateData.templateEncontrado) {
          this.logger.log(
            `Notificação de cancelamento enviada com template ${templateData.codigoTemplate} para usuário ${solicitacao.tecnico_id}`,
          );
        } else {
          this.logger.warn(
            `Template para CANCELAMENTO não encontrado. Notificação enviada sem template.`,
          );
        }
      } catch (notificationError) {
        this.logger.error(
          `Erro ao enviar notificação de cancelamento da solicitação ${solicitacaoId}: ${notificationError.message}`,
          notificationError.stack,
        );
      }

      // Emitir notificação SSE específica para cancelamento
      try {
        this.eventEmitter.emit('sse.notificacao', {
          userId: solicitacao.tecnico_id,
          tipo: 'solicitacao_cancelada',
          dados: {
            solicitacaoId: solicitacao.id,
            protocolo: solicitacao.protocolo,
            tipoBeneficio: solicitacao.tipo_beneficio?.nome || 'Benefício',
            beneficiarioNome: solicitacao.beneficiario?.nome || 'Beneficiário',
            motivo: motivo,
            prioridade: 'medium',
            dataCancelamento: new Date(),
          },
        });
      } catch (sseError) {
        this.logger.error(
          `Erro ao emitir notificação SSE para cancelamento ${solicitacaoId}: ${sseError.message}`,
          sseError.stack,
        );
      }
    }

    return resultado;
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
    dadosAdicionais?: {
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
      let observacaoCompleta = dadosAdicionais?.observacao || '';

      if (dadosAdicionais?.justificativa) {
        observacaoCompleta += `\nJustificativa: ${dadosAdicionais.justificativa}`;
      }

      if (dadosAdicionais?.processo_judicial_id) {
        observacaoCompleta += `\nProcesso Judicial ID: ${dadosAdicionais.processo_judicial_id}`;
      }

      if (dadosAdicionais?.determinacao_judicial_id) {
        observacaoCompleta += `\nDeterminação Judicial ID: ${dadosAdicionais.determinacao_judicial_id}`;
      }

      // Salvar o estado anterior para o retorno
      const statusAnterior = solicitacao.status;

      // Preparar dados adicionais para atualização
      const updateData: any = {
        status: novoStatus,
        updated_at: new Date(),
      };

      // Adicionar dados adicionais, se existirem
      if (dadosAdicionais?.processo_judicial_id) {
        updateData.processo_judicial_id = dadosAdicionais.processo_judicial_id;
        updateData.determinacao_judicial_flag = true;
      }

      if (dadosAdicionais?.determinacao_judicial_id) {
        updateData.determinacao_judicial_id =
          dadosAdicionais.determinacao_judicial_id;
        updateData.determinacao_judicial_flag = true;
      }

      // Atualizar a solicitação usando o queryRunner
      await queryRunner.manager.update(
        Solicitacao,
        { id: solicitacaoId },
        updateData,
      );

      // Registrar a transição no histórico
      const historico = new HistoricoSolicitacao();
      historico.solicitacao_id = solicitacaoId;
      historico.status_anterior = statusAnterior;
      historico.status_atual = novoStatus;
      historico.usuario_id = usuarioId;
      historico.observacao =
        observacaoCompleta ||
        `Status atualizado de ${statusAnterior} para ${novoStatus}`;
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
      if (
        error.name === 'QueryFailedError' &&
        (error.message.includes('version') ||
          error.message.includes('version mismatch'))
      ) {
        throw new BadRequestException(
          'A solicitação foi modificada por outro usuário enquanto você a editava. ' +
            'Por favor, atualize a página e tente novamente.',
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
