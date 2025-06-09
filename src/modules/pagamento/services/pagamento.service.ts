import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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

    await this.atualizarStatus(
      result.solicitacaoId,
      StatusPagamentoEnum.LIBERADO,
      usuarioId
    );

    // A auditoria será registrada automaticamente pelo AuditoriaInterceptor

    return result;
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
    const pagamento = await this.pagamentoRepository.findOneBy({ id });
    if (!pagamento) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    // Validar a transição de status
    if (!this.statusValidator.canTransition(pagamento.status, updateDto.status)) {
      throw new ConflictException(
        `Transição de status inválida: ${pagamento.status} -> ${updateDto.status}`
      );
    }

    // Validar se comprovante é obrigatório para status CONFIRMADO
    if (updateDto.status === StatusPagamentoEnum.CONFIRMADO && !updateDto.comprovanteId) {
      throw new BadRequestException(
        'Comprovante é obrigatório para concluir um pagamento'
      );
    }

    // Validar se data de agendamento é obrigatória para status AGENDADO
    if (updateDto.status === StatusPagamentoEnum.AGENDADO && !updateDto.dataAgendamento) {
      throw new BadRequestException(
        'Data de agendamento é obrigatória para agendar um pagamento'
      );
    }

    // Armazenar dados anteriores para auditoria
    const dadosAnteriores = { ...pagamento };

    // Atualizar os campos
    pagamento.status = updateDto.status;
    pagamento.updated_at = new Date();

    // Atualizar campos específicos baseados no status
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
    logDto.metodo_http = 'PUT';
    await this.auditoriaService.create(logDto);

    return result;
  }

  /**
   * Atualiza o status de um pagamento existente (método legado)
   *
   * @param id ID do pagamento
   * @param novoStatus Novo status do pagamento
   * @param usuarioId ID do usuário que está realizando a operação
   * @returns Pagamento atualizado
   */
  async atualizarStatus(
    id: string,
    novoStatus: StatusPagamentoEnum,
    usuarioId: string,
  ): Promise<Pagamento> {
    // Buscar o pagamento existente
    const pagamento = await this.pagamentoRepository.findOneBy({ id });
    if (!pagamento) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    // Validar a transição de status
    if (!this.statusValidator.canTransition(pagamento.status, novoStatus)) {
      throw new ConflictException(
        `Transição de status inválida: ${pagamento.status} -> ${novoStatus}`
      );
    }

    // Armazenar dados anteriores para auditoria
    const dadosAnteriores = { ...pagamento };

    // Atualizar o status
    pagamento.status = novoStatus;
    pagamento.updated_at = new Date();

    // Salvar a atualização
    const result = await this.pagamentoRepository.save(pagamento);

    // A auditoria será registrada automaticamente pelo AuditoriaInterceptor

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
    const pagamento = await this.pagamentoRepository.findOneBy({ id });
    if (!pagamento) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    // Verificar se o pagamento pode ser cancelado
    if (pagamento.status === StatusPagamentoEnum.CANCELADO) {
      throw new ConflictException('Pagamento já está cancelado');
    }

    if (pagamento.status === StatusPagamentoEnum.LIBERADO) {
      throw new ConflictException('Não é possível cancelar um pagamento já realizado');
    }

    // Armazenar dados anteriores para auditoria
    const dadosAnteriores = { ...pagamento };

    // Atualizar o status para cancelado
    pagamento.status = StatusPagamentoEnum.CANCELADO;
    pagamento.updated_at = new Date();

    // Adicionar motivo do cancelamento às observações
    pagamento.observacoes = pagamento.observacoes
      ? `${pagamento.observacoes}\nMotivo do cancelamento: ${motivoCancelamento}`
      : `Motivo do cancelamento: ${motivoCancelamento}`;

    // Salvar a atualização
    const result = await this.pagamentoRepository.save(pagamento);

    await this.atualizarStatus(
       pagamento.solicitacaoId,
       StatusPagamentoEnum.CANCELADO,
       usuarioId
     );

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
}
