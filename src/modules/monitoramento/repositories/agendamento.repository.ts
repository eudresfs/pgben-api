import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, SelectQueryBuilder } from 'typeorm';
import { AgendamentoVisita } from '../entities/agendamento-visita.entity';
import { StatusAgendamento, TipoVisita, PrioridadeVisita } from '../../../enums';

/**
 * Interface para filtros de busca de agendamentos
 */
export interface AgendamentoFilters {
  beneficiario_id?: string;
  tecnico_id?: string;
  unidade_id?: string;
  status?: StatusAgendamento[];
  tipo_visita?: TipoVisita[];
  prioridade?: PrioridadeVisita[];
  data_inicio?: Date;
  data_fim?: Date;
  em_atraso?: boolean;
}

/**
 * Repository responsável pelas operações de persistência de agendamentos.
 * 
 * @description
 * Centraliza todas as operações de banco de dados relacionadas aos agendamentos,
 * incluindo consultas complexas, filtros e relacionamentos.
 * 
 * @author Sistema PGBEN
 * @since 2025-01-15
 */
@Injectable()
export class AgendamentoRepository {
  constructor(
    @InjectRepository(AgendamentoVisita)
    private readonly repository: Repository<AgendamentoVisita>,
  ) {}

  /**
   * Cria um novo agendamento
   * 
   * @param agendamentoData Dados do agendamento
   * @returns Agendamento criado
   */
  async create(agendamentoData: Partial<AgendamentoVisita>): Promise<AgendamentoVisita> {
    const agendamento = this.repository.create({
      ...agendamentoData,
      created_at: new Date(),
      updated_at: new Date(),
    });
    return this.repository.save(agendamento);
  }

  /**
   * Salva um agendamento existente
   * 
   * @param agendamento Agendamento a ser salvo
   * @returns Agendamento salvo
   */
  async save(agendamento: AgendamentoVisita): Promise<AgendamentoVisita> {
    agendamento.updated_at = new Date();
    return this.repository.save(agendamento);
  }

  /**
   * Busca um agendamento por ID com relacionamentos
   * 
   * @param id ID do agendamento
   * @returns Agendamento encontrado ou null
   */
  async findByIdWithRelations(id: string): Promise<AgendamentoVisita | null> {
    return this.repository
      .createQueryBuilder('agendamento')
      .leftJoinAndSelect('agendamento.beneficiario', 'beneficiario')
      .leftJoinAndSelect('agendamento.concessao', 'concessao')
      .leftJoinAndSelect('concessao.solicitacao', 'solicitacao')
      .leftJoinAndSelect('solicitacao.tipo_beneficio', 'tipo_beneficio')
      .leftJoinAndSelect('agendamento.tecnico_responsavel', 'tecnico')
      .leftJoinAndSelect('tecnico.role', 'role')
      .leftJoinAndSelect('agendamento.unidade', 'unidade')
      .leftJoinAndSelect('agendamento.visitas', 'visita')
      .where('agendamento.id = :id', { id })
      .getOne();
  }

  /**
   * Busca um agendamento por ID simples
   * 
   * @param id ID do agendamento
   * @returns Agendamento encontrado ou null
   */
  async findById(id: string): Promise<AgendamentoVisita | null> {
    return this.repository.findOne({ where: { id } });
  }

  /**
   * Busca agendamentos com filtros e relacionamentos
   * 
   * @param filters Filtros de busca
   * @returns Lista de agendamentos
   */
  async findWithFilters(filters?: AgendamentoFilters): Promise<AgendamentoVisita[]> {
    const queryBuilder = this.createBaseQueryBuilder();
    this.applyFilters(queryBuilder, filters);
    return queryBuilder.getMany();
  }

  /**
   * Busca agendamentos com paginação
   * 
   * @param filters Filtros de busca
   * @param page Página
   * @param limit Limite por página
   * @returns Lista paginada de agendamentos
   */
  async findWithPagination(
    filters?: AgendamentoFilters,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ agendamentos: AgendamentoVisita[]; total: number }> {
    const queryBuilder = this.createBaseQueryBuilder();
    this.applyFilters(queryBuilder, filters);
    queryBuilder.where('agendamento.removed_at IS NULL');
    
    const [agendamentos, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { agendamentos, total };
  }

  /**
   * Busca agendamentos em atraso
   * 
   * @param filters Filtros adicionais
   * @returns Lista de agendamentos em atraso
   */
  async findEmAtraso(filters?: Omit<AgendamentoFilters, 'em_atraso'>): Promise<AgendamentoVisita[]> {
    return this.findWithFilters({ ...filters, em_atraso: true });
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
  ): Promise<AgendamentoVisita[]> {
    return this.findWithFilters({
      tecnico_id: tecnicoId,
      data_inicio: dataInicio,
      data_fim: dataFim,
    });
  }

  /**
   * Busca agendamentos por beneficiário
   * 
   * @param beneficiarioId ID do beneficiário
   * @returns Lista de agendamentos do beneficiário
   */
  async findByBeneficiario(beneficiarioId: string): Promise<AgendamentoVisita[]> {
    return this.findWithFilters({ beneficiario_id: beneficiarioId });
  }

  /**
   * Verifica conflitos de agendamento para um técnico
   * 
   * @param tecnicoId ID do técnico
   * @param dataHora Data e hora do agendamento
   * @param excludeId ID para excluir da verificação (usado em reagendamentos)
   * @returns Agendamento conflitante ou null
   */
  async findConflictingSchedule(
    tecnicoId: string,
    dataHora: Date,
    excludeId?: string,
  ): Promise<AgendamentoVisita | null> {
    const inicioJanela = new Date(dataHora.getTime() - 60 * 60 * 1000); // 1 hora antes
    const fimJanela = new Date(dataHora.getTime() + 60 * 60 * 1000); // 1 hora depois

    const queryBuilder = this.repository
      .createQueryBuilder('agendamento')
      .where('agendamento.tecnico_id = :tecnico_id', {
        tecnico_id: tecnicoId,
      })
      .andWhere('agendamento.status IN (:...status)', {
        status: [StatusAgendamento.AGENDADO, StatusAgendamento.CONFIRMADO],
      })
      .andWhere(
        'agendamento.data_agendamento BETWEEN :inicio AND :fim',
        {
          inicio: inicioJanela,
          fim: fimJanela,
        },
      );

    if (excludeId) {
      queryBuilder.andWhere('agendamento.id != :excludeId', { excludeId });
    }

    return queryBuilder.getOne();
  }

  /**
   * Busca agendamento recente para um beneficiário
   * 
   * @param beneficiarioId ID do beneficiário
   * @param dataReferencia Data de referência
   * @param diasTolerance Dias de tolerância (padrão: 7)
   * @returns Agendamento recente ou null
   */
  async findRecentScheduleForBeneficiario(
    beneficiarioId: string,
    dataReferencia: Date,
    diasTolerance: number = 7,
  ): Promise<AgendamentoVisita | null> {
    const inicioJanela = new Date(dataReferencia.getTime() - diasTolerance * 24 * 60 * 60 * 1000);
    const fimJanela = new Date(dataReferencia.getTime() + diasTolerance * 24 * 60 * 60 * 1000);

    return this.repository.findOne({
      where: {
        beneficiario_id: beneficiarioId,
        status: In([StatusAgendamento.AGENDADO, StatusAgendamento.CONFIRMADO]),
        data_agendamento: Between(inicioJanela, fimJanela),
      },
    });
  }

  /**
   * Conta agendamentos por status
   * 
   * @param filters Filtros opcionais
   * @returns Contagem por status
   */
  async countByStatus(filters?: Omit<AgendamentoFilters, 'status'>): Promise<Record<StatusAgendamento, number>> {
    const queryBuilder = this.repository.createQueryBuilder('agendamento');
    this.applyFilters(queryBuilder, filters);

    const result = await queryBuilder
      .select('agendamento.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('agendamento.status')
      .getRawMany();

    const counts = {} as Record<StatusAgendamento, number>;
    Object.values(StatusAgendamento).forEach(status => {
      counts[status] = 0;
    });

    result.forEach(row => {
      counts[row.status] = parseInt(row.count);
    });

    return counts;
  }

  /**
   * Cria o query builder base com relacionamentos
   * 
   * @private
   * @returns Query builder configurado
   */
  private createBaseQueryBuilder(): SelectQueryBuilder<AgendamentoVisita> {
    return this.repository
      .createQueryBuilder('agendamento')
      .leftJoinAndSelect('agendamento.beneficiario', 'beneficiario')
      .leftJoinAndSelect('agendamento.concessao', 'concessao')
      .leftJoinAndSelect('concessao.solicitacao', 'solicitacao')
      .leftJoinAndSelect('solicitacao.tipo_beneficio', 'tipo_beneficio')
      .leftJoinAndSelect('agendamento.tecnico_responsavel', 'tecnico')
      .leftJoinAndSelect('tecnico.role', 'role')
      .leftJoinAndSelect('agendamento.unidade', 'unidade')
      .leftJoinAndSelect('agendamento.visitas', 'visita')
      .orderBy('agendamento.data_agendamento', 'ASC');
  }

  /**
   * Aplica filtros ao query builder
   * 
   * @private
   * @param queryBuilder Query builder
   * @param filters Filtros a serem aplicados
   */
  private applyFilters(
    queryBuilder: SelectQueryBuilder<AgendamentoVisita>,
    filters?: AgendamentoFilters,
  ): void {
    if (!filters) return;

    if (filters.beneficiario_id) {
      queryBuilder.andWhere('agendamento.beneficiario_id = :beneficiario_id', {
        beneficiario_id: filters.beneficiario_id,
      });
    }

    if (filters.tecnico_id) {
      queryBuilder.andWhere(
        'agendamento.tecnico_id = :tecnico_id',
        { tecnico_id: filters.tecnico_id },
      );
    }

    if (filters.unidade_id) {
      queryBuilder.andWhere('agendamento.unidade_id = :unidade_id', {
        unidade_id: filters.unidade_id,
      });
    }

    if (filters.status && filters.status.length > 0) {
      queryBuilder.andWhere('agendamento.status IN (:...status)', {
        status: filters.status,
      });
    }

    if (filters.tipo_visita && filters.tipo_visita.length > 0) {
      queryBuilder.andWhere('agendamento.tipo_visita IN (:...tipo_visita)', {
        tipo_visita: filters.tipo_visita,
      });
    }

    if (filters.prioridade && filters.prioridade.length > 0) {
      queryBuilder.andWhere('agendamento.prioridade IN (:...prioridade)', {
        prioridade: filters.prioridade,
      });
    }

    if (filters.data_inicio && filters.data_fim) {
      queryBuilder.andWhere(
        'agendamento.data_agendamento BETWEEN :data_inicio AND :data_fim',
        {
          data_inicio: filters.data_inicio,
          data_fim: filters.data_fim,
        },
      );
    }

    if (filters.em_atraso) {
      queryBuilder.andWhere(
        'agendamento.data_agendamento < :now AND agendamento.status IN (:...statusAtivos)',
        {
          now: new Date(),
          statusAtivos: [StatusAgendamento.AGENDADO, StatusAgendamento.CONFIRMADO],
        },
      );
    }
  }
}