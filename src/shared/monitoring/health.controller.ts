import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HttpHealthIndicator,
  TypeOrmHealthIndicator,
  HealthCheck,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../../auth/decorators/public.decorator';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheckService as AppHealthCheckService } from '../services/health-check.service';
import { StorageHealthService } from '../../modules/documento/services/storage-health.service';
import { UnifiedLoggerService } from '../logging/unified-logger.service';

/**
 * Controlador de Health Check
 *
 * Fornece endpoints para verificar a saúde da aplicação
 * e seus componentes (banco de dados, memória, disco, etc.)
 */
@ApiTags('Métricas e Dashboard')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private appHealthCheck: AppHealthCheckService,
    private storageHealth: StorageHealthService,
    private readonly logger: UnifiedLoggerService,
  ) {
    this.logger.setContext(HealthController.name);
  }

  /**
   * Endpoint de liveness – resposta rápida para indicar que a app está rodando
   */
  @Get()
  @Public()
  liveness() {
    this.logger.debug('Liveness check');
    return {
      status: 'ok',
      timestamp: new Date(),
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  /**
   * Endpoint de readiness – verifica dependências externas
   */
  @Get('ready')
  @Public()
  @HealthCheck()
  async readiness() {
    this.logger.debug('Readiness check');

    const isRedisAvailable = await this.appHealthCheck.isRedisAvailable();
    const disableRedis = process.env.DISABLE_REDIS === 'true';

    return this.health.check([
      () => this.db.pingCheck('database'),
      () =>
        this.http.pingCheck('frontend', 'https://pgben-front.kemosoft.com.br/'),
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      () =>
        this.disk.checkStorage('disk', {
          path: '/',
          thresholdPercent: 0.9,
        }),
      async () => ({
        redis: {
          status: disableRedis
            ? 'disabled'
            : isRedisAvailable
              ? 'up'
              : 'down',
          message: disableRedis
            ? 'Redis desabilitado por configuração'
            : isRedisAvailable
              ? 'Conexão com Redis estabelecida'
              : 'Não foi possível conectar ao Redis',
        },
      }) as unknown as Record<string, any>,
      async () => {
        const storageStatus = await this.storageHealth.checkHealth();
        return {
          storage: {
            status: storageStatus.isHealthy ? 'up' : 'down',
            provider: storageStatus.provider,
            message: storageStatus.details.error || 'OK',
            details: storageStatus.details,
            lastChecked: storageStatus.timestamp,
          },
        } as unknown as Record<string, any>;
      },
    ]);
  }

  /**
   * Endpoint simplificado para verificações rápidas
   * Retorna apenas status OK se a aplicação estiver funcionando
   */
  @Get('ping')
  @Public()
  ping() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'pgben-api',
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  /**
   * Verifica apenas o banco de dados
   */
  @Get('db')
  @Public()
  @HealthCheck()
  checkDatabase() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }

  /**
   * Verifica uso de recursos do sistema
   */
  @Get('system')
  @Public()
  @HealthCheck()
  checkSystem() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
      () =>
        this.disk.checkStorage('disk', {
          path: '/',
          thresholdPercent: 0.9,
        }),
    ]);
  }

  /**
   * Verifica a disponibilidade do Redis
   */
  @Get('redis')
  @Public()
  @HealthCheck()
  async checkRedis() {
    const isRedisAvailable = await this.appHealthCheck.isRedisAvailable();
    const disableRedis = process.env.DISABLE_REDIS === 'true';

    return {
      status: disableRedis ? 'disabled' : isRedisAvailable ? 'up' : 'down',
      info: {
        redis: {
          status: disableRedis ? 'disabled' : isRedisAvailable ? 'up' : 'down',
          message: disableRedis
            ? 'Redis desabilitado por configuração'
            : isRedisAvailable
              ? 'Conexão com Redis estabelecida'
              : 'Não foi possível conectar ao Redis',
        },
      },
    };
  }

  /**
   * Verifica apenas o storage (S3/MinIO)
   */
  @Get('storage')
  @Public()
  async checkStorage() {
    const storageStatus = await this.storageHealth.checkHealth();
    return {
      storage: {
        status: storageStatus.isHealthy ? 'up' : 'down',
        provider: storageStatus.provider,
        message: storageStatus.details.error || 'OK',
        details: storageStatus.details,
        lastChecked: storageStatus.timestamp,
      },
    };
  }
}
