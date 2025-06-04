import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

/**
 * Guard para verificar IPs na blacklist
 * Bloqueia requisições de IPs suspeitos ou maliciosos
 */
@Injectable()
export class IpBlacklistGuard implements CanActivate {
  private readonly logger = new Logger(IpBlacklistGuard.name);
  private readonly blacklistedIps = new Set<string>();
  private readonly suspiciousIps = new Map<
    string,
    { count: number; lastSeen: Date }
  >();
  private readonly maxSuspiciousAttempts: number;
  private readonly suspiciousTimeWindow: number; // em minutos
  private readonly blacklistDuration: number; // em minutos

  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {
    // Configurações do blacklist
    this.maxSuspiciousAttempts = this.configService.get<number>(
      'SECURITY_MAX_SUSPICIOUS_ATTEMPTS',
      10,
    );
    this.suspiciousTimeWindow = this.configService.get<number>(
      'SECURITY_SUSPICIOUS_TIME_WINDOW',
      15,
    );
    this.blacklistDuration = this.configService.get<number>(
      'SECURITY_BLACKLIST_DURATION',
      60,
    );

    // IPs permanentemente bloqueados (configuráveis via env)
    const permanentBlacklist = this.configService.get<string>(
      'SECURITY_PERMANENT_BLACKLIST',
      '',
    );
    if (permanentBlacklist) {
      permanentBlacklist.split(',').forEach((ip) => {
        this.blacklistedIps.add(ip.trim());
      });
    }

    // Limpeza periódica de IPs suspeitos
    setInterval(
      () => {
        this.cleanupSuspiciousIps();
      },
      5 * 60 * 1000,
    ); // A cada 5 minutos
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = this.getClientIp(request);

    // Verificar se o IP está na blacklist
    if (this.isBlacklisted(clientIp)) {
      this.logger.warn(`Acesso bloqueado para IP blacklistado: ${clientIp}`, {
        ip: clientIp,
        userAgent: request.headers['user-agent'],
        url: request.url,
        method: request.method,
      });

      throw new ForbiddenException({
        message: 'Acesso negado',
        error: 'IP_BLACKLISTED',
        statusCode: 403,
      });
    }

    // Verificar se deve pular a verificação (para endpoints específicos)
    const skipBlacklist = this.reflector.get<boolean>(
      'skipIpBlacklist',
      context.getHandler(),
    );
    if (skipBlacklist) {
      return true;
    }

    return true;
  }

  /**
   * Extrai o IP real do cliente considerando proxies
   */
  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'] as string;
    const realIp = request.headers['x-real-ip'] as string;
    const remoteAddress = request.connection?.remoteAddress;
    const socketAddress = request.socket?.remoteAddress;

    // Priorizar headers de proxy confiáveis
    if (forwarded) {
      // X-Forwarded-For pode conter múltiplos IPs separados por vírgula
      const ips = forwarded.split(',').map((ip) => ip.trim());
      return ips[0]; // Primeiro IP é o cliente original
    }

    if (realIp) {
      return realIp;
    }

    return remoteAddress || socketAddress || 'unknown';
  }

  /**
   * Verifica se um IP está na blacklist
   */
  private isBlacklisted(ip: string): boolean {
    return this.blacklistedIps.has(ip);
  }

  /**
   * Adiciona um IP à blacklist temporariamente
   */
  public addToBlacklist(ip: string, duration?: number): void {
    this.blacklistedIps.add(ip);
    this.logger.warn(`IP adicionado à blacklist: ${ip}`);

    // Remover da blacklist após o tempo especificado
    const timeoutDuration = duration || this.blacklistDuration;
    setTimeout(
      () => {
        this.removeFromBlacklist(ip);
      },
      timeoutDuration * 60 * 1000,
    );
  }

  /**
   * Remove um IP da blacklist
   */
  public removeFromBlacklist(ip: string): void {
    if (this.blacklistedIps.delete(ip)) {
      this.logger.log(`IP removido da blacklist: ${ip}`);
    }
  }

  /**
   * Marca um IP como suspeito
   */
  public markAsSuspicious(ip: string, reason?: string): void {
    const now = new Date();
    const existing = this.suspiciousIps.get(ip);

    if (existing) {
      // Verificar se ainda está dentro da janela de tempo
      const timeDiff =
        (now.getTime() - existing.lastSeen.getTime()) / (1000 * 60);
      if (timeDiff <= this.suspiciousTimeWindow) {
        existing.count++;
        existing.lastSeen = now;
      } else {
        // Reset do contador se passou da janela de tempo
        existing.count = 1;
        existing.lastSeen = now;
      }

      // Adicionar à blacklist se excedeu o limite
      if (existing.count >= this.maxSuspiciousAttempts) {
        this.addToBlacklist(ip);
        this.suspiciousIps.delete(ip);
        this.logger.warn(
          `IP ${ip} adicionado à blacklist por atividade suspeita (${existing.count} tentativas)`,
          { reason },
        );
      }
    } else {
      this.suspiciousIps.set(ip, { count: 1, lastSeen: now });
    }

    this.logger.warn(`IP marcado como suspeito: ${ip}`, {
      reason,
      count: this.suspiciousIps.get(ip)?.count,
    });
  }

  /**
   * Limpa IPs suspeitos antigos
   */
  private cleanupSuspiciousIps(): void {
    const now = new Date();
    const toRemove: string[] = [];

    this.suspiciousIps.forEach((data, ip) => {
      const timeDiff = (now.getTime() - data.lastSeen.getTime()) / (1000 * 60);
      if (timeDiff > this.suspiciousTimeWindow) {
        toRemove.push(ip);
      }
    });

    toRemove.forEach((ip) => {
      this.suspiciousIps.delete(ip);
    });

    if (toRemove.length > 0) {
      this.logger.debug(`Removidos ${toRemove.length} IPs suspeitos expirados`);
    }
  }

  /**
   * Obtém estatísticas do blacklist
   */
  public getStats(): {
    blacklistedCount: number;
    suspiciousCount: number;
    blacklistedIps: string[];
    suspiciousIps: { ip: string; count: number; lastSeen: Date }[];
  } {
    return {
      blacklistedCount: this.blacklistedIps.size,
      suspiciousCount: this.suspiciousIps.size,
      blacklistedIps: Array.from(this.blacklistedIps),
      suspiciousIps: Array.from(this.suspiciousIps.entries()).map(
        ([ip, data]) => ({
          ip,
          count: data.count,
          lastSeen: data.lastSeen,
        }),
      ),
    };
  }

  /**
   * Verifica se um IP é considerado local/confiável
   */
  private isLocalIp(ip: string): boolean {
    const localPatterns = [
      /^127\./,
      /^192\.168\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^::1$/,
      /^localhost$/i,
    ];

    return localPatterns.some((pattern) => pattern.test(ip));
  }

  /**
   * Limpa todas as blacklists (usar com cuidado)
   */
  public clearAll(): void {
    this.blacklistedIps.clear();
    this.suspiciousIps.clear();
    this.logger.warn('Todas as blacklists foram limpas');
  }
}
