import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { LoggingService } from '../../../shared/logging/logging.service';
import { validate as isUUID } from 'uuid';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

/**
 * Interceptor para validação e sanitização de entrada em endpoints de documentos
 *
 * Funcionalidades:
 * - Sanitização de parâmetros de rota e query
 * - Validação de formatos (UUID, números, etc.)
 * - Prevenção de ataques de injeção
 * - Validação de DTOs com class-validator
 * - Logging de tentativas suspeitas
 */
@Injectable()
export class InputValidationInterceptor implements NestInterceptor {
  // Padrões suspeitos que podem indicar tentativas de ataque
  private readonly suspiciousPatterns = [
    /\.\.[\/\\]/g, // Path traversal
    /<script[^>]*>.*?<\/script>/gi, // XSS básico
    /javascript:/gi, // JavaScript protocol
    /on\w+\s*=/gi, // Event handlers
    /\b(union|select|insert|update|delete|drop|create|alter)\b/gi, // SQL injection básico
    /\$\{.*\}/g, // Template injection
    /\{\{.*\}\}/g, // Template injection
    /%[0-9a-f]{2}/gi, // URL encoding suspeito
    /\\x[0-9a-f]{2}/gi, // Hex encoding
    /\\u[0-9a-f]{4}/gi, // Unicode encoding
  ];

  // Caracteres perigosos que devem ser removidos/escapados
  private readonly dangerousChars = /[<>"'&\x00-\x1f\x7f-\x9f]/g;

  // Limites de tamanho para diferentes tipos de entrada
  private readonly sizeLimits = {
    uuid: 36,
    filename: 255,
    description: 1000,
    query: 100,
    general: 500,
  };

  constructor(private readonly logger: LoggingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    try {
      // Validar e sanitizar parâmetros de rota
      this.validateAndSanitizeParams(request);

      // Validar e sanitizar query parameters
      this.validateAndSanitizeQuery(request);

      // Validar headers críticos
      this.validateHeaders(request);

      // Validar body se presente
      this.validateBody(request);
    } catch (error) {
      this.logger.warn(
        'Tentativa de entrada inválida detectada',
        InputValidationInterceptor.name,
        {
          userId: user?.id,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          method: request.method,
          path: request.path,
          params: request.params,
          query: request.query,
          error: error.message,
        },
      );

      throw error;
    }

    return next.handle();
  }

  private validateAndSanitizeParams(request: Request): void {
    if (!request.params) return;

    for (const [key, value] of Object.entries(request.params)) {
      if (typeof value !== 'string') continue;

      // Verificar tamanho
      if (value.length > this.sizeLimits.general) {
        throw new BadRequestException(`Parâmetro '${key}' muito longo`);
      }

      // Verificar padrões suspeitos
      this.checkSuspiciousPatterns(value, `parâmetro '${key}'`);

      // Validações específicas por tipo de parâmetro
      if (key === 'id' || key === 'documentoId' || key === 'cidadaoId') {
        this.validateUUID(value, key);
      }

      // Para codigoOrId, aceitar tanto UUID quanto código alfanumérico
      if (key === 'codigoOrId') {
        this.validateCodigoOrId(value, key);
      }

      if (key === 'solicitacaoId') {
        this.validateUUID(value, key);
      }

      // Sanitizar o valor
      request.params[key] = this.sanitizeString(value);
    }
  }

  private validateAndSanitizeQuery(request: Request): void {
    if (!request.query) return;

    for (const [key, value] of Object.entries(request.query)) {
      if (typeof value !== 'string') continue;

      // Verificar tamanho - permitir tokens JWT longos
      // const sizeLimit = key === 'token' ? 2000 : this.sizeLimits.query; // JWT tokens podem ser longos
      // if (value.length > sizeLimit) {
      //   throw new BadRequestException(`Query parameter '${key}' muito longo`);
      // }

      // Verificar padrões suspeitos
      this.checkSuspiciousPatterns(value, `query parameter '${key}'`);

      // Validações específicas
      if (key === 'page' || key === 'limit' || key === 'offset') {
        this.validateNumeric(value, key);
        const num = parseInt(value, 10);
        if (num < 0 || num > 10000) {
          throw new BadRequestException(`${key} deve estar entre 0 e 10000`);
        }
      }

      if (key === 'sort') {
        this.validateSortParameter(value);
      }

      if (key === 'filter') {
        this.validateFilterParameter(value);
      }

      // Sanitizar o valor
      request.query[key] = this.sanitizeString(value);
    }
  }

  private validateHeaders(request: Request): void {
    const userAgent = request.headers['user-agent'];
    const contentType = request.headers['content-type'];

    // Validar User-Agent
    if (userAgent) {
      if (userAgent.length > 500) {
        throw new BadRequestException('User-Agent muito longo');
      }

      this.checkSuspiciousPatterns(userAgent, 'User-Agent');

      // Detectar User-Agents suspeitos
      const suspiciousUserAgents = [
        /sqlmap/i,
        /nikto/i,
        /nessus/i,
        /burp/i,
        /nmap/i,
        /masscan/i,
        /zap/i,
        /gobuster/i,
        /dirb/i,
      ];

      for (const pattern of suspiciousUserAgents) {
        if (pattern.test(userAgent)) {
          throw new BadRequestException('User-Agent não permitido');
        }
      }
    }

    // Validar Content-Type para uploads
    if (request.method === 'POST' && request.path.includes('/upload')) {
      if (!contentType || !contentType.includes('multipart/form-data')) {
        throw new BadRequestException('Content-Type inválido para upload');
      }
    }
  }

  private validateBody(request: Request): void {
    if (!request.body || typeof request.body !== 'object') return;

    // Verificar tamanho do body (proteção contra DoS)
    const bodyString = JSON.stringify(request.body);
    if (bodyString.length > 50000) {
      // 50KB
      throw new BadRequestException('Body da requisição muito grande');
    }

    // Validar recursivamente todos os valores string no body
    this.validateObjectRecursively(request.body, 'body');
  }

  private validateObjectRecursively(obj: any, path: string): void {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = `${path}.${key}`;

      if (typeof value === 'string') {
        // Verificar tamanho
        if (value.length > this.sizeLimits.general) {
          throw new BadRequestException(`Campo '${currentPath}' muito longo`);
        }

        // Verificar padrões suspeitos
        this.checkSuspiciousPatterns(value, currentPath);

        // Sanitizar
        obj[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        this.validateObjectRecursively(value, currentPath);
      }
    }
  }

  private checkSuspiciousPatterns(value: string, context: string): void {
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(value)) {
        throw new BadRequestException(
          `Padrão suspeito detectado em ${context}`,
        );
      }
    }
  }

  private validateUUID(value: string, fieldName: string): void {
    if (!isUUID(value)) {
      throw new BadRequestException(`${fieldName} deve ser um UUID válido`);
    }
  }

  private validateCodigoOrId(value: string, fieldName: string): void {
    // Aceita UUID ou código alfanumérico (letras, números, hífen, underscore)
    const isValidUUID = isUUID(value);
    const isValidCode =
      /^[a-zA-Z0-9_-]+$/.test(value) && value.length >= 1 && value.length <= 50;

    if (!isValidUUID && !isValidCode) {
      throw new BadRequestException(
        `${fieldName} deve ser um UUID válido ou um código alfanumérico (letras, números, hífen, underscore)`,
      );
    }
  }

  private validateNumeric(value: string, fieldName: string): void {
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException(`${fieldName} deve ser um número`);
    }
  }

  private validateSortParameter(value: string): void {
    // Permitir apenas campos específicos para ordenação
    const allowedSortFields = [
      'createdAt',
      'updatedAt',
      'filename',
      'size',
      'mimetype',
      'verified',
    ];

    const sortParts = value.split(',');
    for (const part of sortParts) {
      const field = part.replace(/^-/, ''); // Remove o sinal de menos
      if (!allowedSortFields.includes(field)) {
        throw new BadRequestException(
          `Campo de ordenação '${field}' não permitido`,
        );
      }
    }
  }

  private validateFilterParameter(value: string): void {
    try {
      const filter = JSON.parse(value);

      // Verificar se é um objeto válido
      if (typeof filter !== 'object' || filter === null) {
        throw new BadRequestException('Filtro deve ser um objeto JSON válido');
      }

      // Limitar profundidade do objeto
      this.checkObjectDepth(filter, 0, 3);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Filtro deve ser um JSON válido');
    }
  }

  private checkObjectDepth(
    obj: any,
    currentDepth: number,
    maxDepth: number,
  ): void {
    if (currentDepth > maxDepth) {
      throw new BadRequestException(
        'Filtro muito complexo (profundidade máxima excedida)',
      );
    }

    if (typeof obj === 'object' && obj !== null) {
      for (const value of Object.values(obj)) {
        this.checkObjectDepth(value, currentDepth + 1, maxDepth);
      }
    }
  }

  private sanitizeString(value: string): string {
    return value
      .trim()
      .replace(this.dangerousChars, '') // Remove caracteres perigosos
      .replace(/\s+/g, ' '); // Normaliza espaços
  }

  // Método para validar DTOs usando class-validator
  async validateDTO(dto: any, dtoClass: any): Promise<void> {
    const object = plainToClass(dtoClass, dto);
    const errors = await validate(object);

    if (errors.length > 0) {
      const messages = errors
        .map((error) => Object.values(error.constraints || {}).join(', '))
        .join('; ');

      throw new BadRequestException(`Dados inválidos: ${messages}`);
    }
  }
}
