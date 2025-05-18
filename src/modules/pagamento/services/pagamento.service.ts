import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pagamento } from '../entities/pagamento.entity';
import { StatusPagamentoEnum } from '../enums/status-pagamento.enum';
import { PagamentoCreateDto } from '../dtos/pagamento-create.dto';
import { StatusTransitionValidator } from '../validators/status-transition-validator';

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
    // Outros serviços necessários serão injetados aqui
    // private readonly solicitacaoService: SolicitacaoService,
    // private readonly auditoriaService: AuditoriaService,
    // etc.
  ) {}

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
    usuarioId: string
  ): Promise<Pagamento> {
    // Validar se a solicitação existe e está aprovada
    // const solicitacao = await this.solicitacaoService.findOne(solicitacaoId);
    
    // if (!solicitacao) {
    //   throw new NotFoundException('Solicitação não encontrada');
    // }
    
    // if (solicitacao.status !== 'aprovada') {
    //   throw new ConflictException('Somente solicitações aprovadas podem ter pagamentos liberados');
    // }

    // Validar método de pagamento e informações bancárias
    if (createDto.metodoPagamento !== 'presencial' && !createDto.infoBancariaId) {
      throw new ConflictException(
        'Informações bancárias são obrigatórias para pagamentos não presenciais'
      );
    }

    // Validar limites de valor
    // await this.validarLimitesPagamento(solicitacao.tipoBeneficioId, createDto.valor);

    // Criar nova entidade de pagamento
    const pagamento = this.pagamentoRepository.create({
      solicitacaoId,
      infoBancariaId: createDto.infoBancariaId,
      valor: createDto.valor,
      dataLiberacao: createDto.dataLiberacao,
      status: StatusPagamentoEnum.LIBERADO, // Status inicial ao criar o pagamento
      metodoPagamento: createDto.metodoPagamento,
      liberadoPor: usuarioId,
      observacoes: createDto.observacoes
    });

    // Salvar o pagamento
    const result = await this.pagamentoRepository.save(pagamento);

    // Atualizar status da solicitação
    // await this.solicitacaoService.atualizarStatusParaPagamentoPendente(solicitacaoId);

    // Registrar operação no log de auditoria
    // await this.auditoriaService.registrarOperacao({
    //   tipoOperacao: 'CRIACAO_PAGAMENTO',
    //   usuarioId,
    //   entidadeId: result.id,
    //   tipoEntidade: 'PAGAMENTO',
    //   dadosAnteriores: null,
    //   dadosNovos: result
    // });

    return result;
  }

  /**
   * Atualiza o status de um pagamento existente
   * 
   * @param id ID do pagamento
   * @param novoStatus Novo status do pagamento
   * @param usuarioId ID do usuário que está realizando a operação
   * @returns Pagamento atualizado
   */
  async atualizarStatus(
    id: string,
    novoStatus: StatusPagamentoEnum,
    usuarioId: string
  ): Promise<Pagamento> {
    // Buscar o pagamento pelo ID
    const pagamento = await this.findOne(id);
    
    if (!pagamento) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    // Validar a transição de status
    const transitionResult = this.statusValidator.canTransition(
      pagamento.status,
      novoStatus
    );

    if (!transitionResult.allowed) {
      throw new ConflictException(
        `Transição de status não permitida: ${transitionResult.reason}`
      );
    }

    // Salvar dados anteriores para auditoria
    const dadosAnteriores = { ...pagamento };

    // Atualizar o status
    pagamento.status = novoStatus;
    
    // Salvar a atualização
    const result = await this.pagamentoRepository.save(pagamento);

    // Atualizar status da solicitação, se necessário
    // if (novoStatus === StatusPagamentoEnum.CONFIRMADO) {
    //   await this.solicitacaoService.atualizarStatusParaConcluido(pagamento.solicitacaoId);
    // } else if (novoStatus === StatusPagamentoEnum.CANCELADO) {
    //   await this.solicitacaoService.atualizarStatusParaAprovado(pagamento.solicitacaoId);
    // }

    // Registrar operação no log de auditoria
    // await this.auditoriaService.registrarOperacao({
    //   tipoOperacao: 'ATUALIZACAO_STATUS_PAGAMENTO',
    //   usuarioId,
    //   entidadeId: id,
    //   tipoEntidade: 'PAGAMENTO',
    //   dadosAnteriores,
    //   dadosNovos: result
    // });

    return result;
  }

  /**
   * Cancela um pagamento existente
   * 
   * @param id ID do pagamento a ser cancelado
   * @param usuarioId ID do usuário que está realizando a operação
   * @param motivoCancelamento Motivo do cancelamento
   * @returns Pagamento cancelado
   */
  async cancelarPagamento(
    id: string,
    usuarioId: string,
    motivoCancelamento: string
  ): Promise<Pagamento> {
    // Buscar o pagamento pelo ID
    const pagamento = await this.findOne(id);
    
    if (!pagamento) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    // Verificar se o pagamento pode ser cancelado
    if (!this.statusValidator.canBeCanceled(pagamento.status)) {
      throw new ConflictException(
        'Este pagamento não pode ser cancelado devido ao seu status atual'
      );
    }

    // Salvar dados anteriores para auditoria
    const dadosAnteriores = { ...pagamento };

    // Atualizar o status e registrar motivo do cancelamento
    pagamento.status = StatusPagamentoEnum.CANCELADO;
    pagamento.observacoes = pagamento.observacoes 
      ? `${pagamento.observacoes}\nMotivo do cancelamento: ${motivoCancelamento}`
      : `Motivo do cancelamento: ${motivoCancelamento}`;
    
    // Salvar a atualização
    const result = await this.pagamentoRepository.save(pagamento);

    // Atualizar status da solicitação
    // await this.solicitacaoService.atualizarStatusParaAprovado(pagamento.solicitacaoId);

    // Registrar operação no log de auditoria
    // await this.auditoriaService.registrarOperacao({
    //   tipoOperacao: 'CANCELAMENTO_PAGAMENTO',
    //   usuarioId,
    //   entidadeId: id,
    //   tipoEntidade: 'PAGAMENTO',
    //   dadosAnteriores,
    //   dadosNovos: result,
    //   observacoes: motivoCancelamento
    // });

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
   * @param options Opções de filtro
   * @returns Lista de pagamentos com meta-informações de paginação
   */
  async findAll(options: {
    status?: StatusPagamentoEnum;
    unidadeId?: string;
    dataInicio?: Date;
    dataFim?: Date;
    metodoPagamento?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: Pagamento[]; total: number; page: number; limit: number }> {
    const {
      status,
      unidadeId,
      dataInicio,
      dataFim,
      metodoPagamento,
      page = 1,
      limit = 10
    } = options;

    // Construir a query base
    const queryBuilder = this.pagamentoRepository.createQueryBuilder('pagamento');
    
    // Adicionar condições
    if (status) {
      queryBuilder.andWhere('pagamento.status = :status', { status });
    }
    
    if (metodoPagamento) {
      queryBuilder.andWhere('pagamento.metodo_pagamento = :metodoPagamento', { metodoPagamento });
    }
    
    if (dataInicio) {
      queryBuilder.andWhere('pagamento.data_liberacao >= :dataInicio', { dataInicio });
    }
    
    if (dataFim) {
      queryBuilder.andWhere('pagamento.data_liberacao <= :dataFim', { dataFim });
    }
    
    // Filtro por unidade (requer join com solicitação)
    if (unidadeId) {
      queryBuilder
        .innerJoin('solicitacao', 's', 'pagamento.solicitacao_id = s.id')
        .andWhere('s.unidade_id = :unidadeId', { unidadeId });
    }
    
    // Adicionar paginação
    queryBuilder
      .skip((page - 1) * limit)
      .take(limit);
    
    // Ordenar por data de liberação (mais recentes primeiro)
    queryBuilder.orderBy('pagamento.data_liberacao', 'DESC');
    
    // Executar a query
    const [items, total] = await queryBuilder.getManyAndCount();
    
    return {
      items,
      total,
      page,
      limit
    };
  }

  /**
   * Lista pagamentos pendentes (liberados mas não confirmados)
   * 
   * @param options Opções de filtro
   * @returns Lista de pagamentos pendentes
   */
  async findPendentes(options: {
    unidadeId?: string;
    tipoBeneficioId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: Pagamento[]; total: number; page: number; limit: number }> {
    const {
      unidadeId,
      tipoBeneficioId,
      page = 1,
      limit = 10
    } = options;

    // Construir a query base
    const queryBuilder = this.pagamentoRepository.createQueryBuilder('pagamento');
    
    // Filtrar apenas pagamentos liberados
    queryBuilder.where('pagamento.status = :status', { status: StatusPagamentoEnum.LIBERADO });
    
    // Filtros adicionais que requerem joins
    if (unidadeId || tipoBeneficioId) {
      queryBuilder.innerJoin('solicitacao', 's', 'pagamento.solicitacao_id = s.id');
      
      if (unidadeId) {
        queryBuilder.andWhere('s.unidade_id = :unidadeId', { unidadeId });
      }
      
      if (tipoBeneficioId) {
        queryBuilder.andWhere('s.tipo_beneficio_id = :tipoBeneficioId', { tipoBeneficioId });
      }
    }
    
    // Adicionar paginação
    queryBuilder
      .skip((page - 1) * limit)
      .take(limit);
    
    // Ordenar por data de liberação (mais antigos primeiro)
    queryBuilder.orderBy('pagamento.data_liberacao', 'ASC');
    
    // Executar a query
    const [items, total] = await queryBuilder.getManyAndCount();
    
    return {
      items,
      total,
      page,
      limit
    };
  }

  /**
   * Valida se o valor está dentro dos limites permitidos para o tipo de benefício
   * 
   * @param tipoBeneficioId ID do tipo de benefício
   * @param valor Valor a ser validado
   * @throws ConflictException se o valor exceder os limites permitidos
   */
  private async validarLimitesPagamento(tipoBeneficioId: string, valor: number): Promise<void> {
    // Esta é uma implementação de placeholder
    // Será integrada com o ConfiguracaoModule ou TipoBeneficioService
    
    // const tipoBeneficio = await this.tipoBeneficioService.findOne(tipoBeneficioId);
    
    // if (!tipoBeneficio) {
    //   throw new NotFoundException('Tipo de benefício não encontrado');
    // }
    
    // if (valor > tipoBeneficio.valorMaximo) {
    //   throw new ConflictException(
    //     `O valor excede o limite máximo permitido (${tipoBeneficio.valorMaximo}) para este tipo de benefício`
    //   );
    // }
    
    // if (valor < tipoBeneficio.valorMinimo) {
    //   throw new ConflictException(
    //     `O valor está abaixo do limite mínimo permitido (${tipoBeneficio.valorMinimo}) para este tipo de benefício`
    //   );
    // }
  }
}
