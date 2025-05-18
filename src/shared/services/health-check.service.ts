import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Serviço para verificar a saúde de serviços externos como Redis, 
 * permitindo que a aplicação inicialize mesmo com falhas em serviços não-críticos
 */
@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Verifica a disponibilidade do Redis
   * @returns true se o Redis estiver disponível, false caso contrário
   */
  async isRedisAvailable(): Promise<boolean> {
    // Verificar se o Redis está desabilitado por configuração
    const disableRedis = this.configService.get('DISABLE_REDIS') === 'true';
    
    if (disableRedis) {
      this.logger.warn('Redis desabilitado por configuração. Algumas funcionalidades não estarão disponíveis.');
      return false;
    }
    
    const host = this.configService.get('REDIS_HOST', 'localhost');
    const port = parseInt(this.configService.get('REDIS_PORT', '6379'));
    const password = this.configService.get('REDIS_PASSWORD', '');

    const redis = new Redis({
      host,
      port,
      password,
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });

    try {
      this.logger.log(`Verificando conexão com Redis em ${host}:${port}...`);
      await redis.ping();
      this.logger.log('Conexão com Redis estabelecida com sucesso');
      await redis.quit();
      return true;
    } catch (error) {
      this.logger.warn(`Redis não disponível: ${error.message}`);
      try {
        await redis.quit();
      } catch {}
      return false;
    }
  }

  /**
   * Imprime informações sobre o status dos serviços externos
   * @param redisAvailable Status da disponibilidade do Redis
   */
  logServicesStatus(redisAvailable: boolean): void {
    this.logger.log('========== Status dos Serviços Externos ==========');
    
    // Verificar se o Redis está desabilitado por configuração
    const disableRedis = this.configService.get('DISABLE_REDIS') === 'true';
    
    if (disableRedis) {
      this.logger.log(`Redis: DESABILITADO POR CONFIGURAÇÃO ⚠️`);
      this.logger.warn('⚠️ Redis desabilitado intencionalmente. Funcionalidades que dependem de filas estão desativadas.');
    } else {
      this.logger.log(`Redis: ${redisAvailable ? 'DISPONÍVEL ✅' : 'INDISPONÍVEL ❌'}`);
      if (!redisAvailable) {
        this.logger.warn('⚠️ Redis indisponível: funcionalidades que dependem de filas não funcionarão corretamente');
        this.logger.warn('⚠️ Serviços afetados: Auditoria assíncrona, processamento em background');
      }
    }
    
    this.logger.log('==================================================');
  }
}
