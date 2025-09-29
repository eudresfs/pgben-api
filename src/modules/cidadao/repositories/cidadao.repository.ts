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
  include_removed?: boolean;
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
      include_removed = false,
    } = options;

    // Criar QueryBuilder com escopo aplicado automaticamente
    const query = this.createScopedQueryBuilder('cidadao');

    // Aplicar filtro de soft delete (por padrão, excluir registros removidos)
    if (!include_removed) {
      query.andWhere('cidadao.removed_at IS NULL');
    }

    // JOIN com composição familiar para busca
    query.leftJoin('cidadao.composicao_familiar', 'composicao_familiar_search');

    // Filtro adicional por unidade (além do escopo automático)
    // Útil para usuários com escopo GLOBAL que querem filtrar por unidade específica
    if (unidade_id) {
      query.andWhere('cidadao.unidade_id = :unidade_id', { unidade_id });
    }

    // Busca por nome/CPF/NIS - melhorada com flag de composição familiar
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

      // Busca por CPF na composição familiar (se o termo tem dígitos)
      if (searchClean.length > 0) {
        conditions.push(
          'composicao_familiar_search.cpf LIKE :searchCpfFamiliar',
        );
        parameters.searchCpfFamiliar = `%${searchClean}%`;
      }

      // Busca por NIS na composição familiar (se o termo tem dígitos)
      if (searchClean.length > 0) {
        conditions.push(
          'composicao_familiar_search.nis LIKE :searchNisFamiliar',
        );
        parameters.searchNisFamiliar = `%${searchClean}%`;
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

      // Adicionar flag para identificar se foi encontrado por composição familiar
      // Só adiciona a flag quando há busca por CPF (searchClean tem dígitos)
      if (searchClean.length > 0) {
        query.addSelect(
          `CASE 
            WHEN composicao_familiar_search.cpf IS NOT NULL 
            AND cidadao.cpf != '${searchClean}' 
            THEN true 
            ELSE false 
          END`,
          'encontrado_por_composicao_familiar',
        );
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

    // Relacionamentos - sempre carregar relações essenciais
    query.leftJoinAndSelect('cidadao.unidade', 'unidade');
    query.leftJoinAndSelect('cidadao.info_bancaria', 'info_bancaria');

    if (includeRelations) {
      query.leftJoinAndSelect('cidadao.contatos', 'contato');
      query.leftJoinAndSelect('cidadao.enderecos', 'endereco');
      query.leftJoinAndSelect(
        'cidadao.composicao_familiar',
        'composicao_familiar',
      );
    } else {
      // Carregar apenas endereço vigente quando não incluir todas as relações
      query.leftJoinAndSelect(
        'cidadao.enderecos',
        'endereco',
        'endereco.data_fim_vigencia IS NULL',
      );
    }

    // Quando há busca por CPF, precisamos usar getRawAndEntities para obter a flag calculada
    if (
      search &&
      search.trim() !== '' &&
      search.replace(/\D/g, '').length > 0
    ) {
      const result = await query
        .orderBy('cidadao.created_at', 'DESC')
        .skip(skip)
        .take(Math.min(take, 100))
        .getRawAndEntities();

      const rawResults = result.raw;
      const entities = result.entities;

      // Mapear a flag calculada para as entidades
      const entitiesWithFlag = entities.map((entity, index) => {
        const rawResult = rawResults[index];
        if (
          rawResult &&
          rawResult.encontrado_por_composicao_familiar !== undefined
        ) {
          (entity as any).encontrado_por_composicao_familiar =
            rawResult.encontrado_por_composicao_familiar;
        }
        return entity;
      });

      // Para obter o count total, fazemos uma query separada
      const countQuery = this.createScopedQueryBuilder('cidadao');

      if (unidade_id) {
        countQuery.andWhere('cidadao.unidade_id = :unidade_id', { unidade_id });
      }

      const searchTerm = search.trim();
      const searchClean = searchTerm.replace(/\D/g, '');
      const conditions: string[] = [];
      const parameters: any = {};

      conditions.push('LOWER(cidadao.nome) LIKE LOWER(:searchName)');
      parameters.searchName = `%${searchTerm}%`;

      if (searchClean.length > 0) {
        conditions.push('cidadao.cpf LIKE :searchCpf');
        parameters.searchCpf = `%${searchClean}%`;

        // Adicionar busca na composição familiar
        countQuery.leftJoin(
          'cidadao.composicao_familiar',
          'composicao_familiar_count',
          'composicao_familiar_count.cpf = :searchCleanCount',
          { searchCleanCount: searchClean },
        );
        conditions.push('composicao_familiar_count.cpf = :searchCpfFamiliar');
        parameters.searchCpfFamiliar = searchClean;
      }

      if (searchClean.length > 0) {
        conditions.push('cidadao.nis LIKE :searchNis');
        parameters.searchNis = `%${searchClean}%`;
      }

      if (conditions.length > 0) {
        countQuery.andWhere(`(${conditions.join(' OR ')})`, parameters);
      }

      if (bairro && bairro.trim() !== '') {
        countQuery
          .leftJoin('cidadao.enderecos', 'endereco_count')
          .andWhere('endereco_count.bairro ILIKE :bairroCount', {
            bairroCount: `%${bairro.trim()}%`,
          })
          .andWhere('endereco_count.data_fim_vigencia IS NULL');
      }

      const total = await countQuery.getCount();

      return [entitiesWithFlag, total];
    }

    // Para buscas sem CPF, usar o método normal
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
    include_removed = false,
  ): Promise<Cidadao | null> {
    const query = this.createScopedQueryBuilder('cidadao').where(
      'cidadao.id = :id',
      { id },
    );

    // Aplicar filtro de soft delete se necessário
    if (!include_removed) {
      query.andWhere('cidadao.removed_at IS NULL');
    }

    // Sempre carregar relações essenciais
    query.leftJoinAndSelect('cidadao.unidade', 'unidade');
    query.leftJoinAndSelect('cidadao.info_bancaria', 'info_bancaria');

    if (includeRelations) {
      query.leftJoinAndSelect('cidadao.contatos', 'contato');
      query.leftJoinAndSelect('cidadao.enderecos', 'endereco');
      query.leftJoinAndSelect(
        'cidadao.composicao_familiar',
        'composicao_familiar',
      );
    } else {
      // Carregar apenas endereço vigente quando não incluir todas as relações
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
    include_removed = false,
  ): Promise<Cidadao | null> {
    const cpfClean = cpf.replace(/\D/g, '');
    const query = this.createScopedQueryBuilder('cidadao').where(
      'cidadao.cpf = :cpf',
      { cpf: cpfClean },
    );

    // Aplicar filtro de soft delete se necessário
    if (!include_removed) {
      query.andWhere('cidadao.removed_at IS NULL');
    }

    if (includeRelations) {
      query.leftJoinAndSelect('cidadao.unidade', 'unidade');
      query.leftJoinAndSelect('cidadao.contatos', 'contato');
      query.leftJoinAndSelect('cidadao.enderecos', 'endereco');
      query.leftJoinAndSelect('cidadao.info_bancaria', 'info_bancaria');
      query.leftJoinAndSelect(
        'cidadao.composicao_familiar',
        'composicao_familiar',
      );
    } else {
      query.leftJoinAndSelect('cidadao.unidade', 'unidade');
      query.leftJoinAndSelect('cidadao.info_bancaria', 'info_bancaria');
      query.leftJoinAndSelect(
        'cidadao.enderecos',
        'endereco',
        'endereco.data_fim_vigencia IS NULL',
      );
    }

    return query.getOne();
  }

  /**
   * Busca cidadão por CPF ignorando escopo (busca global)
   * Usado para verificação de duplicidade de CPF em todo o sistema
   *
   * @param cpf - CPF do cidadão
   * @param includeRelations - Se deve incluir relacionamentos
   * @param include_removed - Se deve incluir registros removidos
   * @returns Cidadão encontrado ou null
   */
  async findByCpfGlobal(
    cpf: string,
    includeRelations = false,
    include_removed = false,
  ): Promise<Cidadao | null> {
    const cpfClean = cpf.replace(/\D/g, '');

    const query = this.createQueryBuilder('cidadao').where(
      'cidadao.cpf = :cpf',
      { cpf: cpfClean },
    );

    // Se include_removed for true, usar withDeleted() para incluir registros removidos
    if (include_removed) {
      query.withDeleted();
    }

    if (includeRelations) {
      query.leftJoinAndSelect('cidadao.unidade', 'unidade');
      query.leftJoinAndSelect('cidadao.contatos', 'contato');
      query.leftJoinAndSelect(
        'cidadao.enderecos',
        'endereco',
        'endereco.data_fim_vigencia IS NULL',
      );
      query.leftJoinAndSelect('cidadao.info_bancaria', 'info_bancaria');
      query.leftJoinAndSelect(
        'cidadao.composicao_familiar',
        'composicao_familiar',
      );
    } else {
      query.leftJoinAndSelect('cidadao.unidade', 'unidade');
      query.leftJoinAndSelect('cidadao.info_bancaria', 'info_bancaria');
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
    include_removed = false,
  ): Promise<Cidadao | null> {
    const nisClean = nis.replace(/\D/g, '');
    const query = this.createScopedQueryBuilder('cidadao').where(
      'cidadao.nis = :nis',
      { nis: nisClean },
    );

    // Aplicar filtro de soft delete se necessário
    if (!include_removed) {
      query.andWhere('cidadao.removed_at IS NULL');
    }

    // Sempre carregar relações essenciais
    query.leftJoinAndSelect('cidadao.unidade', 'unidade');
    query.leftJoinAndSelect('cidadao.info_bancaria', 'info_bancaria');

    if (includeRelations) {
      query.leftJoinAndSelect('cidadao.contatos', 'contato');
      query.leftJoinAndSelect('cidadao.enderecos', 'endereco');
      query.leftJoinAndSelect(
        'cidadao.composicao_familiar',
        'composicao_familiar',
      );
    } else {
      // Carregar apenas endereço vigente quando não incluir todas as relações
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
    // Verificar duplicatas usando métodos com escopo (incluindo registros removidos)
    // Isso previne violações de constraint no banco de dados
    if (data.cpf) {
      const existingCpf = await this.findByCpf(data.cpf, false, true);
      if (existingCpf) {
        throw new ConflictException('CPF já cadastrado');
      }
    }

    if (data.nis) {
      const existingNis = await this.findByNis(data.nis, false, true);
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
   * Busca cidadãos com filtros avançados e escopo aplicado automaticamente
   *
   * @param filtros - Filtros avançados
   * @returns Array de cidadãos e total de registros
   */
  async findWithAdvancedFilters(filtros: {
    skip?: number;
    take?: number;
    search?: string;
    includeRelations?: boolean;
    unidades?: string[];
    bairros?: string[];
    status?: string[];
    apenas_com_beneficios?: boolean;
    idade_minima?: number;
    idade_maxima?: number;
    unidade_usuario?: string;
  }): Promise<[Cidadao[], number]> {
    const {
      skip = 0,
      take = 10,
      search,
      includeRelations = false,
      unidades,
      bairros,
      status,
      apenas_com_beneficios,
      idade_minima,
      idade_maxima,
    } = filtros;

    // Criar QueryBuilder com escopo aplicado automaticamente
    const query = this.createScopedQueryBuilder('cidadao');

    // JOIN com composição familiar para busca
    query.leftJoin('cidadao.composicao_familiar', 'composicao_familiar_search');

    // Filtro por unidades específicas
    if (unidades && unidades.length > 0) {
      query.andWhere('cidadao.unidade_id IN (:...unidades)', { unidades });
    }

    // Filtro por bairros
    if (bairros && bairros.length > 0) {
      query
        .leftJoin('cidadao.enderecos', 'endereco_filter')
        .andWhere('endereco_filter.bairro IN (:...bairros)', { bairros })
        .andWhere('endereco_filter.data_fim_vigencia IS NULL');
    }

    // Filtro por status
    if (status && status.length > 0) {
      query.andWhere('cidadao.status IN (:...status)', { status });
    }

    // Filtro por idade
    if (idade_minima !== undefined || idade_maxima !== undefined) {
      if (idade_minima !== undefined) {
        query.andWhere(
          'EXTRACT(YEAR FROM AGE(CURRENT_DATE, cidadao.data_nascimento)) >= :idade_minima',
          { idade_minima },
        );
      }
      if (idade_maxima !== undefined) {
        query.andWhere(
          'EXTRACT(YEAR FROM AGE(CURRENT_DATE, cidadao.data_nascimento)) <= :idade_maxima',
          { idade_maxima },
        );
      }
    }

    // Filtro apenas com benefícios (através das solicitações aprovadas)
    if (apenas_com_beneficios) {
      query
        .leftJoin('cidadao.solicitacoes', 's')
        .leftJoin('s.concessao', 'c')
        .andWhere('c.id IS NOT NULL')
        .andWhere('c.status = :statusAprovado', { statusAprovado: 'ativo' });
    }

    // Busca por nome/CPF/NIS
    if (search && search.trim() !== '') {
      const searchTerm = search.trim();
      const searchClean = searchTerm.replace(/\D/g, '');

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

      // Busca por CPF na composição familiar
      if (searchClean.length > 0) {
        conditions.push('composicao_familiar_search.cpf LIKE :searchCpfFamiliar');
        parameters.searchCpfFamiliar = `%${searchClean}%`;
      }

      // Busca por NIS na composição familiar
      if (searchClean.length > 0) {
        conditions.push('composicao_familiar_search.nis LIKE :searchNisFamiliar');
        parameters.searchNisFamiliar = `%${searchClean}%`;
      }

      // Aplicar condições OR
      if (conditions.length > 0) {
        query.andWhere(`(${conditions.join(' OR ')})`, parameters);
      }
    }

    // Relacionamentos - sempre carregar relações essenciais
    query.leftJoinAndSelect('cidadao.unidade', 'unidade');
    query.leftJoinAndSelect('cidadao.info_bancaria', 'info_bancaria');

    if (includeRelations) {
      query.leftJoinAndSelect('cidadao.contatos', 'contato');
      query.leftJoinAndSelect('cidadao.enderecos', 'endereco');
      query.leftJoinAndSelect('cidadao.composicao_familiar', 'composicao_familiar');
      query.leftJoinAndSelect('cidadao.solicitacoes', 'solicitacoes');
    } else {
      // Carregar apenas endereço vigente quando não incluir todas as relações
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

    // Relacionamentos - sempre carregar relações essenciais
    query.leftJoinAndSelect('cidadao.unidade', 'unidade');
    query.leftJoinAndSelect('cidadao.info_bancaria', 'info_bancaria');

    if (includeRelations) {
      query.leftJoinAndSelect('cidadao.contatos', 'contato');
      query.leftJoinAndSelect('cidadao.enderecos', 'endereco');
      query.leftJoinAndSelect(
        'cidadao.composicao_familiar',
        'composicao_familiar',
      );
    } else {
      // Carregar apenas endereço vigente quando não incluir todas as relações
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
