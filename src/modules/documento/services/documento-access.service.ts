import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoggingService } from '../../../shared/logging/logging.service';
import { DocumentoService } from './documento.service';
import { CacheService } from '../../../shared/cache/cache.service';

export interface DocumentAccessToken {
  documentoId: string;
  usuarioId: string;
  type: 'document_access';
  exp?: number; // Opcional, gerenciado pelo JWT Service
  iat: number;
  jti: string; // JWT ID para revogação
}

export interface SecureUrlOptions {
  expiresIn?: string | number; // Tempo de expiração (padrão: 1h)
  allowDownload?: boolean; // Permitir download direto
  maxUses?: number; // Número máximo de usos
}

export interface SecureUrlResult {
  url: string;
  token: string;
  expiresAt: Date;
  maxUses?: number;
}

@Injectable()
export class DocumentoAccessService {
  private readonly defaultExpiry: string;
  private readonly baseUrl: string;
  private readonly revokedTokensKey = 'documento:revoked_tokens';
  private readonly tokenUsageKey = 'documento:token_usage';

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly logger: LoggingService,
    private readonly documentoService: DocumentoService,
    private readonly cacheService: CacheService,
  ) {
    this.defaultExpiry = this.configService.get<string>('DOCUMENT_TOKEN_EXPIRY', '3600s');
    this.baseUrl = this.configService.get<string>('BASE_URL', 'http://localhost:3000');
  }

  /**
   * Gera URL segura com token de acesso temporário
   */
  async generateSecureUrl(
    documentoId: string,
    usuarioId: string,
    options: SecureUrlOptions = {},
  ): Promise<SecureUrlResult> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Gerando URL segura para documento', DocumentoAccessService.name, {
        documentoId,
        usuarioId,
        options,
      });

      // Verificar se o usuário tem acesso ao documento
      const hasAccess = await this.documentoService.checkUserDocumentAccess(documentoId, usuarioId);
      if (!hasAccess) {
        throw new ForbiddenException('Usuário não tem acesso a este documento');
      }

      // Gerar JWT ID único para permitir revogação
      const jti = this.generateJwtId();
      const now = Math.floor(Date.now() / 1000);
      const expirySeconds = this.parseExpiryToSeconds(options.expiresIn || this.defaultExpiry);
      const exp = now + expirySeconds;

      // Payload do token (sem exp e jti, deixar o JWT Service gerenciar)
      const payload = {
        documentoId,
        usuarioId,
        type: 'document_access',
        iat: now,
      };

      // Gerar token JWT com expiresIn e jwtid
      const token = this.jwtService.sign(payload, {
        jwtid: jti,
        expiresIn: expirySeconds,
      });

      // Armazenar informações do token no cache se maxUses for especificado
      if (options.maxUses) {
        await this.cacheService.set(
          `${this.tokenUsageKey}:${jti}`,
          { uses: 0, maxUses: options.maxUses },
          exp - now,
        );
      }

      // Construir URL segura
      const secureUrl = `${this.baseUrl}/api/v1/documento/acesso/${documentoId}?token=${token}`;
      const expiresAt = new Date(exp * 1000);

      const processingTime = Date.now() - startTime;
      this.logger.info('URL segura gerada com sucesso', DocumentoAccessService.name, {
        documentoId,
        usuarioId,
        jti,
        expiresAt,
        processingTime,
      });

      return {
        url: secureUrl,
        token,
        expiresAt,
        maxUses: options.maxUses,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error('Erro ao gerar URL segura', error.stack, DocumentoAccessService.name, {
        documentoId,
        usuarioId,
        error: error.message,
        processingTime,
      });
      throw error;
    }
  }

  /**
   * Valida e usa token de acesso, retornando dados do documento
   */
  async validateAndUseToken(token: string): Promise<{ documentoId: string; usuarioId: string }> {
    try {
      this.logger.debug('Validando e usando token de acesso', DocumentoAccessService.name, {
        tokenPrefix: token.substring(0, 20) + '...',
      });

      // Verificar e decodificar o token
      const payload = this.jwtService.verify<DocumentAccessToken>(token);

      // Validações básicas
      if (payload.type !== 'document_access') {
        throw new UnauthorizedException('Tipo de token inválido');
      }

      // Verificar se o token foi revogado
      const isRevoked = await this.isTokenRevoked(payload.jti);
      if (isRevoked) {
        throw new UnauthorizedException('Token foi revogado');
      }

      // Verificar limite de usos se aplicável
      const usageValid = await this.checkTokenUsage(payload.jti);
      if (!usageValid) {
        throw new UnauthorizedException('Token excedeu limite de usos');
      }

      this.logger.debug('Token validado e usado com sucesso', DocumentoAccessService.name, {
        jti: payload.jti,
        documentoId: payload.documentoId,
        usuarioId: payload.usuarioId,
      });

      return {
        documentoId: payload.documentoId,
        usuarioId: payload.usuarioId,
      };
    } catch (error) {
      this.logger.warn('Erro na validação/uso do token', DocumentoAccessService.name, {
        error: error.message,
      });
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }

  /**
   * Valida token de acesso a documento
   */
  async validateDocumentToken(
    token: string,
    documentoId: string,
    usuarioId: string,
  ): Promise<boolean> {
    try {
      this.logger.debug('Validando token de documento', DocumentoAccessService.name, {
        documentoId,
        usuarioId,
        tokenPrefix: token.substring(0, 20) + '...',
      });

      // Verificar e decodificar o token
      const payload = this.jwtService.verify<DocumentAccessToken>(token);

      // Validações básicas
      if (
        payload.documentoId !== documentoId ||
        payload.usuarioId !== usuarioId ||
        payload.type !== 'document_access'
      ) {
        this.logger.warn('Token inválido - dados não conferem', DocumentoAccessService.name, {
          expectedDocumentoId: documentoId,
          actualDocumentoId: payload.documentoId,
          expectedUsuarioId: usuarioId,
          actualUsuarioId: payload.usuarioId,
          tokenType: payload.type,
        });
        return false;
      }

      // Verificar se o token foi revogado
      const isRevoked = await this.isTokenRevoked(payload.jti);
      if (isRevoked) {
        this.logger.warn('Token revogado', DocumentoAccessService.name, {
          jti: payload.jti,
          documentoId,
          usuarioId,
        });
        return false;
      }

      // Verificar limite de usos se aplicável
      const usageValid = await this.checkTokenUsage(payload.jti);
      if (!usageValid) {
        this.logger.warn('Token excedeu limite de usos', DocumentoAccessService.name, {
          jti: payload.jti,
          documentoId,
          usuarioId,
        });
        return false;
      }

      this.logger.debug('Token validado com sucesso', DocumentoAccessService.name, {
        jti: payload.jti,
        documentoId,
        usuarioId,
      });

      return true;
    } catch (error) {
      this.logger.warn('Erro na validação do token', DocumentoAccessService.name, {
        error: error.message,
        documentoId,
        usuarioId,
      });
      return false;
    }
  }

  /**
   * Revoga um token específico
   */
  async revokeToken(token: string, reason?: string): Promise<void> {
    try {
      // Extrair JTI do token
      const payload = this.jwtService.decode(token) as DocumentAccessToken;
      const jti = payload?.jti;
      
      if (!jti) {
        throw new UnauthorizedException('Token inválido');
      }

      this.logger.info('Revogando token', DocumentoAccessService.name, {
        jti,
        reason,
      });

      // Adicionar token à lista de revogados no cache
      const revokedTokens = await this.cacheService.get<string[]>(this.revokedTokensKey) || [];
      if (!revokedTokens.includes(jti)) {
        revokedTokens.push(jti);
        await this.cacheService.set(this.revokedTokensKey, revokedTokens, 86400); // 24 horas
      }

      this.logger.info('Token revogado com sucesso', DocumentoAccessService.name, {
        jti,
        reason,
      });
    } catch (error) {
      this.logger.error('Erro ao revogar token', error.stack, DocumentoAccessService.name, {
        reason,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Revoga todos os tokens de um usuário para um documento
   */
  async revokeUserDocumentTokens(
    documentoId: string,
    usuarioId: string,
    reason?: string,
  ): Promise<void> {
    try {
      this.logger.info('Revogando todos os tokens do usuário para documento', DocumentoAccessService.name, {
        documentoId,
        usuarioId,
        reason,
      });

      // Esta implementação seria mais complexa em produção
      // Por simplicidade, vamos apenas logar a ação
      // Em produção, seria necessário manter um índice de tokens por usuário/documento
      
      this.logger.info('Revogação em lote solicitada', DocumentoAccessService.name, {
        documentoId,
        usuarioId,
        reason,
        note: 'Implementação completa requer índice de tokens',
      });
    } catch (error) {
      this.logger.error('Erro ao revogar tokens do usuário', error.stack, DocumentoAccessService.name, {
        documentoId,
        usuarioId,
        reason,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Limpa tokens expirados
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      this.logger.debug('Iniciando limpeza de tokens expirados', DocumentoAccessService.name);

      // Obter todos os tokens revogados
      const revokedTokens = await this.cacheService.get<string[]>(this.revokedTokensKey) || [];
      let cleanedCount = 0;
      const validTokens: string[] = [];

      for (const jti of revokedTokens) {
        try {
          // Verificar se o token de uso ainda existe
          const usageKey = `${this.tokenUsageKey}:${jti}`;
          const usage = await this.cacheService.get(usageKey);
          
          if (usage) {
            // Token ainda válido, manter na lista
            validTokens.push(jti);
          } else {
            // Token expirado, será removido
            cleanedCount++;
          }
        } catch (error) {
          // Token expirado ou inválido, será removido
          cleanedCount++;
        }
      }

      // Atualizar lista de tokens revogados apenas com os válidos
      if (cleanedCount > 0) {
        await this.cacheService.set(this.revokedTokensKey, validTokens, 86400);
      }

      this.logger.info('Limpeza de tokens concluída', DocumentoAccessService.name, {
        cleanedCount,
        totalRevoked: revokedTokens.length,
        remainingTokens: validTokens.length,
      });

      return cleanedCount;
    } catch (error) {
      this.logger.error('Erro na limpeza de tokens', error.stack, DocumentoAccessService.name, {
        error: error.message,
      });
      return 0;
    }
  }

  // Métodos privados

  private generateJwtId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private parseExpiryToSeconds(expiry: string | number): number {
    if (typeof expiry === 'number') {
      return expiry;
    }

    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 3600; // 1 hora padrão
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 3600;
    }
  }

  private async isTokenRevoked(jti: string): Promise<boolean> {
    try {
      const revokedTokens = await this.cacheService.get<string[]>(this.revokedTokensKey) || [];
      return revokedTokens.includes(jti);
    } catch (error) {
      this.logger.warn('Erro ao verificar revogação do token', DocumentoAccessService.name, {
        jti,
        error: error.message,
      });
      return false;
    }
  }

  private async checkTokenUsage(jti: string): Promise<boolean> {
    try {
      const usageKey = `${this.tokenUsageKey}:${jti}`;
      const usage = await this.cacheService.get<{uses: number; maxUses: number}>(usageKey);
      
      if (!usage) {
        // Sem limite de uso
        return true;
      }

      if (usage.uses >= usage.maxUses) {
        return false;
      }

      // Incrementar contador de uso
      usage.uses++;
      await this.cacheService.set(usageKey, usage);
      
      return true;
    } catch (error) {
      this.logger.warn('Erro ao verificar uso do token', DocumentoAccessService.name, {
        jti,
        error: error.message,
      });
      return true; // Em caso de erro, permitir acesso
    }
  }
}