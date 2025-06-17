import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { SseStructuredLoggingService, LogLevel } from '../services/sse-structured-logging.service';
import { SseGracefulDegradationService, DegradationLevel } from '../services/sse-graceful-degradation.service';
import { SseRetryPolicyService } from '../services/sse-retry-policy.service';
import { SseErrorBoundaryService } from '../services/sse-error-boundary.service';
import { SseCircuitBreakerService } from '../services/sse-circuit-breaker.service';
import { CacheService } from '../../../shared/cache/cache.service';

/**
 * Interface para payload do JWT
 */
interface JwtPayload {
  sub: string; // User ID
  email: string;
  roles: string[];
  permissions: string[];
  iat: number;
  exp: number;
}

/**
 * Interface para usuário autenticado
 */
interface AuthenticatedUser {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
  isActive: boolean;
}

/**
 * Interface para resultado de validação
 */
interface ValidationResult {
  isValid: boolean;
  user?: AuthenticatedUser;
  error?: string;
  shouldRetry?: boolean;
}

/**
 * Guard de autenticação para SSE com integração de resiliência
 */
@Injectable()
export class SseAuthGuard implements CanActivate {
  private readonly requiredPermissions = ['sse:connect', 'notifications:receive'];
  
  constructor(
    private readonly jwtService: JwtService,
    private readonly cacheService: CacheService,
    private readonly loggingService: SseStructuredLoggingService,
    private readonly gracefulDegradationService: SseGracefulDegradationService,
    private readonly retryPolicyService: SseRetryPolicyService,
    private readonly errorBoundaryService: SseErrorBoundaryService,
    private readonly circuitBreakerService: SseCircuitBreakerService,
  ) {}

  /**
   * Método principal de verificação de autorização
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = this.getClientIp(request);
    
    try {
      // Verificar se a autenticação está disponível
      const isAuthAvailable = this.gracefulDegradationService.isFeatureAvailable('authentication');
      
      if (!isAuthAvailable) {
        return this.handleDegradedAuth(request, clientIp, startTime);
      }

      // Extrair token do request
      const token = this.extractTokenFromRequest(request);
      
      if (!token) {
        this.logAuthFailure(request, 'Token não fornecido', startTime);
        throw new UnauthorizedException('Token de acesso requerido');
      }

      // Validar token com retry policy
      const validationResult = await this.retryPolicyService.executeWithRetry(
        () => this.validateToken(token, request),
        { maxAttempts: 3, initialDelay: 1000 }
      );

      if (!validationResult.success || !validationResult.result?.isValid) {
        const errorMsg = validationResult.result?.error || 'Token inválido';
        this.logAuthFailure(request, errorMsg, startTime);
        
        if (errorMsg.includes('expired')) {
          throw new UnauthorizedException('Token expirado');
        }
        
        throw new UnauthorizedException('Token inválido');
      }

      // Verificar permissões
      const hasPermissions = await this.checkPermissions(validationResult.result.user!, request);
      
      if (!hasPermissions) {
        this.logAuthFailure(request, 'Permissões insuficientes', startTime);
        throw new ForbiddenException('Permissões insuficientes para acessar SSE');
      }

      // Adicionar usuário ao request
      (request as any).user = validationResult.result.user;
      
      // Log de autenticação bem-sucedida
      this.logAuthSuccess(request, validationResult.result.user!, startTime);
      
      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Capturar erro com error boundary
      await this.errorBoundaryService.captureError(error as Error, {
        userId: 0,
        additionalData: {
          component: 'sse-auth-guard',
          operation: 'authentication',
          clientIp,
          userAgent: request.get('User-Agent'),
          duration,
          hasToken: !!this.extractTokenFromRequest(request),
        },
      });

      // Re-lançar exceções de autorização
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }

      // Para outros erros, log e negar acesso
      this.loggingService.logError(error as Error, {
        userId: 0,
        component: 'sse-auth-guard',
        operation: 'authentication_error',
        metadata: {
          clientIp,
          userAgent: request.get('User-Agent'),
          duration,
        },
      });

      throw new UnauthorizedException('Falha na autenticação');
    }
  }

  /**
   * Lidar com autenticação em modo degradado
   */
  private async handleDegradedAuth(
    request: Request,
    clientIp: string,
    startTime: number
  ): Promise<boolean> {
    const degradationLevel = this.gracefulDegradationService.getCurrentStatus().currentLevel;
    const duration = Date.now() - startTime;
    
    // Em modo crítico, negar todas as conexões
    if (degradationLevel === DegradationLevel.CRITICAL) {
      this.loggingService.logSecurity('Conexão negada - modo crítico', {
        userId: 0,
        component: 'sse-auth-guard',
        operation: 'degraded_auth_critical',
        metadata: {
          clientIp,
          userAgent: request.get('User-Agent'),
          degradationLevel,
          duration,
        },
      });
      
      throw new UnauthorizedException('Serviço temporariamente indisponível');
    }

    // Em outros níveis, permitir com autenticação básica
    const token = this.extractTokenFromRequest(request);
    
    if (!token) {
      this.loggingService.logSecurity('Conexão negada - sem token em modo degradado', {
        userId: 0,
        component: 'sse-auth-guard',
        operation: 'degraded_auth_no_token',
        metadata: {
          clientIp,
          userAgent: request.get('User-Agent'),
          degradationLevel,
          duration,
        },
      });
      
      throw new UnauthorizedException('Token requerido mesmo em modo degradado');
    }

    // Validação básica do token (apenas estrutura, sem verificação de assinatura)
    try {
      const payload = this.jwtService.decode(token) as JwtPayload;
      
      if (!payload || !payload.sub) {
        throw new UnauthorizedException('Token malformado');
      }

      // Criar usuário básico para modo degradado
      const degradedUser: AuthenticatedUser = {
        id: payload.sub,
        email: payload.email || 'unknown',
        roles: ['user'], // Papel básico
        permissions: ['sse:connect'], // Permissão mínima
        isActive: true,
      };

      (request as any).user = degradedUser;
      
      this.loggingService.logConnection(LogLevel.INFO, 'Autenticação degradada bem-sucedida', {
        userId: Number(degradedUser.id),
        component: 'sse-auth-guard',
        operation: 'degraded_auth_success',
        metadata: {
          clientIp,
          userAgent: request.get('User-Agent'),
          degradationLevel,
          duration,
        },
      });
      
      return true;
    } catch (error) {
      this.loggingService.logSecurity('Falha na autenticação degradada', {
        userId: 0,
        component: 'sse-auth-guard',
        operation: 'degraded_auth_failure',
        metadata: {
          clientIp,
          userAgent: request.get('User-Agent'),
          degradationLevel,
          duration,
          error: (error as Error).message,
        },
      });
      
      throw new UnauthorizedException('Falha na autenticação degradada');
    }
  }

  /**
   * Validar token JWT
   */
  private async validateToken(token: string, request: Request): Promise<ValidationResult> {
    try {
      // Verificar se o token está na blacklist (com circuit breaker)
      const blacklistCircuitBreaker = this.circuitBreakerService.getCircuitBreaker<[string], boolean>(
        'auth-blacklist-check',
        () => this.checkTokenBlacklist(token)
      );
      const isBlacklisted = await blacklistCircuitBreaker.fire(token);

      if (isBlacklisted) {
        return {
          isValid: false,
          error: 'Token na blacklist',
        };
      }

      // Verificar e decodificar token
      const payload = this.jwtService.verify(token) as JwtPayload;
      
      // Verificar se o usuário ainda está ativo (com circuit breaker)
      const userValidationCircuitBreaker = this.circuitBreakerService.getCircuitBreaker<[string], AuthenticatedUser | null>(
        'auth-user-validation',
        () => this.getUserFromDatabase(payload.sub)
      );
      const user = await userValidationCircuitBreaker.fire(payload.sub) as AuthenticatedUser | null;

      if (!user || !user.isActive) {
        return {
          isValid: false,
          error: 'Usuário inativo ou não encontrado',
        };
      }

      return {
        isValid: true,
        user,
      };
    } catch (error) {
      const errorMessage = (error as Error).message;
      
      return {
        isValid: false,
        error: errorMessage,
        shouldRetry: !errorMessage.includes('expired') && !errorMessage.includes('invalid'),
      };
    }
  }

  /**
   * Verificar se token está na blacklist
   */
  private async checkTokenBlacklist(token: string): Promise<boolean> {
    try {
      const blacklistKey = `blacklist:token:${token}`;
      const result = await this.cacheService.get(blacklistKey);
      return result !== null;
    } catch (error) {
      // Em caso de erro no Redis, assumir que não está na blacklist
      this.loggingService.logError(error as Error, {
        userId: 0,
        component: 'sse-auth-guard',
        operation: 'check_token_blacklist',
        metadata: { fallbackAction: 'assume_not_blacklisted' },
      });
      
      return false;
    }
  }

  /**
   * Obter usuário do banco de dados
   */
  private async getUserFromDatabase(userId: string): Promise<AuthenticatedUser | null> {
    // Simular busca no banco de dados
    // Em implementação real, usar repository/service apropriado
    try {
      // Placeholder - implementar busca real no banco
      const user: AuthenticatedUser = {
        id: userId,
        email: 'user@example.com',
        roles: ['user'],
        permissions: ['sse:connect', 'notifications:receive'],
        isActive: true,
      };
      
      return user;
    } catch (error) {
      this.loggingService.logError(error as Error, {
        userId: Number(userId),
        component: 'sse-auth-guard',
        operation: 'get_user_from_database',
        metadata: {},
      });
      
      return null;
    }
  }

  /**
   * Verificar permissões do usuário
   */
  private async checkPermissions(user: AuthenticatedUser, request: Request): Promise<boolean> {
    try {
      // Verificar se o usuário tem as permissões necessárias
      const hasRequiredPermissions = this.requiredPermissions.every(permission =>
        user.permissions.includes(permission)
      );

      if (!hasRequiredPermissions) {
        this.loggingService.logSecurity('Permissões insuficientes', {
          userId: Number(user.id),
          component: 'sse-auth-guard',
          operation: 'check_permissions',
          metadata: {
            userPermissions: user.permissions,
            requiredPermissions: this.requiredPermissions,
            clientIp: this.getClientIp(request),
          },
        });
        
        return false;
      }

      return true;
    } catch (error) {
      this.loggingService.logError(error as Error, {
        userId: Number(user.id),
        component: 'sse-auth-guard',
        operation: 'check_permissions_error',
        metadata: {},
      });
      
      return false;
    }
  }

  /**
   * Extrair token do request
   */
  private extractTokenFromRequest(request: Request): string | null {
    // Verificar header Authorization
    const authHeader = request.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Verificar query parameter (para SSE)
    const tokenFromQuery = request.query.token as string;
    if (tokenFromQuery) {
      return tokenFromQuery;
    }

    // Verificar cookie
    const tokenFromCookie = request.cookies?.access_token;
    if (tokenFromCookie) {
      return tokenFromCookie;
    }

    return null;
  }

  /**
   * Log de autenticação bem-sucedida
   */
  private logAuthSuccess(request: Request, user: AuthenticatedUser, startTime: number) {
    const duration = Date.now() - startTime;
    
    this.loggingService.logSecurity('Autenticação SSE bem-sucedida', {
      userId: Number(user.id),
      component: 'sse-auth-guard',
      operation: 'authentication_success',
      metadata: {
        userEmail: user.email,
        userRoles: user.roles,
        clientIp: this.getClientIp(request),
        userAgent: request.get('User-Agent'),
        duration,
      },
    });
  }

  /**
   * Log de falha na autenticação
   */
  private logAuthFailure(request: Request, reason: string, startTime: number) {
    const duration = Date.now() - startTime;
    
    this.loggingService.logSecurity('Falha na autenticação SSE', {
      userId: 0,
      component: 'sse-auth-guard',
      operation: 'authentication_failure',
      metadata: {
        reason,
        clientIp: this.getClientIp(request),
        userAgent: request.get('User-Agent'),
        duration,
      },
    });
  }

  /**
   * Obter IP do cliente
   */
  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }
}