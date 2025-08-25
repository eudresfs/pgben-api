import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { VisitaDomiciliar } from '../entities/visita-domiciliar.entity';
import { AgendamentoVisita } from '../entities/agendamento-visita.entity';
import { ResultadoVisita, TipoVisita } from '../../../enums';
import { PaginationParamsDto } from '../../../shared/dtos/pagination-params.dto';
import { PaginationHelper } from '../helpers/pagination.helper';

/**
 * Interface para filtros de busca de visitas
 */
export interface VisitaFilters {
  beneficiario_id?: string;
  tecnico_id?: string;
  unidade_id?: string;
  resultado?: ResultadoVisita[];
  tipo_visita?: TipoVisita[];
  data_inicio?: Date;
  data_fim?: Date;
  recomenda_renovacao?: boolean;
  necessita_nova_visita?: boolean;
  criterios_elegibilidade_mantidos?: boolean;
}

/**
 * Interface para paginação (legado)
 * @deprecated Use PaginationParamsDto
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

/**
 * Interface para resultado de busca paginada
 */
export interface PaginatedVisitaResult {
  items: VisitaDomiciliar[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Repository responsável pelas operações de persistência de visitas domiciliares.
 * 
 * @description
 * Centraliza todas as operações de banco de dados relacionadas às visitas,
 * incluindo criação, busca, atualização e consultas específicas.
 * 
 * @author Sistema PGBEN
 * @since 2025-01-15
 */
@Injectable()
export class VisitaRepository {
  constructor(
    @InjectRepository(VisitaDomiciliar)
    private readonly visitaRepository: Repository<VisitaDomiciliar>,
    @InjectRepository(AgendamentoVisita)
    private readonly agendamentoRepository: Repository<AgendamentoVisita>,
  ) {}

  /**
   * Cria uma nova instância de visita sem salvar no banco
   * 
   * @param visitaData Dados da visita
   * @returns Instância da visita criada
   */
  create(visitaData: Partial<VisitaDomiciliar>): VisitaDomiciliar {
    return this.visitaRepository.create(visitaData);
  }

  /**
   * Expõe o createQueryBuilder do TypeORM
   */
  createQueryBuilder(alias: string) {
    return this.visitaRepository.createQueryBuilder(alias);
  }

  /**
   * Expõe o findOne do TypeORM
   */
  findOne(options: any) {
    return this.visitaRepository.findOne(options);
  }

  /**
   * Salva uma visita no banco de dados
   * 
   * @param visita Visita a ser salva
   * @returns Visita salva
   */
  async save(visita: VisitaDomiciliar): Promise<VisitaDomiciliar> {
    return this.visitaRepository.save(visita);
  }

  /**
   * Busca uma visita por ID
   * 
   * @param id ID da visita
   * @returns Visita encontrada ou null
   */
  async findById(id: string): Promise<VisitaDomiciliar | null> {
    return this.visitaRepository.findOne({
      where: { id },
    });
  }

  /**
   * Busca uma visita por ID com relacionamentos
   * 
   * @param id ID da visita
   * @returns Visita encontrada com relacionamentos ou null
   */
  async findByIdWithRelations(id: string): Promise<VisitaDomiciliar | null> {
    return this.visitaRepository
      .createQueryBuilder('visita')
      .leftJoinAndSelect('visita.agendamento', 'agendamento')
      .leftJoinAndSelect('visita.beneficiario', 'beneficiario')
      .leftJoinAndSelect('visita.tecnico_responsavel', 'tecnico')
      .leftJoinAndSelect('visita.unidade', 'unidade')
      .where('visita.id = :id', { id })
      .getOne();
  }

  /**
   * Busca uma visita por agendamento ID
   * 
   * @param agendamentoId ID do agendamento
   * @returns Visita encontrada ou null
   */
  async findByAgendamentoId(agendamentoId: string): Promise<VisitaDomiciliar | null> {
    return this.visitaRepository.findOne({
      where: { agendamento_id: agendamentoId },
    });
  }

  /**
   * Busca visitas com filtros
   * 
   * @param filters Filtros de busca
   * @returns Lista de visitas
   */
  async findWithFilters(filters?: VisitaFilters): Promise<VisitaDomiciliar[]> {
    const queryBuilder = this.buildBaseQueryBuilder();
    this.applyFilters(queryBuilder, filters);
    queryBuilder.orderBy('visita.data_visita', 'DESC');
    
    return queryBuilder.getMany();
  }

  /**
   * Busca visitas com filtros e paginação
   * 
   * @param filters Filtros de busca
   * @param paginationParams Parâmetros de paginação
   * @param orderBy Campo para ordenação
   * @param orderDirection Direção da ordenação
   * @returns Lista paginada de visitas
   */
  async findWithFiltersAndPagination(
    filters?: VisitaFilters,
    paginationParams?: PaginationParamsDto,
    orderBy: string = 'visita.data_visita',
    orderDirection: 'ASC' | 'DESC' = 'DESC',
  ): Promise<PaginatedVisitaResult> {
    // Aplica valores padrão e valida parâmetros
    const params = PaginationHelper.applyDefaults(paginationParams || {});
    PaginationHelper.validatePaginationParams(params);
    
    // Converte para parâmetros de repository
    const { page, limit, offset } = PaginationHelper.convertToRepositoryParams(params);
    
    const queryBuilder = this.buildBaseQueryBuilder();
    this.applyFilters(queryBuilder, filters);
    
    // Aplicar ordenação
    queryBuilder.orderBy(orderBy, orderDirection);
    
    // Aplicar paginação
    const [items, total] = await queryBuilder
      .skip(offset)
      .take(limit)
      .getManyAndCount();
    
    return { items, total, page, limit };
  }
  
  /**
   * Busca visitas com filtros e paginação (método legado)
   * 
   * @deprecated Use findWithFiltersAndPagination com PaginationParamsDto
   * @param filters Filtros de busca
   * @param pagination Opções de paginação
   * @returns Lista paginada de visitas
   */
  async findWithFiltersAndPaginationLegacy(
    filters?: VisitaFilters,
    pagination?: PaginationOptions,
  ): Promise<{ visitas: VisitaDomiciliar[]; total: number }> {
    const paginationParams = pagination ? 
      PaginationHelper.applyDefaults({
        page: pagination.page,
        limit: pagination.limit,
      }) : undefined;
    
    const orderBy = pagination?.orderBy || 'visita.data_visita';
    const orderDirection = pagination?.orderDirection || 'DESC';
    
    const result = await this.findWithFiltersAndPagination(
      filters,
      paginationParams,
      orderBy,
      orderDirection,
    );
    
    return { visitas: result.items, total: result.total };
  }

  /**
   * Busca visitas por beneficiário
   * 
   * @param beneficiarioId ID do beneficiário
   * @returns Lista de visitas do beneficiário
   */
  async findByBeneficiario(beneficiarioId: string): Promise<VisitaDomiciliar[]> {
    return this.findWithFilters({ beneficiario_id: beneficiarioId });
  }

  /**
   * Busca visitas por técnico
   * 
   * @param tecnicoId ID do técnico
   * @param dataInicio Data de início (opcional)
   * @param dataFim Data de fim (opcional)
   * @returns Lista de visitas do técnico
   */
  async findByTecnico(
    tecnicoId: string,
    dataInicio?: Date,
    dataFim?: Date,
  ): Promise<VisitaDomiciliar[]> {
    return this.findWithFilters({
      tecnico_id: tecnicoId,
      data_inicio: dataInicio,
      data_fim: dataFim,
    });
  }

  /**
   * Busca visitas que recomendam renovação
   * 
   * @returns Lista de visitas que recomendam renovação
   */
  async findRecomendamRenovacao(): Promise<VisitaDomiciliar[]> {
    return this.findWithFilters({ recomenda_renovacao: true });
  }

  /**
   * Busca visitas que necessitam nova visita
   * 
   * @returns Lista de visitas que necessitam nova visita
   */
  async findNecessitamNovaVisita(): Promise<VisitaDomiciliar[]> {
    return this.findWithFilters({ necessita_nova_visita: true });
  }

  /**
   * Busca visitas com critérios de elegibilidade não mantidos
   * 
   * @returns Lista de visitas com problemas de elegibilidade
   */
  async findComProblemasElegibilidade(): Promise<VisitaDomiciliar[]> {
    return this.findWithFilters({ criterios_elegibilidade_mantidos: false });
  }

  /**
   * Busca visitas por resultado
   * 
   * @param resultado Resultado da visita
   * @returns Lista de visitas com o resultado especificado
   */
  async findByResultado(resultado: ResultadoVisita): Promise<VisitaDomiciliar[]> {
    return this.findWithFilters({ resultado: [resultado] });
  }

  /**
   * Busca visitas por tipo
   * 
   * @param tipoVisita Tipo da visita
   * @returns Lista de visitas do tipo especificado
   */
  async findByTipo(tipoVisita: TipoVisita): Promise<VisitaDomiciliar[]> {
    return this.findWithFilters({ tipo_visita: [tipoVisita] });
  }

  /**
   * Busca visitas por unidade
   * 
   * @param unidadeId ID da unidade
   * @returns Lista de visitas da unidade
   */
  async findByUnidade(unidadeId: string): Promise<VisitaDomiciliar[]> {
    return this.findWithFilters({ unidade_id: unidadeId });
  }

  /**
   * Conta visitas por resultado
   * 
   * @param resultado Resultado da visita
   * @returns Número de visitas com o resultado
   */
  async countByResultado(resultado: ResultadoVisita): Promise<number> {
    return this.visitaRepository.count({
      where: { resultado },
    });
  }

  /**
   * Conta visitas por técnico
   * 
   * @param tecnicoId ID do técnico
   * @returns Número de visitas do técnico
   */
  async countByTecnico(tecnicoId: string): Promise<number> {
    return this.visitaRepository.count({
      where: { tecnico_id: tecnicoId },
    });
  }

  /**
   * Conta visitas por beneficiário
   * 
   * @param beneficiarioId ID do beneficiário
   * @returns Número de visitas do beneficiário
   */
  async countByBeneficiario(beneficiarioId: string): Promise<number> {
    return this.visitaRepository.count({
      where: { beneficiario_id: beneficiarioId },
    });
  }

  /**
   * Atualiza o status de um agendamento
   * 
   * @param agendamento Agendamento a ser atualizado
   * @returns Agendamento atualizado
   */
  async updateAgendamentoStatus(agendamento: AgendamentoVisita): Promise<AgendamentoVisita> {
    return this.agendamentoRepository.save(agendamento);
  }

  /**
   * Busca um agendamento por ID com relacionamentos
   * 
   * @param agendamentoId ID do agendamento
   * @returns Agendamento encontrado ou null
   */
  async findAgendamentoById(agendamentoId: string): Promise<AgendamentoVisita | null> {
    return this.agendamentoRepository.findOne({
      where: { id: agendamentoId },
      relations: ['beneficiario', 'tecnico_responsavel', 'unidade'],
    });
  }

  /**
   * Remove uma visita do banco de dados
   * 
   * @param visita Visita a ser removida
   * @returns Resultado da operação
   */
  async remove(visita: VisitaDomiciliar): Promise<VisitaDomiciliar> {
    return this.visitaRepository.remove(visita);
  }

  /**
   * Constrói o query builder base com relacionamentos
   * 
   * @private
   * @returns Query builder configurado
   */
  private buildBaseQueryBuilder(): SelectQueryBuilder<VisitaDomiciliar> {
    return this.visitaRepository
      .createQueryBuilder('visita')
      .leftJoinAndSelect('visita.agendamento', 'agendamento')
      .leftJoinAndSelect('visita.beneficiario', 'beneficiario')
      .leftJoinAndSelect('visita.tecnico_responsavel', 'tecnico')
      .leftJoinAndSelect('visita.unidade', 'unidade');
  }

  /**
   * Aplica filtros ao query builder
   * 
   * @private
   * @param queryBuilder Query builder
   * @param filters Filtros a serem aplicados
   */
  private applyFilters(
    queryBuilder: SelectQueryBuilder<VisitaDomiciliar>,
    filters?: VisitaFilters,
  ): void {
    if (!filters) return;

    if (filters.beneficiario_id) {
      queryBuilder.andWhere('visita.beneficiario_id = :beneficiario_id', {
        beneficiario_id: filters.beneficiario_id,
      });
    }

    if (filters.tecnico_id) {
      queryBuilder.andWhere(
        'visita.tecnico_id = :tecnico_id',
        { tecnico_id: filters.tecnico_id },
      );
    }

    if (filters.unidade_id) {
      queryBuilder.andWhere('visita.unidade_id = :unidade_id', {
        unidade_id: filters.unidade_id,
      });
    }

    if (filters.resultado && filters.resultado.length > 0) {
      queryBuilder.andWhere('visita.resultado IN (:...resultado)', {
        resultado: filters.resultado,
      });
    }

    if (filters.tipo_visita && filters.tipo_visita.length > 0) {
      queryBuilder.andWhere('visita.tipo_visita IN (:...tipo_visita)', {
        tipo_visita: filters.tipo_visita,
      });
    }

    if (filters.data_inicio && filters.data_fim) {
      queryBuilder.andWhere(
        'visita.data_visita BETWEEN :data_inicio AND :data_fim',
        {
          data_inicio: filters.data_inicio,
          data_fim: filters.data_fim,
        },
      );
    }

    if (filters.recomenda_renovacao !== undefined) {
      queryBuilder.andWhere('visita.recomenda_renovacao = :recomenda_renovacao', {
        recomenda_renovacao: filters.recomenda_renovacao,
      });
    }

    if (filters.necessita_nova_visita !== undefined) {
      queryBuilder.andWhere('visita.necessita_nova_visita = :necessita_nova_visita', {
        necessita_nova_visita: filters.necessita_nova_visita,
      });
    }

    if (filters.criterios_elegibilidade_mantidos !== undefined) {
      queryBuilder.andWhere(
        'visita.criterios_elegibilidade_mantidos = :criterios_elegibilidade_mantidos',
        {
          criterios_elegibilidade_mantidos: filters.criterios_elegibilidade_mantidos,
        },
      );
    }
  }
}