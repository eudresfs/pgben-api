import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { registerAs } from '@nestjs/config';

/**
 * Configuração do Ably para notificações em tempo real
 * 
 * Esta classe centraliza todas as configurações relacionadas ao Ably,
 * incluindo autenticação, canais, performance e segurança.
 */
@Injectable()
export class AblyConfig {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Configurações principais do Ably
   */
  get apiKey(): string {
    const apiKey = this.configService.get<string>('ABLY_API_KEY');
    if (!apiKey) {
      throw new Error('ABLY_API_KEY não configurada.');
    }
    return apiKey;
  }

  get environment(): 'sandbox' | 'production' | undefined {
    return this.configService.get<'sandbox' | 'production' | undefined>('ABLY_ENVIRONMENT');
  }

  get clientId(): string {
    return this.configService.get<string>('ABLY_CLIENT_ID', 'pgben-server');
  }

  /**
   * Configurações de autenticação JWT
   */
  get jwtExpiresIn(): number {
    // Pode vir como string ("3600" ou "1h"), então convertemos para segundos
    const raw = this.configService.get<string>('ABLY_JWT_EXPIRES_IN', '3600');
    // Se for no formato "1h", "30m" etc., converte manualmente
    if (/^\d+$/.test(raw)) {
      return Number(raw);
    }
    const durationMatch = raw.match(/^(\d+)([smhd])$/i);
    if (durationMatch) {
      const value = Number(durationMatch[1]);
      const unit = durationMatch[2].toLowerCase();
      const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
      return value * (multipliers[unit] || 1);
    }
    // Fallback para 1 hora (3600s)
    return 3600;
  }

  get jwtCapabilityAdmin(): string {
    return this.configService.get<string>('ABLY_JWT_CAPABILITY_ADMIN', '*');
  }

  get jwtCapabilityUser(): string {
    return this.configService.get<string>('ABLY_JWT_CAPABILITY_USER', 'user-*');
  }

  /**
   * Allow-list de canais permitidos (se vazio ou conter '*', todos os canais são permitidos)
   */
  get allowedChannels(): string[] {
    const raw = this.configService.get<string>('ABLY_ALLOWED_CHANNELS', '*');
    return raw.split(',').map((c) => c.trim());
  }

  /**
   * Verifica se o canal informado está autorizado na allow-list
   */
  isChannelAllowed(channel: string): boolean {
    if (!channel) return false;
    if (this.allowedChannels.includes('*')) return true;
    return this.allowedChannels.some((allowed) => {
      if (allowed.endsWith('*')) {
        // prefix match
        return channel.startsWith(allowed.slice(0, -1));
      }
      return channel === allowed;
    });
  }

  /**
   * Configurações de canais
   */
  get channelPrefix(): string {
    return this.configService.get<string>('ABLY_CHANNEL_PREFIX', 'pgben');
  }

  get channelNotifications(): string {
    return this.configService.get<string>('ABLY_CHANNEL_NOTIFICATIONS', 'notifications');
  }

  get channelSystem(): string {
    return this.configService.get<string>('ABLY_CHANNEL_SYSTEM', 'system');
  }

  get channelAudit(): string {
    return this.configService.get<string>('ABLY_CHANNEL_AUDIT', 'audit');
  }

  /**
   * Configurações de performance
   */
  get connectionTimeout(): number {
    return this.configService.get<number>('ABLY_CONNECTION_TIMEOUT', 30000);
  }

  get maxMessageSize(): number {
    return this.configService.get<number>('ABLY_MAX_MESSAGE_SIZE', 65536);
  }

  get heartbeatInterval(): number {
    return this.configService.get<number>('ABLY_HEARTBEAT_INTERVAL', 15000);
  }

  get retryAttempts(): number {
    return this.configService.get<number>('ABLY_RETRY_ATTEMPTS', 3);
  }

  /**
   * Configurações de segurança
   */
  get enableTls(): boolean {
    return this.configService.get<boolean>('ABLY_ENABLE_TLS', true);
  }

  get logLevel(): 'debug' | 'info' | 'warn' | 'error' {
    return this.configService.get<'debug' | 'info' | 'warn' | 'error'>('ABLY_LOG_LEVEL', 'warn');
  }

  get enableFallback(): boolean {
    return this.configService.get<boolean>('ABLY_ENABLE_FALLBACK', true);
  }

  /**
   * Gera o nome completo do canal com prefixo
   */
  /**
   * Gera o nome completo do canal seguindo os novos padrões.
   *
   * Padrões suportados:
   *  - Canal de usuário em unidade:  `${prefix}:unit-{unitId}:user-{userId}:{canal}`
   *  - Canal de broadcast:         `${prefix}:broadcast-{scope}-{id}`
   *  - Canal de sistema:           `${prefix}:{canal}` (default)
   *
   * A função é retrocompatível com o formato antigo `${prefix}:user-{userId}:{canal}`.
   */
  getChannelName(
    channel: string,
    userId?: string | number,
    unitId?: string | number,
  ): string {
    const prefix = this.channelPrefix;

    // Já contém o prefixo completo
    if (channel.startsWith(`${prefix}:`)) {
      return channel;
    }

    // Se o canal já contém um escopo (unit- ou broadcast-) não precisamos de userId extra
    if (channel.startsWith('unit-') || channel.startsWith('broadcast-')) {
      return `${prefix}:${channel}`;
    }

    // Formato novo com unidade + usuário
    if (userId && unitId !== undefined && unitId !== null) {
      return `${prefix}:unit-${unitId}:user-${userId}:${channel}`;
    }

    // Formato antigo somente usuário
    if (userId) {
      return `${prefix}:user-${userId}:${channel}`;
    }

    // Canal global/padrão
    return `${prefix}:${channel}`;
  }

  /**
   * Gera as capacidades JWT baseadas no perfil do usuário
   */
  getJwtCapabilities(isAdmin: boolean, userId?: string): Record<string, string[]> {
    if (isAdmin) {
      return {
        [this.jwtCapabilityAdmin]: ['*']
      };
    }

    const userCapability = userId 
      ? `${this.channelPrefix}:user-${userId}:*`
      : this.jwtCapabilityUser;

    return {
      [userCapability]: ['subscribe', 'presence']
    };
  }

  /**
   * Configuração completa do cliente Ably
   */
  getClientOptions(): any {
    return {
      key: this.apiKey,
      clientId: this.clientId,
      ...(this.environment && this.environment !== 'production' && { environment: this.environment }),
      tls: this.enableTls,
      logLevel: this.logLevel,
      disconnectedRetryTimeout: this.connectionTimeout,
      suspendedRetryTimeout: this.connectionTimeout,
      httpRequestTimeout: this.connectionTimeout,
      maxMessageSize: this.maxMessageSize,
      fallbackHosts: this.enableFallback ? undefined : [],
      // Configurações específicas para o ambiente
      ...(this.environment === 'sandbox' && {
        restHost: 'sandbox-rest.ably.io',
        realtimeHost: 'sandbox-realtime.ably.io'
      })
    };
  }

  /**
   * Valida se todas as configurações obrigatórias estão presentes
   */
  validateConfig(): void {
    // Validação de formato da API KEY (ex: "xxxx:yyyy")
    const apiKeyRaw = this.configService.get<string>('ABLY_API_KEY');
    const apiKeyRegex = /^[a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+$/;
    if (apiKeyRaw && apiKeyRaw !== 'disabled' && !apiKeyRegex.test(apiKeyRaw)) {
      throw new Error('ABLY_API_KEY em formato inválido. Verifique a documentação do Ably.');
    }
    const apiKey = this.configService.get<string>('ABLY_API_KEY');
    
    // Permite inicialização mesmo com Ably desabilitado
    if (!apiKey || apiKey === 'disabled') {
      console.warn('⚠️ Ably desabilitado - notificações em tempo real não estarão disponíveis');
      return;
    }

    const requiredConfigs = [
      { key: 'ABLY_API_KEY', value: apiKey }
    ];

    const missingConfigs = requiredConfigs.filter(config => !config.value);
    
    if (missingConfigs.length > 0) {
      const missing = missingConfigs.map(config => config.key).join(', ');
      throw new Error(`Configurações obrigatórias do Ably não encontradas: ${missing}`);
    }
  }
}

/**
 * Factory function para configuração do Ably
 */
export const ablyConfigFactory = registerAs('ably', () => ({
  apiKey: process.env.ABLY_API_KEY,
  environment: process.env.ABLY_ENVIRONMENT || 'sandbox',
  clientId: process.env.ABLY_CLIENT_ID || 'pgben-server',
  jwtExpiresIn: parseInt(process.env.ABLY_JWT_EXPIRES_IN || '3600'),
  jwtCapabilityAdmin: process.env.ABLY_JWT_CAPABILITY_ADMIN || '*',
  jwtCapabilityUser: process.env.ABLY_JWT_CAPABILITY_USER || 'user-*'
}));

/**
 * Export default para compatibilidade
 */
export default ablyConfigFactory;