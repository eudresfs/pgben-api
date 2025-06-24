import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSION_REQUIREMENTS_KEY,
  PermissionRequirement,
} from '../decorators/requires-permission.decorator';
import { PermissionService } from '../services/permission.service';
import { TipoEscopo } from '../../entities/user-permission.entity';
import { PermissionDeniedException } from '../exceptions/permission-denied.exception';

/**
 * Guard para verificar permissões granulares.
 *
 * Este guard verifica se o usuário tem as permissões necessárias para acessar
 * um endpoint, considerando os requisitos de permissão definidos pelo decorador
 * RequiresPermission.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService,
  ) {}

  /**
   * Verifica se o usuário tem as permissões necessárias para acessar o endpoint.
   *
   * @param context Contexto de execução
   * @returns true se o usuário tem as permissões necessárias, false caso contrário
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Obtém os requisitos de permissão do método e da classe
    const methodRequirements =
      this.reflector.get<PermissionRequirement[]>(
        PERMISSION_REQUIREMENTS_KEY,
        context.getHandler(),
      ) || [];

    const classRequirements =
      this.reflector.get<PermissionRequirement[]>(
        PERMISSION_REQUIREMENTS_KEY,
        context.getClass(),
      ) || [];

    // Combina os requisitos de permissão
    const requirements = [...methodRequirements, ...classRequirements];

    // Se não houver requisitos de permissão, permite o acesso
    if (requirements.length === 0) {
      return true;
    }

    // Obtém a requisição
    const request = context.switchToHttp().getRequest();

    // Verifica se o usuário está autenticado
    if (!request.user || !request.user.id) {
      throw new UnauthorizedException('Usuário não autenticado');
    }

    const userId = request.user.id;

    // Verificar se o usuário tem permissões em memória
    const userPermissions = request.user.permissions;
    
    // Se o usuário tem permissões em memória, verificar se tem a permissão de super admin
    if (userPermissions && userPermissions.length > 0) {
      // Verificar se o usuário tem permissão de super admin
      if (this.permissionService.hasPermissionInMemory(userPermissions, '*.*')) {
        this.logger.debug(
          `Acesso concedido via super admin: usuário ${userId} possui permissão '*.*'`,
        );
        return true;
      }
    } else {
      // FALLBACK: Se não tem permissões em memória, verificar no banco de dados
      // Este código será removido quando todas as permissões estiverem no JWT
      const hasSuperAdminPermission = await this.permissionService.hasPermission({
        userId,
        permissionName: '*.*',
        scopeType: TipoEscopo.GLOBAL,
      });

      if (hasSuperAdminPermission) {
        this.logger.debug(
          `Acesso concedido via super admin (banco): usuário ${userId} possui permissão '*.*'`,
        );
        return true;
      }
    }

    // Verifica se o usuário tem pelo menos uma das permissões requeridas (OR lógico)
    const requirementDetails: Array<{
      requirement: PermissionRequirement;
      scopeId?: string;
      hasPermission: boolean;
    }> = [];

    // Prepara todas as verificações de permissão
    for (const requirement of requirements) {
      const {
        permissionName,
        scopeType = TipoEscopo.GLOBAL,
        scopeIdExpression,
      } = requirement;

      // Obtém o ID do escopo a partir da expressão
      let scopeId: string | undefined;
      if (scopeType === TipoEscopo.UNIDADE && scopeIdExpression) {
        scopeId = this.evaluateScopeIdExpression(scopeIdExpression, request);
      }

      // Verificar permissões em memória primeiro
      let hasPermission = false;
      const userPermissions = request.user.permissions;
      
      if (userPermissions && userPermissions.length > 0) {
        // Verificar permissão em memória
        this.logger.debug(`Verificando permissão em memória: ${permissionName}`);
        hasPermission = this.permissionService.hasPermissionInMemory(userPermissions, permissionName);
        
        if (hasPermission) {
          this.logger.debug(`Permissão ${permissionName} encontrada em memória`);
        } else {
          this.logger.debug(`Permissão ${permissionName} NÃO encontrada em memória`);
        }
      } else {
        // FALLBACK: Se não tem permissões em memória, verificar no banco de dados
        // Este código será removido quando todas as permissões estiverem no JWT
        this.logger.debug(`Verificando permissão no banco: ${permissionName}`);
        hasPermission = await this.permissionService.hasPermission({
          userId,
          permissionName,
          scopeType,
          scopeId,
        });
      }

      requirementDetails.push({ requirement, scopeId, hasPermission });
    }
    
    // Verificar resultados
    const results = requirementDetails.map(detail => detail.hasPermission);

    // Verifica se pelo menos uma permissão foi concedida
    const hasAnyPermission = results.some((result) => result === true);

    if (!hasAnyPermission) {
      // Log detalhado de todas as permissões que falharam
      const failedPermissions = requirementDetails
        .filter((_, index) => !results[index])
        .map(({ requirement, scopeId }) => {
          const { permissionName, scopeType = TipoEscopo.GLOBAL } = requirement;
          return `${permissionName} (escopo: ${scopeType}${scopeId ? `, ID: ${scopeId}` : ''})`;
        });

      this.logger.warn(
        `Acesso negado: usuário ${userId} não possui nenhuma das permissões requeridas: ${failedPermissions.join(', ')}`,
      );

      // Lança exceção com a primeira permissão que falhou (para compatibilidade)
      const firstFailedRequirement = requirementDetails.find(
        (_, index) => !results[index],
      );
      if (firstFailedRequirement) {
        const { permissionName, scopeType = TipoEscopo.GLOBAL } =
          firstFailedRequirement.requirement;
        throw new PermissionDeniedException(
          permissionName,
          scopeType,
          firstFailedRequirement.scopeId,
        );
      }
    }

    return true;
  }

  /**
   * Avalia a expressão para obter o ID do escopo a partir dos parâmetros da requisição.
   *
   * @param expression Expressão para obter o ID do escopo
   * @param request Requisição
   * @returns ID do escopo ou undefined se não for possível obter
   */
  private evaluateScopeIdExpression(
    expression: string,
    request: any,
  ): string | undefined {
    try {
      // Divide a expressão em partes (ex: 'params.unidadeId' -> ['params', 'unidadeId'])
      const parts = expression.split('.');

      // Avalia a expressão
      let value = request;
      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          return undefined;
        }
      }

      return value?.toString();
    } catch (error) {
      this.logger.error(
        `Erro ao avaliar expressão de escopo: ${error.message}`,
        error.stack,
      );
      return undefined;
    }
  }
}
