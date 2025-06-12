import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HttpHealthIndicator,
  TypeOrmHealthIndicator,
  HealthCheck,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  HealthIndicatorResult,
  HealthIndicatorStatus,
} from '@nestjs/terminus';
import { Public } from '../../auth/decorators/public.decorator';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheckService as AppHealthCheckService } from '../services/health-check.service';
import { StorageHealthService, StorageHealthStatus } from '../../modules/documento/services/storage-health.service';
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
    this.logger.debug('Readiness check iniciado');
    
    // Configuração de timeout para evitar bloqueios longos
    const checkTimeout = 5000; // 5 segundos
    
    // Verificar Redis com timeout
    let isRedisAvailable = false;
    const disableRedis = process.env.DISABLE_REDIS === 'true';
    
    if (!disableRedis) {
      try {
        const redisPromise = this.appHealthCheck.isRedisAvailable();
        isRedisAvailable = await Promise.race([
          redisPromise,
          new Promise<boolean>((_, reject) => {
            setTimeout(() => reject(new Error('Redis check timeout')), checkTimeout);
          })
        ]).catch(err => {
          this.logger.warn(`Redis health check falhou: ${err.message}`);
          return false;
        });
      } catch (error) {
        this.logger.warn(`Erro ao verificar Redis: ${error.message}`);
        isRedisAvailable = false;
      }
    }

    this.logger.debug('Executando verificações de saúde dos componentes');
    return this.health.check([
      // Verificação do banco de dados com tratamento de erro
      async (): Promise<HealthIndicatorResult> => {
        try {
          const dbCheck = await Promise.race<HealthIndicatorResult>([
            this.db.pingCheck('database'),
            new Promise<HealthIndicatorResult>((_, reject) => {
              setTimeout(() => reject(new Error('Database check timeout')), checkTimeout);
            })
          ]);
          return dbCheck;
        } catch (error) {
          this.logger.warn(`Erro na verificação do banco de dados: ${error.message}`);
          return {
            database: {
              status: 'down',
              message: `Falha na conexão: ${error.message}`,
            },
          } as HealthIndicatorResult;
        }
      },
      
      // Verificação do frontend com tratamento de erro
      async (): Promise<HealthIndicatorResult> => {
        try {
          const httpCheck = await Promise.race<HealthIndicatorResult>([
            this.http.pingCheck('frontend', 'https://pgben-front.kemosoft.com.br/'),
            new Promise<HealthIndicatorResult>((_, reject) => {
              setTimeout(() => reject(new Error('Frontend check timeout')), checkTimeout);
            })
          ]);
          return httpCheck;
        } catch (error) {
          this.logger.warn(`Erro na verificação do frontend: ${error.message}`);
          return {
            frontend: {
              status: 'down',
              message: `Falha na conexão: ${error.message}`,
            },
          } as HealthIndicatorResult;
        }
      },
      
      // Verificação de memória
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      
      // Verificação de disco
      () =>
        this.disk.checkStorage('disk', {
          path: '/',
          thresholdPercent: 0.9,
        }),
      async (): Promise<HealthIndicatorResult> => {
        return {
          redis: {
            status: (disableRedis
              ? 'disabled'
              : isRedisAvailable
                ? 'up'
                : 'down') as HealthIndicatorStatus,
            message: disableRedis
              ? 'Redis desabilitado por configuração'
              : isRedisAvailable
                ? 'Conexão com Redis estabelecida'
                : 'Não foi possível conectar ao Redis',
          },
        };
      },
      // Verificação do serviço de armazenamento com tratamento de erro e timeout
      async (): Promise<HealthIndicatorResult> => {
        try {
          const storagePromise = this.storageHealth.checkHealth();
          const storageStatus = await Promise.race<StorageHealthStatus>([
            storagePromise,
            new Promise<StorageHealthStatus>((_, reject) => {
              setTimeout(() => reject(new Error('Storage check timeout')), checkTimeout * 2); // Dobro do timeout para storage
            })
          ]);
          
          this.logger.debug(`Storage health check concluído: ${storageStatus.isHealthy ? 'healthy' : 'unhealthy'}`);
          
          return {
            storage: {
              status: storageStatus.isHealthy ? 'up' : 'down',
              provider: storageStatus.provider,
              message: storageStatus.details.error || 'OK',
              details: storageStatus.details,
              lastChecked: storageStatus.timestamp,
            },
          } as HealthIndicatorResult;
        } catch (error) {
          this.logger.warn(`Erro na verificação do storage: ${error.message}`);
          return {
            storage: {
              status: 'down',
              provider: 'unknown',
              message: `Falha na verificação: ${error.message}`,
              details: { error: error.message },
              lastChecked: new Date(),
            },
          } as HealthIndicatorResult;
        }
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
