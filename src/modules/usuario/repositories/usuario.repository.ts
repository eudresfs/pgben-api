import { Injectable } from '@nestjs/common';
import { DataSource, DeepPartial, Brackets, FindOperator } from 'typeorm';
import { Usuario } from '../../../entities/usuario.entity';
import { Status } from '../../../enums/status.enum';
import { throwUserNotFound } from '../../../shared/exceptions/error-catalog/domains/usuario.errors';
import { ScopedRepository } from '../../../common/repositories/scoped-repository';

/**
 * Repositório de usuários com escopo aplicado
 *
 * Responsável por operações de acesso a dados relacionadas a usuários,
 * aplicando automaticamente filtros de escopo baseados na unidade do usuário.
 * 
 * Para usuários, o escopo é aplicado da seguinte forma:
 * - GLOBAL: Acesso a todos os usuários do sistema
 * - UNIDADE: Acesso apenas aos usuários da mesma unidade
 * - PROPRIO: Acesso apenas ao próprio usuário
 */
@Injectable()
export class UsuarioRepository {
  private scopedRepository: ScopedRepository<Usuario>;

  constructor(private dataSource: DataSource) {
    this.scopedRepository = new ScopedRepository(
      Usuario,
      this.dataSource.manager,
      undefined,
      {
        strictMode: true,
        allowGlobalScope: true,
        operationName: 'usuario',
        enableMetadataCache: true,
        enableQueryHints: true,
      },
    );
  }

  /**
   * Busca todos os usuários com filtros, paginação e escopo aplicado
   * @param options Opções de filtro e paginação
   * @returns Lista de usuários paginada com escopo aplicado
   */
  async findAll(options?: {
    relations?: boolean;
    skip?: number;
    take?: number;
    where?: any;
    order?: any;
  }): Promise<[Usuario[], number]> {
    const {
      relations = false,
      skip = 0,
      take = 10,
      where = {},
      order = { created_at: 'DESC' },
    } = options || {};

    // Criar QueryBuilder com escopo aplicado
    const queryBuilder = this.scopedRepository.createScopedQueryBuilder('usuario');

    // Aplicar relacionamentos se solicitados
    if (relations) {
      queryBuilder
        .leftJoinAndSelect('usuario.unidade', 'unidade')
        .leftJoinAndSelect('usuario.role', 'role')
        .leftJoinAndSelect('usuario.setor', 'setor');
    }

    // Aplicar filtros where adicionais se fornecidos
    if (where && Object.keys(where).length > 0) {
      // Verificar se where é um array (condições OR)
      if (Array.isArray(where)) {
        // Aplicar condições OR
        queryBuilder.andWhere(
          new Brackets((qb) => {
            where.forEach((condition, index) => {
              const orConditions: string[] = [];
              const orParams: Record<string, any> = {};

              Object.entries(condition).forEach(([key, value]) => {
                const paramKey = `${key}_${index}`;
                const columnName = key.includes('.') ? key : `usuario.${key}`;

                if (value instanceof FindOperator) {
                  // Para operadores como ILike
                  orConditions.push(`${columnName} ${(value as any)._type} :${paramKey}`);
                  orParams[paramKey] = (value as any)._value;
                } else {
                  // Para valores simples
                  orConditions.push(`${columnName} = :${paramKey}`);
                  orParams[paramKey] = value;
                }
              });

              if (orConditions.length > 0) {
                const conditionString = orConditions.join(' AND ');
                if (index === 0) {
                  qb.where(`(${conditionString})`, orParams);
                } else {
                  qb.orWhere(`(${conditionString})`, orParams);
                }
              }
            });
          })
        );
      } else {
        // Aplicar condições AND normais
        Object.entries(where).forEach(([key, value]) => {
          const columnName = key.includes('.') ? key : `usuario.${key}`;

          if (value instanceof FindOperator) {
            // Para operadores como ILike
            queryBuilder.andWhere(`${columnName} ${(value as any)._type} :${key}`, { [key]: (value as any)._value });
          } else {
            // Para valores simples
            queryBuilder.andWhere(`${columnName} = :${key}`, { [key]: value });
          }
        });
      }
    }

    // Aplicar ordenação com prefixo correto da tabela
    if (order && Object.keys(order).length > 0) {
      const orderEntries = Object.entries(order);
      orderEntries.forEach(([field, direction], index) => {
        const columnName = field.includes('.') ? field : `usuario.${field}`;
        if (index === 0) {
          queryBuilder.orderBy(columnName, direction as 'ASC' | 'DESC');
        } else {
          queryBuilder.addOrderBy(columnName, direction as 'ASC' | 'DESC');
        }
      });
    }

    // Aplicar paginação
    queryBuilder.skip(skip).take(take);

    return queryBuilder.getManyAndCount();
  }

  /**
   * Busca usuários por unidade
   * @param unidade_id ID da unidade
   * @returns Lista de usuários da unidade
   */
  async findByUnidade(unidade_id: string) {
    const usuarios = await this.scopedRepository.createScopedQueryBuilder('usuario')
      .where('usuario.unidade_id = :unidade_id', { unidade_id })
      .getMany();

    if (!usuarios) {
      throwUserNotFound(unidade_id);
    }

    return usuarios;
  }

  /**
   * Busca um usuário pelo ID com escopo aplicado
   * @param id ID do usuário
   * @returns Usuário encontrado dentro do escopo
   * @throws UsuarioError quando usuário não encontrado ou fora do escopo
   */
  async findById(id: string): Promise<Usuario> {
    const queryBuilder = this.scopedRepository.createScopedQueryBuilder('usuario');

    queryBuilder
      .leftJoinAndSelect('usuario.role', 'role')
      .leftJoinAndSelect('usuario.unidade', 'unidade')
      .leftJoinAndSelect('usuario.setor', 'setor')
      .where('usuario.id = :id', { id });

    const usuario = await queryBuilder.getOne();

    if (!usuario) {
      throwUserNotFound(id);
    }

    return usuario;
  }

  /**
   * Busca um usuário pelo email com escopo aplicado
   * @param email Email do usuário
   * @returns Usuário encontrado dentro do escopo ou null
   */
  async findByEmail(email: string): Promise<Usuario | null> {
    const queryBuilder = this.scopedRepository.createScopedQueryBuilder('usuario');

    queryBuilder
      .leftJoinAndSelect('usuario.role', 'role')
      .leftJoinAndSelect('usuario.unidade', 'unidade')
      .leftJoinAndSelect('usuario.setor', 'setor')
      .where('usuario.email = :email', { email });

    return queryBuilder.getOne();
  }

  /**
   * Busca um usuário pelo CPF com escopo aplicado
   * @param cpf CPF do usuário
   * @returns Usuário encontrado dentro do escopo ou null
   */
  async findByCpf(cpf: string): Promise<Usuario | null> {
    const queryBuilder = this.scopedRepository.createScopedQueryBuilder('usuario');

    queryBuilder
      .leftJoinAndSelect('usuario.role', 'role')
      .leftJoinAndSelect('usuario.unidade', 'unidade')
      .leftJoinAndSelect('usuario.setor', 'setor')
      .where('usuario.cpf = :cpf', { cpf });

    return queryBuilder.getOne();
  }

  /**
   * Busca um usuário pela matrícula com escopo aplicado
   * @param matricula Matrícula do usuário
   * @returns Usuário encontrado dentro do escopo ou null
   */
  async findByMatricula(matricula: string): Promise<Usuario | null> {
    const queryBuilder = this.scopedRepository.createScopedQueryBuilder('usuario');

    queryBuilder
      .leftJoinAndSelect('usuario.role', 'role')
      .leftJoinAndSelect('usuario.unidade', 'unidade')
      .leftJoinAndSelect('usuario.setor', 'setor')
      .where('usuario.matricula = :matricula', { matricula });

    return queryBuilder.getOne();
  }

  /**
   * Cria um novo usuário
   * @param data Dados do usuário
   * @returns Usuário criado
   */
  async create(data: Partial<Usuario>): Promise<Usuario> {
    // Para criação, usar o repository original sem escopo
    const repository = this.dataSource.getRepository(Usuario);
    const usuario = repository.create(data);
    return repository.save(usuario);
  }

  /**
   * Atualiza um usuário existente
   * @param id ID do usuário
   * @param data Dados a serem atualizados
   * @returns Usuário atualizado
   */
  async update(id: string, data: Partial<Usuario>): Promise<Usuario> {
    // Para atualização, usar o repository original sem escopo
    const repository = this.dataSource.getRepository(Usuario);
    const result = await repository.update(id, data);
    if (result.affected === 0) {
      throwUserNotFound(id);
    }
    // Buscar o usuário atualizado sem escopo para evitar problemas durante operações sem contexto
    const usuario = await this.findByIdGlobal(id);
    if (!usuario) {
      throwUserNotFound(id);
    }
    return usuario;
  }

  /**
   * Atualiza o status de um usuário
   * @param id ID do usuário
   * @param status Novo status
   * @returns Usuário atualizado
   */
  async updateStatus(id: string, status: Status): Promise<Usuario> {
    const dadosAtualizacao: DeepPartial<Usuario> = { status };

    // Para atualização, usar o repository original sem escopo
    const repository = this.dataSource.getRepository(Usuario);
    await repository.update(id, dadosAtualizacao);
    // Buscar o usuário atualizado sem escopo para evitar problemas durante autenticação
    const usuario = await this.findByIdGlobal(id);
    if (!usuario) {
      throwUserNotFound(id);
    }
    return usuario;
  }

  /**
   * Atualiza a senha de um usuário
   * @param id ID do usuário
   * @param senhaHash Hash da nova senha
   * @returns Usuário atualizado
   */
  async updateSenha(id: string, senhaHash: string): Promise<Usuario> {
    const dadosAtualizacao: DeepPartial<Usuario> = {
      senhaHash,
      primeiro_acesso: false,
    };

    // Para atualização, usar o repository original sem escopo
    const repository = this.dataSource.getRepository(Usuario);
    await repository.update(id, dadosAtualizacao);
    // Buscar o usuário atualizado sem escopo para evitar problemas durante operações sem contexto
    const usuario = await this.findByIdGlobal(id);
    if (!usuario) {
      throwUserNotFound(id);
    }
    return usuario;
  }

  /**
   * Remove um usuário (soft delete)
   * @param id ID do usuário
   * @returns Resultado da operação
   */
  async remove(id: string): Promise<void> {
    // Para remoção, usar o repository original sem escopo
    const repository = this.dataSource.getRepository(Usuario);
    const result = await repository.softDelete(id);
    if (result.affected === 0) {
      throwUserNotFound(id);
    }
  }

  /**
   * Conta o total de usuários com escopo aplicado
   * @param where Condições de filtro adicionais
   * @returns Número total de usuários dentro do escopo
   */
  async count(where?: any): Promise<number> {
    const queryBuilder = this.scopedRepository.createScopedQueryBuilder('usuario');

    // Aplicar filtros where adicionais se fornecidos
    if (where && Object.keys(where).length > 0) {
      Object.entries(where).forEach(([key, value]) => {
        const columnName = key.includes('.') ? key : `usuario.${key}`;
        queryBuilder.andWhere(`${columnName} = :${key}`, { [key]: value });
      });
    }

    return queryBuilder.getCount();
  }

  // ========== MÉTODOS SEM ESCOPO (PARA AUTENTICAÇÃO E OPERAÇÕES ADMINISTRATIVAS) ==========

  /**
   * Busca um usuário pelo email SEM aplicar escopo (para autenticação)
   * @param email Email do usuário
   * @returns Usuário encontrado ou null
   */
  async findByEmailGlobal(email: string): Promise<Usuario | null> {
    const repository = this.dataSource.getRepository(Usuario);
    return repository.findOne({
      where: { email },
      relations: ['role', 'unidade', 'setor'],
    });
  }

  /**
   * Busca um usuário pelo ID SEM aplicar escopo (para operações administrativas)
   * @param id ID do usuário
   * @returns Usuário encontrado ou null
   */
  async findByIdGlobal(id: string): Promise<Usuario | null> {
    const repository = this.dataSource.getRepository(Usuario);
    return repository.findOne({
      where: { id },
      relations: ['role', 'unidade', 'setor'],
    });
  }

  /**
   * Busca um usuário pelo CPF SEM aplicar escopo (para validações)
   * @param cpf CPF do usuário
   * @returns Usuário encontrado ou null
   */
  async findByCpfGlobal(cpf: string): Promise<Usuario | null> {
    const repository = this.dataSource.getRepository(Usuario);
    return repository.findOne({
      where: { cpf },
      relations: ['role', 'unidade', 'setor'],
    });
  }

  /**
   * Busca um usuário pela matrícula SEM aplicar escopo (para validações)
   * @param matricula Matrícula do usuário
   * @returns Usuário encontrado ou null
   */
  async findByMatriculaGlobal(matricula: string): Promise<Usuario | null> {
    const repository = this.dataSource.getRepository(Usuario);
    return repository.findOne({
      where: { matricula },
      relations: ['role', 'unidade', 'setor'],
    });
  }

  /**
   * Busca todos os usuários SEM aplicar escopo (para operações administrativas)
   * @param options Opções de filtro e paginação
   * @returns Lista de usuários paginada sem escopo
   */
  async findAllGlobal(options?: {
    relations?: boolean;
    skip?: number;
    take?: number;
    where?: any;
    order?: any;
  }): Promise<[Usuario[], number]> {
    const {
      relations = false,
      skip = 0,
      take = 10,
      where = {},
      order = { created_at: 'DESC' },
    } = options || {};

    const repository = this.dataSource.getRepository(Usuario);
    const queryBuilder = repository.createQueryBuilder('usuario');

    // Aplicar relacionamentos se solicitados
    if (relations) {
      queryBuilder
        .leftJoinAndSelect('usuario.unidade', 'unidade')
        .leftJoinAndSelect('usuario.role', 'role')
        .leftJoinAndSelect('usuario.setor', 'setor');
    }

    // Aplicar filtros where se fornecidos
    if (where && Object.keys(where).length > 0) {
      Object.entries(where).forEach(([key, value]) => {
        const columnName = key.includes('.') ? key : `usuario.${key}`;
        queryBuilder.andWhere(`${columnName} = :${key}`, { [key]: value });
      });
    }

    // Aplicar ordenação
    if (order && Object.keys(order).length > 0) {
      const orderEntries = Object.entries(order);
      orderEntries.forEach(([field, direction], index) => {
        const columnName = field.includes('.') ? field : `usuario.${field}`;
        if (index === 0) {
          queryBuilder.orderBy(columnName, direction as 'ASC' | 'DESC');
        } else {
          queryBuilder.addOrderBy(columnName, direction as 'ASC' | 'DESC');
        }
      });
    }

    // Aplicar paginação
    queryBuilder.skip(skip).take(take);

    return queryBuilder.getManyAndCount();
  }

  /**
   * Conta o total de usuários SEM aplicar escopo
   * @param where Condições de filtro
   * @returns Número total de usuários
   */
  async countGlobal(where?: any): Promise<number> {
    const repository = this.dataSource.getRepository(Usuario);
    return repository.count({ where });
  }

  /**
   * Busca usuários com filtros avançados e escopo aplicado automaticamente
   * @param filtros Filtros avançados a serem aplicados
   * @returns Array de usuários e total de registros
   */
  async findWithAdvancedFilters(filtros: {
    skip?: number;
    take?: number;
    search?: string;
    includeRelations?: boolean;
    unidades?: string[];
    setores?: string[];
    roles?: string[];
    status?: string[];
    primeiro_acesso?: boolean;
    tentativas_login_min?: number;
    tentativas_login_max?: number;
  }): Promise<[Usuario[], number]> {
    const {
      skip = 0,
      take = 10,
      search,
      includeRelations = false,
      unidades,
      setores,
      roles,
      status,
      primeiro_acesso,
      tentativas_login_min,
      tentativas_login_max,
    } = filtros;

    // Criar QueryBuilder com escopo aplicado automaticamente
    const query = this.scopedRepository.createScopedQueryBuilder('usuario');

    // Filtro por unidades específicas
    if (unidades && unidades.length > 0) {
      query.andWhere('usuario.unidade_id IN (:...unidades)', { unidades });
    }

    // Filtro por setores
    if (setores && setores.length > 0) {
      query.andWhere('usuario.setor_id IN (:...setores)', { setores });
    }

    // Filtro por roles
    if (roles && roles.length > 0) {
      query.andWhere('usuario.role_id IN (:...roles)', { roles });
    }

    // Filtro por status
    if (status && status.length > 0) {
      query.andWhere('usuario.status IN (:...status)', { status });
    }

    // Filtro por primeiro acesso
    if (primeiro_acesso !== undefined) {
      query.andWhere('usuario.primeiro_acesso = :primeiro_acesso', { primeiro_acesso });
    }

    // Filtro por tentativas de login
    if (tentativas_login_min !== undefined) {
      query.andWhere('usuario.tentativas_login >= :tentativas_login_min', { tentativas_login_min });
    }
    if (tentativas_login_max !== undefined) {
      query.andWhere('usuario.tentativas_login <= :tentativas_login_max', { tentativas_login_max });
    }

    // Busca por nome/email/CPF/matrícula
    if (search && search.trim() !== '') {
      const searchTerm = search.trim();
      const searchClean = searchTerm.replace(/\D/g, ''); // Remove formatação para CPF

      const conditions: string[] = [];
      const parameters: any = {};

      // Busca por nome (case insensitive)
      conditions.push('LOWER(usuario.nome) LIKE LOWER(:searchName)');
      parameters.searchName = `%${searchTerm}%`;

      // Busca por email (case insensitive)
      conditions.push('LOWER(usuario.email) LIKE LOWER(:searchEmail)');
      parameters.searchEmail = `%${searchTerm}%`;

      // Busca por matrícula
      conditions.push('usuario.matricula LIKE :searchMatricula');
      parameters.searchMatricula = `%${searchTerm}%`;

      // Busca por CPF (se o termo tem dígitos)
      if (searchClean.length > 0) {
        conditions.push('usuario.cpf LIKE :searchCpf');
        parameters.searchCpf = `%${searchClean}%`;
      }

      // Aplicar condições OR
      if (conditions.length > 0) {
        query.andWhere(`(${conditions.join(' OR ')})`, parameters);
      }
    }

    // Relacionamentos
    if (includeRelations) {
      query.leftJoinAndSelect('usuario.unidade', 'unidade');
      query.leftJoinAndSelect('usuario.role', 'role');
      query.leftJoinAndSelect('usuario.setor', 'setor');
    } else {
      // Sempre incluir relacionamentos básicos
      query.leftJoinAndSelect('usuario.unidade', 'unidade');
      query.leftJoinAndSelect('usuario.role', 'role');
      query.leftJoinAndSelect('usuario.setor', 'setor');
    }

    return query
      .orderBy('usuario.created_at', 'DESC')
      .skip(skip)
      .take(Math.min(take, 100))
      .getManyAndCount();
  }
}
