import { ConfigService } from '@nestjs/config';

/**
 * Interface para configurações do módulo SSE
 */
export interface SseConfig {
  /** Habilitar suporte ao Redis para múltiplas instâncias */
  redisEnabled: boolean;

  /** TTL das conexões no Redis (em segundos) */
  connectionTtl: number;

  /** Intervalo de heartbeat (em milissegundos) */
  heartbeatInterval: number;

  /** Intervalo de limpeza de conexões expiradas (em milissegundos) */
  cleanupInterval: number;

  /** Máximo de conexões por usuário */
  maxConnectionsPerUser: number;

  /** Timeout para reconexão (em milissegundos) */
  reconnectionTimeout: number;

  /** ID da instância do servidor */
  instanceId: string;

  /** Configuração de heartbeat adaptativo */
  adaptiveHeartbeat: {
    /** Habilitar heartbeat adaptativo */
    enabled: boolean;
    /** Intervalo base de heartbeat em ms */
    baseInterval: number;
    /** Intervalo mínimo permitido em ms */
    minInterval: number;
    /** Intervalo máximo permitido em ms */
    maxInterval: number;
    /** Fator de multiplicação para aumentar intervalo */
    backoffFactor: number;
    /** Número máximo de heartbeats perdidos antes de considerar conexão morta */
    maxMissedHeartbeats: number;
    /** Timeout para resposta de heartbeat em ms */
    responseTimeout: number;
  };

  /** Configuração de detecção de conexões mortas */
  deadConnectionDetection: {
    /** Habilitar detecção de conexões mortas */
    enabled: boolean;
    /** Intervalo de verificação de conexões mortas em ms */
    checkInterval: number;
    /** Timeout para considerar conexão morta em ms */
    timeout: number;
    /** Número de tentativas de ping antes de considerar morta */
    maxPingAttempts: number;
  };
}

/**
 * Factory para criar configuração do SSE
 */
export const createSseConfig = (configService: ConfigService): SseConfig => {
  return {
    redisEnabled: configService.get<boolean>('REDIS_SSE_ENABLED', true),
    connectionTtl: configService.get<number>('REDIS_SSE_CONNECTION_TTL', 3600),
    heartbeatInterval: configService.get<number>(
      'REDIS_SSE_HEARTBEAT_INTERVAL',
      30000,
    ),
    cleanupInterval: configService.get<number>(
      'REDIS_SSE_CLEANUP_INTERVAL',
      60000,
    ),
    maxConnectionsPerUser: configService.get<number>(
      'SSE_MAX_CONNECTIONS_PER_USER',
      5,
    ),
    reconnectionTimeout: configService.get<number>(
      'SSE_RECONNECTION_TIMEOUT',
      5000,
    ),
    instanceId: configService.get<string>(
      'INSTANCE_ID',
      `instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ),

    adaptiveHeartbeat: {
      enabled: configService.get<boolean>(
        'SSE_ADAPTIVE_HEARTBEAT_ENABLED',
        true,
      ),
      baseInterval: configService.get<number>(
        'SSE_ADAPTIVE_HEARTBEAT_BASE_INTERVAL',
        30000,
      ),
      minInterval: configService.get<number>(
        'SSE_ADAPTIVE_HEARTBEAT_MIN_INTERVAL',
        10000,
      ),
      maxInterval: configService.get<number>(
        'SSE_ADAPTIVE_HEARTBEAT_MAX_INTERVAL',
        120000,
      ),
      backoffFactor: configService.get<number>(
        'SSE_ADAPTIVE_HEARTBEAT_BACKOFF_FACTOR',
        1.5,
      ),
      maxMissedHeartbeats: configService.get<number>(
        'SSE_ADAPTIVE_HEARTBEAT_MAX_MISSED',
        3,
      ),
      responseTimeout: configService.get<number>(
        'SSE_ADAPTIVE_HEARTBEAT_RESPONSE_TIMEOUT',
        10000,
      ),
    },

    deadConnectionDetection: {
      enabled: configService.get<boolean>(
        'SSE_DEAD_CONNECTION_DETECTION_ENABLED',
        true,
      ),
      checkInterval: configService.get<number>(
        'SSE_DEAD_CONNECTION_CHECK_INTERVAL',
        60000,
      ),
      timeout: configService.get<number>('SSE_DEAD_CONNECTION_TIMEOUT', 180000),
      maxPingAttempts: configService.get<number>(
        'SSE_DEAD_CONNECTION_MAX_PING_ATTEMPTS',
        3,
      ),
    },
  };
};

/**
 * Token de injeção para a configuração do SSE
 */
export const SSE_CONFIG = 'SSE_CONFIG';
