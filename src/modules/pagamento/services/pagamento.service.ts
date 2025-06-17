import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pagamento } from '../../../entities/pagamento.entity';
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
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';
import { StatusSolicitacao } from '@/enums';
import { NotificacaoService } from '../../notificacao/services/notificacao.service';
import { UnifiedLoggerService } from '../../../shared/logging/unified-logger.service';

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
    private readonly workflowSolicitacaoService: WorkflowSolicitacaoService,
    private readonly solicitacaoService: SolicitacaoService,
    private readonly auditoriaService: AuditoriaService,
    private readonly notificacaoService: NotificacaoService,
    private readonly logger: UnifiedLoggerService,
    private readonly eventEmitter: EventEmitter2,
  ) { }

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
          `Erro ao emitir notificação SSE para criação de pagamento pendente ${result.id}: ${sseError.message}`,
          sseError.stack,
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

    // Verificar se a solicitação não está bloqueada ou suspensa
    if (solicitacao.status === StatusSolicitacao.BLOQUEADO) {
      throw new ConflictException(
        'Não é possível criar pagamentos para solicitações bloqueadas'
      );
    }

    if (solicitacao.status === StatusSolicitacao.SUSPENSO) {
      throw new ConflictException(
        'Não é possível criar pagamentos para solicitações suspensas'
      );
    }

    // Verificar se a solicitação está em status válido para pagamento
    if (solicitacao.status !== StatusSolicitacao.APROVADA && 
        solicitacao.status !== StatusSolicitacao.LIBERADA) {
      throw new ConflictException(
        'Só é possível criar pagamentos para solicitações aprovadas ou liberadas'
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

    await this.atualizarStatus(
      result.solicitacaoId,
      StatusPagamentoEnum.LIBERADO,
      usuarioId
    );

    // A auditoria será registrada automaticamente pelo AuditoriaInterceptor

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
          `Erro ao emitir notificação SSE para criação de pagamento ${result.id}: ${sseError.message}`,
          sseError.stack,
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
          statusSolicitacao = StatusSolicitacao.EM_PROCESSAMENTO;
          observacao = 'Pagamento criado e pendente de liberação';
          break;
        case StatusPagamentoEnum.LIBERADO:
          statusSolicitacao = StatusSolicitacao.LIBERADA;
          observacao = 'Pagamento liberado para confirmação';
          break;
        case StatusPagamentoEnum.CONFIRMADO:
          statusSolicitacao = StatusSolicitacao.CONCLUIDA;
          observacao = 'Pagamento confirmado e concluído';
          break;
        case StatusPagamentoEnum.CANCELADO:
          statusSolicitacao = StatusSolicitacao.CANCELADA;
          observacao = 'Pagamento cancelado';
          break;
        default:
          statusSolicitacao = StatusSolicitacao.EM_PROCESSAMENTO;
          observacao = `Status do pagamento atualizado para ${statusPagamento}`;
      }

      await this.workflowSolicitacaoService.atualizarStatus(
        solicitacaoId,
        statusSolicitacao,
        observacao
      );

      this.logger.log(
        `Status da solicitação ${solicitacaoId} atualizado para ${statusSolicitacao} devido ao pagamento ${statusPagamento}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar status da solicitação ${solicitacaoId} para pagamento ${statusPagamento}`,
        error.stack,
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
        `Erro ao enviar notificação de atualização de pagamento ${id}: ${notificationError.message}`,
        notificationError.stack,
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
        `Erro ao enviar notificação de cancelamento de pagamento ${id}: ${notificationError.message}`,
        notificationError.stack,
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
}
