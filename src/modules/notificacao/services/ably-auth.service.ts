import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { PermissionService } from '../../../auth/services/permission.service';
import { AblyConfig } from '../../../config/ably.config';
import {
  IAblyAuthConfig,
  IAblyTokenDetails,
  IAblyOperationResult,
} from '../interfaces/ably.interface';

/**
 * Serviço de autenticação para o Ably
 *
 * Este serviço é responsável por:
 * - Gerar tokens JWT para autenticação no Ably
 * - Gerenciar capacidades e permissões de usuários
 * - Validar tokens e sessões
 * - Implementar controle de acesso baseado em perfis
 */
@Injectable()
export class AblyAuthService {
  private readonly logger = new Logger(AblyAuthService.name);
  private readonly tokenCache = new Map<string, IAblyTokenDetails>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  constructor(
    @Inject('ABLY_CONFIG') private readonly ablyConfig: AblyConfig,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly permissionService: PermissionService,
  ) {}

  /**
   * Gera um token de autenticação para o Ably
   */
  async generateAuthToken(
    config: IAblyAuthConfig,
  ): Promise<IAblyOperationResult<IAblyTokenDetails>> {
    const startTime = Date.now();

    try {
      this.logger.debug(`Gerando token para usuário ${config.userId}`);

      // Verifica cache primeiro
      const cacheKey = this.getCacheKey(config);
      const cachedToken = this.getFromCache(cacheKey);

      if (cachedToken && this.isTokenValid(cachedToken)) {
        this.logger.debug(
          `Token encontrado no cache para usuário ${config.userId}`,
        );
        return {
          success: true,
          data: cachedToken,
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
        };
      }

      // Gera novo token
      const tokenDetails = await this.createNewToken(config);

      // Armazena no cache
      this.storeInCache(cacheKey, tokenDetails);

      const executionTime = Date.now() - startTime;

      this.logger.debug(
        `Token gerado com sucesso para usuário ${config.userId}`,
      );

      return {
        success: true,
        data: tokenDetails,
        timestamp: new Date(),
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error(
        `Erro ao gerar token para usuário ${config.userId}:`,
        error,
      );

      return {
        success: false,
        error: error.message,
        errorCode: error.code || 'AUTH_TOKEN_GENERATION_FAILED',
        timestamp: new Date(),
        executionTime,
      };
    }
  }

  /**
   * Cria um novo token JWT
   */
  private async createNewToken(
    config: IAblyAuthConfig,
  ): Promise<IAblyTokenDetails> {
    const now = Math.floor(Date.now() / 1000);
    const expiresInRaw = config.expiresIn ?? this.ablyConfig.jwtExpiresIn;
    const expiresIn = Number(expiresInRaw);
    if (Number.isNaN(expiresIn) || expiresIn <= 0) {
      throw new Error('expiresIn inválido para geração do token');
    }
    const expires = now + expiresIn;

    // Gera capacidades baseadas no perfil do usuário
    const capabilities =
      config.capabilities ||
      (await this.buildCapabilities(config.userId, config.isAdmin));

    // Payload do JWT (não incluir exp para evitar conflito com expiresIn)
    const payload = {
      iat: now, // Issued at
      'x-ably-capability': JSON.stringify(capabilities),
      'x-ably-clientId': config.userId,
    };

    // Gera o token JWT
    const token = await this.jwtService.signAsync(payload, {
      algorithm: 'RS256',
      keyid: this.getKeyId(),
      expiresIn, // segundos
    });

    return {
      token,
      expires: expires * 1000, // Converte para milliseconds
      capability: capabilities,
      clientId: config.userId,
    };
  }

  /**
   * Gera um token para administrador
   */
  async generateAdminToken(
    userId: string,
    expiresIn?: number,
  ): Promise<IAblyOperationResult<IAblyTokenDetails>> {
    const config: IAblyAuthConfig = {
      userId,
      isAdmin: true,
      expiresIn,
    };

    return this.generateAuthToken(config);
  }

  /**
   * Gera um token para usuário comum
   */
  async generateUserToken(
    userId: string,
    expiresIn?: number,
  ): Promise<IAblyOperationResult<IAblyTokenDetails>> {
    const config: IAblyAuthConfig = {
      userId,
      isAdmin: false,
      expiresIn,
    };

    return this.generateAuthToken(config);
  }

  /**
   * Gera um token com capacidades customizadas
   */
  async generateCustomToken(
    userId: string,
    capabilities: Record<string, string[]>,
    expiresIn?: number,
  ): Promise<IAblyOperationResult<IAblyTokenDetails>> {
    const config: IAblyAuthConfig = {
      userId,
      isAdmin: false,
      capabilities,
      expiresIn,
    };

    return this.generateAuthToken(config);
  }

  /**
   * Valida um token JWT
   */
  async validateToken(token: string): Promise<IAblyOperationResult<any>> {
    try {
      const decoded = await this.jwtService.verifyAsync(token, {
        algorithms: ['RS256'],
      });

      // Verifica se o token não expirou
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        return {
          success: false,
          error: 'Token expirado',
          errorCode: 'TOKEN_EXPIRED',
          timestamp: new Date(),
        };
      }

      return {
        success: true,
        data: decoded,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Erro ao validar token:', error);

      return {
        success: false,
        error: error.message,
        errorCode: 'TOKEN_VALIDATION_FAILED',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Revoga um token (adiciona à blacklist)
   */
  async revokeToken(
    token: string,
    userId: string,
  ): Promise<IAblyOperationResult> {
    try {
      // Remove do cache
      const cacheKeys = Array.from(this.tokenCache.keys()).filter((key) =>
        key.includes(userId),
      );
      cacheKeys.forEach((key) => this.tokenCache.delete(key));

      // Aqui você pode implementar uma blacklist persistente se necessário
      // Por exemplo, armazenar tokens revogados no Redis ou banco de dados

      this.logger.debug(`Token revogado para usuário ${userId}`);

      return {
        success: true,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Erro ao revogar token para usuário ${userId}:`, error);

      return {
        success: false,
        error: error.message,
        errorCode: 'TOKEN_REVOCATION_FAILED',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Verifica se um usuário tem permissão para acessar um canal
   */
  async hasChannelPermission(
    userId: string,
    channelName: string,
    permission: string = 'subscribe',
  ): Promise<boolean> {
    try {
      const fullChannelName = this.ablyConfig.getChannelName(
        channelName,
        userId,
      );

      // Administrador tem acesso total
      if (await this.isAdminUser(userId)) {
        return true;
      }

      // Canal pessoal (ex: pgben:user-123:notifications)
      if (fullChannelName.includes(`user-${userId}`)) {
        return true;
      }

      // Determina permissão necessária de acordo com o tipo de canal
      let requiredPermission = 'notificacao.canal.subscribe';
      if (fullChannelName.includes(':broadcast-unit-')) {
        requiredPermission = 'notificacao.broadcast.unit';
      } else if (fullChannelName.includes(':broadcast-role-')) {
        requiredPermission = 'notificacao.broadcast.role';
      } else if (fullChannelName.includes(':broadcast-region-')) {
        requiredPermission = 'notificacao.broadcast.region';
      }

      const hasPermission = await this.permissionService.hasPermission({
        userId,
        permissionName: requiredPermission,
      });

      return hasPermission;
    } catch (error) {
      this.logger.error(
        `Erro ao verificar permissão do canal para usuário ${userId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Gera capacidades (capability) dinâmicas para o JWT conforme as permissões do usuário.
   *
   * A lógica segue as seguintes regras:
   * 1. Usuários administradores recebem acesso total (`*`).
   * 2. Usuários comuns recebem acesso ao seu canal pessoal (`pgben:user-{id}:*`).
   * 3. Se possuírem permissões de broadcast, recebem acesso aos canais de broadcast
   *    correspondentes (unidade, papel, região).
   */
  private async buildCapabilities(
    userId: string,
    isAdmin = false,
  ): Promise<Record<string, string[]>> {
    // 1. Admin: acesso irrestrito
    if (isAdmin || (await this.isAdminUser(userId))) {
      return {
        '*': ['publish', 'subscribe', 'presence'],
      };
    }

    // 2. Capacidade padrão de usuário (canal pessoal)
    const capabilities: Record<string, string[]> = {
      // Canal pessoal — publica e assina mensagens e atualizações de presença
      [this.ablyConfig.getChannelName(`user-${userId}:*`, userId)]: [
        'publish',
        'subscribe',
        'presence',
      ],
    };

    // 3. Verifica permissões de broadcast em paralelo
    const [canUnitBroadcast, canRoleBroadcast, canRegionBroadcast] =
      await Promise.all([
        this.permissionService.hasPermission({
          userId,
          permissionName: 'notificacao.broadcast.unit',
        }),
        this.permissionService.hasPermission({
          userId,
          permissionName: 'notificacao.broadcast.role',
        }),
        this.permissionService.hasPermission({
          userId,
          permissionName: 'notificacao.broadcast.region',
        }),
      ]);

    const prefix = this.ablyConfig.channelPrefix;

    if (canUnitBroadcast) {
      capabilities[`${prefix}:broadcast-unit-*`] = ['subscribe', 'presence'];
    }

    if (canRoleBroadcast) {
      capabilities[`${prefix}:broadcast-role-*`] = ['subscribe', 'presence'];
    }

    if (canRegionBroadcast) {
      capabilities[`${prefix}:broadcast-region-*`] = ['subscribe', 'presence'];
    }

    return capabilities;
  }

  /**
   * Verifica se um usuário é administrador
   */
  private async isAdminUser(userId: string): Promise<boolean> {
    try {
      // Usuário com permissão global possui acesso total
      return await this.permissionService.hasPermission({
        userId,
        permissionName: '*.*',
      });
    } catch (error) {
      this.logger.error(`Erro ao verificar se usuário é administrador:`, error);
      return false;
    }
  }

  /**
   * Gera chave de cache para o token
   */
  private getCacheKey(config: IAblyAuthConfig): string {
    const capabilities = JSON.stringify(config.capabilities || {});
    const hash = crypto
      .createHash('md5')
      .update(`${config.userId}-${config.isAdmin}-${capabilities}`)
      .digest('hex');
    return `ably-token-${hash}`;
  }

  /**
   * Obtém token do cache
   */
  private getFromCache(key: string): IAblyTokenDetails | null {
    const cached = this.tokenCache.get(key);

    if (!cached) {
      return null;
    }

    // Verifica se o cache não expirou
    if (Date.now() > cached.expires - this.CACHE_TTL) {
      this.tokenCache.delete(key);
      return null;
    }

    return cached;
  }

  /**
   * Armazena token no cache
   */
  private storeInCache(key: string, tokenDetails: IAblyTokenDetails): void {
    this.tokenCache.set(key, tokenDetails);

    // Remove do cache quando expirar
    setTimeout(() => {
      this.tokenCache.delete(key);
    }, tokenDetails.expires - Date.now());
  }

  /**
   * Verifica se o token ainda é válido
   */
  private isTokenValid(tokenDetails: IAblyTokenDetails): boolean {
    return Date.now() < tokenDetails.expires - 60000; // 1 minuto de margem
  }

  /**
   * Gera ID da chave para o JWT
   */
  private getKeyId(): string {
    // Aqui você pode implementar um sistema de rotação de chaves
    // Por enquanto, retorna um ID fixo
    return 'pgben-ably-key-1';
  }

  /**
   * Limpa cache de tokens expirados
   */
  cleanExpiredTokens(): void {
    const now = Date.now();

    for (const [key, tokenDetails] of this.tokenCache.entries()) {
      if (now >= tokenDetails.expires) {
        this.tokenCache.delete(key);
      }
    }

    this.logger.debug(
      `Cache de tokens limpo. Tokens ativos: ${this.tokenCache.size}`,
    );
  }

  /**
   * Obtém estatísticas do cache de tokens
   */
  getCacheStats(): { totalTokens: number; activeTokens: number } {
    const now = Date.now();
    let activeTokens = 0;

    for (const tokenDetails of this.tokenCache.values()) {
      if (now < tokenDetails.expires) {
        activeTokens++;
      }
    }

    return {
      totalTokens: this.tokenCache.size,
      activeTokens,
    };
  }
}
