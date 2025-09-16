import { Request } from 'express';

/**
 * Estratégias de identificação de usuário para rate limiting
 */
export enum UserIdentificationStrategy {
  /** Usar ID do usuário autenticado */
  USER_ID = 'user_id',
  /** Usar IP como fallback para usuários não autenticados */
  IP_FALLBACK = 'ip_fallback',
  /** Usar limite global para rotas públicas */
  GLOBAL_LIMIT = 'global_limit',
}

/**
 * Resultado da identificação do usuário
 */
export interface UserIdentificationResult {
  /** Identificador único do usuário/cliente */
  identifier: string;
  /** Estratégia utilizada para identificação */
  strategy: UserIdentificationStrategy;
  /** Se o usuário está autenticado */
  isAuthenticated: boolean;
  /** ID do usuário (se autenticado) */
  userId?: string;
  /** Informações adicionais para auditoria */
  metadata?: {
    ip?: string;
    userAgent?: string;
    route?: string;
  };
}

/**
 * Interface para serviço de identificação de usuários
 */
export interface IUserIdentifierService {
  /**
   * Identifica o usuário baseado na requisição
   * @param req Objeto de requisição Express
   * @param strategy Estratégia de identificação (opcional)
   * @returns Resultado da identificação
   */
  identifyUser(
    req: Request,
    strategy?: UserIdentificationStrategy,
  ): UserIdentificationResult;

  /**
   * Verifica se o identificador é válido
   * @param identifier Identificador a ser validado
   * @returns true se válido
   */
  isValidIdentifier(identifier: string): boolean;

  /**
   * Sanitiza o identificador para uso seguro
   * @param identifier Identificador a ser sanitizado
   * @returns Identificador sanitizado
   */
  sanitizeIdentifier(identifier: string): string;
}