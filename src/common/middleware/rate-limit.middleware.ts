import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware para controle de rate limiting e bloqueio por tentativas de login
 * Implementa proteção contra ataques de força bruta
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private attempts: Map<string, { count: number; lastAttempt: Date; blockedUntil?: Date }> = new Map();
  
  // Configurações do rate limiting
  private readonly MAX_ATTEMPTS = 5; // Máximo de tentativas
  private readonly BLOCK_DURATION = 15 * 60 * 1000; // 15 minutos em ms
  private readonly WINDOW_DURATION = 5 * 60 * 1000; // 5 minutos em ms

  /**
   * Middleware principal para controle de rate limiting
   * @param req Request object
   * @param res Response object
   * @param next Next function
   */
  use(req: Request, res: Response, next: NextFunction) {
    // Aplicar rate limiting apenas para rotas de autenticação
    if (!this.isAuthRoute(req.path)) {
      return next();
    }

    const clientId = this.getClientIdentifier(req);
    const now = new Date();
    
    // Verificar se o cliente está bloqueado
    if (this.isBlocked(clientId, now)) {
      const blockedUntil = this.attempts.get(clientId)?.blockedUntil;
      const remainingTime = blockedUntil ? Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000) : 0;
      
      throw new HttpException(
        {
          message: 'Muitas tentativas de login. Tente novamente mais tarde.',
          error: 'Too Many Requests',
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          remainingTime: remainingTime
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Registrar a tentativa
    this.recordAttempt(clientId, now);
    
    // Interceptar resposta para detectar falhas de autenticação
    const originalSend = res.send;
    res.send = function(body: any) {
      const response = typeof body === 'string' ? JSON.parse(body) : body;
      
      // Se a autenticação falhou, incrementar contador
      if (res.statusCode === 401 || (response && response.statusCode === 401)) {
        const attempts = this.attempts.get(clientId);
        if (attempts && attempts.count >= this.MAX_ATTEMPTS) {
          // Bloquear cliente
          attempts.blockedUntil = new Date(now.getTime() + this.BLOCK_DURATION);
        }
      } else if (res.statusCode === 200 || res.statusCode === 201) {
        // Login bem-sucedido, limpar tentativas
        this.attempts.delete(clientId);
      }
      
      return originalSend.call(this, body);
    }.bind(this);

    next();
  }

  /**
   * Verifica se a rota é de autenticação
   * @param path Caminho da requisição
   * @returns true se for rota de autenticação
   */
  private isAuthRoute(path: string): boolean {
    const authRoutes = ['/api/v1/auth/login', '/api/v1/auth/refresh'];
    return authRoutes.some(route => path.includes(route));
  }

  /**
   * Obtém identificador único do cliente
   * @param req Request object
   * @returns Identificador do cliente
   */
  private getClientIdentifier(req: Request): string {
    // Usar IP + User-Agent para identificar cliente
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    return `${ip}:${userAgent}`;
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