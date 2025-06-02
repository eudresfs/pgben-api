import { Injectable, Logger } from '@nestjs/common';
import { PermissionService, PermissionCheckOptions } from './permission.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { ScopeType, TipoEscopo } from '../../entities/user-permission.entity';

/**
 * Interface para verificação de autorização
 */
export interface AuthorizationOptions {
  /**
   * ID do usuário para verificação de autorização
   */
  userId: string;
  
  /**
   * Roles necessárias (opcional)
   */
  roles?: string[];
  
  /**
   * Nome da permissão no formato `modulo.recurso.operacao` (opcional)
   */
  permissionName?: string;
  
  /**
   * Tipo de escopo (opcional, padrão é GLOBAL)
   */
  scopeType?: TipoEscopo;
  
  /**
   * ID do escopo (opcional, necessário apenas para scopeType UNIT)
   */
  scopeId?: string;
  
  /**
   * Operador lógico para combinar roles e permissões (padrão é 'AND')
   */
  operator?: 'AND' | 'OR';
  
  /**
   * Função de verificação baseada em dados (opcional)
   */
  dataCheck?: (data: any) => boolean | Promise<boolean>;
  
  /**
   * Dados para verificação baseada em dados (opcional)
   */
  data?: any;
}

/**
 * Serviço de autorização centralizado
 * 
 * Este serviço é responsável por verificações combinadas de role e permissão,
 * bem como verificações baseadas em dados.
 */
@Injectable()
export class AuthorizationService {
  private readonly logger = new Logger(AuthorizationService.name);
  
  constructor(
    private readonly permissionService: PermissionService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}
  
  /**
   * Verifica se um usuário está autorizado a realizar uma ação
   * 
   * @param options Opções de autorização
   * @returns true se o usuário está autorizado, false caso contrário
   */
  async isAuthorized(options: AuthorizationOptions): Promise<boolean> {
    const { 
      userId, 
      roles, 
      permissionName, 
      scopeType = ScopeType.GLOBAL, 
      scopeId, 
      operator = 'AND',
      dataCheck,
      data
    } = options;
    
    // Verificar cache
    const cacheKey = this.generateCacheKey(options);
    const cachedResult = await this.cacheManager.get<boolean>(cacheKey);
    
    if (cachedResult !== undefined && cachedResult !== null) {
      return cachedResult;
    }
    
    // Verificar roles se especificado
    let hasRole = true;
    if (roles && roles.length > 0) {
      hasRole = await this.hasRole(userId, roles);
    }
    
    // Verificar permissão se especificada
    let hasPermission = true;
    if (permissionName) {
      hasPermission = await this.permissionService.hasPermission({
        userId,
        permissionName,
        scopeType,
        scopeId,
      });
    }
    
    // Verificar dados se especificado
    let dataCheckResult = true;
    if (dataCheck && data) {
      const checkResult = await Promise.resolve(dataCheck(data));
      // Garantir que o resultado seja sempre um booleano
      dataCheckResult = checkResult === true;
    }
    
    // Combinar resultados com o operador especificado
    let result: boolean;
    
    if (operator === 'AND') {
      result = hasRole && hasPermission && dataCheckResult;
    } else {
      result = hasRole || hasPermission;
      
      // Verificação de dados sempre é AND, mesmo com operador OR
      result = result && dataCheckResult;
    }
    
    // Armazenar em cache (TTL de 5 minutos)
    await this.cacheManager.set(cacheKey, result, 300);
    
    return result;
  }
  
  /**
   * Verifica se um usuário possui uma das roles especificadas
   * 
   * @param userId ID do usuário
   * @param roles Lista de roles
   * @returns true se o usuário possui uma das roles, false caso contrário
   */
  private async hasRole(userId: string, roles: string[]): Promise<boolean> {
    // Implementação básica - na prática, seria necessário consultar o banco de dados
    // para verificar as roles do usuário
    
    // Aqui, estamos assumindo que as roles do usuário estão disponíveis no token JWT
    // e foram extraídas pelo guard JwtAuthGuard
    
    // Na implementação real, você consultaria o banco de dados para obter as roles do usuário
    
    // Exemplo:
    // const userRoles = await this.userRepository.findRolesByUserId(userId);
    // return roles.some(role => userRoles.includes(role));
    
    // Implementação temporária
    return true;
  }
  
  /**
   * Gera uma chave de cache para uma verificação de autorização
   * 
   * @param options Opções de autorização
   * @returns Chave de cache
   */
  private generateCacheKey(options: AuthorizationOptions): string {
    const { 
      userId, 
      roles, 
      permissionName, 
      scopeType, 
      scopeId, 
      operator 
    } = options;
    
    return `auth:${userId}:${roles?.join(',')}:${permissionName}:${scopeType}:${scopeId || 'null'}:${operator}`;
  }
  
  /**
   * Limpa o cache de autorização de um usuário
   * 
   * @param userId ID do usuário
   */
  async clearAuthorizationCache(userId: string): Promise<void> {
    // Implementação básica: na prática, seria necessário um mecanismo mais eficiente
    // para limpar apenas as chaves relacionadas ao usuário
    await this.cacheManager.del(`auth:${userId}:*`);
  }
}
