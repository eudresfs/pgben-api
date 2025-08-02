/**
 * Classe base para erros padronizados do sistema SEMTAS
 *
 * Implementa o padrão de erro estruturado conforme definido
 * no catálogo de erros, com suporte a contexto dinâmico,
 * localização e observabilidade.
 *
 * @see docs/ADRs/catalogo-erros.md
 */

import { HttpException } from '@nestjs/common';
import { ErrorDefinition, ErrorCategory, ErrorSeverity } from './types';

// Removida a importação estática do ERROR_CATALOG para evitar dependência circular

/**
 * Contexto dinâmico para personalização de erros
 */
export interface ErrorContext {
  /** Dados específicos do erro para interpolação na mensagem */
  data?: Record<string, any>;
  /** Causa raiz do erro (para encadeamento) */
  cause?: Error;
  /** Metadados adicionais para logging e debugging */
  metadata?: Record<string, any>;
  /** ID da requisição para rastreabilidade */
  requestId?: string;
  /** ID do usuário que causou o erro */
  userId?: string;
  /** Contexto operacional adicional */
  operationalContext?: {
    module?: string;
    operation?: string;
    entityId?: string;
    entityType?: string;
  };
}

/**
 * Classe principal para erros padronizados do sistema
 */
export class AppError extends HttpException {
  /** Código único do erro conforme catálogo */
  public readonly errorCode: string;

  /** Definição completa do erro do catálogo */
  public readonly definition: ErrorDefinition;

  /** Contexto dinâmico do erro */
  public readonly context: ErrorContext;

  /** Timestamp de quando o erro ocorreu */
  public readonly timestamp: Date;

  /** Mensagem localizada (se disponível) */
  public readonly localizedMessage?: string;

  constructor(
    errorCode: string,
    context: ErrorContext = {},
    acceptedLanguage: string = 'pt-BR',
  ) {
    // Importação dinâmica do catálogo para evitar dependência circular
    // Isso garante que o catálogo já esteja completamente construído quando for usado
    const { ERROR_CATALOG } = require('./catalog');

    const definition = ERROR_CATALOG[errorCode];

    if (!definition) {
      throw new Error(
        `Código de erro não encontrado no catálogo: ${errorCode}`,
      );
    }

    // Interpolar dados na mensagem se fornecidos
    const message = context.data
      ? AppError.interpolateMessage(definition.message, context.data)
      : definition.message;

    super(message, definition.httpStatus);

    this.name = 'AppError';
    this.errorCode = errorCode;
    this.definition = definition;
    this.context = context;
    this.timestamp = new Date();

    // Definir mensagem localizada
    if (definition.localizedMessages?.[acceptedLanguage]) {
      this.localizedMessage = context.data
        ? AppError.interpolateMessage(
            definition.localizedMessages[acceptedLanguage],
            context.data,
          )
        : definition.localizedMessages[acceptedLanguage];
    }

    // Preservar stack trace da causa raiz
    if (context.cause) {
      this.stack = context.cause.stack;
    }
  }

  /**
   * Interpola dados dinâmicos na mensagem usando placeholders
   * Formato: "Erro no campo {fieldName} com valor {value}"
   */
  private static interpolateMessage(
    template: string,
    data: Record<string, any>,
  ): string {
    return template.replace(/\{([^}]+)\}/g, (match, key) => {
      return data[key]?.toString() || match;
    });
  }

  /**
   * Retorna representação JSON estruturada do erro
   */
  public toJSON(): Record<string, any> {
    return {
      errorCode: this.errorCode,
      message: this.message,
      localizedMessage: this.localizedMessage,
      httpStatus: this.getStatus(),
      category: this.definition.category,
      severity: this.definition.severity,
      timestamp: this.timestamp.toISOString(),
      context: {
        data: this.context.data,
        metadata: this.context.metadata,
        requestId: this.context.requestId,
        userId: this.context.userId,
        operationalContext: this.context.operationalContext,
      },
      legalReference: this.definition.legalReference,
    };
  }

  /**
   * Retorna dados estruturados para logging
   */
  public getLogData(): Record<string, any> {
    return {
      errorCode: this.errorCode,
      category: this.definition.category,
      severity: this.definition.severity,
      httpStatus: this.getStatus(),
      message: this.message,
      localizedMessage: this.localizedMessage,
      timestamp: this.timestamp.toISOString(),
      requestId: this.context.requestId,
      userId: this.context.userId,
      operationalContext: this.context.operationalContext,
      metadata: this.context.metadata,
      legalReference: this.definition.legalReference,
      causedBy: this.context.cause?.message,
    };
  }

  /**
   * Retorna dados seguros para resposta da API (sem informações sensíveis)
   */
  public getApiResponse(includeDetails: boolean = false): Record<string, any> {
    // Usar contextualMessage se disponível, senão usar localizedMessage ou message padrão
    const contextualMessage = this.context.data?.contextualMessage;
    const userFriendlyMessage = this.context.data?.userFriendlyMessage;

    const response = {
      code: this.errorCode,
      message:
        contextualMessage ||
        userFriendlyMessage ||
        this.localizedMessage ||
        this.message,
      category: this.definition.category,
      timestamp: this.timestamp.toISOString(),
    };

    if (includeDetails && this.context.data) {
      // Filtrar dados sensíveis antes de incluir
      const safeData = this.filterSensitiveData(this.context.data);
      if (Object.keys(safeData).length > 0) {
        (response as any).details = safeData;
      }
    }

    if (this.definition.legalReference) {
      (response as any).legalReference = this.definition.legalReference;
    }

    return response;
  }

  /**
   * Remove dados sensíveis do contexto para exposição segura
   */
  private filterSensitiveData(data: Record<string, any>): Record<string, any> {
    const sensitiveKeys = [
      'password',
      'senha',
      'token',
      'secret',
      'key',
      'cpf',
      'rg',
      'email',
      'telefone',
      'endereco',
      'address',
      'phone',
    ];

    const filtered: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      const isSensitive = sensitiveKeys.some((sensitiveKey) =>
        key.toLowerCase().includes(sensitiveKey.toLowerCase()),
      );

      if (!isSensitive) {
        filtered[key] = value;
      }
    }

    return filtered;
  }

  /**
   * Verifica se o erro é crítico baseado na severidade
   */
  public isCritical(): boolean {
    return this.definition.severity === ErrorSeverity.CRITICAL;
  }

  /**
   * Verifica se o erro é de alta severidade
   */
  public isHighSeverity(): boolean {
    return this.definition.severity === ErrorSeverity.HIGH || this.isCritical();
  }

  /**
   * Verifica se o erro pertence a uma categoria específica
   */
  public isCategory(category: ErrorCategory): boolean {
    return this.definition.category === category;
  }

  /**
   * Cria uma nova instância do erro com contexto adicional
   */
  public withContext(additionalContext: Partial<ErrorContext>): AppError {
    const mergedContext: ErrorContext = {
      ...this.context,
      ...additionalContext,
      data: { ...this.context.data, ...additionalContext.data },
      metadata: { ...this.context.metadata, ...additionalContext.metadata },
    };

    return new AppError(this.errorCode, mergedContext);
  }

  /**
   * Factory method para criar erro a partir de código PostgreSQL
   */
  public static fromPostgresError(
    postgresCode: string,
    context: ErrorContext = {},
    acceptedLanguage: string = 'pt-BR',
  ): AppError {
    // Importar o mapa aqui para evitar dependência circular
    const { POSTGRES_ERROR_MAP } = require('./catalog');

    const errorCode = POSTGRES_ERROR_MAP[postgresCode];

    if (!errorCode) {
      // Fallback para erro genérico de sistema
      return new AppError(
        'SYSTEM_DATABASE_ERROR',
        {
          ...context,
          metadata: {
            ...context.metadata,
            postgresCode,
          },
        },
        acceptedLanguage,
      );
    }

    return new AppError(
      errorCode,
      {
        ...context,
        metadata: {
          ...context.metadata,
          postgresCode,
        },
      },
      acceptedLanguage,
    );
  }
}
