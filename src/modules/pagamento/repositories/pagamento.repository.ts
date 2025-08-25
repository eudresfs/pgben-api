import { Injectable } from '@nestjs/common';
import {
  Brackets,
} from 'typeorm';
import { Pagamento } from '../../../entities/pagamento.entity';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { ScopedRepository } from '../../../common/repositories/scoped-repository';
import { InjectScopedRepository } from '../../../common/providers/scoped-repository.provider';
import { UuidValidator } from '../../../common/utils/uuid-validator.util';
import { raw } from 'express';

/**
 * Repository para operações de banco de dados relacionadas a Pagamentos
 * Implementa o padrão Repository para isolar a lógica de acesso a dados
 */
@Injectable()
export class PagamentoRepository {
  constructor(
    @InjectScopedRepository(Pagamento)
    private readonly scopedRepository: ScopedRepository<Pagamento>,
  ) { }

  /**
   * Cria um novo pagamento
   */
  async create(dados_pagamento: Partial<Pagamento>): Promise<Pagamento> {
    const pagamento = this.scopedRepository.create(dados_pagamento);
    return await this.scopedRepository.saveWithScope(pagamento);
  }

  /**
   * Cria um query builder com escopo
   */
  createScopedQueryBuilder(alias: string) {
    return this.scopedRepository.createScopedQueryBuilder(alias);
  }

  /**
   * Busca pagamento por ID
   */
  async findById(id: string): Promise<Pagamento | null> {
    // Validar UUID antes de usar na query
    UuidValidator.validateOrThrow(id, 'id');
    return await this.scopedRepository
      .createScopedQueryBuilder('pagamento')
      .leftJoinAndSelect('pagamento.solicitacao', 'solicitacao')
      .leftJoinAndSelect('pagamento.concessao', 'concessao')
      .where('pagamento.id = :id', { id })
      .orderBy('pagamento.created_at', 'ASC')
      .getOne();
  }

  /**
   * Busca um pagamento por ID com as relações de concessão e solicitação.
   */
  async findPagamentoComRelacoes(id: string): Promise<Pagamento | null> {
    // Validar UUID antes de usar na query
    UuidValidator.validateOrThrow(id, 'id');
    return await this.scopedRepository
      .createScopedQueryBuilder('pagamento')
      .leftJoinAndSelect('pagamento.concessao', 'concessao')
      .leftJoinAndSelect('concessao.solicitacao', 'solicitacao')
      .where('pagamento.id = :id', { id })
      .getOne();
  }

  /**
   * Busca pagamento por ID com relacionamentos específicos
   */
  async findByIdWithRelations(
    id: string,
    relations: string[] = [],
  ): Promise<Pagamento | null> {
    // Validar UUID antes de usar na query
    UuidValidator.validateOrThrow(id, 'id');
    const queryBuilder = this.scopedRepository
      .createScopedQueryBuilder('pagamento')
      .where('pagamento.id = :id', { id });

    // Adicionar relações dinamicamente
    relations.forEach((relation) => {
      queryBuilder.leftJoinAndSelect(`pagamento.${relation}`, relation);
    });

    return await queryBuilder.getOne();
  }

  /**
   * Busca pagamentos por solicitação
   */
  async findBySolicitacao(solicitacao_id: string): Promise<Pagamento[]> {
    // Validar UUID antes de usar na query
    UuidValidator.validateOrThrow(solicitacao_id, 'solicitacao_id');
    return await this.scopedRepository
      .createScopedQueryBuilder('pagamento')
      .where('pagamento.solicitacao_id = :solicitacao_id', { solicitacao_id })
      .orderBy('pagamento.created_at', 'DESC')
      .getMany();
  }

  /**
   * Busca um pagamento específico por solicitação e número da parcela
   */
  async findBySolicitacaoAndParcela(
    solicitacao_id: string,
    numero_parcela: number,
  ): Promise<Pagamento | null> {
    // Validar UUID antes de usar na query
    UuidValidator.validateOrThrow(solicitacao_id, 'solicitacao_id');
    return await this.scopedRepository
      .createScopedQueryBuilder('pagamento')
      .where('pagamento.solicitacao_id = :solicitacao_id', { solicitacao_id })
      .andWhere('pagamento.numero_parcela = :numero_parcela', { numero_parcela })
      .getOne();
  }

  /**
   * Busca uma parcela anterior específica por concessão e número da parcela
   */
  async findParcelaAnterior(
    concessao_id: string,
    numero_parcela: number,
  ): Promise<Pagamento | null> {
    // Validar UUID antes de usar na query
    UuidValidator.validateOrThrow(concessao_id, 'concessao_id');
    return await this.scopedRepository
      .createScopedQueryBuilder('pagamento')
      .where('pagamento.concessao_id = :concessao_id', { concessao_id })
      .andWhere('pagamento.numero_parcela = :numero_parcela', { numero_parcela })
      .getOne();
  }

  /**
   * Busca pagamentos por concessão
   */
  async findByConcessao(concessao_id: string): Promise<Pagamento[]> {
    // Validar UUID antes de usar na query
    UuidValidator.validateOrThrow(concessao_id, 'concessao_id');
    return await this.scopedRepository
      .createScopedQueryBuilder('pagamento')
      .where('pagamento.concessao_id = :concessao_id', { concessao_id })
      .orderBy('pagamento.numero_parcela', 'ASC')
      .getMany();
  }

  /**
   * Busca pagamentos por comprovante_id
   */
  async findByComprovanteId(comprovante_id: string): Promise<Pagamento[]> {
    // Validar UUID antes de usar na query
    UuidValidator.validateOrThrow(comprovante_id, 'comprovante_id');
    return await this.scopedRepository
      .createScopedQueryBuilder('pagamento')
      .where('pagamento.comprovante_id = :comprovante_id', { comprovante_id })
      .getMany();
  }

  /**
   * Busca pagamentos por status
   */
  async findByStatus(
    status: StatusPagamentoEnum,
    limit?: number,
  ): Promise<Pagamento[]> {
    const queryBuilder = this.scopedRepository
      .createScopedQueryBuilder('pagamento')
      .leftJoinAndSelect('pagamento.concessao', 'concessao')
      .where('pagamento.status = :status', { status })
      .orderBy('pagamento.created_at', 'DESC');

    if (limit) {
      queryBuilder.take(limit);
    }

    return await queryBuilder.getMany();
  }

  /**
   * Busca pagamentos elegíveis para liberação
   */
  async findElegiveisParaLiberacao(limite: number = 100): Promise<Pagamento[]> {
    const agora = new Date();

    return await this.scopedRepository
      .createScopedQueryBuilder('pagamento')
      .leftJoinAndSelect('pagamento.concessao', 'concessao')
      .where(
        new Brackets((qb) => {
          qb.where(
            'pagamento.status = :status AND pagamento.data_prevista_liberacao <= :agora',
            {
              status: StatusPagamentoEnum.PENDENTE,
              agora,
            },
          ).orWhere(
            'pagamento.status = :status AND pagamento.data_prevista_liberacao IS NULL',
            {
              status: StatusPagamentoEnum.PENDENTE,
            },
          );
        }),
      )
      .orderBy('pagamento.data_prevista_liberacao', 'ASC')
      .addOrderBy('pagamento.created_at', 'ASC')
      .take(limite)
      .getMany();
  }

  /**
   * Busca pagamentos vencidos
   */
  async findVencidos(): Promise<Pagamento[]> {
    const agora = new Date();

    return await this.scopedRepository
      .createScopedQueryBuilder('pagamento')
      .leftJoinAndSelect('pagamento.concessao', 'concessao')
      .where('pagamento.status = :status', {
        status: StatusPagamentoEnum.PENDENTE,
      })
      .andWhere('pagamento.data_vencimento <= :agora', { agora })
      .orderBy('pagamento.data_vencimento', 'ASC')
      .getMany();
  }

  /**
   * Busca pagamentos próximos ao vencimento (para notificação)
   */
  async findPagamentosProximosVencimento(
    dataLimite: Date,
  ): Promise<Pagamento[]> {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const limite = new Date(dataLimite);
    limite.setHours(23, 59, 59, 999);

    return await this.scopedRepository
      .createScopedQueryBuilder('pagamento')
      .leftJoinAndSelect('pagamento.concessao', 'concessao')
      .where('pagamento.status = :status', {
        status: StatusPagamentoEnum.PENDENTE,
      })
      .andWhere('pagamento.data_vencimento BETWEEN :hoje AND :limite', {
        hoje,
        limite,
      })
      .orderBy('pagamento.data_vencimento', 'ASC')
      .getMany();
  }

  /**
   * Lista com filtros e paginação
   * Retorna também o nome do benefício, unidade e usuário
   */
  async findWithFilters(
    filtros: {
      search?: string;
      status?: StatusPagamentoEnum;
      unidade_id?: string;
      solicitacao_id?: string;
      concessao_id?: string;
      data_inicio?: string;
      data_fim?: string;
      sort_by?: string;
      sort_order?: 'ASC' | 'DESC';
      valor_minimo?: number;
      valor_maximo?: number;
      page?: number;
      limit?: number;
      usuarioId?: string;
      pagamento_ids?: string[]; // Novo filtro para múltiplos IDs
      com_comprovante?: boolean; // Filtro para pagamentos com/sem comprovante
    },
  ): Promise<{ items: Pagamento[]; total: number }> {
    const queryBuilder = this.scopedRepository
      .createScopedQueryBuilder('pagamento')
      .leftJoinAndSelect('pagamento.solicitacao', 'solicitacao')
      .leftJoinAndSelect('pagamento.concessao', 'concessao')
      .leftJoin('solicitacao.tipo_beneficio', 'tipo_beneficio')
      .leftJoin('solicitacao.beneficiario', 'beneficiario')
      .addSelect([
        'beneficiario.id',
        'beneficiario.nome',
        'beneficiario.cpf',
      ])

      .leftJoin('solicitacao.unidade', 'unidade')
      .leftJoin('solicitacao.tecnico', 'tecnico')
      .leftJoin('pagamento.responsavel_liberacao', 'responsavel_liberacao')
      .leftJoin('pagamento.info_bancaria', 'info_bancaria')
      .addSelect([
        // Beneficio
        'tipo_beneficio.id',
        'tipo_beneficio.nome',
        'tipo_beneficio.codigo',
        // Unidade
        'unidade.id',
        'unidade.nome',
        // Técnico responsável
        'tecnico.id',
        'tecnico.nome',
        // Usuário liberador
        'responsavel_liberacao.id',
        'responsavel_liberacao.nome',
      ]);

    // Aplicar filtros
    if (filtros.search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('LOWER(beneficiario.nome) LIKE LOWER(:search)', {
            search: `%${filtros.search}%`,
          })
            .orWhere('beneficiario.cpf LIKE :searchExact', {
              searchExact: `%${filtros.search}%`,
            })
            .orWhere('LOWER(solicitacao.protocolo) LIKE LOWER(:search)', {
              search: `%${filtros.search}%`,
            })
            .orWhere('LOWER(tipo_beneficio.nome) LIKE LOWER(:search)', {
              search: `%${filtros.search}%`,
            })
            .orWhere('LOWER(tipo_beneficio.codigo) LIKE LOWER(:search)', {
              search: `%${filtros.search}%`,
            });
        }),
      );
    }

    if (filtros.status) {
      queryBuilder.andWhere('pagamento.status = :status', {
        status: filtros.status,
      });
    }

    if (filtros.unidade_id) {
      // Validar UUID antes de usar na query
      UuidValidator.validateOrThrow(filtros.unidade_id, 'unidade_id');
      queryBuilder.andWhere('solicitacao.unidade_id = :unidade_id', {
        unidade_id: filtros.unidade_id,
      });
    }

    if (filtros.usuarioId) {
      // Validar UUID antes de usar na query
      UuidValidator.validateOrThrow(filtros.usuarioId, 'usuarioId');
      queryBuilder.andWhere('solicitacao.tecnico_id = :usuarioId', {
        usuarioId: filtros.usuarioId,
      });
    }

    if (filtros.solicitacao_id) {
      // Validar UUID antes de usar na query
      UuidValidator.validateOrThrow(filtros.solicitacao_id, 'solicitacao_id');
      queryBuilder.andWhere('pagamento.solicitacao_id = :solicitacao_id', {
        solicitacao_id: filtros.solicitacao_id,
      });
    }

    if (filtros.concessao_id) {
      // Validar UUID antes de usar na query
      UuidValidator.validateOrThrow(filtros.concessao_id, 'concessao_id');
      queryBuilder.andWhere('pagamento.concessao_id = :concessao_id', {
        concessao_id: filtros.concessao_id,
      });
    }

    // Filtro por múltiplos IDs de pagamento
    if (filtros.pagamento_ids && filtros.pagamento_ids.length > 0) {
      // Validar todos os UUIDs antes de usar na query
      filtros.pagamento_ids.forEach((id, index) => {
        UuidValidator.validateOrThrow(id, `pagamento_ids[${index}]`);
      });

      // Usar IN clause para buscar múltiplos IDs de forma eficiente
      queryBuilder.andWhere('pagamento.id IN (:...pagamento_ids)', {
        pagamento_ids: filtros.pagamento_ids,
      });
    }

    // Filtro por presença de comprovante
    if (filtros.com_comprovante !== undefined) {
      if (filtros.com_comprovante === true) {
        // Buscar apenas pagamentos que possuem comprovante
        queryBuilder.andWhere('pagamento.comprovante_id IS NOT NULL');
      } else {
        // Buscar apenas pagamentos que não possuem comprovante
        queryBuilder.andWhere('pagamento.comprovante_id IS NULL');
      }
    }

    if (filtros.data_inicio && filtros.data_fim) {
      queryBuilder.andWhere(
        'CAST(pagamento.data_liberacao AS DATE) BETWEEN :data_inicio AND :data_fim',
        {
          data_inicio: filtros.data_inicio,
          data_fim: filtros.data_fim,
        },
      );
    }

    if (filtros.valor_minimo) {
      queryBuilder.andWhere('pagamento.valor >= :valor_minimo', {
        valor_minimo: filtros.valor_minimo,
      });
    }

    if (filtros.valor_maximo) {
      queryBuilder.andWhere('pagamento.valor <= :valor_maximo', {
        valor_maximo: filtros.valor_maximo,
      });
    }

    // Paginação
    const page = filtros.page || 1;
    const limit = filtros.limit || 10;
    const skip = (page - 1) * limit;

    queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy(`pagamento.${filtros.sort_by}`, filtros.sort_order)
      .addOrderBy('pagamento.numero_parcela', 'ASC');

    const [items, total] = await queryBuilder.getManyAndCount();

    return { items, total };
  }

  /**
   * Busca pagamentos por período
   */
  async findByPeriodo(
    data_inicio: Date,
    data_fim: Date,
    status?: StatusPagamentoEnum,
  ): Promise<Pagamento[]> {
    const queryBuilder = this.scopedRepository
      .createScopedQueryBuilder('pagamento')
      .leftJoinAndSelect('pagamento.concessao', 'concessao')
      .where('pagamento.created_at BETWEEN :data_inicio AND :data_fim', {
        data_inicio,
        data_fim,
      })
      .orderBy('pagamento.created_at', 'DESC');

    if (status) {
      queryBuilder.andWhere('pagamento.status = :status', { status });
    }

    return await queryBuilder.getMany();
  }

  /**
   * Atualiza um pagamento
   */
  async update(
    id: string,
    dadosAtualizacao: Partial<Pagamento>,
  ): Promise<Pagamento> {
    // Validar UUID antes de usar na query
    UuidValidator.validateOrThrow(id, 'id');
    const pagamento = await this.findById(id);
    if (!pagamento) {
      throw new Error('Pagamento não encontrado');
    }

    Object.assign(pagamento, dadosAtualizacao);
    return await this.scopedRepository.saveWithScope(pagamento);
  }

  /**
   * Salva um pagamento (create ou update)
   */
  async save(pagamento: Pagamento): Promise<Pagamento> {
    return await this.scopedRepository.saveWithScope(pagamento);
  }

  /**
   * Salva múltiplos pagamentos
   */
  async saveMany(pagamentos: Pagamento[]): Promise<Pagamento[]> {
    return await this.scopedRepository.save(pagamentos);
  }

  /**
   * Remove um pagamento
   */
  async remove(id: string): Promise<void> {
    // Validar UUID antes de usar na query
    UuidValidator.validateOrThrow(id, 'id');
    await this.scopedRepository.deleteWithScope(id);
  }

  /**
   * Remove um pagamento (método alternativo)
   */
  async delete(id: string): Promise<void> {
    // Validar UUID antes de usar na query
    UuidValidator.validateOrThrow(id, 'id');
    const pagamento = await this.findById(id);
    if (!pagamento) {
      throw new Error('Pagamento não encontrado');
    }
    await this.scopedRepository.deleteWithScope(pagamento.id);
  }

  /**
   * Conta pagamentos por status
   */
  async countByStatus(status: StatusPagamentoEnum): Promise<number> {
    return await this.scopedRepository
      .createScopedQueryBuilder('pagamento')
      .where('pagamento.status = :status', { status })
      .getCount();
  }

  /**
   * Busca pagamentos pendentes de monitoramento
   * Retorna pagamentos que ainda não têm agendamento/visita criado
   */
  async findPendentesMonitoramento(): Promise<any[]> {
    return await this.scopedRepository
      .createQueryBuilder('pagamento')
      .distinctOn(['pagamento.id'])
      .leftJoin('pagamento.solicitacao', 'solicitacao')
      .leftJoin('solicitacao.tipo_beneficio', 'beneficio')
      .leftJoin('solicitacao.beneficiario', 'cidadao')
      .leftJoin('cidadao.enderecos', 'endereco')
      .leftJoin('solicitacao.unidade', 'unidade')
      .leftJoin('solicitacao.tecnico', 'tecnico')
      .leftJoin('agendamento_visita', 'agendamento', 'agendamento.pagamento_id = pagamento.id')
      .where('agendamento.id IS NULL')
      .andWhere('pagamento.status = :status', { status: 'pago' })
      .andWhere('pagamento.monitorado = :monitorado', { monitorado: false })
      .andWhere('beneficio.codigo = :beneficio', { beneficio: 'aluguel-social' })
      .select([
        'pagamento.*',
        'cidadao.nome AS cidadao_nome',
        'cidadao.cpf AS cidadao_cpf',
        'endereco.bairro AS endereco_bairro',
        'unidade.id AS unidade_id',
        'unidade.nome AS unidade_nome',
        'tecnico.id AS tecnico_id',
        'tecnico.nome AS tecnico_nome'
      ])
      .orderBy('pagamento.id')
      .addOrderBy('pagamento.numero_parcela')
      .getRawMany();
  }




  /**
   * Busca estatísticas de pagamentos
   */
  async getEstatisticas(): Promise<{
    totalPagamentos: number;
    porStatus: Record<StatusPagamentoEnum, number>;
    valorTotal: number;
  }> {
    // Total de pagamentos
    const totalPagamentos = await this.scopedRepository
      .createScopedQueryBuilder('pagamento')
      .getCount();

    // Count por status
    const statusCounts = await this.scopedRepository
      .createScopedQueryBuilder('pagamento')
      .select('pagamento.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('pagamento.status')
      .getRawMany();

    const porStatus = {} as Record<StatusPagamentoEnum, number>;
    statusCounts.forEach((item) => {
      porStatus[item.status] = parseInt(item.count);
    });

    // Valor total
    const valorTotalResult = await this.scopedRepository
      .createScopedQueryBuilder('pagamento')
      .select('SUM(pagamento.valor)', 'total')
      .getRawOne();

    const valorTotal = valorTotalResult?.total || 0;

    return {
      totalPagamentos,
      porStatus,
      valorTotal: parseFloat(valorTotal),
    };
  }
}
