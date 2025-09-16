import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { UserIdentifierService } from '../services/user-identifier.service';
import { UserIdentificationStrategy } from '../interfaces/user-identifier.interface';

/**
 * Middleware para controle de rate limiting e bloqueio por tentativas de login
 * Implementa proteção contra ataques de força bruta usando identificação inteligente de usuários
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);
  
  private attempts: Map<
    string,
    { count: number; lastAttempt: Date; blockedUntil?: Date }
  > = new Map();

  // Configurações do rate limiting
  private readonly MAX_ATTEMPTS = 5; // Máximo de tentativas
  private readonly BLOCK_DURATION = 15 * 60 * 1000; // 15 minutos em ms
  private readonly WINDOW_DURATION = 5 * 60 * 1000; // 5 minutos em ms

  constructor(private readonly userIdentifierService: UserIdentifierService) {}

  /**
   * Middleware principal para controle de rate limiting
   * @param req Request object
   * @param res Response object
   * @param next Next function
   */
  use(req: Request, res: Response, next: NextFunction) {
    try {
      // Aplicar rate limiting apenas para rotas de autenticação
      if (!this.isAuthRoute(req.path)) {
        return next();
      }

      // Usar o UserIdentifierService para identificação inteligente
      const identificationResult = this.userIdentifierService.identifyUser(req);
      const clientId = identificationResult.identifier;
      const strategy = identificationResult.strategy;
      const now = new Date();

      // Log da identificação para auditoria
      this.logger.debug(
        `Rate limiting check - ID: ${clientId}, Strategy: ${strategy}, Path: ${req.path}`,
      );

      // Verificar se o cliente está bloqueado
      if (this.isBlocked(clientId, now)) {
        const blockedUntil = this.attempts.get(clientId)?.blockedUntil;
        const remainingTime = blockedUntil
          ? Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000)
          : 0;

        // Log de tentativa bloqueada para auditoria
        this.logger.warn(
          `Rate limit exceeded - ID: ${clientId}, Strategy: ${strategy}, Remaining: ${remainingTime}s`,
        );

        throw new HttpException(
          {
            message: 'Muitas tentativas de login. Tente novamente mais tarde.',
            error: 'Too Many Requests',
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            remainingTime: remainingTime,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Registrar a tentativa
      this.recordAttempt(clientId, now);

      // Interceptar resposta para detectar falhas de autenticação
      const originalSend = res.send;
      const middlewareInstance = this;
      res.send = function (body: any) {
        const response = typeof body === 'string' ? JSON.parse(body) : body;

        // Se a autenticação falhou, incrementar contador
        if (res.statusCode === 401 || (response && response.statusCode === 401)) {
          const attempts = middlewareInstance.attempts.get(clientId);
          if (attempts && attempts.count >= middlewareInstance.MAX_ATTEMPTS) {
            // Bloquear cliente
            attempts.blockedUntil = new Date(now.getTime() + middlewareInstance.BLOCK_DURATION);
            
            // Log de bloqueio para auditoria
            middlewareInstance.logger.warn(
              `Client blocked due to failed attempts - ID: ${clientId}, Strategy: ${strategy}, Count: ${attempts.count}`,
            );
          }
        } else if (res.statusCode === 200 || res.statusCode === 201) {
          // Login bem-sucedido, limpar tentativas
          middlewareInstance.attempts.delete(clientId);
          
          // Log de sucesso para auditoria
          middlewareInstance.logger.log(
            `Successful authentication - ID: ${clientId}, Strategy: ${strategy}`,
          );
        }

        return originalSend.call(this, body);
      };

      next();
    } catch (error) {
      this.logger.error(
        `Error in rate limiting middleware: ${error.message}`,
        error.stack,
      );
      // Em caso de erro, permitir a requisição para não quebrar o fluxo
      next();
    }
  }

  /**
   * Verifica se a rota é de autenticação
   * @param path Caminho da requisição
   * @returns true se for rota de autenticação
   */
  private isAuthRoute(path: string): boolean {
    const authRoutes = ['/api/v1/auth/login', '/api/v1/auth/refresh'];
    return authRoutes.some((route) => path.includes(route));
  }



  /**
   * Verifica se o cliente está bloqueado
   * @param clientId Identificador do cliente
   * @param now Data/hora atual
   * @returns true se estiver bloqueado
   */
  private isBlocked(clientId: string, now: Date): boolean {
    const attempts = this.attempts.get(clientId);

    if (!attempts) {
      return false;
    }

    // Verificar se o bloqueio expirou
    if (attempts.blockedUntil && now > attempts.blockedUntil) {
      this.attempts.delete(clientId);
      return false;
    }

    return !!attempts.blockedUntil;
  }

  /**
   * Registra uma tentativa de acesso
   * @param clientId Identificador do cliente
   * @param now Data/hora atual
   */
  private recordAttempt(clientId: string, now: Date): void {
    const existing = this.attempts.get(clientId);

    if (!existing) {
      this.attempts.set(clientId, { count: 1, lastAttempt: now });
      return;
    }

    // Verificar se a janela de tempo expirou
    const timeDiff = now.getTime() - existing.lastAttempt.getTime();
    if (timeDiff > this.WINDOW_DURATION) {
      // Resetar contador se a janela expirou
      this.attempts.set(clientId, { count: 1, lastAttempt: now });
    } else {
      // Incrementar contador
      existing.count++;
      existing.lastAttempt = now;
    }
  }

  /**
   * Limpa tentativas expiradas (método de limpeza)
   * Deve ser chamado periodicamente para evitar vazamento de memória
   */
  public cleanupExpiredAttempts(): void {
    const now = new Date();

    for (const [clientId, attempts] of this.attempts.entries()) {
      const timeDiff = now.getTime() - attempts.lastAttempt.getTime();

      // Remover entradas antigas (mais de 1 hora)
      if (timeDiff > 60 * 60 * 1000) {
        this.attempts.delete(clientId);
      }
    }
  }
}
