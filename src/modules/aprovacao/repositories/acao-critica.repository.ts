import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { AcaoCritica } from '../entities/acao-critica.entity';
import { TipoAcaoCritica } from '../enums/aprovacao.enums';

/**
 * Repository para gerenciar operações de banco de dados da entidade AcaoCritica
 * Fornece métodos específicos do domínio para consultas e operações complexas
 */
@Injectable()
export class AcaoCriticaRepository {
  constructor(
    @InjectRepository(AcaoCritica)
    private readonly repository: Repository<AcaoCritica>,
  ) {}

  /**
   * Busca uma ação crítica por código
   * @param codigo - Código único da ação crítica
   * @returns Promise<AcaoCritica | null>
   */
  async buscarPorCodigo(codigo: string): Promise<AcaoCritica | null> {
    return this.repository.findOne({
      where: { codigo },
      relations: ['configuracoes_aprovacao', 'solicitacoes_aprovacao'],
    });
  }

  /**
   * Busca ações críticas por tipo
   * @param tipo - Tipo da ação crítica
   * @returns Promise<AcaoCritica[]>
   */
  async buscarPorTipo(tipo: TipoAcaoCritica): Promise<AcaoCritica[]> {
    return this.repository.find({
      where: { tipo },
      order: { ordem: 'ASC', nome: 'ASC' },
    });
  }

  /**
   * Busca ações críticas por módulo
   * @param modulo - Nome do módulo
   * @returns Promise<AcaoCritica[]>
   */
  async buscarPorModulo(modulo: string): Promise<AcaoCritica[]> {
    return this.repository.find({
      where: { modulo, ativo: true },
      order: { ordem: 'ASC', nome: 'ASC' },
    });
  }

  /**
   * Busca ações críticas ativas
   * @returns Promise<AcaoCritica[]>
   */
  async buscarAtivas(): Promise<AcaoCritica[]> {
    return this.repository.find({
      where: { ativo: true },
      order: { modulo: 'ASC', ordem: 'ASC', nome: 'ASC' },
    });
  }

  /**
   * Busca ações críticas por tags
   * @param tags - Array de tags para buscar
   * @returns Promise<AcaoCritica[]>
   */
  async buscarPorTags(tags: string[]): Promise<AcaoCritica[]> {
    const queryBuilder = this.repository.createQueryBuilder('acao');
    
    return queryBuilder
      .where('acao.tags && :tags', { tags })
      .andWhere('acao.ativo = :ativo', { ativo: true })
      .orderBy('acao.ordem', 'ASC')
      .addOrderBy('acao.nome', 'ASC')
      .getMany();
  }

  /**
   * Busca ações críticas por controlador e método
   * @param controlador - Nome do controlador
   * @param metodo - Nome do método
   * @returns Promise<AcaoCritica[]>
   */
  async buscarPorControladorMetodo(
    controlador: string,
    metodo: string,
  ): Promise<AcaoCritica[]> {
    return this.repository.find({
      where: {
        controlador,
        metodo,
        ativo: true,
      },
      order: { ordem: 'ASC' },
    });
  }

  /**
   * Busca ações críticas que requerem justificativa
   * @returns Promise<AcaoCritica[]>
   */
  async buscarQueRequeremJustificativa(): Promise<AcaoCritica[]> {
    return this.repository.find({
      where: {
        requer_justificativa: true,
        ativo: true,
      },
      order: { nivel_criticidade: 'DESC', nome: 'ASC' },
    });
  }

  /**
   * Busca ações críticas por nível de criticidade
   * @param nivelMinimo - Nível mínimo de criticidade
   * @returns Promise<AcaoCritica[]>
   */
  async buscarPorNivelCriticidade(nivelMinimo: number): Promise<AcaoCritica[]> {
    return this.repository.find({
      where: {
        nivel_criticidade: nivelMinimo,
        ativo: true,
      },
      order: { nivel_criticidade: 'DESC', nome: 'ASC' },
    });
  }

  /**
   * Conta ações críticas por status
   * @param ativo - Status de ativação
   * @returns Promise<number>
   */
  async contarPorStatus(ativo: boolean): Promise<number> {
    return this.repository.count({ where: { ativo } });
  }

  /**
   * Busca ações críticas com paginação
   * @param skip - Número de registros para pular
   * @param take - Número de registros para retornar
   * @param filtros - Filtros opcionais
   * @returns Promise<[AcaoCritica[], number]>
   */
  async buscarComPaginacao(
    skip: number,
    take: number,
    filtros?: Partial<AcaoCritica>,
  ): Promise<[AcaoCritica[], number]> {
    const where: FindOptionsWhere<AcaoCritica> = {};
    
    if (filtros) {
      Object.assign(where, filtros);
    }

    return this.repository.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip,
      take,
      relations: ['configuracoes_aprovacao'],
    });
  }

  /**
   * Cria uma nova ação crítica
   * @param dadosAcao - Dados da ação crítica
   * @returns Promise<AcaoCritica>
   */
  async criar(dadosAcao: Partial<AcaoCritica>): Promise<AcaoCritica> {
    const acao = this.repository.create(dadosAcao);
    return this.repository.save(acao);
  }

  /**
   * Atualiza uma ação crítica
   * @param id - ID da ação crítica
   * @param dadosAtualizacao - Dados para atualização
   * @returns Promise<AcaoCritica>
   */
  async atualizar(
    id: string,
    dadosAtualizacao: Partial<AcaoCritica>,
  ): Promise<AcaoCritica> {
    await this.repository.update(id, dadosAtualizacao);
    return this.repository.findOne({ where: { id } });
  }

  /**
   * Remove uma ação crítica (soft delete)
   * @param id - ID da ação crítica
   * @returns Promise<void>
   */
  async remover(id: string): Promise<void> {
    await this.repository.update(id, { ativo: false });
  }

  /**
   * Busca ações críticas que permitem escalação
   * @returns Promise<AcaoCritica[]>
   */
  async buscarQuePermitemEscalacao(): Promise<AcaoCritica[]> {
    return this.repository.find({
      where: {
        permite_escalacao: true,
        ativo: true,
      },
      order: { tempo_limite_horas: 'ASC' },
    });
  }

  /**
   * Busca estatísticas de uso das ações críticas
   * @returns Promise<any[]>
   */
  async buscarEstatisticasUso(): Promise<any[]> {
    return this.repository
      .createQueryBuilder('acao')
      .select('acao.codigo', 'codigo')
      .addSelect('acao.nome', 'nome')
      .addSelect('COUNT(sol.id)', 'total_solicitacoes')
      .leftJoin('acao.solicitacoes_aprovacao', 'sol')
      .where('acao.ativo = :ativo', { ativo: true })
      .groupBy('acao.id, acao.codigo, acao.nome')
      .orderBy('COUNT(sol.id)', 'DESC')
      .getRawMany();
  }

  /**
   * Verifica se existe uma ação crítica com o código especificado
   * @param codigo - Código da ação crítica
   * @param excluirId - ID para excluir da verificação (útil para updates)
   * @returns Promise<boolean>
   */
  async existePorCodigo(codigo: string, excluirId?: string): Promise<boolean> {
    const where: FindOptionsWhere<AcaoCritica> = { codigo };
    
    if (excluirId) {
      where.id = { $ne: excluirId } as any;
    }

    const count = await this.repository.count({ where });
    return count > 0;
  }
}