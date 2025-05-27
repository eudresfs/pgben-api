import { Injectable, CanActivate, ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_REQUIREMENTS_KEY, PermissionRequirement } from '../decorators/requires-permission.decorator';
import { PermissionService } from '../services/permission.service';
import { TipoEscopo } from '../entities/user-permission.entity';
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
    const methodRequirements = this.reflector.get<PermissionRequirement[]>(
      PERMISSION_REQUIREMENTS_KEY,
      context.getHandler(),
    ) || [];

    const classRequirements = this.reflector.get<PermissionRequirement[]>(
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

    // Verifica cada requisito de permissão
    for (const requirement of requirements) {
      const { permissionName, scopeType = TipoEscopo.GLOBAL, scopeIdExpression } = requirement;

      // Obtém o ID do escopo a partir da expressão
      let scopeId: string | undefined;
      if (scopeType === TipoEscopo.UNIDADE && scopeIdExpression) {
        scopeId = this.evaluateScopeIdExpression(scopeIdExpression, request);
      }

      // Verifica se o usuário tem a permissão
      const hasPermission = await this.permissionService.hasPermission({
        userId,
        permissionName,
        scopeType,
        scopeId,
      });

      if (!hasPermission) {
        this.logger.warn(
          `Acesso negado: usuário ${userId} não tem a permissão ${permissionName} com escopo ${scopeType}${
            scopeId ? ` e ID ${scopeId}` : ''
          }`,
        );
        
        // Lançar exceção personalizada em vez de retornar false
        throw new PermissionDeniedException(permissionName, scopeType, scopeId);
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
  private evaluateScopeIdExpression(expression: string, request: any): string | undefined {
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
      this.logger.error(`Erro ao avaliar expressão de escopo: ${error.message}`, error.stack);
      return undefined;
    }
  }
}
