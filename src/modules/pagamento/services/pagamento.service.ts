import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PagamentoRepository } from '../repositories/pagamento.repository';
import { Pagamento } from '../../../entities/pagamento.entity';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { MetodoPagamentoEnum } from '../../../enums/metodo-pagamento.enum';
import { StatusConcessao } from '../../../enums/status-concessao.enum';
import { PagamentoCreateDto } from '../dtos/pagamento-create.dto';
import { PagamentoUpdateStatusDto } from '../dtos/pagamento-update-status.dto';
import { normalizeEnumFields } from '../../../shared/utils/enum-normalizer.util';
import { PagamentoValidationUtil } from '../utils/pagamento-validation.util';
import { PagamentoCalculatorService } from './pagamento-calculator.service';
import { PagamentoCacheInvalidationService } from './pagamento-cache-invalidation.service';
import {
  DadosPagamento,
  ResultadoCalculoPagamento,
} from '../interfaces/pagamento-calculator.interface';
import { format } from 'date-fns';
import { AuditoriaService } from '@/modules/auditoria/services/auditoria.service';
import { ConcessaoService } from '@/modules/beneficio/services/concessao.service';
import { SolicitacaoService } from '@/modules/solicitacao/services/solicitacao.service';
import { PagamentoUnifiedMapper } from '../mappers';
import { PagamentoCacheService } from './pagamento-cache.service';
import { PagamentoValidationService } from './pagamento-validation.service';
import { PagamentoFiltrosAvancadosDto, PagamentoFiltrosResponseDto } from '../dto/pagamento-filtros-avancados.dto';
import { FiltrosAvancadosService } from '../../../common/services/filtros-avancados.service';
import { PeriodoPredefinido } from '../../../enums/periodo-predefinido.enum';
import { SelectQueryBuilder } from 'typeorm';
import { PagamentoEventosService } from './pagamento-eventos.service';

/**
 * Service simplificado para gerenciamento de pagamentos
 * Foca apenas na lógica de negócio essencial, delegando operações de dados para o repository
 */
@Injectable()
export class PagamentoService {
  private readonly logger = new Logger(PagamentoService.name);

  constructor(
    private readonly pagamentoRepository: PagamentoRepository,
    private readonly validationService: PagamentoValidationService,
    private readonly cacheService: PagamentoCacheService,
    private readonly cacheInvalidationService: PagamentoCacheInvalidationService,
    private readonly auditoriaService: AuditoriaService,
    private readonly solicitacaoService: SolicitacaoService,
    @Inject(forwardRef(() => ConcessaoService))
    private readonly concessaoService: ConcessaoService,
    private readonly mapper: PagamentoUnifiedMapper,
    private readonly pagamentoCalculatorService: PagamentoCalculatorService,
    private readonly filtrosAvancadosService: FiltrosAvancadosService,
    private readonly pagamentoEventosService: PagamentoEventosService,
  ) { }

  /**
   * Cria um novo pagamento
   */
  async create(
    createDto: PagamentoCreateDto,
    usuarioId: string,
  ): Promise<Pagamento> {
    this.logger.log(`Criando pagamento`);

    // Validar valor
    PagamentoValidationUtil.validarValor(createDto.valor);

    // Preparar dados
    const dadosNormalizados = normalizeEnumFields({
      ...createDto,
      status: StatusPagamentoEnum.PENDENTE,
      criado_por: usuarioId,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Criar pagamento
    const pagamento = await this.pagamentoRepository.create(dadosNormalizados);

    // Emitir evento de invalidação de cache
    this.cacheInvalidationService.emitCacheInvalidationEvent({
      pagamentoId: pagamento.id,
      action: 'create',
      solicitacaoId: pagamento.solicitacao_id,
      concessaoId: pagamento.concessao_id,
      metadata: {
        status: pagamento.status,
        metodo: pagamento.metodo_pagamento,
        valor: pagamento.valor,
      },
    });

    // Emitir evento de pagamento criado
    await this.pagamentoEventosService.emitirEventoPagamentoCriado({
      concessaoId: pagamento.concessao_id,
      valor: pagamento.valor,
      dataVencimento: pagamento.data_vencimento,
      usuarioCriadorId: pagamento.criado_por || 'sistema',
      observacao: pagamento.observacoes,
    });

    // Pagamento criado com sucesso
    return pagamento;
  }

  /**
   * Busca pagamento por ID com cálculo de critérios de liberação
   */
  async findById(id: string): Promise<Pagamento> {
    const pagamento = await this.pagamentoRepository.findById(id);

    if (!pagamento) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    return pagamento;
  }

  /**
   * Busca um pagamento por ID com todas as relações necessárias para o processamento da fila.
   */
  async findPagamentoCompleto(id: string): Promise<Pagamento> {
    return this.pagamentoRepository.findPagamentoComRelacoes(id);
  }

  /**
   * Lista pagamentos com filtros
   */
  async findAll(
    filtros: {
      search?: string;
      status?: StatusPagamentoEnum;
      unidade_id?: string;
      solicitacao_id?: string;
      concessao_id?: string;
      data_inicio?: string;
      data_fim?: string;
      page?: number;
      limit?: number;
      sort_by?: string;
      sort_order?: 'ASC' | 'DESC';
      usuario_id?: string;
      pagamento_ids?: string[]; // Novo filtro para múltiplos IDs
      com_comprovante?: boolean; // Filtro para pagamentos com/sem comprovante
    },
  ) {
    const { items, total } =
      await this.pagamentoRepository.findWithFilters(filtros);

    const page = filtros.page || 1;
    const limit = filtros.limit || 10;

    // Aplicar mapper para converter entidades em DTOs de resposta com contexto de pagamentos anteriores
    const mappedItems = PagamentoUnifiedMapper.toResponseDtoList(items, false);

    return {
      data: mappedItems,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Atualiza status do pagamento
   */
  async updateStatus(
    id: string,
    updateDto: PagamentoUpdateStatusDto,
    usuarioId: string,
  ): Promise<Pagamento> {
    this.logger.log(
      `Atualizando status do pagamento ${id} para ${updateDto.status}`,
    );

    // Buscar pagamento existente com relações necessárias
    const pagamento = await this.pagamentoRepository.findPagamentoComRelacoes(id);

    if (!pagamento) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    // Validar transição de status
    PagamentoValidationUtil.validarTransicaoStatus(
      pagamento.status,
      updateDto.status,
    );

    // Preparar dados de atualização
    const dadosAtualizacao: Partial<Pagamento> = {
      status: updateDto.status,
      observacoes: updateDto.observacoes,
      updated_at: new Date(),
    };

    // Atualizações específicas por status
    switch (updateDto.status) {
      case StatusPagamentoEnum.LIBERADO:
        dadosAtualizacao.data_liberacao = new Date();
        dadosAtualizacao.liberado_por = usuarioId;
        break;
      case StatusPagamentoEnum.PAGO:
        dadosAtualizacao.data_pagamento = new Date();
        break;
      case StatusPagamentoEnum.CONFIRMADO:
        dadosAtualizacao.data_conclusao = new Date();
        if (updateDto.comprovante_id) {
          dadosAtualizacao.comprovante_id = updateDto.comprovante_id;
        }
        break;
      case StatusPagamentoEnum.AGENDADO:
        if (updateDto.data_agendamento) {
          dadosAtualizacao.data_agendamento = new Date(
            updateDto.data_agendamento,
          );
        }
        break;
    }

    // Atualizar pagamento
    const pagamentoAtualizado = await this.pagamentoRepository.update(
      id,
      dadosAtualizacao,
    );

    // Se o número da parcela for 1, atualizar status da concessão para ATIVO
    if (pagamento.numero_parcela === 1 && pagamento.concessao_id) {
      try {
        await this.concessaoService.atualizarStatus(
          pagamento.concessao_id,
          StatusConcessao.ATIVO,
          usuarioId,
          `Ativação automática - Primeira parcela do pagamento ${id} atualizada para ${updateDto.status}`,
        );

        this.logger.log(
          `Status da concessão ${pagamento.concessao_id} atualizado para ATIVO devido à atualização da primeira parcela`,
        );
      } catch (error) {
        this.logger.warn(
          `Erro ao atualizar status da concessão ${pagamento.concessao_id}: ${error.message}`,
        );
        // Não falha a operação principal se houver erro na atualização da concessão
      }
    }

    // Emitir evento de invalidação de cache para mudança de status
    this.cacheInvalidationService.emitCacheInvalidationEvent({
      pagamentoId: pagamento.id,
      action: 'status_change',
      oldStatus: pagamento.status,
      newStatus: updateDto.status,
      solicitacaoId: pagamento.solicitacao_id,
      concessaoId: pagamento.concessao_id,
      metadata: {
        previousStatus: pagamento.status,
        newStatus: updateDto.status,
        updatedAt: new Date(),
        isFirstInstallment: pagamento.numero_parcela === 1,
      },
    });

    // Emitir evento de status atualizado
    await this.pagamentoEventosService.emitirEventoStatusAtualizado({
      statusAnterior: pagamento.status,
      statusAtual: updateDto.status,
      motivoMudanca: updateDto.observacoes,
      usuarioId: usuarioId,
      observacao: updateDto.observacoes,
    });

    this.logger.log(
      `Status do pagamento ${id} atualizado para ${updateDto.status}`,
    );
    return pagamentoAtualizado;
  }

  /**
   * Cancela um pagamento
   */
  async cancelar(
    id: string,
    motivo: string,
    usuarioId: string,
  ): Promise<Pagamento> {
    this.logger.log(`Cancelando pagamento ${id}`);

    const pagamento = await this.findById(id);

    // Verificar se pode ser cancelado
    if (pagamento.status === StatusPagamentoEnum.CANCELADO) {
      throw new ConflictException('Pagamento já está cancelado');
    }

    if (pagamento.status === StatusPagamentoEnum.CONFIRMADO) {
      throw new ConflictException(
        'Não é possível cancelar um pagamento confirmado',
      );
    }

    // Atualizar status
    const dadosAtualizacao = {
      status: StatusPagamentoEnum.CANCELADO,
      observacoes: `Cancelado: ${motivo}`,
      updated_at: new Date(),
    };

    const pagamentoCancelado = await this.pagamentoRepository.update(
      id,
      dadosAtualizacao,
    );

    // Emitir evento de invalidação de cache para cancelamento
    this.cacheInvalidationService.emitCacheInvalidationEvent({
      pagamentoId: pagamento.id,
      action: 'cancelled',
      oldStatus: pagamento.status,
      newStatus: StatusPagamentoEnum.CANCELADO,
      solicitacaoId: pagamento.solicitacao_id,
      concessaoId: pagamento.concessao_id,
      metadata: {
        cancelledAt: new Date(),
        previousStatus: pagamento.status,
        reason: 'Manual cancellation',
      },
    });

    // Emitir evento de pagamento cancelado
    await this.pagamentoEventosService.emitirEventoPagamentoCancelado({
      canceladoPorId: usuarioId,
      motivoCancelamento: motivo,
      dataCancelamento: new Date(),
      observacao: motivo,
    });

    // Pagamento cancelado com sucesso
    return pagamentoCancelado;
  }

  /**
   * Busca pagamentos por solicitação
   */
  async findBySolicitacao(solicitacao_id: string): Promise<Pagamento[]> {
    return await this.pagamentoRepository.findBySolicitacao(solicitacao_id);
  }

  /**
   * Busca pagamentos por concessão
   */
  async findByConcessao(concessao_id: string): Promise<Pagamento[]> {
    return await this.pagamentoRepository.findByConcessao(concessao_id);
  }

  /**
   * Busca pagamentos pendentes de monitoramento
   * Retorna pagamentos que ainda não têm agendamento/visita criado
   * @param filtros Filtros opcionais para bairro, CPF e paginação
   */
  async findPendentesMonitoramento(filtros?: {
    bairro?: string;
    cpf?: string;
    page?: number;
    limit?: number;
    offset?: number;
  }) {
    return this.pagamentoRepository.findPendentesMonitoramento(filtros);
  }

  /**
   * Aplica filtros avançados para busca de pagamentos
   * Implementa busca otimizada com múltiplos critérios e paginação
   * @param filtros Critérios de filtro avançados
   * @returns Resultado paginado com metadados
   */
  async aplicarFiltrosAvancados(
    filtros: PagamentoFiltrosAvancadosDto,
  ): Promise<PagamentoFiltrosResponseDto> {
    const startTime = Date.now();

    try {
      // Construir query base com relacionamentos necessários
      const queryBuilder = this.pagamentoRepository
        .createScopedQueryBuilder('pagamento')
        .leftJoinAndSelect('pagamento.solicitacao', 'solicitacao')
        .leftJoinAndSelect('pagamento.concessao', 'concessao')
        .leftJoin('solicitacao.tecnico', 'usuario')
        .addSelect([
          'usuario.id',
          'usuario.email',
          'unidade.nome',
        ])
        .leftJoinAndSelect('solicitacao.unidade', 'unidade')
        .leftJoinAndSelect('solicitacao.beneficiario', 'cidadao')
        .leftJoinAndSelect('solicitacao.tipo_beneficio', 'beneficio');

      // Aplicar filtros condicionalmente
      if (filtros.unidades?.length > 0) {
        queryBuilder.andWhere('solicitacao.unidade_id IN (:...unidades)', {
          unidades: filtros.unidades,
        });
      }

      if (filtros.beneficios?.length > 0) {
        queryBuilder.andWhere('solicitacao.tipo_beneficio IN (:...beneficios)', {
          beneficios: filtros.beneficios,
        });
      }

      if (filtros.status?.length > 0) {
        queryBuilder.andWhere('pagamento.status IN (:...status)', {
          status: filtros.status,
        });
      }

      if (filtros.metodos_pagamento?.length > 0) {
        queryBuilder.andWhere('pagamento.metodo_pagamento IN (:...metodos)', {
          metodos: filtros.metodos_pagamento,
        });
      }

      if (filtros.solicitacoes?.length > 0) {
        queryBuilder.andWhere('pagamento.solicitacao_id IN (:...solicitacoes)', {
          solicitacoes: filtros.solicitacoes,
        });
      }

      if (filtros.concessoes?.length > 0) {
        queryBuilder.andWhere('pagamento.concessao_id IN (:...concessoes)', {
          concessoes: filtros.concessoes,
        });
      }

      // Filtro de busca textual
      if (filtros.search) {
        queryBuilder.andWhere(
          '(cidadao.nome ILIKE :search OR cidadao.cpf ILIKE :search OR pagamento.observacoes ILIKE :search)',
          { search: `%${filtros.search}%` },
        );
      }

      // Aplicar filtros de período
      this.aplicarFiltrosPeriodo(queryBuilder, filtros);

      // Filtros de data específicos (sobrescrevem período se fornecidos)
      if (filtros.data_inicio) {
        queryBuilder.andWhere('pagamento.data_liberacao >= :dataInicio', {
          dataInicio: filtros.data_inicio,
        });
      }

      if (filtros.data_fim) {
        queryBuilder.andWhere('pagamento.data_liberacao <= :dataFim', {
          dataFim: filtros.data_fim,
        });
      }

      if (filtros.data_pagamento_inicio) {
        queryBuilder.andWhere('pagamento.data_pagamento >= :dataPagamentoInicio', {
          dataPagamentoInicio: filtros.data_pagamento_inicio,
        });
      }

      if (filtros.data_pagamento_fim) {
        queryBuilder.andWhere('pagamento.data_pagamento <= :dataPagamentoFim', {
          dataPagamentoFim: filtros.data_pagamento_fim,
        });
      }

      // Filtros de valor
      if (filtros.valor_min !== undefined) {
        queryBuilder.andWhere('pagamento.valor >= :valorMin', {
          valorMin: filtros.valor_min,
        });
      }

      if (filtros.valor_max !== undefined) {
        queryBuilder.andWhere('pagamento.valor <= :valorMax', {
          valorMax: filtros.valor_max,
        });
      }

      // Filtros de parcela
      if (filtros.parcela_min !== undefined) {
        queryBuilder.andWhere('pagamento.numero_parcela >= :parcelaMin', {
          parcelaMin: filtros.parcela_min,
        });
      }

      if (filtros.parcela_max !== undefined) {
        queryBuilder.andWhere('pagamento.numero_parcela <= :parcelaMax', {
          parcelaMax: filtros.parcela_max,
        });
      }

      // Filtro de comprovante
      if (filtros.com_comprovante !== undefined) {
        if (filtros.com_comprovante) {
          queryBuilder.andWhere('pagamento.comprovante_id IS NOT NULL');
        } else {
          queryBuilder.andWhere('pagamento.comprovante_id IS NULL');
        }
      }

      // Incluir relacionamentos opcionais
      if (filtros.include_relations?.includes('comprovante')) {
        queryBuilder.leftJoinAndSelect('pagamento.comprovante', 'comprovante');
      }

      if (filtros.include_relations?.includes('monitoramento')) {
        queryBuilder.leftJoinAndSelect('pagamento.agendamentos', 'agendamentos');
        queryBuilder.leftJoinAndSelect('agendamentos.visitas', 'visitas');
      }

      // Aplicar ordenação
      const sortField = filtros.sort_by || 'data_liberacao';
      const sortOrder = filtros.sort_order || 'DESC';
      queryBuilder.orderBy(`pagamento.${sortField}`, sortOrder);

      // Aplicar paginação
      const page = filtros.page || 1;
      const limit = Math.min(filtros.limit || 0, 100); // se não vier nada ou vier 0 → não limita
      const offset = (page - 1) * (limit || 1); // evita offset negativo ou NaN

      queryBuilder.skip(offset);

      if (limit > 0) {
        queryBuilder.take(limit);
      }


      // Executar query
      const [items, total] = await queryBuilder.getManyAndCount();

      // Remover campos sensíveis dos resultados
      const sanitizedItems = items.map((item) => {
        // Remover campos sensíveis dos usuários relacionados
        if (item.solicitacao?.tecnico?.senhaHash) {
          delete item.solicitacao.tecnico.senhaHash;
        }
        if (item.solicitacao?.aprovador?.senhaHash) {
          delete item.solicitacao.aprovador.senhaHash;
        }
        if (item.solicitacao?.liberador?.senhaHash) {
          delete item.solicitacao.liberador.senhaHash;
        }
        return item;
      });

      // Calcular tempo de execução
      const tempoExecucao = Date.now() - startTime;

      // Preparar metadados de paginação
      const pages = Math.ceil(total / limit);
      const meta = {
        limit,
        offset,
        page,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1,
      };

      // Calcular período se fornecido
      let periodoCalculado: any;
      if (filtros.periodo && filtros.periodo !== 'personalizado') {
        periodoCalculado = this.filtrosAvancadosService.calcularPeriodoPredefinido(filtros.periodo);
      }

      return {
        items: sanitizedItems,
        total,
        filtros_aplicados: this.filtrosAvancadosService.normalizarFiltros(filtros),
        periodo_calculado: periodoCalculado,
        meta,
        tempo_execucao: tempoExecucao,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao aplicar filtros avançados de pagamentos: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        'Erro ao processar filtros de pagamentos',
      );
    }
  }

  /**
   * Obter estatísticas de pagamentos
   */
  async getEstatisticas() {
    return await this.pagamentoRepository.getEstatisticas();
  }

  /**
   * Gera pagamentos para uma concessão baseado no tipo de benefício
   *
   * Este método agora segue os princípios SOLID:
   * - Single Responsibility: apenas orquestra a criação de pagamentos
   * - Open/Closed: extensível via estratégias de cálculo
   * - Dependency Inversion: depende de abstrações (PagamentoCalculatorService)
   */
  async gerarPagamentosParaConcessao(
    concessao: any,
    solicitacao: any,
    usuarioId: string,
    dadosEspecificos?: any,
  ): Promise<Pagamento[]> {
    this.logger.log(`Gerando pagamentos para concessão ${concessao.id}`);

    try {
      // 1. Validar e preparar dados de entrada
      const dadosPagamento = this.prepararDadosPagamento(
        concessao,
        solicitacao,
        dadosEspecificos,
      );

      // 2. Calcular dados do pagamento usando o serviço especializado
      const resultadoCalculo =
        await this.pagamentoCalculatorService.calcularPagamento(dadosPagamento);

      // 3. Gerar as entidades de pagamento
      const pagamentosGerados = await this.criarPagamentos(
        concessao,
        solicitacao,
        resultadoCalculo,
        usuarioId,
      );

      this.logger.log(
        `${pagamentosGerados.length} pagamentos gerados para concessão ${concessao.id} - ` +
        `Total: R$ ${dadosPagamento.valor.toFixed(2)}`,
      );

      // Emitir eventos de invalidação de cache para cada pagamento criado
      pagamentosGerados.forEach((pagamento) => {
        this.cacheInvalidationService.emitCacheInvalidationEvent({
          pagamentoId: pagamento.id,
          action: 'create',
          solicitacaoId: pagamento.solicitacao_id,
          concessaoId: pagamento.concessao_id,
          metadata: {
            status: pagamento.status,
            metodo: pagamento.metodo_pagamento,
            valor: pagamento.valor,
            batchCreation: true,
            batchSize: pagamentosGerados.length,
          },
        });
      });

      return pagamentosGerados;
    } catch (error) {
      this.logger.error(
        `Erro ao gerar pagamentos para concessão ${concessao.id}:`,
        error.message,
      );
      throw new BadRequestException(
        `Falha ao gerar pagamentos: ${error.message}`,
      );
    }
  }

  /**
   * Prepara e valida os dados necessários para o cálculo do pagamento
   */
  private prepararDadosPagamento(
    concessao: any,
    solicitacao: any,
    dadosEspecificos?: any,
  ): DadosPagamento {
    // Validar data de início
    const dataInicio = concessao.data_inicio
      ? new Date(concessao.data_inicio)
      : new Date();
    if (isNaN(dataInicio.getTime())) {
      throw new Error(
        `Data de início da concessão inválida: ${concessao.data_inicio}`,
      );
    }

    // Validar valor do benefício
    // Para alguns benefícios (como cesta básica), o valor pode vir da estratégia, não da solicitação
    const valorSolicitacao = solicitacao.valor ? Number(solicitacao.valor) : null;

    // Se há valor na solicitação, validar se é positivo
    if (valorSolicitacao !== null && (isNaN(valorSolicitacao) || valorSolicitacao < 0)) {
      throw new Error(
        `Valor do benefício inválido: ${solicitacao.valor}`,
      );
    }

    // O valor final será determinado pela estratégia de cálculo
    const valor = valorSolicitacao;

    const quantidadeParcelas = Number(solicitacao.quantidade_parcelas) || 0;
    if (quantidadeParcelas < 0) {
      throw new Error(
        `Quantidade de parcelas inválida: ${solicitacao.quantidade_parcelas}`,
      );
    }

    // Validar tipo de benefício
    const tipoBeneficio = solicitacao.tipo_beneficio?.codigo;
    if (!tipoBeneficio) {
      throw new Error('Tipo de benefício não informado');
    }

    if (dadosEspecificos) {
      this.logger.debug(
        `Dados específicos recebidos para solicitação ${solicitacao.id}: ${JSON.stringify(dadosEspecificos)}`,
      );
    }

    return {
      tipoBeneficio,
      valor,
      dataInicio,
      quantidadeParcelas,
      dadosEspecificos,
    };
  }

  /**
   * Cria as entidades de pagamento baseadas no resultado do cálculo
   */
  private async criarPagamentos(
    concessao: any,
    solicitacao: any,
    resultado: ResultadoCalculoPagamento,
    usuarioId: string,
  ): Promise<Pagamento[]> {
    const pagamentosGerados: Pagamento[] = [];
    const {
      quantidadeParcelas,
      valorParcela,
      dataLiberacao,
      dataVencimento,
      intervaloParcelas,
    } = resultado;

    this.logger.log(
      `Criando ${quantidadeParcelas} parcelas de R$ ${valorParcela.toFixed(2)} ` +
      `para ${solicitacao.tipo_beneficio?.nome}`,
    );

    for (let i = 1; i <= quantidadeParcelas; i++) {
      const dadosPagamento = this.calcularDadosParcela(
        concessao,
        solicitacao,
        resultado,
        i,
      );

      const user =
        usuarioId || solicitacao.liberador_id || solicitacao.tecnico_id;
      const pagamento = await this.create(dadosPagamento, user);
      pagamentosGerados.push(pagamento);
    }

    return pagamentosGerados;
  }

  /**
   * Calcula os dados específicos de uma parcela
   */
  private calcularDadosParcela(
    concessao: any,
    solicitacao: any,
    resultado: ResultadoCalculoPagamento,
    numeroParcela: number,
  ): any {
    const {
      quantidadeParcelas,
      valorParcela,
      dataLiberacao,
      dataVencimento,
      intervaloParcelas,
    } = resultado;

    // Calcular datas da parcela
    const dataLiberacaoParcela = this.calcularDataParcela(
      dataLiberacao,
      numeroParcela - 1,
      intervaloParcelas,
    );
    const dataVencimentoParcela = this.calcularDataParcela(
      dataVencimento,
      numeroParcela - 1,
      intervaloParcelas,
    );

    // Ajustar valor da última parcela para compensar arredondamentos
    let valorFinal = valorParcela;
    if (numeroParcela === quantidadeParcelas && quantidadeParcelas > 1) {
      const totalCalculado = valorParcela * (quantidadeParcelas - 1);
      // Usar o valor total correto baseado no cálculo das parcelas
      const valorTotalCalculado = valorParcela * quantidadeParcelas;
      valorFinal = Number((valorTotalCalculado - totalCalculado).toFixed(2));

      // Garantir que o valor final seja sempre positivo
      if (valorFinal <= 0) {
        this.logger.warn(
          `Valor da última parcela calculado como ${valorFinal}, usando valor da parcela padrão: ${valorParcela}`,
        );
        valorFinal = valorParcela;
      }
    }

    return {
      concessao_id: concessao.id,
      solicitacao_id: solicitacao.id,
      valor: valorFinal,
      data_liberacao: dataLiberacaoParcela,
      data_vencimento: dataVencimentoParcela,
      metodo_pagamento: solicitacao.info_bancaria
        ? MetodoPagamentoEnum.PIX
        : MetodoPagamentoEnum.DEPOSITO,
      info_bancaria_id: solicitacao.info_bancaria?.id || undefined,
      numero_parcela: numeroParcela,
      total_parcelas: quantidadeParcelas,
      observacoes: this.gerarObservacoesParcela(
        numeroParcela,
        quantidadeParcelas,
        solicitacao.tipo_beneficio?.nome,
        dataLiberacaoParcela,
        dataVencimentoParcela,
      ),
    };
  }

  /**
   * Calcula a data de uma parcela específica
   */
  private calcularDataParcela(
    dataBase: Date,
    indiceParcela: number,
    intervaloDias: number,
  ): Date {
    if (intervaloDias === 0 || indiceParcela === 0) {
      return new Date(dataBase);
    }

    const novaData = new Date(dataBase);
    novaData.setDate(novaData.getDate() + indiceParcela * intervaloDias);
    return novaData;
  }

  /**
   * Gera observações padronizadas para uma parcela
   */
  private gerarObservacoesParcela(
    numeroParcela: number,
    totalParcelas: number,
    nomeBeneficio: string,
    dataLiberacao: Date,
    dataVencimento: Date,
  ): string {
    return (
      `Pagamento ${numeroParcela}/${totalParcelas} - ${nomeBeneficio} - ` +
      `Liberação: ${format(dataLiberacao, 'dd/MM/yyyy')} - ` +
      `Vencimento: ${format(dataVencimento, 'dd/MM/yyyy')}`
    );
  }

  /**
   * Aplica filtros de período baseado em período predefinido ou datas customizadas
   * @param queryBuilder Query builder do TypeORM
   * @param filtros Filtros avançados contendo período
   */
  private aplicarFiltrosPeriodo(
    queryBuilder: SelectQueryBuilder<Pagamento>,
    filtros: PagamentoFiltrosAvancadosDto,
  ): void {
    // Se tem período predefinido, calcular as datas automaticamente
    if (filtros.periodo && filtros.periodo !== PeriodoPredefinido.PERSONALIZADO) {
      try {
        const periodoCalculado = this.filtrosAvancadosService.calcularPeriodoPredefinido(filtros.periodo);

        // Aplicar filtro de data de liberação baseado no período
        queryBuilder.andWhere('pagamento.data_liberacao >= :periodoInicio', {
          periodoInicio: periodoCalculado.dataInicio,
        });

        queryBuilder.andWhere('pagamento.data_liberacao <= :periodoFim', {
          periodoFim: periodoCalculado.dataFim,
        });

        this.logger.debug(
          `Aplicado filtro de período ${filtros.periodo}: ${periodoCalculado.dataInicio} a ${periodoCalculado.dataFim}`,
        );
      } catch (error) {
        this.logger.warn(
          `Erro ao calcular período ${filtros.periodo}: ${error.message}`,
        );
        throw new BadRequestException(
          `Período inválido: ${filtros.periodo}`,
        );
      }
    }
    // Se é período personalizado, as datas específicas serão aplicadas posteriormente
    // no método principal (data_liberacao_inicio, data_liberacao_fim, etc.)
  }
}
