import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeterminacaoJudicial } from '../../../entities/determinacao-judicial.entity';
import { CreateDeterminacaoJudicialDto, UpdateDeterminacaoJudicialDto } from '../dtos/determinacao-judicial.dto';

/**
 * Repositório para operações relacionadas às determinações judiciais
 */
@Injectable()
export class DeterminacaoJudicialRepository {
  constructor(
    @InjectRepository(DeterminacaoJudicial)
    private readonly repository: Repository<DeterminacaoJudicial>,
  ) {}

  /**
   * Cria uma nova determinação judicial
   * @param data Dados da determinação
   * @param usuarioId ID do usuário que está criando
   * @returns Determinação criada
   */
  async create(
    data: CreateDeterminacaoJudicialDto,
    usuarioId: string,
  ): Promise<DeterminacaoJudicial> {
    const determinacao = this.repository.create({
      ...data,
      created_by: usuarioId,
      updated_by: usuarioId,
    });
    return this.repository.save(determinacao);
  }

  /**
   * Busca todas as determinações judiciais
   * @param includeInactive Se deve incluir determinações inativas
   * @returns Lista de determinações
   */
  async findAll(includeInactive = false): Promise<DeterminacaoJudicial[]> {
    const query = this.repository.createQueryBuilder('determinacao')
      .leftJoinAndSelect('determinacao.processo_judicial', 'processo');

    if (!includeInactive) {
      query.where('determinacao.ativo = :ativo', { ativo: true });
    }

    return query.orderBy('determinacao.created_at', 'DESC').getMany();
  }

  /**
   * Busca uma determinação pelo ID
   * @param id ID da determinação
   * @returns Determinação encontrada ou null
   */
  async findById(id: string): Promise<DeterminacaoJudicial | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['processo_judicial'],
    });
  }

  /**
   * Busca determinações por processo judicial
   * @param processoId ID do processo judicial
   * @param includeInactive Se deve incluir determinações inativas
   * @returns Lista de determinações
   */
  async findByProcesso(
    processoId: string,
    includeInactive = false,
  ): Promise<DeterminacaoJudicial[]> {
    const query = this.repository.createQueryBuilder('determinacao')
      .leftJoinAndSelect('determinacao.processo_judicial', 'processo')
      .where('determinacao.processo_judicial_id = :processoId', { processoId });

    if (!includeInactive) {
      query.andWhere('determinacao.ativo = :ativo', { ativo: true });
    }

    return query.orderBy('determinacao.created_at', 'DESC').getMany();
  }

  /**
   * Busca determinações por cidadão
   * @param cidadaoId ID do cidadão
   * @param includeInactive Se deve incluir determinações inativas
   * @returns Lista de determinações
   */
  async findByCidadao(
    cidadaoId: string,
    includeInactive = false,
  ): Promise<DeterminacaoJudicial[]> {
    const query = this.repository.createQueryBuilder('determinacao')
      .leftJoinAndSelect('determinacao.processo_judicial', 'processo')
      .where('determinacao.cidadao_id = :cidadaoId', { cidadaoId });

    if (!includeInactive) {
      query.andWhere('determinacao.ativo = :ativo', { ativo: true });
    }

    return query.orderBy('determinacao.created_at', 'DESC').getMany();
  }

  /**
   * Busca determinações por solicitação
   * @param solicitacaoId ID da solicitação
   * @param includeInactive Se deve incluir determinações inativas
   * @returns Lista de determinações
   */
  async findBySolicitacao(
    solicitacaoId: string,
    includeInactive = false,
  ): Promise<DeterminacaoJudicial[]> {
    const query = this.repository.createQueryBuilder('determinacao')
      .leftJoinAndSelect('determinacao.processo_judicial', 'processo')
      .where('determinacao.solicitacao_id = :solicitacaoId', { solicitacaoId });

    if (!includeInactive) {
      query.andWhere('determinacao.ativo = :ativo', { ativo: true });
    }

    return query.orderBy('determinacao.created_at', 'DESC').getMany();
  }

  /**
   * Busca determinações pendentes de cumprimento
   * @param includeInactive Se deve incluir determinações inativas
   * @returns Lista de determinações
   */
  async findPendentes(includeInactive = false): Promise<DeterminacaoJudicial[]> {
    const query = this.repository.createQueryBuilder('determinacao')
      .leftJoinAndSelect('determinacao.processo_judicial', 'processo')
      .where('determinacao.cumprida = :cumprida', { cumprida: false });

    if (!includeInactive) {
      query.andWhere('determinacao.ativo = :ativo', { ativo: true });
    }

    return query.orderBy('determinacao.data_prazo', 'ASC').getMany();
  }

  /**
   * Atualiza uma determinação existente
   * @param id ID da determinação
   * @param data Dados para atualização
   * @param usuarioId ID do usuário que está atualizando
   * @returns Determinação atualizada
   */
  async update(
    id: string,
    data: UpdateDeterminacaoJudicialDto,
    usuarioId: string,
  ): Promise<DeterminacaoJudicial> {
    await this.repository.update(id, {
      ...data,
      updated_by: usuarioId,
    });
    const determinacao = await this.findById(id);
    if (!determinacao) {
      throw new NotFoundException(`Determinação judicial com ID ${id} não encontrada`);
    }
    return determinacao;
  }

  /**
   * Marca uma determinação como cumprida
   * @param id ID da determinação
   * @param observacao Observação sobre o cumprimento
   * @param usuarioId ID do usuário que está marcando como cumprida
   * @returns Determinação atualizada
   */
  async marcarComoCumprida(
    id: string,
    observacao: string,
    usuarioId: string,
  ): Promise<DeterminacaoJudicial> {
    await this.repository.update(id, {
      cumprida: true,
      data_cumprimento: new Date(),
      observacao_cumprimento: observacao,
      updated_by: usuarioId,
    });
    const determinacao = await this.findById(id);
    if (!determinacao) {
      throw new NotFoundException(`Determinação judicial com ID ${id} não encontrada`);
    }
    return determinacao;
  }

  /**
   * Ativa ou desativa uma determinação
   * @param id ID da determinação
   * @param ativo Status de ativação
   * @param usuarioId ID do usuário que está alterando o status
   * @returns Determinação atualizada
   */
  async toggleAtivo(
    id: string,
    ativo: boolean,
    usuarioId: string,
  ): Promise<DeterminacaoJudicial> {
    await this.repository.update(id, {
      ativo,
      updated_by: usuarioId,
    });
    const determinacao = await this.findById(id);
    if (!determinacao) {
      throw new NotFoundException(`Determinação judicial com ID ${id} não encontrada`);
    }
    return determinacao;
  }

  /**
   * Remove uma determinação
   * @param id ID da determinação
   */
  async remove(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
