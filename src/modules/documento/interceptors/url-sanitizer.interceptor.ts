import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { LoggingService } from '../../../shared/logging/logging.service';

/**
 * Interceptor para sanitização de URLs e prevenção de ataques
 * 
 * Este interceptor:
 * - Previne ataques de path traversal
 * - Sanitiza parâmetros de URL
 * - Valida formatos de entrada
 * - Registra tentativas suspeitas
 */
@Injectable()
export class UrlSanitizerInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    // Sanitizar parâmetros da URL
    this.sanitizeParams(request.params, user?.id);
    
    // Sanitizar query parameters
    this.sanitizeQuery(request.query, user?.id);
    
    // Sanitizar headers suspeitos
    this.sanitizeHeaders(request.headers, user?.id);
    
    return next.handle();
  }

  private sanitizeParams(params: any, userId?: string): void {
    if (!params) return;

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        // Verificar path traversal
        if (this.containsPathTraversal(value)) {
          this.logger.warn(
            `Tentativa de path traversal detectada no parâmetro ${key}: ${value}`,
            UrlSanitizerInterceptor.name,
            { key, value, userId, type: 'path_traversal' }
          );
          throw new BadRequestException(`Parâmetro ${key} contém caracteres inválidos`);
        }

        // Verificar caracteres suspeitos
        if (this.containsSuspiciousChars(value)) {
          this.logger.warn(
            `Caracteres suspeitos detectados no parâmetro ${key}: ${value}`,
            UrlSanitizerInterceptor.name,
            { key, value, userId, type: 'suspicious_chars' }
          );
          throw new BadRequestException(`Parâmetro ${key} contém caracteres não permitidos`);
        }

        // Validar UUIDs se aplicável (exceto codigoOrId que pode ser código ou UUID)
        if (key.toLowerCase().includes('id') && key !== 'codigoOrId' && !this.isValidUUID(value)) {
          this.logger.warn(
            `UUID inválido detectado no parâmetro ${key}: ${value}`,
            UrlSanitizerInterceptor.name,
            { key, value, userId, type: 'invalid_uuid' }
          );
          throw new BadRequestException(`Parâmetro ${key} deve ser um UUID válido`);
        }

        // Validar codigoOrId especificamente (aceita UUID ou código alfanumérico)
        if (key === 'codigoOrId' && !this.isValidCodigoOrId(value)) {
          this.logger.warn(
            `Código ou ID inválido detectado no parâmetro ${key}: ${value}`,
            UrlSanitizerInterceptor.name,
            { key, value, userId, type: 'invalid_codigo_or_id' }
          );
          throw new BadRequestException(`Parâmetro ${key} deve ser um UUID válido ou código alfanumérico`);
        }
      }
    }
  }

  private sanitizeQuery(query: any, userId?: string): void {
    if (!query) return;

    for (const [key, value] of Object.entries(query)) {
      if (typeof value === 'string') {
        // Verificar injeção de SQL básica
        if (this.containsSQLInjection(value)) {
          this.logger.warn(
            `Tentativa de SQL injection detectada no query ${key}: ${value}`,
            UrlSanitizerInterceptor.name,
            { key, value, userId, type: 'sql_injection' }
          );
          throw new BadRequestException(`Query parameter ${key} contém caracteres não permitidos`);
        }

        // Verificar XSS básico
        if (this.containsXSS(value)) {
          this.logger.warn(
            `Tentativa de XSS detectada no query ${key}: ${value}`,
            UrlSanitizerInterceptor.name,
            { key, value, userId, type: 'xss_attempt' }
          );
          throw new BadRequestException(`Query parameter ${key} contém caracteres não permitidos`);
        }
      }
    }
  }

  private sanitizeHeaders(headers: any, userId?: string): void {
    if (!headers) return;

    // Verificar headers suspeitos
    const suspiciousHeaders = [
      'x-forwarded-for',
      'x-real-ip',
      'x-originating-ip',
      'x-remote-ip',
    ];

    for (const header of suspiciousHeaders) {
      const value = headers[header];
      if (value && this.containsSuspiciousChars(value)) {
        this.logger.warn(
          `Header suspeito detectado ${header}: ${value}`,
          UrlSanitizerInterceptor.name,
          { header, value, userId, type: 'suspicious_header' }
        );
      }
    }

    // Verificar User-Agent suspeito
    const userAgent = headers['user-agent'];
    if (userAgent && this.isSuspiciousUserAgent(userAgent)) {
      this.logger.warn(
        `User-Agent suspeito detectado: ${userAgent}`,
        UrlSanitizerInterceptor.name,
        { userAgent, userId, type: 'suspicious_user_agent' }
      );
    }
  }

  private containsPathTraversal(value: string): boolean {
    const pathTraversalPatterns = [
      '../',
      '..\\',
      '%2e%2e%2f',
      '%2e%2e%5c',
      '..%2f',
      '..%5c',
      '%252e%252e%252f',
      '%252e%252e%255c',
    ];

    const lowerValue = value.toLowerCase();
    return pathTraversalPatterns.some(pattern => lowerValue.includes(pattern));
  }

  private containsSuspiciousChars(value: string): boolean {
    // Caracteres que podem indicar tentativas de ataque
    const suspiciousPatterns = [
      /[<>"']/,  // XSS básico
      /\x00/,    // Null bytes
      /\x1f/,    // Caracteres de controle
      /[\x7f-\xff]/, // Caracteres não ASCII
    ];

    return suspiciousPatterns.some(pattern => pattern.test(value));
  }

  private containsSQLInjection(value: string): boolean {
    const sqlPatterns = [
      /('|(\-\-)|(;)|(\||\|)|(\*|\*))/i,
      /(union|select|insert|delete|update|drop|create|alter|exec|execute)/i,
      /(script|javascript|vbscript|onload|onerror|onclick)/i,
    ];

    return sqlPatterns.some(pattern => pattern.test(value));
  }

  private containsXSS(value: string): boolean {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<[^>]*on\w+[^>]*>/gi,
    ];

    return xssPatterns.some(pattern => pattern.test(value));
  }

  private isValidUUID(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  private isValidCodigoOrId(value: string): boolean {
    // Aceita UUID ou código alfanumérico (letras, números, hífen, underscore)
    const isValidUUID = this.isValidUUID(value);
    const isValidCode = /^[a-zA-Z0-9_-]+$/.test(value) && value.length >= 1 && value.length <= 50;
    
    return isValidUUID || isValidCode;
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /sqlmap/i,
      /nikto/i,
      /nessus/i,
      /burp/i,
      /nmap/i,
      /masscan/i,
      /zap/i,
      /acunetix/i,
      /appscan/i,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }
}