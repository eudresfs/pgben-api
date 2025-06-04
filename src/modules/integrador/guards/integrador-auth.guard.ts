import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IntegradorAuthService } from '../services/integrador-auth.service';
import { ESCOPOS_KEY } from '../decorators/escopos.decorator';

/**
 * Guard de autenticação para integradores.
 * Valida se a requisição possui um token válido e se tem as permissões necessárias.
 */
@Injectable()
export class IntegradorAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: IntegradorAuthService,
  ) {}

  /**
   * Verifica se a requisição pode ser ativada (autorizada).
   * @param context Contexto de execução
   * @returns true se autorizado, false ou exceção caso contrário
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const resource = `${request.method} ${request.route?.path || request.url}`;
    const ipAddress = this.authService.getIpFromRequest(request);

    try {
      // Validar a autenticação
      const payload = await this.authService.validateRequest(request);

      // Verificar escopos requeridos
      const requiredScopes =
        this.reflector.getAllAndOverride<string[]>(ESCOPOS_KEY, [
          context.getHandler(),
          context.getClass(),
        ]) || [];

      if (!this.authService.checkPermissions(request, requiredScopes)) {
        // Registrar tentativa de acesso não autorizada
        await this.authService.registrarTentativaAcesso(
          payload.jti,
          payload.integrador?.id,
          false,
          ipAddress,
          resource,
          `Escopos insuficientes. Requeridos: ${requiredScopes.join(', ')}`,
        );

        throw new ForbiddenException(
          'Permissão insuficiente para acessar este recurso',
        );
      }

      // Registrar acesso bem-sucedido
      await this.authService.registrarTentativaAcesso(
        payload.jti,
        payload.integrador?.id,
        true,
        ipAddress,
        resource,
        'Acesso autorizado',
      );

      return true;
    } catch (error) {
      // Registrar tentativa de acesso falha
      await this.authService.registrarTentativaAcesso(
        null,
        null,
        false,
        ipAddress,
        resource,
        error.message || 'Erro desconhecido',
      );

      // Propagar a exceção original
      throw error;
    }
  }
}
