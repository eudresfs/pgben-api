import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between } from 'typeorm';
import { AgendamentoVisita } from '../entities/agendamento-visita.entity';
import { Pagamento } from '../../../entities/pagamento.entity';
import { AgendamentoRepository } from '../repositories/agendamento.repository';
import { CriarAgendamentoDto } from '../dto/criar-agendamento.dto';
import { AgendamentoResponseDto } from '../dto/agendamento-response.dto';
import { PaginationParamsDto } from '../../../shared/dtos/pagination-params.dto';
import { PaginatedResponseDto } from '../../../shared/dtos/pagination.dto';
import { PaginationHelper } from '../helpers/pagination.helper';
import {
  StatusAgendamento,
  TipoVisita,
  PrioridadeVisita,
  getStatusAgendamentoLabel,
  getTipoVisitaLabel,
  getPrioridadeVisitaLabel,
  getPrioridadeVisitaCor,
  getPrioridadeVisitaPrazo,
  isStatusAgendamentoAtivo,
} from '../../../enums';

/**
 * Serviço responsável pelo gerenciamento de agendamentos de visitas domiciliares.
 * 
 * @description
 * Implementa operações CRUD e regras de negócio específicas para agendamentos,
 * incluindo validações de disponibilidade, conflitos e prazos.
 * 
 * @author Sistema PGBEN
 * @since 2025-01-15
 */
@Injectable()
export class AgendamentoService {
  private readonly logger = new Logger(AgendamentoService.name);

  constructor(
    private agendamentoRepository: AgendamentoRepository,
    @InjectRepository(Pagamento)
    private pagamentoRepository: Repository<Pagamento>,
  ) {}

  /**
   * Cria um novo agendamento de visita domiciliar
   * 
   * @param createDto Dados do agendamento a ser criado
   * @returns Dados do agendamento criado
   * @throws BadRequestException se os dados forem inválidos
   * @throws ConflictException se houver conflito de horário
   * @throws NotFoundException se entidades relacionadas não forem encontradas
   */
  async criarAgendamento(createDto: CriarAgendamentoDto): Promise<AgendamentoResponseDto> {
    try {
      this.logger.log(
        `Iniciando criação de agendamento para pagamento ${createDto.pagamento_id}`,
      );

      // Validar entidades relacionadas
      await this.validateRelatedEntities(createDto);

      // Validar regras de negócio
      await this.validateBusinessRules(createDto);

      // Verificar conflitos de agendamento
      await this.checkSchedulingConflicts(createDto);

      // Criar o agendamento através do repository
      const agendamento = await this.agendamentoRepository.create({
        pagamento_id: createDto.pagamento_id,
        data_agendamento: new Date(createDto.data_agendamento),
        tipo_visita: createDto.tipo_visita,
        prioridade: createDto.prioridade,
        observacoes: createDto.observacoes,
        endereco_visita: createDto.endereco_visita,
        dados_complementares: createDto.dados_complementares,
        status: StatusAgendamento.AGENDADO,
        notificar_beneficiario: createDto.notificar_beneficiario || false,
      });

      const savedAgendamento = await this.agendamentoRepository.save(agendamento);

      // Buscar o agendamento completo com as relações carregadas
      const agendamentoCompleto = await this.agendamentoRepository.findByIdWithRelations(savedAgendamento.id);
      
      if (!agendamentoCompleto) {
        throw new BadRequestException('Erro interno: agendamento criado mas não encontrado');
      }

      this.logger.log(
        `Agendamento criado com sucesso: ${savedAgendamento.id} para pagamento ${createDto.pagamento_id}`,
      );

      return this.buildResponseDto(agendamentoCompleto);
    } catch (error) {
      // Log detalhado do erro original com contexto completo
      this.logger.error(
        `Falha ao criar agendamento para pagamento ${createDto.pagamento_id}`,
        {
          error: error.message,
          stack: error.stack,
          name: error.name,
          code: error.code,
          detail: error.detail,
          constraint: error.constraint,
          table: error.table,
          column: error.column,
          pagamento_id: createDto.pagamento_id,
          data_agendamento: createDto.data_agendamento,
          tipo_visita: createDto.tipo_visita,
          originalError: error,
        },
      );

      // Re-lançar erros conhecidos sem modificação
      if (error instanceof BadRequestException || 
          error instanceof ConflictException || 
          error instanceof NotFoundException) {
        throw error;
      }

      // Tratar erros de banco de dados
      if (error.code) {
        switch (error.code) {
          case '23505': // Violação de constraint única
            throw new ConflictException(
              'Já existe um agendamento com essas características. Verifique os dados e tente novamente.',
            );
          case '23503': // Violação de chave estrangeira
            throw new BadRequestException(
              'Uma ou mais referências fornecidas são inválidas. Verifique os IDs informados.',
            );
          case '23514': // Violação de constraint de verificação
            throw new BadRequestException(
              'Os dados fornecidos não atendem aos critérios de validação do sistema.',
            );
          default:
            this.logger.error(`Erro de banco de dados não tratado: ${error.code}`, error);
        }
      }

      // Log adicional para erros não categorizados
      this.logger.error('Erro não categorizado durante criação de agendamento:', {
        errorType: typeof error,
        errorConstructor: error.constructor.name,
        errorKeys: Object.keys(error),
        errorString: error.toString(),
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });

      // Erro genérico para casos não previstos - incluindo detalhes do erro original
      throw new BadRequestException(
        `Não foi possível criar o agendamento. Erro: ${error.message || 'Erro desconhecido'}. Verifique os dados fornecidos e tente novamente.`,
      );
    }
  }

  /**
   * Cria um novo agendamento de visita domiciliar
   * 
   * @param createDto Dados do agendamento a ser criado
   * @returns Dados do agendamento criado
   * @throws BadRequestException se os dados forem inválidos
   * @throws ConflictException se houver conflito de horário
   */
  async create(createDto: CriarAgendamentoDto): Promise<AgendamentoResponseDto> {
    try {
      // Validar entidades relacionadas
      await this.validateRelatedEntities(createDto);

      // Validar regras de negócio
      await this.validateBusinessRules(createDto);

      // Verificar conflitos de agendamento
      await this.checkSchedulingConflicts(createDto);

      // Criar o agendamento
      const agendamento = await this.agendamentoRepository.create({
        ...createDto,
        status: StatusAgendamento.AGENDADO,
        created_at: new Date(),
        updated_at: new Date(),
        data_agendamento: new Date(createDto.data_agendamento),
      });

      const savedAgendamento = await this.agendamentoRepository.save(agendamento);

      this.logger.log(
        `Agendamento criado com sucesso: ${savedAgendamento.id} para pagamento ${createDto.pagamento_id}`,
      );

      return this.buildResponseDto(savedAgendamento);
    } catch (error) {
      this.logger.error(
        `Erro ao criar agendamento para pagamento ${createDto.pagamento_id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Busca todos os agendamentos com filtros opcionais
   * 
   * @param filters Filtros de busca
   * @returns Lista de agendamentos
   */
  async findAll(filters?: {
    beneficiario_id?: string;
    tecnico_id?: string;
    unidade_id?: string;
    status?: StatusAgendamento[];
    tipo_visita?: TipoVisita[];
    prioridade?: PrioridadeVisita[];
    data_inicio?: Date;
    data_fim?: Date;
    em_atraso?: boolean;
  }): Promise<AgendamentoResponseDto[]> {
    try {
      // Converter filtros para o formato do repository
      const repositoryFilters = {
        beneficiario_id: filters?.beneficiario_id,
        tecnico_id: filters?.tecnico_id,
        unidade_id: filters?.unidade_id,
        status: filters?.status,
        tipo_visita: filters?.tipo_visita,
        prioridade: filters?.prioridade,
        data_inicio: filters?.data_inicio,
        data_fim: filters?.data_fim,
        em_atraso: filters?.em_atraso,
      };

      const agendamentos = await this.agendamentoRepository.findWithFilters(repositoryFilters);
      return agendamentos.map((agendamento) => this.buildResponseDto(agendamento));
    } catch (error) {
      this.logger.error(`Erro ao buscar agendamentos: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Busca um agendamento pelo ID
   * 
   * @param id ID do agendamento
   * @returns Dados do agendamento
   * @throws NotFoundException se não encontrado
   */
  async findById(id: string): Promise<AgendamentoResponseDto> {
    try {
      const agendamento = await this.agendamentoRepository.findByIdWithRelations(id);

      if (!agendamento) {
        throw new NotFoundException(`Agendamento com ID ${id} não encontrado`);
      }

      return this.buildResponseDto(agendamento);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erro ao buscar agendamento ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Confirma um agendamento
   * 
   * @param id ID do agendamento
   * @returns Agendamento confirmado
   * @throws NotFoundException se não encontrado
   * @throws BadRequestException se não puder ser confirmado
   */
  async confirmar(id: string): Promise<AgendamentoResponseDto> {
    try {
      const agendamento = await this.agendamentoRepository.findByIdWithRelations(id);

      if (!agendamento) {
        throw new NotFoundException(`Agendamento com ID ${id} não encontrado`);
      }

      if (![StatusAgendamento.AGENDADO, StatusAgendamento.REAGENDADO].includes(agendamento.status)) {
        throw new BadRequestException(
          `Agendamento não pode ser confirmado. Status atual: ${getStatusAgendamentoLabel(agendamento.status)}`,
        );
      }

      agendamento.status = StatusAgendamento.CONFIRMADO;
      agendamento.updated_at = new Date();

      const savedAgendamento = await this.agendamentoRepository.save(agendamento);

      this.logger.log(`Agendamento ${id} confirmado com sucesso`);

      return this.buildResponseDto(savedAgendamento);
    } catch (error) {
      this.logger.error(`Erro ao confirmar agendamento ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Reagenda uma visita
   * 
   * @param id ID do agendamento
   * @param novaDataHora Nova data e hora
   * @param motivo Motivo do reagendamento
   * @returns Agendamento reagendado
   */
  async reagendar(
    id: string,
    novaDataHora: Date,
    motivo?: string,
  ): Promise<AgendamentoResponseDto> {
    try {
      const agendamento = await this.agendamentoRepository.findByIdWithRelations(id);

      if (!agendamento) {
        throw new NotFoundException(`Agendamento com ID ${id} não encontrado`);
      }

      if (!isStatusAgendamentoAtivo(agendamento.status)) {
        throw new BadRequestException(
          `Agendamento não pode ser reagendado. Status atual: ${getStatusAgendamentoLabel(agendamento.status)}`,
        );
      }

      // Verificar conflitos na nova data
      await this.checkSchedulingConflicts({
        pagamento_id: agendamento.pagamento_id,
        data_agendamento: novaDataHora,
      } as CriarAgendamentoDto, id);

      const dataAnterior = agendamento.data_agendamento;
      agendamento.data_agendamento = novaDataHora;
      agendamento.status = StatusAgendamento.REAGENDADO;
      agendamento.updated_at = new Date();

      // Adicionar informações do reagendamento aos dados complementares
      agendamento.dados_complementares = {
        ...agendamento.dados_complementares,
        historico_reagendamentos: [
          ...(agendamento.dados_complementares?.historico_reagendamentos || []),
          {
            data_anterior: dataAnterior,
            nova_data: novaDataHora,
            motivo,
            data_reagendamento: new Date(),
          },
        ],
      };

      const savedAgendamento = await this.agendamentoRepository.save(agendamento);

      this.logger.log(`Agendamento ${id} reagendado de ${dataAnterior} para ${novaDataHora}`);

      return this.buildResponseDto(savedAgendamento);
    } catch (error) {
      this.logger.error(`Erro ao reagendar agendamento ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Cancela um agendamento
   * 
   * @param id ID do agendamento
   * @param motivo Motivo do cancelamento
   * @param cancelado_por ID do usuário que cancelou
   * @returns Agendamento cancelado
   */
  async cancelar(
    id: string,
    motivo: string,
    cancelado_por: string,
  ): Promise<AgendamentoResponseDto> {
    try {
      const agendamento = await this.agendamentoRepository.findByIdWithRelations(id);

      if (!agendamento) {
        throw new NotFoundException(`Agendamento com ID ${id} não encontrado`);
      }

      if (!isStatusAgendamentoAtivo(agendamento.status)) {
        throw new BadRequestException(
          `Agendamento não pode ser cancelado. Status atual: ${getStatusAgendamentoLabel(agendamento.status)}`,
        );
      }

      agendamento.status = StatusAgendamento.CANCELADO;
      agendamento.motivo_cancelamento = motivo;
      agendamento.cancelado_por = cancelado_por;
      agendamento.data_cancelamento = new Date();
      agendamento.updated_at = new Date();

      const savedAgendamento = await this.agendamentoRepository.save(agendamento);

      this.logger.log(`Agendamento ${id} cancelado por ${cancelado_por}: ${motivo}`);

      return this.buildResponseDto(savedAgendamento);
    } catch (error) {
      this.logger.error(`Erro ao cancelar agendamento ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Busca agendamentos em atraso
   * 
   * @returns Lista de agendamentos em atraso
   */
  async findEmAtraso(): Promise<AgendamentoResponseDto[]> {
    return this.findAll({
      em_atraso: true,
    });
  }

  /**
   * Busca agendamentos por técnico
   * 
   * @param tecnicoId ID do técnico
   * @param dataInicio Data de início (opcional)
   * @param dataFim Data de fim (opcional)
   * @returns Lista de agendamentos do técnico
   */
  async findByTecnico(
    tecnicoId: string,
    dataInicio?: Date,
    dataFim?: Date,
  ): Promise<AgendamentoResponseDto[]> {
    const repositoryFilters = {
      tecnico_id: tecnicoId,
      data_inicio: dataInicio,
      data_fim: dataFim,
    };

    const agendamentos = await this.agendamentoRepository.findWithFilters(repositoryFilters);
    return agendamentos.map(agendamento => this.buildResponseDto(agendamento));
  }

  /**
   * Busca agendamentos por pagamento
   * 
   * @param pagamentoId ID do pagamento
   * @returns Lista de agendamentos do pagamento
   */
  async findByPagamento(pagamentoId: string): Promise<AgendamentoResponseDto[]> {
    const repositoryFilters = {
      pagamento_id: pagamentoId,
    };

    const agendamentos = await this.agendamentoRepository.findWithFilters(repositoryFilters);
    return agendamentos.map(agendamento => this.buildResponseDto(agendamento));
  }

  /**
   * Valida entidades relacionadas
   * 
   * @private
   * @param createDto Dados do agendamento
   */
  /**
   * Valida se o pagamento existe e suas relações são válidas
   * 
   * @private
   * @param createDto Dados do agendamento
   * @throws NotFoundException se o pagamento não for encontrado
   * @throws BadRequestException se houver inconsistência nos dados
   */
  private async validateRelatedEntities(createDto: CriarAgendamentoDto): Promise<void> {
    // Validar pagamento e suas relações
    const pagamento = await this.pagamentoRepository.findOne({
      where: { id: createDto.pagamento_id },
      relations: [
        'solicitacao',
        'solicitacao.beneficiario',
        'solicitacao.tecnico',
        'solicitacao.unidade'
      ],
    });

    if (!pagamento) {
      throw new NotFoundException(
        `Pagamento com ID '${createDto.pagamento_id}' não foi encontrado no sistema.`
      );
    }

    if (!pagamento.solicitacao) {
      throw new BadRequestException(
        'O pagamento informado não possui uma solicitação associada válida.'
      );
    }

    if (!pagamento.solicitacao.beneficiario) {
      throw new BadRequestException(
        'A solicitação associada ao pagamento não possui um beneficiário válido.'
      );
    }

    if (!pagamento.solicitacao.tecnico) {
      throw new BadRequestException(
        'A solicitação associada ao pagamento não possui um técnico responsável válido.'
      );
    }

    if (!pagamento.solicitacao.unidade) {
      throw new BadRequestException(
        'A solicitação associada ao pagamento não possui uma unidade válida.'
      );
    }

    // Armazenar as relações no DTO para uso posterior
    createDto.pagamento_id = pagamento.id;
  }

  /**
   * Valida regras de negócio
   * 
   * @private
   * @param createDto Dados do agendamento
   */
  /**
   * Valida regras de negócio específicas para agendamentos
   * 
   * @private
   * @param createDto Dados do agendamento
   * @throws BadRequestException se as regras de negócio não forem atendidas
   * @throws ConflictException se houver conflito com agendamentos existentes
   */
  private async validateBusinessRules(createDto: CriarAgendamentoDto): Promise<void> {
    const dataAgendamento = new Date(createDto.data_agendamento);
    const agora = new Date();
    const businessErrors: string[] = [];

    // Validar se a data não é no passado
    if (dataAgendamento <= agora) {
      const dataFormatada = dataAgendamento.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      businessErrors.push(
        `A data de agendamento (${dataFormatada}) não pode ser no passado. Selecione uma data futura.`
      );
    }

    // Validar se a data não é muito distante no futuro (ex: máximo 6 meses)
    const seiseMesesFuturo = new Date();
    seiseMesesFuturo.setMonth(seiseMesesFuturo.getMonth() + 6);
    if (dataAgendamento > seiseMesesFuturo) {
      businessErrors.push(
        'Não é possível agendar visitas com mais de 6 meses de antecedência.'
      );
    }

    // Validar horário de funcionamento (8h às 17h, segunda a sexta)
    const diaSemana = dataAgendamento.getDay();
    const hora = dataAgendamento.getHours();
    
    if (diaSemana === 0 || diaSemana === 7) {
      businessErrors.push(
        'Agendamentos só podem ser realizados de segunda a sexta-feira.'
      );
    }

    // Se houver erros de regras básicas, lançar antes de verificar conflitos
    if (businessErrors.length > 0) {
      const errorMessage = businessErrors.length === 1 
        ? businessErrors[0]
        : `Foram encontrados os seguintes problemas:\n${businessErrors.map((error, index) => `${index + 1}. ${error}`).join('\n')}`;
      
      throw new BadRequestException(errorMessage);
    }

    // Verificar se não há agendamento muito próximo para o mesmo beneficiário
    try {
      const agendamentoRecente = await this.agendamentoRepository.findRecentScheduleForPagamento(
        createDto.pagamento_id,
        dataAgendamento,
        7
      );

      if (agendamentoRecente) {
        const dataExistente = new Date(agendamentoRecente.data_agendamento).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        throw new ConflictException(
          `Já existe um agendamento para este beneficiário em ${dataExistente}. ` +
          'Aguarde pelo menos 7 dias entre agendamentos para o mesmo beneficiário.'
        );
      }
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      
      this.logger.warn(
        `Erro ao verificar agendamentos recentes para pagamento ${createDto.pagamento_id}: ${error.message}`
      );
      // Continua o processo mesmo se a verificação falhar
    }
  }

  /**
   * Verifica conflitos de agendamento
   * 
   * @private
   * @param createDto Dados do agendamento
   * @param excludeId ID para excluir da verificação (usado em reagendamentos)
   */
  /**
   * Verifica conflitos de agendamento com outros compromissos
   * 
   * @private
   * @param createDto Dados do agendamento
   * @param excludeId ID para excluir da verificação (usado em reagendamentos)
   * @throws ConflictException se houver conflito de horário
   */
  private async checkSchedulingConflicts(
    createDto: CriarAgendamentoDto,
    excludeId?: string,
  ): Promise<void> {
    const dataAgendamento = new Date(createDto.data_agendamento);

    try {
      const conflito = await this.agendamentoRepository.findConflictingSchedule(
         createDto.pagamento_id,
         dataAgendamento,
         excludeId,
       );

      if (conflito) {
        const dataConflito = new Date(conflito.data_agendamento).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        const tipoVisitaConflito = getTipoVisitaLabel(conflito.tipo_visita);
        
        throw new ConflictException(
          `O técnico selecionado já possui um agendamento em ${dataConflito} ` +
          `(${tipoVisitaConflito}). Escolha outro horário ou técnico.`
        );
      }
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      
      this.logger.error(
        `Erro ao verificar conflitos de agendamento para pagamento ${createDto.pagamento_id}`,
        {
          error: error.message,
          pagamento_id: createDto.pagamento_id,
          data_agendamento: createDto.data_agendamento,
        }
      );
      
      // Em caso de erro na verificação, permitir o agendamento mas logar o problema
      this.logger.warn(
        'Verificação de conflitos falhou, mas agendamento será permitido. Verifique manualmente.'
      );
    }
  }

  /**
   * Busca todos os agendamentos com paginação
   * 
   * @param filtros Filtros de busca
   * @param paginationParams Parâmetros de paginação
   * @returns Lista paginada de agendamentos
   */
  async buscarTodos(
    filtros?: any,
    paginationParams?: PaginationParamsDto,
  ): Promise<PaginatedResponseDto<AgendamentoResponseDto>> {
    try {
      const repositoryFilters = this.convertToRepositoryFilters(filtros);
      
      const { items, total, page, limit } = await this.agendamentoRepository.findWithPagination(
        repositoryFilters,
        paginationParams,
      );

      const agendamentosDto = items.map(agendamento =>
        this.buildResponseDto(agendamento),
      );

      return PaginationHelper.createPaginatedResponse(
        agendamentosDto,
        page,
        limit,
        total,
      );
    } catch (error) {
      this.logger.error(`Erro ao buscar agendamentos: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  /**
   * Busca todos os agendamentos com paginação (método legado)
   * 
   * @deprecated Use buscarTodos com PaginationParamsDto
   * @param filtros Filtros de busca
   * @param page Página atual
   * @param limit Limite de itens por página
   * @returns Lista paginada de agendamentos
   */
  async buscarTodosLegacy(
    filtros?: any,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    agendamentos: AgendamentoResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const paginationParams = PaginationHelper.applyDefaults({ page, limit });
    const result = await this.buscarTodos(filtros, paginationParams);
    
    return {
      agendamentos: result.items,
      total: result.meta.total,
      page: result.meta.page,
      limit: result.meta.limit,
      totalPages: result.meta.pages,
    };
  }

  /**
   * Busca agendamento por ID
   */
  async buscarPorId(id: string): Promise<AgendamentoResponseDto> {
    try {
      const agendamento = await this.agendamentoRepository.findByIdWithRelations(id);
      
      if (!agendamento) {
        throw new NotFoundException(`Agendamento com ID ${id} não encontrado`);
      }
      
      return this.buildResponseDto(agendamento);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erro ao buscar agendamento ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Busca agendamentos em atraso com paginação
   */
  async buscarEmAtraso(
    filters: any,
    paginationParams?: PaginationParamsDto,
  ): Promise<PaginatedResponseDto<AgendamentoResponseDto>> {
    try {
      // Aplicar valores padrão e validar parâmetros de paginação
      const validatedParams = PaginationHelper.applyDefaults(paginationParams);
      
      const repositoryFilters = {
        ...this.convertToRepositoryFilters(filters),
        em_atraso: true,
      };
      
      const { items, total } = await this.agendamentoRepository.findWithPagination(
        repositoryFilters,
        validatedParams,
      );
      
      const agendamentosDto = items.map(agendamento => this.buildResponseDto(agendamento));
      
      return PaginationHelper.createPaginatedResponse(
        agendamentosDto,
        validatedParams.page,
        validatedParams.limit,
        total,
      );
    } catch (error) {
      this.logger.error(`Erro ao buscar agendamentos em atraso: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Busca agendamentos em atraso (método legado para compatibilidade)
   * @deprecated Use buscarEmAtraso com PaginationParamsDto
   */
  async buscarEmAtrasoLegacy(filters: any): Promise<{ agendamentos: AgendamentoResponseDto[]; total: number }> {
    try {
      const repositoryFilters = {
        ...this.convertToRepositoryFilters(filters),
        em_atraso: true,
      };
      
      const agendamentos = await this.agendamentoRepository.findWithFilters(repositoryFilters);
      
      return {
        agendamentos: agendamentos.map(agendamento => this.buildResponseDto(agendamento)),
        total: agendamentos.length,
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar agendamentos em atraso: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Busca agendamentos por técnico com paginação
   */
  async buscarPorTecnico(
    tecnicoId: string,
    filters: any,
    paginationParams?: PaginationParamsDto,
  ): Promise<PaginatedResponseDto<AgendamentoResponseDto>> {
    try {
      // Aplicar valores padrão e validar parâmetros de paginação
      const validatedParams = PaginationHelper.applyDefaults(paginationParams);
      
      const repositoryFilters = {
        ...this.convertToRepositoryFilters(filters),
        tecnico_id: tecnicoId,
      };
      
      const { items, total } = await this.agendamentoRepository.findWithPagination(
        repositoryFilters,
        validatedParams,
      );
      
      const agendamentosDto = items.map(agendamento => this.buildResponseDto(agendamento));
      
      return PaginationHelper.createPaginatedResponse(
        agendamentosDto,
        validatedParams.page,
        validatedParams.limit,
        total,
      );
    } catch (error) {
      this.logger.error(`Erro ao buscar agendamentos por técnico ${tecnicoId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Busca agendamentos por técnico (método legado para compatibilidade)
   * @deprecated Use buscarPorTecnico com PaginationParamsDto
   */
  async buscarPorTecnicoLegacy(tecnicoId: string, filters: any): Promise<{ agendamentos: AgendamentoResponseDto[]; total: number }> {
    try {
      const repositoryFilters = {
        ...this.convertToRepositoryFilters(filters),
        tecnico_id: tecnicoId,
      };
      
      const agendamentos = await this.agendamentoRepository.findWithFilters(repositoryFilters);
      
      return {
        agendamentos: agendamentos.map(agendamento => this.buildResponseDto(agendamento)),
        total: agendamentos.length,
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar agendamentos por técnico ${tecnicoId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Busca agendamentos por pagamento com paginação
   */
  async buscarPorPagamento(
    pagamentoId: string,
    filters: any,
    paginationParams?: PaginationParamsDto,
  ): Promise<PaginatedResponseDto<AgendamentoResponseDto>> {
    try {
      // Aplicar valores padrão e validar parâmetros de paginação
      const validatedParams = PaginationHelper.applyDefaults(paginationParams);
      
      const repositoryFilters = {
        ...this.convertToRepositoryFilters(filters),
        pagamento_id: pagamentoId,
      };
      
      const { items, total } = await this.agendamentoRepository.findWithPagination(
        repositoryFilters,
        validatedParams,
      );
      
      const agendamentosDto = items.map(agendamento => this.buildResponseDto(agendamento));
      
      return PaginationHelper.createPaginatedResponse(
        agendamentosDto,
        validatedParams.page,
        validatedParams.limit,
        total,
      );
    } catch (error) {
      this.logger.error(`Erro ao buscar agendamentos por pagamento ${pagamentoId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Busca agendamentos por pagamento (método legado para compatibilidade)
   * @deprecated Use buscarPorPagamento com PaginationParamsDto
   */
  async buscarPorPagamentoLegacy(pagamentoId: string, filters: any): Promise<{ agendamentos: AgendamentoResponseDto[]; total: number }> {
    try {
      const repositoryFilters = {
        ...this.convertToRepositoryFilters(filters),
        pagamento_id: pagamentoId,
      };
      
      const agendamentos = await this.agendamentoRepository.findWithFilters(repositoryFilters);
      
      return {
        agendamentos: agendamentos.map(agendamento => this.buildResponseDto(agendamento)),
        total: agendamentos.length,
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar agendamentos por pagamento ${pagamentoId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Confirma um agendamento
   */
  async confirmarAgendamento(id: string): Promise<AgendamentoResponseDto> {
    return this.confirmar(id);
  }

  /**
   * Reagenda uma visita
   */
  async reagendarVisita(id: string, novaData: Date, motivo?: string): Promise<AgendamentoResponseDto> {
    return this.reagendar(id, novaData, motivo);
  }

  /**
   * Cancela um agendamento
   */
  async cancelarAgendamento(id: string, motivo: string, responsavel: string): Promise<AgendamentoResponseDto> {
    return this.cancelar(id, motivo, responsavel);
  }

  /**
   * Converte filtros para o formato do repository
   * 
   * @private
   * @param filtros Filtros de entrada
   * @returns Filtros formatados para o repository
   */
  private convertToRepositoryFilters(filtros?: any): any {
    if (!filtros) return {};
    
    return {
      beneficiario_id: filtros.beneficiario_id,
      tecnico_id: filtros.tecnico_id,
      unidade_id: filtros.unidade_id,
      status: filtros.status,
      tipo_visita: filtros.tipo_visita,
      prioridade: filtros.prioridade,
      data_inicio: filtros.data_inicio,
      data_fim: filtros.data_fim,
      em_atraso: filtros.em_atraso,
    };
  }

  /**
   * Constrói o DTO de resposta
   * 
   * @private
   * @param agendamento Entidade do agendamento
   * @returns DTO de resposta formatado
   */
  private buildResponseDto(agendamento: AgendamentoVisita): AgendamentoResponseDto {
    const agora = new Date();
    const dataAgendamento = new Date(agendamento.data_agendamento);
    const emAtraso = dataAgendamento < agora && isStatusAgendamentoAtivo(agendamento.status);
    const diasAtraso = emAtraso
      ? Math.floor((agora.getTime() - dataAgendamento.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const prazoLimite = new Date(
      dataAgendamento.getTime() + getPrioridadeVisitaPrazo(agendamento.prioridade) * 24 * 60 * 60 * 1000,
    );

    return {
      id: agendamento.id,
      pagamento_id: agendamento.pagamento_id,
      beneficiario: {
        id: agendamento.pagamento.solicitacao.beneficiario.id,
        nome: agendamento.pagamento.solicitacao.beneficiario.nome,
        cpf: agendamento.pagamento.solicitacao.beneficiario.cpf,
        telefone: agendamento.pagamento.solicitacao.beneficiario.contatos?.[0].telefone,
      },
      tecnico_responsavel: {
        id: agendamento.pagamento.solicitacao.tecnico_id,
        nome: agendamento.pagamento.solicitacao.tecnico?.nome || 'N/A',
        matricula: agendamento.pagamento.solicitacao.tecnico?.matricula || 'N/A',
        cargo: agendamento.pagamento.solicitacao.tecnico?.role?.nome || 'Técnico',
      },
      unidade: {
        id: agendamento.pagamento.solicitacao.unidade.id,
        nome: agendamento.pagamento.solicitacao.unidade.nome,
        codigo: agendamento.pagamento.solicitacao.unidade.codigo,
        endereco: agendamento.pagamento.solicitacao.unidade.endereco,
      },
      data_agendamento: agendamento.data_agendamento,
      tipo_visita: agendamento.tipo_visita,
      tipo_visita_label: getTipoVisitaLabel(agendamento.tipo_visita),
      prioridade: agendamento.prioridade,
      prioridade_label: getPrioridadeVisitaLabel(agendamento.prioridade),
      prioridade_cor: getPrioridadeVisitaCor(agendamento.prioridade),
      status: agendamento.status,
      status_label: getStatusAgendamentoLabel(agendamento.status),
      observacoes: agendamento.observacoes,
      endereco_visita: agendamento.endereco_visita,
      telefone_contato: agendamento.pagamento.solicitacao.beneficiario?.contatos?.[0]?.telefone || null,
      motivo_visita: agendamento.tipo_visita,
      notificar_beneficiario: agendamento.notificar_beneficiario || false,
      em_atraso: emAtraso,
      dias_atraso: diasAtraso > 0 ? diasAtraso : undefined,
      prazo_limite: prazoLimite.toISOString(),
      visita_realizada: null,
      created_at: agendamento.created_at.toISOString(),
      updated_at: agendamento.updated_at.toISOString(),
    };
  }
}