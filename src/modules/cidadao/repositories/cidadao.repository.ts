import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Cidadao } from '../../../entities/cidadao.entity';
import { ScopedRepository } from '../../../common/repositories/scoped-repository';

export interface FindAllOptions {
  skip?: number;
  take?: number;
  search?: string;
  bairro?: string;
  unidade_id?: string;
  includeRelations?: boolean;
}

/**
 * Repository para entidade Cidadao com aplicação automática de escopo
 *
 * @description
 * Estende ScopedRepository para aplicar automaticamente filtros de escopo
 * baseados no contexto da requisição (GLOBAL, UNIDADE, PROPRIO)
 */
@Injectable()
export class CidadaoRepository extends ScopedRepository<Cidadao> {
  constructor(private readonly dataSource: DataSource) {
    const manager = dataSource.createEntityManager();
    super(Cidadao, manager, undefined, {
      strictMode: true,
      allowGlobalScope: false,
    });
  }

  /**
   * Busca cidadãos com filtros específicos e escopo aplicado automaticamente
   *
   * @param options - Opções de busca e filtros
   * @returns Array de cidadãos e total de registros
   */
  async findAllWithFilters(
    options: FindAllOptions = {},
  ): Promise<[Cidadao[], number]> {
    const {
      skip = 0,
      take = 10,
      search,
      bairro,
      unidade_id,
      includeRelations = false,
    } = options;

    // Criar QueryBuilder com escopo aplicado automaticamente
    const query = this.createScopedQueryBuilder('cidadao');

    // Filtro adicional por unidade (além do escopo automático)
    // Útil para usuários com escopo GLOBAL que querem filtrar por unidade específica
    if (unidade_id) {
      query.andWhere('cidadao.unidade_id = :unidade_id', { unidade_id });
    }

    // Busca por nome/CPF/NIS - melhorada
    if (search && search.trim() !== '') {
      const searchTerm = search.trim();
      const searchClean = searchTerm.replace(/\D/g, ''); // Remove formatação para CPF/NIS

      const conditions: string[] = [];
      const parameters: any = {};

      // Busca por nome (case insensitive)
      conditions.push('LOWER(cidadao.nome) LIKE LOWER(:searchName)');
      parameters.searchName = `%${searchTerm}%`;

      // Busca por CPF (se o termo tem dígitos)
      if (searchClean.length > 0) {
        conditions.push('cidadao.cpf LIKE :searchCpf');
        parameters.searchCpf = `%${searchClean}%`;
      }

      // Busca por NIS (se o termo tem dígitos)
      if (searchClean.length > 0) {
        conditions.push('cidadao.nis LIKE :searchNis');
        parameters.searchNis = `%${searchClean}%`;
      }

      // Aplicar condições OR
      if (conditions.length > 0) {
        query.andWhere(`(${conditions.join(' OR ')})`, parameters);
      }
    }

    // Filtro por bairro (nova estrutura normalizada)
    if (bairro && bairro.trim() !== '') {
      query
        .leftJoin('cidadao.enderecos', 'endereco_filter')
        .andWhere('endereco_filter.bairro ILIKE :bairro', {
          bairro: `%${bairro.trim()}%`,
        })
        .andWhere('endereco_filter.data_fim_vigencia IS NULL');
    }

    // Relacionamentos
    if (includeRelations) {
      query.leftJoinAndSelect('cidadao.unidade', 'unidade');
      query.leftJoinAndSelect('cidadao.contatos', 'contato');
      query.leftJoinAndSelect('cidadao.enderecos', 'endereco');
      query.leftJoinAndSelect(
        'cidadao.composicao_familiar',
        'composicao_familiar',
      );
    } else {
      // Sempre incluir unidade, contatos e apenas o último endereço
      query.leftJoinAndSelect('cidadao.unidade', 'unidade');
      query.leftJoinAndSelect(
        'cidadao.enderecos',
        'endereco',
        'endereco.data_fim_vigencia IS NULL',
      );
    }

    return query
      .orderBy('cidadao.created_at', 'DESC')
      .skip(skip)
      .take(Math.min(take, 100))
      .getManyAndCount();
  }

  /**
   * Busca cidadão por ID com escopo aplicado automaticamente
   *
   * @param id - ID do cidadão
   * @param includeRelations - Se deve incluir relacionamentos
   * @returns Cidadão encontrado ou null
   */
  async findById(
    id: string,
    includeRelations = false,
  ): Promise<Cidadao | null> {
    const query = this.createScopedQueryBuilder('cidadao').where(
      'cidadao.id = :id',
      { id },
    );

    if (includeRelations) {
      query.leftJoinAndSelect('cidadao.unidade', 'unidade');
      query.leftJoinAndSelect('cidadao.contatos', 'contato');
      query.leftJoinAndSelect('cidadao.enderecos', 'endereco');
      query.leftJoinAndSelect(
        'cidadao.composicao_familiar',
        'composicao_familiar',
      );
    } else {
      query.leftJoinAndSelect('cidadao.unidade', 'unidade');
      query.leftJoinAndSelect(
        'cidadao.enderecos',
        'endereco',
        'endereco.data_fim_vigencia IS NULL',
      );
    }

    return query.getOne();
  }

  /**
   * Busca cidadão por CPF com escopo aplicado automaticamente
   *
   * @param cpf - CPF do cidadão
   * @param includeRelations - Se deve incluir relacionamentos
   * @returns Cidadão encontrado ou null
   */
  async findByCpf(
    cpf: string,
    includeRelations = false,
  ): Promise<Cidadao | null> {
    const cpfClean = cpf.replace(/\D/g, '');
    const query = this.createScopedQueryBuilder('cidadao').where(
      'cidadao.cpf = :cpf',
      { cpf: cpfClean },
    );

    if (includeRelations) {
      query.leftJoinAndSelect('cidadao.unidade', 'unidade');
      query.leftJoinAndSelect('cidadao.contatos', 'contato');
      query.leftJoinAndSelect('cidadao.enderecos', 'endereco');
      query.leftJoinAndSelect(
        'cidadao.composicao_familiar',
        'composicao_familiar',
      );
    } else {
      query.leftJoinAndSelect('cidadao.unidade', 'unidade');
      query.leftJoinAndSelect(
        'cidadao.enderecos',
        'endereco',
        'endereco.data_fim_vigencia IS NULL',
      );
    }

    return query.getOne();
  }

  /**
   * Busca cidadão por NIS com escopo aplicado automaticamente
   *
   * @param nis - NIS do cidadão
   * @param includeRelations - Se deve incluir relacionamentos
   * @returns Cidadão encontrado ou null
   */
  async findByNis(
    nis: string,
    includeRelations = false,
  ): Promise<Cidadao | null> {
    const nisClean = nis.replace(/\D/g, '');
    const query = this.createScopedQueryBuilder('cidadao').where(
      'cidadao.nis = :nis',
      { nis: nisClean },
    );

    if (includeRelations) {
      query.leftJoinAndSelect('cidadao.unidade', 'unidade');
      query.leftJoinAndSelect('cidadao.contatos', 'contato');
      query.leftJoinAndSelect('cidadao.enderecos', 'endereco');
      query.leftJoinAndSelect(
        'cidadao.composicao_familiar',
        'composicao_familiar',
      );
    } else {
      query.leftJoinAndSelect('cidadao.unidade', 'unidade');
      query.leftJoinAndSelect(
        'cidadao.enderecos',
        'endereco',
        'endereco.data_fim_vigencia IS NULL',
      );
    }

    return query.getOne();
  }

  /**
   * Cria um novo cidadão com validações e escopo aplicado
   *
   * @param data - Dados do cidadão
   * @returns Cidadão criado
   */
  async createCidadao(data: Partial<Cidadao>): Promise<Cidadao> {
    // Verificar duplicatas usando métodos com escopo
    if (data.cpf) {
      const existingCpf = await this.findByCpf(data.cpf);
      if (existingCpf) {
        throw new ConflictException('CPF já cadastrado');
      }
    }

    if (data.nis) {
      const existingNis = await this.findByNis(data.nis);
      if (existingNis) {
        throw new ConflictException('NIS já cadastrado');
      }
    }

    // Usar saveWithScope para aplicar campos de criação baseados no contexto
    return this.saveWithScope(data);
  }

  /**
   * Atualiza um cidadão com verificação de escopo
   *
   * @param id - ID do cidadão
   * @param data - Dados para atualização
   * @returns Cidadão atualizado
   */
  async updateCidadao(id: string, data: Partial<Cidadao>): Promise<Cidadao> {
    // Usar updateWithScope para verificar permissões de escopo
    return this.updateWithScope(id, data);
  }

  /**
   * Remove um cidadão com verificação de escopo
   *
   * @param id - ID do cidadão
   */
  async removeCidadao(id: string): Promise<void> {
    // Verificar se existe no escopo antes de remover
    const cidadao = await this.findById(id);
    if (!cidadao) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    // Usar soft delete
    await this.softDelete(id);
  }

  /**
   * Verifica se um cidadão existe no escopo atual
   *
   * @param id - ID do cidadão
   * @returns true se existe no escopo
   */
  async existsCidadao(id: string): Promise<boolean> {
    const cidadao = await this.findById(id);
    return !!cidadao;
  }

  /**
   * Busca todos os bairros disponíveis no escopo atual
   *
   * @returns Lista de bairros únicos
   */
  async findAllBairros(): Promise<string[]> {
    try {
      // Criar query com escopo aplicado
      const query = this.createScopedQueryBuilder('cidadao')
        .select('DISTINCT endereco.bairro', 'bairro')
        .innerJoin('cidadao.enderecos', 'endereco')
        .where('endereco.bairro IS NOT NULL')
        .andWhere("endereco.bairro <> ''")
        .andWhere("TRIM(endereco.bairro) <> ''")
        .andWhere('endereco.data_fim_vigencia IS NULL')
        .orderBy('endereco.bairro', 'ASC');

      const result = await query.getRawMany();

      return result
        .map((item) => item.bairro.trim())
        .filter((bairro) => bairro.length > 0);
    } catch (error) {
      console.error('Erro ao buscar bairros:', error);
      throw new Error('Erro ao buscar bairros');
    }
  }

  // ========== MÉTODOS ADMINISTRATIVOS (SEM ESCOPO) ==========

  /**
   * Busca todos os cidadãos sem aplicar escopo (uso administrativo)
   *
   * @param options - Opções de busca
   * @returns Array de cidadãos e total
   */
  async findAllGlobalAdmin(
    options: FindAllOptions = {},
  ): Promise<[Cidadao[], number]> {
    const {
      skip = 0,
      take = 10,
      search,
      bairro,
      unidade_id,
      includeRelations = false,
    } = options;

    // Usar createQueryBuilder sem escopo
    const query = this.createQueryBuilder('cidadao');

    // Aplicar filtros normalmente
    if (unidade_id) {
      query.andWhere('cidadao.unidade_id = :unidade_id', { unidade_id });
    }

    if (search && search.trim() !== '') {
      const searchTerm = search.trim();
      const searchClean = searchTerm.replace(/\D/g, '');

      const conditions: string[] = [];
      const parameters: any = {};

      conditions.push('LOWER(cidadao.nome) LIKE LOWER(:searchName)');
      parameters.searchName = `%${searchTerm}%`;

      if (searchClean.length > 0) {
        conditions.push('cidadao.cpf LIKE :searchCpf');
        parameters.searchCpf = `%${searchClean}%`;
      }

      if (searchClean.length > 0) {
        conditions.push('cidadao.nis LIKE :searchNis');
        parameters.searchNis = `%${searchClean}%`;
      }

      if (conditions.length > 0) {
        query.andWhere(`(${conditions.join(' OR ')})`, parameters);
      }
    }

    if (bairro && bairro.trim() !== '') {
      query
        .leftJoin('cidadao.enderecos', 'endereco_filter')
        .andWhere('endereco_filter.bairro ILIKE :bairro', {
          bairro: `%${bairro.trim()}%`,
        })
        .andWhere('endereco_filter.data_fim_vigencia IS NULL');
    }

    if (includeRelations) {
      query.leftJoinAndSelect('cidadao.unidade', 'unidade');
      query.leftJoinAndSelect('cidadao.contatos', 'contato');
      query.leftJoinAndSelect('cidadao.enderecos', 'endereco');
      query.leftJoinAndSelect(
        'cidadao.composicao_familiar',
        'composicao_familiar',
      );
    } else {
      query.leftJoinAndSelect('cidadao.unidade', 'unidade');
      query.leftJoinAndSelect(
        'cidadao.enderecos',
        'endereco',
        'endereco.data_fim_vigencia IS NULL',
      );
    }

    return query
      .orderBy('cidadao.created_at', 'DESC')
      .skip(skip)
      .take(Math.min(take, 100))
      .getManyAndCount();
  }
}
