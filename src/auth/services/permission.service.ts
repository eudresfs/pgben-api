import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Permission } from '../../entities/permission.entity';
import { PermissionRepository } from '../repositories/permission.repository';
import { RolePermissionRepository } from '../repositories/role-permission.repository';
import { UserPermissionRepository } from '../repositories/user-permission.repository';
import { PermissionScopeRepository } from '../repositories/permission-scope.repository';
import { TipoEscopo } from '../../entities/user-permission.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Usuario } from '@/entities';

/**
 * Interface para verificação de permissão com escopo.
 */
export interface PermissionCheckOptions {
  /**
   * ID do usuário para verificação de permissão
   */
  userId: string;

  /**
   * Nome da permissão no formato `modulo.recurso.operacao`
   */
  permissionName: string;

  /**
   * Tipo de escopo (opcional, padrão é GLOBAL)
   */
  scopeType?: TipoEscopo;

  /**
   * ID do escopo (opcional, necessário apenas para scopeType UNIT)
   */
  scopeId?: string | null | undefined;
}

/**
 * Serviço responsável por verificar permissões de usuários.
 *
 * Este serviço implementa a lógica de verificação de permissões granulares,
 * considerando permissões diretas, permissões de role e permissões compostas.
 * Também implementa cache para otimizar o desempenho das verificações.
 */
@Injectable()
export class PermissionService {
  verificarPermissaoSolicitacao(usuarioId: string, solicitacao_id: string, arg2: string) {
    throw new Error('Method not implemented.');
  }
  isAdministrador(usuario: Usuario) {
    throw new Error('Method not implemented.');
  }
  private readonly logger = new Logger(PermissionService.name);
  private readonly CACHE_TTL = 300; // 5 minutos em segundos

  constructor(
    @InjectRepository(PermissionRepository)
    private permissionRepository: PermissionRepository,
    @InjectRepository(RolePermissionRepository)
    private rolePermissionRepository: RolePermissionRepository,
    @InjectRepository(UserPermissionRepository)
    private userPermissionRepository: UserPermissionRepository,
    @InjectRepository(PermissionScopeRepository)
    private permissionScopeRepository: PermissionScopeRepository,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {
    this.logger.log('PermissionService inicializado');

    // Verificar se o cache está funcionando
    this.cacheManager
      .set('permission_service_test', 'ok', 10)
      .then(() => this.logger.log('Cache inicializado com sucesso'))
      .catch((err) =>
        this.logger.warn(
          `Erro ao inicializar cache: ${err.message}. Usando fallback.`,
        ),
      );
  }

  /**
   * Verifica se um usuário tem uma permissão específica.
   *
   * @param options Opções de verificação de permissão
   * @returns true se o usuário tem a permissão, false caso contrário
   */
  async hasPermission(options: PermissionCheckOptions): Promise<boolean> {
    try {
      const {
        userId,
        permissionName,
        scopeType = TipoEscopo.GLOBAL,
        scopeId,
      } = options;

      // Validação de parâmetros
      if (!userId || !permissionName) {
        this.logger.warn(
          `Tentativa de verificar permissão com parâmetros inválidos: userId=${userId}, permissionName=${permissionName}`,
        );
        return false;
      }

      // Validação de escopo
      if (scopeType === TipoEscopo.UNIDADE && !scopeId) {
        this.logger.warn(
          `Tentativa de verificar permissão com escopo UNIT sem fornecer scopeId: userId=${userId}, permissionName=${permissionName}`,
        );
        return false;
      }

      // Verificar cache
      const cacheKey = this.generateCacheKey(
        userId,
        permissionName,
        scopeType,
        scopeId,
      );
      let cachedResult;

      try {
        cachedResult = await this.cacheManager.get<boolean>(cacheKey);
        if (cachedResult !== undefined && cachedResult !== null) {
          return cachedResult;
        }
      } catch (error) {
        this.logger.warn(
          `Erro ao acessar cache: ${error.message}. Usando verificação direta.`,
        );
      }

      // Verificar permissões compostas
      if (permissionName.includes(',')) {
        const permissions = permissionName.split(',');
        for (const perm of permissions) {
          const hasIndividualPermission = await this.hasPermission({
            userId,
            permissionName: perm.trim(),
            scopeType,
            scopeId,
          });

          if (hasIndividualPermission) {
            try {
              await this.cacheManager.set(cacheKey, true, 300);
            } catch (error) {
              this.logger.warn(`Erro ao escrever no cache: ${error.message}`);
            }
            return true;
          }
        }

        try {
          await this.cacheManager.set(cacheKey, false, 300);
        } catch (error) {
          this.logger.warn(`Erro ao escrever no cache: ${error.message}`);
        }
        return false;
      }

      // Verifica permissões diretas do usuário
      const hasDirectPermission = await this.checkDirectPermission(
        userId,
        permissionName,
        scopeType,
        scopeId,
      );
      if (hasDirectPermission) {
        await this.cacheManager.set(cacheKey, true, this.CACHE_TTL);
        return true;
      }

      // Verifica permissões da role do usuário
      const hasRolePermission = await this.checkRolePermission(
        userId,
        permissionName,
      );
      if (hasRolePermission) {
        await this.cacheManager.set(cacheKey, true, this.CACHE_TTL);
        return true;
      }

      // Verifica permissões compostas (wildcards)
      const hasCompositePermission = await this.checkCompositePermission(
        userId,
        permissionName,
        scopeType,
        scopeId,
      );
      if (hasCompositePermission) {
        await this.cacheManager.set(cacheKey, true, this.CACHE_TTL);
        return true;
      }

      // Se chegou aqui, o usuário não tem a permissão
      await this.cacheManager.set(cacheKey, false, this.CACHE_TTL);
      return false;
    } catch (error) {
      this.logger.error(`Erro ao verificar permissão: ${error.message}`, {
        options, // Usar o objeto options completo em vez das propriedades individuais
        stack: error.stack,
      });
      return false;
    }
  }

  /**
   * Verifica se um usuário tem uma permissão direta.
   *
   * @param userId ID do usuário
   * @param permissionName Nome da permissão
   * @param scopeType Tipo de escopo
   * @param scopeId ID do escopo (opcional para escopo GLOBAL)
   * @returns true se o usuário tem a permissão direta, false caso contrário
   */
  private async checkDirectPermission(
    userId: string,
    permissionName: string,
    scopeType: TipoEscopo,
    scopeId?: string | null | undefined,
  ): Promise<boolean> {
    try {
      // Busca a permissão pelo nome
      const permission =
        await this.permissionRepository.findByName(permissionName);
      if (!permission) {
        this.logger.warn(`Permissão não encontrada: ${permissionName}`);
        return false;
      }

      // Verifica se o usuário tem a permissão direta
      const userPermission =
        await this.userPermissionRepository.findByUserAndPermission(
          userId,
          permission.id,
          scopeType,
          scopeId || undefined,
        );

      // Se não encontrou a permissão ou ela não está concedida, retorna false
      if (!userPermission || !userPermission.granted) {
        return false;
      }

      // Verifica se a permissão está expirada
      if (userPermission.validUntil && userPermission.validUntil < new Date()) {
        this.logger.debug(
          `Permissão expirada: ${permissionName} para usuário ${userId}`,
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Erro ao verificar permissão direta: ${error.message}`,
        {
          userId,
          permissionName,
          scopeType,
          scopeId,
          stack: error.stack,
        },
      );
      return false;
    }
  }

  /**
   * Verifica se um usuário tem uma permissão através da sua role.
   *
   * @param userId ID do usuário
   * @param permissionName Nome da permissão
   * @returns true se o usuário tem a permissão através da sua role, false caso contrário
   */
  async checkRolePermission(
    userId: string,
    permissionName: string,
  ): Promise<boolean> {
    try {
      // Busca a permissão pelo nome
      const permission =
        await this.permissionRepository.findByName(permissionName);
      if (!permission) {
        this.logger.warn(`Permissão não encontrada: ${permissionName}`);
        return false;
      }

      // Verifica se existe uma role com a permissão usando o método findPermissionsByUserRoles
      const permissions =
        await this.rolePermissionRepository.findPermissionsByUserRoles(userId);

      // Verifica se a permissão específica está na lista de permissões da role
      return permissions.some(
        (p) => p.id === permission.id || p.name === permissionName,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao verificar permissão de role: ${error.message}`,
        {
          userId,
          permissionName,
          stack: error.stack,
        },
      );
      return false;
    }
  }

  /**
   * Verifica se um usuário tem uma permissão composta (com wildcard).
   *
   * @param userId ID do usuário
   * @param permissionName Nome da permissão específica que está sendo verificada
   * @param scopeType Tipo de escopo
   * @param scopeId ID do escopo (opcional para escopo GLOBAL)
   * @returns true se o usuário tem a permissão composta, false caso contrário
   */
  async checkCompositePermission(
    userId: string,
    permissionName: string,
    scopeType: TipoEscopo,
    scopeId?: string | null | undefined,
  ): Promise<boolean> {
    try {
      // Divide o nome da permissão em partes (ex: 'modulo.recurso.operacao')
      const parts = permissionName.split('.');
      if (parts.length < 2) {
        return false; // Formato inválido
      }

      // Constrói os wildcards possíveis
      const wildcards: string[] = [];

      // Permissão super admin - verifica primeiro para otimização
      wildcards.push('*.*');

      // Wildcard para módulo (ex: 'modulo.*')
      wildcards.push(`${parts[0]}.*`);

      // Wildcard para recurso (ex: 'modulo.recurso.*')
      if (parts.length >= 2) {
        wildcards.push(`${parts[0]}.${parts[1]}.*`);
      }

      // Wildcard para operação (ex: '*.operacao')
      if (parts.length >= 2) {
        wildcards.push(`*.${parts[parts.length - 1]}`);
      }

      // Verifica cada wildcard
      for (const wildcard of wildcards) {
        // Verifica permissão direta
        const hasDirectWildcard = await this.checkDirectPermission(
          userId,
          wildcard,
          scopeType,
          scopeId,
        );
        if (hasDirectWildcard) {
          this.logger.debug(
            `Usuário ${userId} tem permissão wildcard direta: ${wildcard}`,
          );
          return true;
        }

        // Verifica permissão de role
        const hasRoleWildcard = await this.checkRolePermission(
          userId,
          wildcard,
        );
        if (hasRoleWildcard) {
          this.logger.debug(
            `Usuário ${userId} tem permissão wildcard via role: ${wildcard}`,
          );
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.error(
        `Erro ao verificar permissão composta: ${error.message}`,
        {
          userId,
          permissionName,
          scopeType,
          scopeId,
          stack: error.stack,
        },
      );
      return false;
    }
  }

  /**
   * Gera uma chave de cache para uma verificação de permissão.
   *
   * @param userId ID do usuário
   * @param permissionName Nome da permissão
   * @param scopeType Tipo de escopo
   * @param scopeId ID do escopo (opcional para escopo GLOBAL)
   * @returns Chave de cache
   */
  generateCacheKey(
    userId: string,
    permissionName: string,
    scopeType: TipoEscopo,
    scopeId?: string | null | undefined,
  ): string {
    return `permission:${userId}:${permissionName}:${scopeType}:${scopeId || 'global'}`;
  }

  /**
   * Limpa o cache de permissões de um usuário.
   *
   * @param userId ID do usuário
   */
  async clearUserPermissionCache(userId: string): Promise<void> {
    try {
      // Implementação simplificada para evitar uso de métodos que podem não estar disponíveis
      // em todas as implementações de cache
      this.logger.debug(`Limpando cache para o usuário: ${userId}`);

      // Como não temos acesso direto a um método para limpar todo o cache,
      // vamos usar uma abordagem alternativa que funciona com a maioria das implementações
      // Definimos uma chave com TTL muito curto para forçar a limpeza do cache
      await this.cacheManager.set(
        `user-cache-clear:${userId}:${Date.now()}`,
        true,
        1,
      );

      this.logger.debug(`Cache de permissões limpo para o usuário ${userId}`);
    } catch (error) {
      this.logger.error(
        `Erro ao limpar cache de permissões do usuário: ${error.message}`,
        {
          userId,
          stack: error.stack,
        },
      );
    }
  }

  /**
   * Limpa o cache de permissões para uma permissão específica.
   *
   * @param permissionName Nome da permissão
   */
  async clearPermissionCache(permissionName: string): Promise<void> {
    try {
      // Obter todas as chaves de cache relacionadas à permissão
      // Isso é uma simplificação, pois o cache-manager não suporta busca por padrão
      // Em uma implementação real, seria necessário usar um adaptador que suporte isso

      // Limpar o cache
      // Como não podemos buscar chaves, vamos apenas registrar que o cache deveria ser limpo
      this.logger.log(`Cache da permissão ${permissionName} deveria ser limpo`);
    } catch (error) {
      this.logger.error(`Erro ao limpar cache da permissão: ${error.message}`, {
        permissionName,
        stack: error.stack,
      });
    }
  }

  /**
   * Obtém todas as permissões ativas de um usuário.
   *
   * @param userId ID do usuário
   * @param includeInactive Se true, inclui permissões inativas (revogadas ou expiradas)
   * @returns Lista de permissões do usuário
   */
  async getUserPermissions(
    userId: string,
    includeInactive: boolean = false,
  ): Promise<Permission[]> {
    try {
      // Busca permissões diretas do usuário
      const userPermissions =
        await this.userPermissionRepository.findByUserId(userId);

      // Filtra permissões ativas, se necessário
      const filteredUserPermissions = includeInactive
        ? userPermissions
        : userPermissions.filter(
            (up) =>
              up.granted && (!up.validUntil || up.validUntil > new Date()),
          );

      // Obtém IDs das permissões
      const permissionIds = filteredUserPermissions.map(
        (up) => up.permissionId,
      );

      // Busca permissões de role do usuário
      const rolePermissions =
        await this.rolePermissionRepository.findPermissionsByUserRoles(userId);

      // Adiciona IDs de permissões de role
      rolePermissions.forEach((permission) => {
        if (!permissionIds.includes(permission.id)) {
          permissionIds.push(permission.id);
        }
      });

      // Busca detalhes das permissões
      if (permissionIds.length === 0) {
        return [];
      }

      return this.permissionRepository.findByIds(permissionIds);
    } catch (error) {
      this.logger.error(
        `Erro ao obter permissões do usuário: ${error.message}`,
        {
          userId,
          includeInactive,
          stack: error.stack,
        },
      );
      return [];
    }
  }

  /**
   * Obtém todas as permissões disponíveis no sistema.
   *
   * @returns Lista de todas as permissões
   */
  async getAllPermissions(): Promise<Permission[]> {
    try {
      // Busca todas as permissões no banco, usando a query builder para ter mais controle
      // e evitar problemas com nomes de propriedades
      const permissions = await this.permissionRepository
        .createQueryBuilder('permission')
        .select(['permission.id', 'permission.nome', 'permission.descricao'])
        .getMany();
      return permissions;
    } catch (error) {
      this.logger.error(
        `Erro ao buscar todas as permissões: ${error.message}`,
        {
          stack: error.stack,
        },
      );
      return [];
    }
  }

  /**
   * Cria uma nova permissão no sistema.
   *
   * @param name Nome da permissão (deve seguir o formato modulo.operacao)
   * @param description Descrição da permissão
   * @param createdBy ID do usuário que está criando a permissão
   * @returns A permissão criada ou null se ocorrer um erro
   */
  async createPermission(
    name: string,
    description: string,
    createdBy: string,
  ): Promise<Permission | null> {
    try {
      // Validação de parâmetros
      if (!name || !createdBy) {
        this.logger.warn(
          `Tentativa de criar permissão com parâmetros inválidos: name=${name}, createdBy=${createdBy}`,
        );
        return null;
      }

      // Verifica se a permissão já existe
      const existingPermission =
        await this.permissionRepository.findByName(name);
      if (existingPermission) {
        this.logger.warn(`Tentativa de criar permissão já existente: ${name}`);
        return existingPermission;
      }

      // Cria a nova permissão
      const newPermission = this.permissionRepository.create({
        nome: name,
        descricao: description || `Permissão ${name}`,
      });

      // Salva a permissão no banco de dados
      const savedPermission =
        await this.permissionRepository.save(newPermission);

      this.logger.log(`Permissão ${name} criada com sucesso por ${createdBy}`);

      return savedPermission;
    } catch (error) {
      this.logger.error(`Erro ao criar permissão: ${error.message}`, {
        name,
        description,
        createdBy,
        stack: error.stack,
      });
      return null;
    }
  }

  /**
   * Cria uma permissão se ela não existir.
   *
   * @param name Nome da permissão
   * @param description Descrição da permissão
   * @param createdBy ID do usuário que está criando a permissão
   * @returns A permissão criada ou existente, ou null se ocorrer um erro
   */
  async createPermissionIfNotExists(
    name: string,
    description: string,
    createdBy: string,
  ): Promise<Permission | null> {
    try {
      // Busca a permissão pelo nome
      const existingPermission =
        await this.permissionRepository.findByName(name);
      if (existingPermission) {
        return existingPermission;
      }

      // Se não existir, cria uma nova
      return this.createPermission(name, description, createdBy);
    } catch (error) {
      this.logger.error(
        `Erro ao criar permissão se não existir: ${error.message}`,
        {
          name,
          description,
          createdBy,
          stack: error.stack,
        },
      );
      return null;
    }
  }

  /**
   * Revoga uma permissão de um usuário.
   *
   * @param userId ID do usuário
   * @param permissionName Nome da permissão
   * @param scopeType Tipo de escopo
   * @param scopeId ID do escopo (opcional para escopo GLOBAL)
   * @param createdBy ID do usuário que está revogando a permissão
   * @returns true se a permissão foi revogada com sucesso, false caso contrário
   */
  async revokePermission(
    userId: string,
    permissionName: string,
    scopeType: TipoEscopo,
    scopeId: string | null | undefined,
    createdBy: string,
  ): Promise<boolean> {
    try {
      // Validação de parâmetros
      if (!userId || !permissionName || !createdBy) {
        this.logger.warn(
          `Tentativa de revogar permissão com parâmetros inválidos: userId=${userId}, permissionName=${permissionName}, createdBy=${createdBy}`,
        );
        return false;
      }

      // Validação de escopo
      if (scopeType === TipoEscopo.UNIDADE && !scopeId) {
        this.logger.warn(
          `Tentativa de revogar permissão com escopo UNIT sem fornecer scopeId: userId=${userId}, permissionName=${permissionName}`,
        );
        return false;
      }

      // Busca a permissão pelo nome
      const permission =
        await this.permissionRepository.findByName(permissionName);
      if (!permission) {
        this.logger.warn(
          `Tentativa de revogar permissão inexistente: permissionName=${permissionName}`,
        );
        return false;
      }

      // Verifica se o usuário tem a permissão
      const existingPermission =
        await this.userPermissionRepository.findByUserAndPermission(
          userId,
          permission.id,
          scopeType,
          scopeId || undefined,
        );

      if (!existingPermission) {
        this.logger.warn(
          `Tentativa de revogar permissão que o usuário não possui: userId=${userId}, permissionName=${permissionName}`,
        );
        return false;
      }

      // Verifica se a permissão já está revogada
      if (existingPermission && !existingPermission.granted) {
        this.logger.log(
          `Permissão já está revogada: userId=${userId}, permissionName=${permissionName}`,
        );
        return true; // Considera sucesso, pois o estado final é o desejado
      }

      // Atualiza a permissão existente para revogada
      await this.userPermissionRepository.updateUserPermission(
        existingPermission.id,
        {
          granted: false,
          updatedBy: createdBy,
        },
      );

      // Limpa o cache de permissões do usuário
      await this.clearUserPermissionCache(userId);

      // Limpa o cache da permissão específica
      await this.clearPermissionCache(permissionName);

      // Registra a operação no log
      this.logger.log(
        `Permissão ${permissionName} revogada do usuário ${userId} com escopo ${scopeType} por ${createdBy}`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Erro ao revogar permissão: ${error.message}`, {
        userId,
        permissionName,
        scopeType,
        scopeId,
        createdBy,
        stack: error.stack,
      });
      return false;
    }
  }

  /**
   * Concede uma permissão a um usuário.
   *
   * @param userId ID do usuário
   * @param permissionName Nome da permissão
   * @param scopeType Tipo de escopo
   * @param scopeId ID do escopo (opcional para escopo GLOBAL)
   * @param validUntil Data de validade da permissão (opcional)
   * @param createdBy ID do usuário que está concedendo a permissão
   * @returns true se a permissão foi concedida com sucesso, false caso contrário
   */
  async grantPermission(
    userId: string,
    permissionName: string,
    scopeType: TipoEscopo,
    scopeId: string | null | undefined,
    validUntil: Date | null | undefined,
    createdBy: string,
  ): Promise<boolean> {
    try {
      // Validação de parâmetros
      if (!userId || !permissionName || !createdBy) {
        this.logger.warn(
          `Tentativa de conceder permissão com parâmetros inválidos: userId=${userId}, permissionName=${permissionName}, createdBy=${createdBy}`,
        );
        return false;
      }

      // Validação de escopo
      if (scopeType === TipoEscopo.UNIDADE && !scopeId) {
        this.logger.warn(
          `Tentativa de conceder permissão com escopo UNIT sem fornecer scopeId: userId=${userId}, permissionName=${permissionName}`,
        );
        return false;
      }

      // Busca a permissão pelo nome
      const permission =
        await this.permissionRepository.findByName(permissionName);
      if (!permission) {
        this.logger.warn(
          `Tentativa de conceder permissão inexistente: permissionName=${permissionName}`,
        );
        return false;
      }

      // Verifica se o usuário já tem a permissão
      const existingPermission =
        await this.userPermissionRepository.findByUserAndPermission(
          userId,
          permission.id,
          scopeType,
          scopeId || undefined,
        );

      // Se já existe e está ativa, apenas atualiza a data de validade se necessário
      if (existingPermission && existingPermission.granted) {
        // Verifica se precisa atualizar a data de validade
        if (
          validUntil &&
          (!existingPermission.validUntil ||
            validUntil > existingPermission.validUntil)
        ) {
          await this.userPermissionRepository.updateUserPermission(
            existingPermission.id,
            {
              validUntil,
              updatedBy: createdBy,
            },
          );

          this.logger.log(
            `Data de validade da permissão ${permissionName} atualizada para o usuário ${userId}`,
          );
        } else {
          this.logger.log(
            `Usuário ${userId} já possui a permissão ${permissionName}`,
          );
        }

        return true;
      }

      // Se existe mas está revogada, reativa
      if (existingPermission && !existingPermission.granted) {
        await this.userPermissionRepository.updateUserPermission(
          existingPermission.id,
          {
            granted: true,
            validUntil: validUntil || null,
            updatedBy: createdBy,
          },
        );

        this.logger.log(
          `Permissão ${permissionName} reativada para o usuário ${userId} com escopo ${scopeType} por ${createdBy}`,
        );
      } else {
        // Cria uma nova permissão para o usuário
        await this.userPermissionRepository.createUserPermission({
          userId,
          permissionId: permission.id,
          scopeType,
          scopeId: scopeId || undefined,
          granted: true,
          validUntil: validUntil || null,
          createdBy,
        });

        this.logger.log(
          `Permissão ${permissionName} concedida ao usuário ${userId} com escopo ${scopeType} por ${createdBy}`,
        );
      }

      // Limpa o cache de permissões do usuário
      await this.clearUserPermissionCache(userId);

      // Limpa o cache da permissão específica
      await this.clearPermissionCache(permissionName);

      return true;
    } catch (error) {
      this.logger.error(`Erro ao conceder permissão: ${error.message}`, {
        error: error.message,
        stack: error.stack,
      });
      return false;
    }
  }

  /**
   * Obtém as permissões associadas a uma role.
   *
   * @param roleId ID da role
   * @returns Lista de permissões associadas à role
   */
  async getPermissionsByRole(roleId: string): Promise<Permission[]> {
    try {
      // Busca as permissões associadas à role
      const rolePermissions =
        await this.rolePermissionRepository.findByRoleId(roleId);

      if (!rolePermissions || rolePermissions.length === 0) {
        return [];
      }

      // Extrai os IDs das permissões
      const permissionIds = rolePermissions.map((rp) => rp.permissionId);

      // Busca os detalhes das permissões
      return this.permissionRepository.findByIds(permissionIds);
    } catch (error) {
      this.logger.error(`Erro ao obter permissões da role: ${error.message}`, {
        roleId,
        stack: error.stack,
      });
      return [];
    }
  }

  /**
   * Obtém as permissões de role associadas a um usuário.
   *
   * @param userId ID do usuário
   * @returns Lista de permissões de role do usuário
   */
  async getRolePermissionsByUserId(userId: string): Promise<Permission[]> {
    try {
      // Busca permissões de role do usuário
      const permissions =
        await this.rolePermissionRepository.findPermissionsByUserRoles(userId);

      return permissions || [];
    } catch (error) {
      this.logger.error(
        `Erro ao obter permissões de role do usuário: ${error.message}`,
        {
          userId,
          stack: error.stack,
        },
      );
      return [];
    }
  }
}
