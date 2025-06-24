import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Pagamento } from '../../../entities/pagamento.entity';
import { Concessao } from '../../../entities/concessao.entity';
import { MetodoPagamentoEnum } from '../../../enums/metodo-pagamento.enum';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { PagamentoCreateDto } from '../dtos/pagamento-create.dto';
import { PagamentoPendenteCreateDto } from '../dtos/pagamento-pendente-create.dto';
import { PagamentoUpdateStatusDto } from '../dtos/pagamento-update-status.dto';
import { StatusTransitionValidator } from '../validators/status-transition-validator';
import { CreateLogAuditoriaDto } from '../../auditoria/dto/create-log-auditoria.dto';
import { normalizeEnumFields } from '../../../shared/utils/enum-normalizer.util';
import { SolicitacaoService } from '../../solicitacao/services/solicitacao.service';
import { WorkflowSolicitacaoService } from '@/modules/solicitacao/services/workflow-solicitacao.service';
import { AuditoriaService } from '../../auditoria/services/auditoria.service';
import { AuditoriaPagamentoService } from './auditoria-pagamento.service';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';
import { StatusSolicitacao } from '@/enums';
import { NotificacaoService } from '../../notificacao/services/notificacao.service';
import { LoggingService } from '../../../shared/logging/logging.service';

/**
 * Serviço para gerenciamento de operações relacionadas a pagamentos
 *
 * Implementa a lógica de negócio para criação, consulta, atualização
 * e gerenciamento de ciclo de vida dos pagamentos no sistema.
 *
 * @author Equipe PGBen
 */
@Injectable()
export class PagamentoService {
  constructor(
    @InjectRepository(Pagamento)
    private readonly pagamentoRepository: Repository<Pagamento>,
    private readonly statusValidator: StatusTransitionValidator,
    @Inject(forwardRef(() => WorkflowSolicitacaoService))
    private readonly workflowSolicitacaoService: WorkflowSolicitacaoService,
    private readonly solicitacaoService: SolicitacaoService,
    private readonly auditoriaService: AuditoriaService,
    private readonly auditoriaPagamentoService: AuditoriaPagamentoService,
    private readonly notificacaoService: NotificacaoService,
    private readonly logger: LoggingService,
    private readonly eventEmitter: EventEmitter2,
  ) { }

    /**
   * Gera todos os pagamentos para uma concessão aprovada.
   * Cria todos os pagamentos com status PENDENTE baseado na quantidade de parcelas da solicitação.
   *
   * @param concessao Concessão ativa
   * @param solicitacao Solicitação relacionada (para obter tipoBeneficio/valor)
   */
  async gerarPagamentosParaConcessao(
    concessao: Concessao, 
    solicitacao: any
  ): Promise<Pagamento[]> {
    // Determina a quantidade de parcelas baseada na solicitação
    const quantidadeParcelas = solicitacao.quantidade_parcelas || 1;
      // Validar número de parcelas
    if (quantidadeParcelas <= 0) {
      throw new BadRequestException('Quantidade de parcelas deve ser maior que zero');
    }
    
    // Garantir valor do benefício
    const valorParcela = solicitacao?.tipo_beneficio?.valor;
    if (!valorParcela || valorParcela <= 0) {
      this.logger.warn(
        `Valor de benefício não definido para solicitação ${solicitacao?.id}. Pagamento não gerado.`,
        PagamentoService.name,
        { solicitacaoId: solicitacao?.id }
      );
      return [];
    }

    // Gerar pagamentos conforme quantidade de parcelas
    const pagamentos: Pagamento[] = [];
    const periodicidade = solicitacao?.tipo_beneficio?.periodicidade || 'mensal';
    const dataInicio = new Date(concessao.dataInicio);
    let numeroParcela = 1;
    
    for (let i = 0; i < quantidadeParcelas; i++) {
      let dataPrevistaLiberacao: Date;
      
      // Calcula a data prevista com base na periodicidade e número da parcela
      if (i === 0) {
        // Regras específicas para Aluguel Social na primeira parcela
        if (solicitacao?.tipo_beneficio?.codigo?.includes('aluguel-social')) {
          dataPrevistaLiberacao = this.calcularDataLiberacaoAluguelSocial(concessao.dataInicio);
        } else {
          // Primeira parcela na data de início da concessão para outros benefícios
          dataPrevistaLiberacao = dataInicio;
        }
      } else {
        // Parcelas subsequentes baseadas na periodicidade
        dataPrevistaLiberacao = this.calcularDataProximaParcela(
          dataInicio, 
          periodicidade, 
          i
        );
      }
      
      const pagamento = this.pagamentoRepository.create({
        solicitacaoId: solicitacao.id,
        concessaoId: concessao.id,
        valor: valorParcela,
        metodoPagamento: MetodoPagamentoEnum.PIX, // default
        status: StatusPagamentoEnum.PENDENTE,
        dataPrevistaLiberacao,
        numeroParcela: numeroParcela++,
        totalParcelas: quantidadeParcelas,
        liberadoPor: undefined,
        ...(solicitacao.tecnico_id ? { criadoPor: solicitacao.tecnico_id } : {}),
      });
      
      pagamentos.push(pagamento);
    }
    
    const savedPagamentos = await this.pagamentoRepository.save(pagamentos);
    
    // Registrar histórico específico para renovações por determinação judicial
    if (concessao.determinacaoJudicialFlag && quantidadeParcelas === 1) {
      // Importar HistoricoConcessao dinamicamente para evitar dependência circular
      const { HistoricoConcessao } = await import('../../../entities/historico-concessao.entity');
      const historicoRepo = this.pagamentoRepository.manager.getRepository(HistoricoConcessao);
      
      const historico = historicoRepo.create({
        concessaoId: concessao.id,
        statusAnterior: concessao.status,
        statusNovo: concessao.status,
        motivo: 'Renovação automática de pagamento por determinação judicial',
        alteradoPor: 'sistema'
      });
      
      await historicoRepo.save(historico);
      this.logger.debug(`Histórico de renovação por determinação judicial registrado para concessao ${concessao.id}`, PagamentoService.name);
    }
    
    this.logger.info(`Gerados ${pagamentos.length} pagamentos para concessão ${concessao.id}`,
      PagamentoService.name,
      { quantidadeParcelas, concessaoId: concessao.id }
    );
    return savedPagamentos;
    }

  /**
   * Cria um novo registro de pagamento pendente
   *
   * @param createDto Dados para criação do pagamento pendente
   * @param usuarioId ID do usuário que está realizando a operação
   * @returns Pagamento criado com status pendente
   */
  async createPagamentoPendente(
    createDto: PagamentoPendenteCreateDto,
    usuarioId: string,
  ): Promise<Pagamento> {
    // Validar se a solicitação existe
    const solicitacao = await this.solicitacaoService.findById(createDto.solicitacaoId);
    if (!solicitacao) {
      throw new NotFoundException('Solicitação não encontrada');
    }

    // Verificar se já existe um pagamento para esta solicitação
    const pagamentoExistente = await this.pagamentoRepository.findOneBy({
      solicitacaoId: createDto.solicitacaoId,
    });
    if (pagamentoExistente) {
      throw new ConflictException(
        'Já existe um pagamento para esta solicitação'
      );
    }

    // Validar limites de valor
    await this.validarLimitesPagamento(createDto.valor, solicitacao.tipo_beneficio);

    // Normalizar campos de enum antes de criar a entidade
    const dadosNormalizados = normalizeEnumFields({
      solicitacaoId: createDto.solicitacaoId,
      infoBancariaId: createDto.infoBancariaId,
      valor: createDto.valor,
      dataPrevistaLiberacao: createDto.dataPrevistaLiberacao,
      status: StatusPagamentoEnum.PENDENTE, // Status inicial pendente
      metodoPagamento: createDto.metodoPagamento,
      criadoPor: usuarioId,
      observacoes: createDto.observacoes,
    });

    // Criar nova entidade de pagamento
    const pagamento = this.pagamentoRepository.create(dadosNormalizados);

    // Salvar o pagamento
    const result = await this.pagamentoRepository.save(pagamento);

    // Registrar auditoria
    const logDto = new CreateLogAuditoriaDto();
    logDto.tipo_operacao = TipoOperacao.CREATE;
    logDto.entidade_afetada = 'Pagamento';
    logDto.entidade_id = result.id;
    logDto.usuario_id = usuarioId;
    logDto.dados_novos = result;
    logDto.ip_origem = '127.0.0.1'; // TODO: Obter IP real da requisição
    logDto.user_agent = 'Sistema Interno'; // TODO: Obter user agent real
    logDto.endpoint = '/pagamentos';
    logDto.metodo_http = 'POST';
    await this.auditoriaService.create(logDto);

    // Emitir notificação SSE para criação de pagamento pendente
    if (solicitacao.tecnico_id) {
      try {
        this.eventEmitter.emit('sse.notificacao', {
          userId: solicitacao.tecnico_id,
          tipo: 'pagamento_pendente_criado',
          dados: {
            pagamentoId: result.id,
            solicitacaoId: result.solicitacaoId,
            protocolo: solicitacao.protocolo,
            valor: result.valor,
            metodoPagamento: result.metodoPagamento,
            dataPrevistaLiberacao: result.dataPrevistaLiberacao,
            status: StatusPagamentoEnum.PENDENTE,
            prioridade: 'medium',
            dataCriacao: new Date(),
          },
        });
      } catch (sseError) {
        this.logger.error(
          `Erro ao enviar notificação para pagamento ${result.id}`,
          sseError,
          PagamentoService.name,
          { pagamentoId: result.id }
        );
      }
    }

    return result;
  }

  /**
   * Cria um novo registro de pagamento para uma solicitação aprovada
   *
   * @param solicitacaoId ID da solicitação aprovada
   * @param createDto Dados para criação do pagamento
   * @param usuarioId ID do usuário que está realizando a operação
   * @returns Pagamento criado
   */
  async createPagamento(
    solicitacaoId: string,
    createDto: PagamentoCreateDto,
    usuarioId: string,
  ): Promise<Pagamento> {
    // Validar se a solicitação existe e está aprovada
    const solicitacao = await this.solicitacaoService.findById(solicitacaoId);
    if (!solicitacao) {
      throw new NotFoundException('Solicitação não encontrada');
    }

    // Verificar se a solicitação não está cancelada ou indeferida
    if (solicitacao.status === StatusSolicitacao.CANCELADA) {
      throw new ConflictException(
        'Não é possível criar pagamentos para solicitações canceladas'
      );
    }

    if (solicitacao.status === StatusSolicitacao.INDEFERIDA) {
      throw new ConflictException(
        'Não é possível criar pagamentos para solicitações indeferidas'
      );
    }

    // Verificar se a solicitação está em status válido para pagamento
    if (solicitacao.status !== StatusSolicitacao.APROVADA) {
      throw new ConflictException(
        'Só é possível criar pagamentos para solicitações aprovadas'
      );
    }

    // Verificar se já existe um pagamento para esta solicitação
    const pagamentoExistente = await this.pagamentoRepository.findOneBy({
      solicitacaoId,
    });
    if (pagamentoExistente) {
      throw new ConflictException(
        'Já existe um pagamento para esta solicitação'
      );
    }

    // Validar limites de valor
    await this.validarLimitesPagamento(createDto.valor, solicitacao.tipo_beneficio);

    // Normalizar campos de enum antes de criar a entidade
    const dadosNormalizados = normalizeEnumFields({
      solicitacaoId,
      infoBancariaId: createDto.infoBancariaId,
      valor: createDto.valor,
      dataLiberacao: createDto.dataLiberacao,
      status: StatusPagamentoEnum.LIBERADO, // Status inicial ao criar o pagamento
      metodoPagamento: createDto.metodoPagamento,
      liberadoPor: usuarioId,
      observacoes: createDto.observacoes,
    });

    // Criar nova entidade de pagamento
    const pagamento = this.pagamentoRepository.create(dadosNormalizados);

    // Salvar o pagamento
    const result = await this.pagamentoRepository.save(pagamento);

    // Emitir notificação SSE para criação de pagamento
    if (solicitacao.tecnico_id) {
      try {
        this.eventEmitter.emit('sse.notificacao', {
          userId: solicitacao.tecnico_id,
          tipo: 'pagamento_criado',
          dados: {
            pagamentoId: result.id,
            solicitacaoId: result.solicitacaoId,
            protocolo: solicitacao.protocolo,
            valor: result.valor,
            metodoPagamento: result.metodoPagamento,
            dataLiberacao: result.dataLiberacao,
            status: StatusPagamentoEnum.LIBERADO,
            prioridade: 'high',
            dataCriacao: new Date(),
          },
        });
      } catch (sseError) {
        this.logger.error(
          `Erro ao enviar notificação para pagamento ${result.id}`,
          sseError,
          PagamentoService.name,
          { pagamentoId: result.id }
        );
      }
    }

    return result;
  }

  /**
   * Atualiza o status da solicitação relacionada ao pagamento
   *
   * @param solicitacaoId ID da solicitação
   * @param statusPagamento Status do pagamento
   * @param usuarioId ID do usuário que está realizando a operação
   */
  async atualizarStatus(
    solicitacaoId: string,
    statusPagamento: StatusPagamentoEnum,
    usuarioId: string,
  ): Promise<void> {
    try {
      let statusSolicitacao: StatusSolicitacao;
      let observacao: string;

      // Mapear status do pagamento para status da solicitação
      switch (statusPagamento) {
        case StatusPagamentoEnum.PENDENTE:
          statusSolicitacao = StatusSolicitacao.APROVADA;
          observacao = 'Pagamento criado e pendente de liberação';
          break;
        case StatusPagamentoEnum.LIBERADO:
          // No novo ciclo de vida, APROVADA é o status final
          // Pagamento liberado não altera mais o status da solicitação
          statusSolicitacao = StatusSolicitacao.APROVADA;
          observacao = 'Pagamento liberado para confirmação';
          break;
        case StatusPagamentoEnum.CONFIRMADO:
          // No novo ciclo de vida, APROVADA é o status final
          // Pagamento confirmado não altera mais o status da solicitação
          statusSolicitacao = StatusSolicitacao.APROVADA;
          observacao = 'Pagamento confirmado e concluído';
          break;
        case StatusPagamentoEnum.CANCELADO:
          statusSolicitacao = StatusSolicitacao.CANCELADA;
          observacao = 'Pagamento cancelado';
          break;
        default:
          statusSolicitacao = StatusSolicitacao.APROVADA;
          observacao = `Status do pagamento atualizado para ${statusPagamento}`;
      }

      await this.workflowSolicitacaoService.atualizarStatus(
        solicitacaoId,
        statusSolicitacao,
        observacao
      );

      this.logger.info(
        `Status da solicitação ${solicitacaoId} atualizado para ${statusSolicitacao} devido ao pagamento ${statusPagamento}`,
        PagamentoService.name,
        { solicitacaoId, statusSolicitacao, statusPagamento }
      );
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar status da solicitação ${solicitacaoId} para ${statusPagamento}`,
        error,
        PagamentoService.name,
        { solicitacaoId, statusPagamento }
      );
      throw error;
    }
  }

  /**
   * Atualiza o status de um pagamento com validações específicas
   *
   * @param id ID do pagamento
   * @param updateDto Dados para atualização do status
   * @param usuarioId ID do usuário que está realizando a operação
   * @returns Pagamento atualizado
   */
  async updateStatus(
    id: string,
    updateDto: PagamentoUpdateStatusDto,
    usuarioId: string,
  ): Promise<Pagamento> {
    // Buscar o pagamento existente
    const pagamento = await this.pagamentoRepository.findOne({
      where: { id },
      relations: ['solicitacao', 'solicitacao.cidadao'],
    });
    if (!pagamento) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    // Validar a transição de status
    if (!this.statusValidator.canTransition(pagamento.status, updateDto.status)) {
      throw new ConflictException(
        `Transição de status inválida: ${pagamento.status} -> ${updateDto.status}`
      );
    }

    // Validações específicas por status
    if (updateDto.status === StatusPagamentoEnum.CONFIRMADO && !updateDto.comprovanteId) {
      throw new BadRequestException(
        'Comprovante é obrigatório para concluir um pagamento'
      );
    }

    if (updateDto.status === StatusPagamentoEnum.AGENDADO && !updateDto.dataAgendamento) {
      throw new BadRequestException(
        'Data de agendamento é obrigatória para agendar um pagamento'
      );
    }

    // Armazenar dados anteriores para auditoria
    const dadosAnteriores = { ...pagamento };
    const statusAnterior = pagamento.status;

    // Atualizar o status
    pagamento.status = updateDto.status;
    pagamento.updated_at = new Date();

    // Atualizações específicas por status
    if (updateDto.status === StatusPagamentoEnum.AGENDADO && updateDto.dataAgendamento) {
      pagamento.dataAgendamento = new Date(updateDto.dataAgendamento);
    }

    if (updateDto.status === StatusPagamentoEnum.LIBERADO) {
      pagamento.dataLiberacao = new Date();
      pagamento.liberadoPor = usuarioId;
    }

    if (updateDto.status === StatusPagamentoEnum.PAGO) {
      pagamento.dataPagamento = new Date();
    }

    if (updateDto.status === StatusPagamentoEnum.CONFIRMADO) {
      pagamento.dataConclusao = new Date();
      if (updateDto.comprovanteId) {
        pagamento.comprovanteId = updateDto.comprovanteId;
      }
    }

    // Adicionar observações se fornecidas
    if (updateDto.observacoes) {
      pagamento.observacoes = pagamento.observacoes
        ? `${pagamento.observacoes}\n${updateDto.observacoes}`
        : updateDto.observacoes;
    }

    // Salvar a atualização
    const result = await this.pagamentoRepository.save(pagamento);

    // Enviar notificação para o criador da solicitação
    try {
      const mensagemNotificacao = this.gerarMensagemNotificacaoPagamento(
        updateDto.status,
        pagamento.solicitacao?.tipo_beneficio.nome || 'benefício',
        updateDto.observacoes
      );

      await this.notificacaoService.criarEBroadcast({
        destinatario_id: pagamento.solicitacao?.tecnico_id || '',
        titulo: `Pagamento ${this.getStatusDisplayName(updateDto.status)}`,
        conteudo: mensagemNotificacao,
        tipo: 'PAGAMENTO',
        prioridade: 'high',
        dados: {
          pagamentoId: pagamento.id,
          solicitacaoId: pagamento.solicitacaoId,
          statusAnterior: statusAnterior,
          statusNovo: updateDto.status,
          valor: pagamento.valor,
        },
      });

      // Emitir evento SSE para notificação em tempo real
      this.eventEmitter.emit('sse.notificacao', {
        userId: pagamento.solicitacao?.tecnico_id || '',
        tipo: 'PAGAMENTO_STATUS_ATUALIZADO',
        dados: {
          pagamentoId: pagamento.id,
          solicitacaoId: pagamento.solicitacaoId,
          protocolo: pagamento.solicitacao?.protocolo,
          valor: pagamento.valor,
          metodoPagamento: pagamento.metodoPagamento,
          statusAnterior: statusAnterior,
          novoStatus: updateDto.status,
          dataAtualizacao: new Date().toISOString(),
          dataLiberacao: pagamento.dataLiberacao?.toISOString(),
          dataPagamento: pagamento.dataPagamento?.toISOString(),
          dataConfirmacao: pagamento.dataConclusao?.toISOString(),
          prioridade: 'high'
        }
      });
    } catch (notificationError) {
      this.logger.error(
        `Erro ao enviar notificação para pagamento ${id}`,
        notificationError,
        PagamentoService.name,
        { pagamentoId: id }
      );
    }

    // Registrar auditoria
    const logDto = new CreateLogAuditoriaDto();
    logDto.tipo_operacao = TipoOperacao.UPDATE;
    logDto.entidade_afetada = 'Pagamento';
    logDto.entidade_id = result.id;
    logDto.usuario_id = usuarioId;
    logDto.dados_anteriores = dadosAnteriores;
    logDto.dados_novos = result;
    logDto.ip_origem = '127.0.0.1'; // TODO: Obter IP real da requisição
    logDto.user_agent = 'Sistema Interno'; // TODO: Obter user agent real
    logDto.endpoint = '/pagamentos';
    logDto.metodo_http = 'PATCH';
    await this.auditoriaService.create(logDto);

    return result;
  }

  /**
   * Cancela um pagamento existente
   *
   * @param id ID do pagamento
   * @param motivoCancelamento Motivo do cancelamento
   * @param usuarioId ID do usuário que está realizando a operação
   * @returns Pagamento cancelado
   */
  async cancelarPagamento(
    id: string,
    motivoCancelamento: string,
    usuarioId: string,
  ): Promise<Pagamento> {
    // Buscar o pagamento existente
    const pagamento = await this.pagamentoRepository.findOne({
      where: { id },
      relations: ['solicitacao', 'solicitacao.cidadao'],
    });
    if (!pagamento) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    // Verificar se o pagamento pode ser cancelado
    if (pagamento.status === StatusPagamentoEnum.CANCELADO) {
      throw new ConflictException('Pagamento já está cancelado');
    }

    if (pagamento.status === StatusPagamentoEnum.CONFIRMADO) {
      throw new ConflictException('Não é possível cancelar um pagamento já confirmado');
    }

    // Armazenar dados anteriores para auditoria
    const dadosAnteriores = { ...pagamento };
    const statusAnterior = pagamento.status;

    // Atualizar o status para cancelado
    pagamento.status = StatusPagamentoEnum.CANCELADO;
    pagamento.updated_at = new Date();

    // Adicionar motivo do cancelamento às observações
    pagamento.observacoes = pagamento.observacoes
      ? `${pagamento.observacoes}\nMotivo do cancelamento: ${motivoCancelamento}`
      : `Motivo do cancelamento: ${motivoCancelamento}`;

    // Salvar a atualização
    const result = await this.pagamentoRepository.save(pagamento);

    // Enviar notificação para o criador da solicitação
    try {
      await this.notificacaoService.criarEBroadcast({
        destinatario_id: pagamento.solicitacao?.tecnico_id || '',
        titulo: 'Pagamento Cancelado',
        conteudo: `O pagamento do seu benefício de ${pagamento.solicitacao?.tipo_beneficio.nome || 'benefício'} foi cancelado. Motivo: ${motivoCancelamento}`,
        tipo: 'CANCELAMENTO',
        prioridade: 'high',
        dados: {
          pagamentoId: pagamento.id,
          solicitacaoId: pagamento.solicitacaoId,
          statusAnterior: statusAnterior,
          statusNovo: StatusPagamentoEnum.CANCELADO,
          motivo: motivoCancelamento,
          valor: pagamento.valor,
        },
      });

      // Emitir evento SSE para notificação em tempo real
      this.eventEmitter.emit('sse.notificacao', {
        usuarioId: pagamento.solicitacao?.tecnico_id || '',
        tipo: 'PAGAMENTO_CANCELADO',
        dados: {
          pagamentoId: pagamento.id,
          solicitacaoId: pagamento.solicitacaoId,
          protocolo: pagamento.solicitacao?.protocolo,
          valor: pagamento.valor,
          metodoPagamento: pagamento.metodoPagamento,
          statusAnterior: statusAnterior,
          novoStatus: StatusPagamentoEnum.CANCELADO,
          motivoCancelamento: motivoCancelamento,
          dataCancelamento: new Date().toISOString(),
          prioridade: 'high'
        }
      });
    } catch (notificationError) {
      this.logger.error(
        `Erro ao enviar notificação para pagamento ${id}`,
        notificationError,
        PagamentoService.name,
        { pagamentoId: id }
      );
    }

    // A auditoria será registrada automaticamente pelo AuditoriaInterceptor

    return result;
  }

  /**
   * Busca um pagamento pelo ID
   *
   * @param id ID do pagamento
   * @returns Pagamento encontrado ou null
   */
  async findOne(id: string): Promise<Pagamento | null> {
    return this.pagamentoRepository.findOneBy({ id });
  }

  /**
   * Busca um pagamento pelo ID com todos os relacionamentos
   *
   * @param id ID do pagamento
   * @returns Pagamento encontrado com relacionamentos ou null
   */
  async findOneWithRelations(id: string): Promise<Pagamento | null> {
    return this.pagamentoRepository.findOne({
      where: { id },
      relations: ['comprovantes', 'confirmacoes'],
    });
  }

  /**
   * Lista pagamentos com filtros e paginação
   *
   * @param filters Filtros de busca
   * @param page Página atual
   * @param limit Limite de itens por página
   * @returns Lista paginada de pagamentos
   */
  async findAll(
    filters: any = {},
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: Pagamento[];
    total: number;
    page: number;
    limit: number;
  }> {
    const queryBuilder = this.pagamentoRepository.createQueryBuilder('pagamento');

    // Aplicar filtros
    if (filters.status) {
      queryBuilder.andWhere('pagamento.status = :status', {
        status: filters.status,
      });
    }

    if (filters.solicitacaoId) {
      queryBuilder.andWhere('pagamento.solicitacaoId = :solicitacaoId', {
        solicitacaoId: filters.solicitacaoId,
      });
    }

    if (filters.concessaoId) {
      queryBuilder.andWhere('pagamento.concessaoId = :concessaoId', {
        concessaoId: filters.concessaoId,
      });
    }

    if (filters.dataInicio && filters.dataFim) {
      queryBuilder.andWhere(
        'pagamento.dataLiberacao BETWEEN :dataInicio AND :dataFim',
        {
          dataInicio: filters.dataInicio,
          dataFim: filters.dataFim,
        }
      );
    }

    // Aplicar paginação
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    // Ordenar por data de criação (mais recentes primeiro)
     queryBuilder.orderBy('pagamento.created_at', 'DESC');

    // Executar consulta
    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Busca pagamentos por solicitação
   *
   * @param solicitacaoId ID da solicitação
   * @returns Lista de pagamentos da solicitação
   */
  async findBySolicitacao(solicitacaoId: string): Promise<Pagamento[]> {
    return this.pagamentoRepository.find({
       where: { solicitacaoId },
       order: { created_at: 'DESC' },
     });
  }

  /**
   * Busca pagamentos por status
   *
   * @param status Status dos pagamentos
   * @param page Página atual
   * @param limit Limite de itens por página
   * @returns Lista paginada de pagamentos com o status especificado
   */
  async findByStatus(
    status: StatusPagamentoEnum,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: Pagamento[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [data, total] = await this.pagamentoRepository.findAndCount({
       where: { status },
       order: { created_at: 'DESC' },
       skip: (page - 1) * limit,
       take: limit,
     });

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Valida se o valor está dentro dos limites permitidos para o tipo de benefício
   *
   * @param valor Valor a ser validado
   * @param tipoBeneficio Tipo de benefício
   * @throws BadRequestException se o valor exceder os limites permitidos
   */
  private async validarLimitesPagamento(
    valor: number,
    tipoBeneficio: any,
  ): Promise<void> {
    // Validação básica de valor
    if (valor <= 0) {
      throw new BadRequestException('Valor do pagamento deve ser positivo');
    }

    // Validar limites baseados no tipo de benefício
    if (tipoBeneficio?.valorMaximo && valor > tipoBeneficio.valorMaximo) {
      throw new BadRequestException(
        `Valor de R$ ${valor.toFixed(2)} excede o limite máximo de R$ ${tipoBeneficio.valorMaximo.toFixed(2)} para o benefício ${tipoBeneficio.nome}`
      );
    }

    if (tipoBeneficio?.valorMinimo && valor < tipoBeneficio.valorMinimo) {
      throw new BadRequestException(
        `Valor de R$ ${valor.toFixed(2)} é inferior ao limite mínimo de R$ ${tipoBeneficio.valorMinimo.toFixed(2)} para o benefício ${tipoBeneficio.nome}`
      );
    }
  }

  /**
   * Gera mensagem de notificação baseada no status do pagamento
   */
  private gerarMensagemNotificacaoPagamento(
    status: StatusPagamentoEnum,
    tipoBeneficio: string,
    observacoes?: string
  ): string {
    const observacoesTexto = observacoes ? ` Observações: ${observacoes}` : '';
    
    switch (status) {
      case StatusPagamentoEnum.AGENDADO:
        return `O pagamento do seu benefício de ${tipoBeneficio} foi agendado.${observacoesTexto}`;
      case StatusPagamentoEnum.LIBERADO:
        return `O pagamento do seu benefício de ${tipoBeneficio} foi liberado e está disponível para saque.${observacoesTexto}`;
      case StatusPagamentoEnum.PAGO:
        return `O pagamento do seu benefício de ${tipoBeneficio} foi efetuado.${observacoesTexto}`;
      case StatusPagamentoEnum.CONFIRMADO:
        return `O pagamento do seu benefício de ${tipoBeneficio} foi confirmado e concluído.${observacoesTexto}`;
      default:
        return `O status do pagamento do seu benefício de ${tipoBeneficio} foi atualizado.${observacoesTexto}`;
    }
  }



  /**
   * Calcula a data da próxima parcela baseada na periodicidade do benefício
   * 
   * Este método implementa o cálculo de datas para parcelas subsequentes considerando:
   * - Diferentes periodicidades (mensal, bimestral, trimestral, semestral, anual, único)
   * - Tratamento especial para fins de mês (ex: 31/01 -> 28/02 em anos não bissextos)
   * - Validação de parâmetros de entrada
   * - Logs para auditoria e debugging
   * 
   * @param dataInicio Data de início da concessão (deve ser uma data válida)
   * @param periodicidade Periodicidade do benefício conforme PeriodicidadeEnum
   * @param numeroParcela Índice da parcela (começando em 0 para primeira parcela)
   * @returns Data calculada para a próxima parcela
   * @throws Error se os parâmetros forem inválidos
   */
  /**
   * Retorna o nome de exibição do status
   */
  private getStatusDisplayName(status: StatusPagamentoEnum): string {
    switch (status) {
      case StatusPagamentoEnum.AGENDADO:
        return 'Agendado';
      case StatusPagamentoEnum.LIBERADO:
        return 'Liberado';
      case StatusPagamentoEnum.PAGO:
        return 'Efetuado';
      case StatusPagamentoEnum.CONFIRMADO:
        return 'Confirmado';
      case StatusPagamentoEnum.CANCELADO:
        return 'Cancelado';
      default:
        return 'Atualizado';
    }
  }

  /**
   * Determina a prioridade da notificação baseada no status
   */
  private getPrioridadeNotificacao(status: StatusPagamentoEnum): 'BAIXA' | 'MEDIA' | 'ALTA' {
    switch (status) {
      case StatusPagamentoEnum.LIBERADO:
      case StatusPagamentoEnum.CONFIRMADO:
        return 'ALTA';
      case StatusPagamentoEnum.PAGO:
      case StatusPagamentoEnum.CANCELADO:
        return 'MEDIA';
      default:
        return 'BAIXA';
    }
  }

  /**
   * Calcula a data da próxima parcela baseada na periodicidade do benefício
   *
   * Este método implementa o cálculo de datas para parcelas subsequentes considerando:
   * - Diferentes periodicidades (mensal, bimestral, trimestral, semestral, anual, único)
   * - Tratamento especial para fins de mês (ex: 31/01 -> 28/02 em anos não bissextos)
   * - Validação de parâmetros de entrada
   * - Logs para auditoria e debugging
   *
   * @param dataInicio Data de início da concessão (deve ser uma data válida)
   * @param periodicidade Periodicidade do benefício conforme PeriodicidadeEnum
   * @param numeroParcela Índice da parcela (começando em 0 para primeira parcela)
   * @returns Data calculada para a próxima parcela
   * @throws Error se os parâmetros forem inválidos
   */
  private calcularDataProximaParcela(
    dataInicio: Date,
    periodicidade: string,
    numeroParcela: number
  ): Date {
    // Validação de parâmetros de entrada
    if (!dataInicio || !(dataInicio instanceof Date) || isNaN(dataInicio.getTime())) {
      this.logger.error('Data de início inválida fornecida para cálculo de parcela', 
        new Error('Data de início inválida'),
        PagamentoService.name,
        {
          dataInicioStr: dataInicio ? dataInicio.toString() : 'undefined',
          periodicidade,
          numeroParcela
        }
      );
      throw new Error('Data de início deve ser uma data válida');
    }

  if (typeof numeroParcela !== 'number' || numeroParcela < 0) {
    this.logger.error('Número da parcela inválido', 
      new Error('Número da parcela inválido'),
      PagamentoService.name,
      {
        dataInicioStr: dataInicio.toISOString(),
        periodicidade,
        numeroParcela
      }
    );
    throw new Error('Número da parcela deve ser um número não negativo');
  }

  if (!periodicidade || typeof periodicidade !== 'string') {
    this.logger.error('Periodicidade inválida fornecida', 
      new Error('Periodicidade inválida'),
      PagamentoService.name,
      {
        dataInicioStr: dataInicio.toISOString(),
        periodicidade: periodicidade || 'undefined',
        numeroParcela
      }
    );
    throw new Error('Periodicidade deve ser uma string válida');
  }

  // Cria uma nova instância da data para evitar mutação do parâmetro original
  const dataCalculada = new Date(dataInicio.getTime());

  // Para benefícios de parcela única, sempre retorna a data de início
  if (periodicidade === 'unico') {
    this.logger.debug('Calculando data para benefício de parcela única', PagamentoService.name, {
      dataInicio: dataInicio.toISOString(),
      dataCalculada: dataCalculada.toISOString(),
    });
    return dataCalculada;
  }

  // Se for a primeira parcela (índice 0), retorna a data de início
  if (numeroParcela === 0) {
    this.logger.debug('Retornando data de início para primeira parcela', PagamentoService.name, {
      dataInicio: dataInicio.toISOString(),
      periodicidade,
      numeroParcela,
    });
    return dataCalculada;
  }

  // Armazena o dia original para tratamento de fins de mês
  const diaOriginal = dataInicio.getDate();

  try {
    switch (periodicidade.toLowerCase()) {
      case 'mensal':
        // Adiciona N meses à data inicial
        dataCalculada.setMonth(dataCalculada.getMonth() + numeroParcela);
        break;

      case 'bimestral':
        // Adiciona N*2 meses à data inicial
        dataCalculada.setMonth(dataCalculada.getMonth() + numeroParcela * 2);
        break;

      case 'trimestral':
        // Adiciona N*3 meses à data inicial
        dataCalculada.setMonth(dataCalculada.getMonth() + numeroParcela * 3);
        break;

      case 'semestral':
        // Adiciona N*6 meses à data inicial
        dataCalculada.setMonth(dataCalculada.getMonth() + numeroParcela * 6);
        break;

      case 'anual':
        // Adiciona N anos à data inicial
        dataCalculada.setFullYear(dataCalculada.getFullYear() + numeroParcela);
        break;

      default:
        this.logger.warn('Periodicidade não reconhecida, usando padrão mensal', 
          PagamentoService.name, 
          {
            periodicidade,
            numeroParcela,
            dataCalculada: dataCalculada.toISOString()
          }
        );
        // Por padrão considera mensal se não reconhecido
        dataCalculada.setMonth(dataCalculada.getMonth() + numeroParcela);
        break;
    }

    // Tratamento especial para fins de mês
    // Se o dia original era maior que o último dia do mês calculado,
    // ajusta para o último dia do mês
    if (diaOriginal > 28 && dataCalculada.getDate() !== diaOriginal) {
      const ultimoDiaDoMes = new Date(dataCalculada.getFullYear(), dataCalculada.getMonth() + 1, 0).getDate();
      const diaAjustado = Math.min(diaOriginal, ultimoDiaDoMes);
      dataCalculada.setDate(diaAjustado);
      
      this.logger.debug('Ajuste realizado para fim de mês', 
        PagamentoService.name,
        {
          diaOriginal,
          diaCalculado: dataCalculada.getDate(),
          diaAjustado,
          ultimoDiaDoMes,
          dataFinal: dataCalculada.toISOString()
        }
      );
    }

    this.logger.debug('Data da próxima parcela calculada com sucesso', 
      PagamentoService.name,
      {
        dataInicioStr: dataInicio.toISOString(),
        periodicidade,
        numeroParcela,
        dataCalculada: dataCalculada.toISOString()
      }
    );

    return dataCalculada;
  } catch (error) {
      this.logger.error('Erro ao calcular data da próxima parcela', 
        error,
        PagamentoService.name,
        {
          dataInicioStr: dataInicio.toISOString(),
          periodicidade,
          numeroParcela
        }
      );
      throw new Error(`Erro no cálculo da data da parcela: ${error.message}`);
    }
  }

  /**
   * Calcula a data de liberação da primeira parcela para Aluguel Social
   * Regras:
   * - Sempre o primeiro dia do mês subsequente à aprovação
   * - Se aprovado após o dia 25, será o primeiro dia do segundo mês subsequente
   */
  private calcularDataLiberacaoAluguelSocial(dataAprovacao: Date): Date {
    const dataLiberacao = new Date(dataAprovacao);
    const diaAprovacao = dataAprovacao.getDate();
    
    if (diaAprovacao > 25) {
      // Se aprovado após o dia 25, pula para o segundo mês subsequente
      dataLiberacao.setMonth(dataLiberacao.getMonth() + 2);
    } else {
      // Caso contrário, vai para o mês subsequente
      dataLiberacao.setMonth(dataLiberacao.getMonth() + 1);
    }
    
    // Define sempre como primeiro dia do mês
    dataLiberacao.setDate(1);
    
    this.logger.debug('Data de liberação calculada para Aluguel Social', 
      PagamentoService.name,
      {
        dataAprovacao: dataAprovacao.toISOString(),
        diaAprovacao,
        dataLiberacao: dataLiberacao.toISOString()
      }
    );
    
    return dataLiberacao;
   }

   /**
    * Processa vencimentos automáticos de pagamentos de Aluguel Social
    * que possuem data de vencimento definida e já venceram
    */
   async processarVencimentoAutomatico(): Promise<Pagamento[]> {
     const agora = new Date();

     // Busca pagamentos pendentes do Aluguel Social com data de vencimento já passada
     const pagamentosVencidos = await this.pagamentoRepository
       .createQueryBuilder('pagamento')
       .innerJoin('pagamento.concessao', 'concessao')
       .innerJoin('concessao.solicitacao', 'solicitacao')
       .innerJoin('solicitacao.tipoBeneficio', 'tipoBeneficio')
       .where('pagamento.status = :status', { status: StatusPagamentoEnum.PENDENTE })
       .andWhere('pagamento.dataVencimento < :agora', { agora })
       .andWhere('tipoBeneficio.codigo = :codigoBeneficio', { codigoBeneficio: 'aluguel-social' })
       .getMany();

     const pagamentosProcessados: Pagamento[] = [];

     for (const pagamento of pagamentosVencidos) {
       try {
         // Marca como vencido
         pagamento.status = StatusPagamentoEnum.VENCIDO;
         
         const pagamentoSalvo = await this.pagamentoRepository.save(pagamento);
         pagamentosProcessados.push(pagamentoSalvo);

         // Registrar auditoria do vencimento automático
         const logDto = new CreateLogAuditoriaDto();
         logDto.tipo_operacao = TipoOperacao.UPDATE;
         logDto.entidade_afetada = 'Pagamento';
         logDto.entidade_id = pagamento.id;
         logDto.usuario_id = 'sistema';
         logDto.descricao = 'Vencimento automático por data de vencimento expirada';
         logDto.dados_anteriores = { status: StatusPagamentoEnum.PENDENTE };
         logDto.dados_novos = { 
           status: StatusPagamentoEnum.VENCIDO,
           dataVencimento: pagamento.dataVencimento
         };
         
         await this.auditoriaService.create(logDto);

         this.logger.info(`Pagamento ${pagamento.id} marcado automaticamente como vencido (data vencimento: ${pagamento.dataVencimento})`, PagamentoService.name);
       } catch (error) {
         this.logger.error(`Erro ao processar vencimento do pagamento ${pagamento.id}:`, error);
       }
     }

     if (pagamentosProcessados.length > 0) {
       this.logger.info(`Processados ${pagamentosProcessados.length} pagamentos vencidos automaticamente`, PagamentoService.name);
     }

     return pagamentosProcessados;
   }

   /**
    * Marca pagamentos como vencidos por falta de documentação (Aluguel Social)
    * Regra: Recibo deve ser entregue até o 10º dia útil do mês vigente
    * 
    * @param pagamentoId ID do pagamento
    * @param motivo Motivo do vencimento
    * @returns Pagamento atualizado
    */
   async marcarComoVencidoPorDocumentacao(pagamentoId: string, motivo: string): Promise<any> {
     const pagamento = await this.pagamentoRepository.findOne({
       where: { id: pagamentoId },
       relations: ['concessao', 'concessao.solicitacao', 'concessao.solicitacao.tipo_beneficio']
     });

     if (!pagamento) {
       throw new NotFoundException('Pagamento não encontrado');
     }

     // Verifica se é Aluguel Social
     const isAluguelSocial = pagamento.concessao?.solicitacao?.tipo_beneficio?.codigo
       ?.toLowerCase().includes('aluguel-social');

     if (!isAluguelSocial) {
       throw new BadRequestException('Esta funcionalidade é específica para Aluguel Social');
     }

     // Só pode marcar como vencido se estiver pendente
     if (pagamento.status !== StatusPagamentoEnum.PENDENTE) {
       throw new BadRequestException('Apenas pagamentos pendentes podem ser marcados como vencidos');
     }

     // Atualiza o status para vencido
     pagamento.status = StatusPagamentoEnum.VENCIDO;
     pagamento.observacoes = motivo;
     pagamento.dataVencimento = new Date();

     const pagamentoSalvo = await this.pagamentoRepository.save(pagamento);

     this.logger.info(`Pagamento ${pagamentoId} marcado como vencido por falta de documentação: ${motivo}`, PagamentoService.name);
     return pagamentoSalvo;
   }

   /**
    * Regulariza um pagamento vencido, retornando-o ao status PENDENTE
    * Permite regularização dentro de 30 dias do vencimento
    */
   async regularizarPagamentoVencido(id: string, observacoes?: string): Promise<Pagamento> {
     const pagamento = await this.pagamentoRepository.findOne({
       where: { id },
       relations: ['concessao', 'concessao.solicitacao', 'concessao.solicitacao.tipo_beneficio']
     });

     if (!pagamento) {
       throw new NotFoundException('Pagamento não encontrado');
     }

     // Verifica se o pagamento está vencido
     if (pagamento.status !== StatusPagamentoEnum.VENCIDO) {
       throw new BadRequestException('Apenas pagamentos vencidos podem ser regularizados');
     }

     // Verifica prazo de regularização (30 dias a partir da data de vencimento)
     if (pagamento.dataVencimento) {
       const dataLimiteRegularizacao = new Date(pagamento.dataVencimento);
       dataLimiteRegularizacao.setDate(dataLimiteRegularizacao.getDate() + 30);
       
       if (new Date() > dataLimiteRegularizacao) {
         throw new BadRequestException('Prazo para regularização expirado (30 dias a partir do vencimento)');
       }
     }

     // Retorna o pagamento ao status pendente e registra a data de regularização
      pagamento.status = StatusPagamentoEnum.PENDENTE;
      pagamento.dataRegularizacao = new Date();
      if (observacoes) {
        pagamento.observacoes = observacoes;
      }
      
      const pagamentoAtualizado = await this.pagamentoRepository.save(pagamento);

      // Registrar auditoria da regularização
      const logDto = new CreateLogAuditoriaDto();
      logDto.tipo_operacao = TipoOperacao.UPDATE;
      logDto.entidade_afetada = 'Pagamento';
      logDto.entidade_id = pagamento.id;
      logDto.usuario_id = 'sistema';
      logDto.descricao = 'Regularização de pagamento vencido';
      logDto.dados_anteriores = { status: StatusPagamentoEnum.VENCIDO };
      logDto.dados_novos = { 
        status: StatusPagamentoEnum.PENDENTE,
        dataRegularizacao: pagamento.dataRegularizacao,
        observacoes: observacoes
      };
      
      await this.auditoriaService.create(logDto);

      return pagamentoAtualizado;
   }
 }
