import { Injectable } from '@nestjs/common';
import {
  FindOptionsWhere,
  Between,
  LessThanOrEqual,
  IsNull,
  Brackets,
  SelectQueryBuilder,
} from 'typeorm';
import { Pagamento } from '../../../entities/pagamento.entity';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { ScopedRepository } from '../../../common/repositories/scoped-repository';
import { InjectScopedRepository } from '../../../common/providers/scoped-repository.provider';
import { RequestContextHolder } from '../../../common/services/request-context-holder.service';
import { ScopeType } from '../../../enums/scope-type.enum';
import { ScopeViolationException } from '../../../common/exceptions/scope.exceptions';

/**
 * Repository para operações de banco de dados relacionadas a Pagamentos
 * Implementa o padrão Repository para isolar a lógica de acesso a dados
 */
@Injectable()
export class PagamentoRepository {
  constructor(
    @InjectScopedRepository(Pagamento)
    private readonly scopedRepository: ScopedRepository<Pagamento>,
  ) {}

  /**
   * Cria um novo pagamento
   */
  async create(dados_pagamento: Partial<Pagamento>): Promise<Pagamento> {
    const pagamento = this.scopedRepository.create(dados_pagamento);
    return await this.scopedRepository.saveWithScope(pagamento);
  }

  /**
   * Busca pagamento por ID
   */
  async findById(id: string): Promise<Pagamento | null> {
    return await this.scopedRepository
      .createScopedQueryBuilder('pagamento')
      .leftJoinAndSelect('pagamento.solicitacao', 'solicitacao')
      .leftJoinAndSelect('pagamento.concessao', 'concessao')
      .leftJoinAndSelect('pagamento.comprovantes', 'comprovantes')
      .where('pagamento.id = :id', { id })
      .getOne();
  }

  /**
   * Busca um pagamento por ID com as relações de concessão e solicitação.
   */
  async findPagamentoComRelacoes(id: string): Promise<Pagamento | null> {
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
    return await this.scopedRepository
      .createScopedQueryBuilder('pagamento')
      .where('pagamento.solicitacao_id = :solicitacao_id', { solicitacao_id })
      .orderBy('pagamento.created_at', 'DESC')
      .getMany();
  }

  /**
   * Busca pagamentos por concessão
   */
  async findByConcessao(concessao_id: string): Promise<Pagamento[]> {
    return await this.scopedRepository
      .createScopedQueryBuilder('pagamento')
      .where('pagamento.concessao_id = :concessao_id', { concessao_id })
      .orderBy('pagamento.numero_parcela', 'ASC')
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
  async findWithFilters(filtros: {
    search?: string;
    status?: StatusPagamentoEnum;
    solicitacao_id?: string;
    concessao_id?: string;
    data_inicio?: string;
    data_fim?: string;
    valorMinimo?: number;
    valorMaximo?: number;
    page?: number;
    limit?: number;
  }): Promise<{ items: Pagamento[]; total: number }> {
    const queryBuilder = this.scopedRepository
      .createScopedQueryBuilder('pagamento')
      .leftJoinAndSelect('pagamento.solicitacao', 'solicitacao')
      .leftJoin('solicitacao.tipo_beneficio', 'tipo_beneficio')
      .leftJoin('solicitacao.beneficiario', 'beneficiario')
      .leftJoin('solicitacao.unidade', 'unidade')
      .leftJoin('solicitacao.tecnico', 'tecnico')
      .leftJoin('pagamento.responsavel_liberacao', 'responsavel_liberacao')
      .leftJoin('pagamento.info_bancaria', 'info_bancaria')
      .addSelect([
        // Beneficio
        'tipo_beneficio.id',
        'tipo_beneficio.nome',
        'tipo_beneficio.codigo',
        // Beneficiário
        'beneficiario.id',
        'beneficiario.nome',
        'beneficiario.cpf',
        // Unidade
        'unidade.id',
        'unidade.nome',
        // Técnico responsável
        'tecnico.id',
        'tecnico.nome',
        // Usuário liberador
        'responsavel_liberacao.id',
        'responsavel_liberacao.nome',
        // Informações bancárias
        'info_bancaria.id',
        'info_bancaria.tipo_chave_pix',
        'info_bancaria.chave_pix',
        'info_bancaria.tipo_conta',
        'info_bancaria.banco',
        'info_bancaria.agencia',
        'info_bancaria.conta',
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

    if (filtros.solicitacao_id) {
      queryBuilder.andWhere('pagamento.solicitacao_id = :solicitacao_id', {
        solicitacao_id: filtros.solicitacao_id,
      });
    }

    if (filtros.concessao_id) {
      queryBuilder.andWhere('pagamento.concessao_id = :concessao_id', {
        concessao_id: filtros.concessao_id,
      });
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

    if (filtros.valorMinimo) {
      queryBuilder.andWhere('pagamento.valor >= :valorMinimo', {
        valorMinimo: filtros.valorMinimo,
      });
    }

    if (filtros.valorMaximo) {
      queryBuilder.andWhere('pagamento.valor <= :valorMaximo', {
        valorMaximo: filtros.valorMaximo,
      });
    }

    // Paginação
    const page = filtros.page || 1;
    const limit = filtros.limit || 10;
    const skip = (page - 1) * limit;

    queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('pagamento.created_at', 'DESC')
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
    await this.scopedRepository.deleteWithScope(id);
  }

  /**
   * Remove um pagamento (método alternativo)
   */
  async delete(id: string): Promise<void> {
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
   * Verifica se existe pagamento para solicitação
   */
  async existsBySolicitacao(solicitacao_id: string): Promise<boolean> {
    const count = await this.scopedRepository
      .createScopedQueryBuilder('pagamento')
      .where('pagamento.solicitacao_id = :solicitacao_id', { solicitacao_id })
      .getCount();
    return count > 0;
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
