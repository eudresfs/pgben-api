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
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SWAGGER_TAGS } from '../configs/swagger/tags.config';
import { HealthCheckService as AppHealthCheckService } from '../services/health-check.service';
import { StorageHealthService, StorageHealthStatus } from '../../modules/documento/services/storage-health.service';
import { UnifiedLoggerService } from '../logging/unified-logger.service';

/**
 * Controlador de Health Check
 *
 * Fornece endpoints para verificar a saúde da aplicação
 * e seus componentes (banco de dados, memória, disco, etc.)
 */
@ApiTags(SWAGGER_TAGS.HEALTH_CHECKS.name)
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
   * 
   * Este endpoint é usado pelo Kubernetes para verificar se o container está vivo.
   * Deve responder rapidamente sem verificar dependências externas.
   * 
   * Caminho: GET /health (excluído do prefixo global 'api')
   */
  @Get()
  @Public()
  @ApiOperation({
    summary: 'Health Check - Liveness Probe',
    description: 'Endpoint rápido para verificar se a aplicação está rodando. Usado pelo Kubernetes como liveness probe.',
  })
  @ApiResponse({
    status: 200,
    description: 'Aplicação está funcionando',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', format: 'date-time' },
        version: { type: 'string', example: '1.0.0' },
      },
    },
  })
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
   * 
   * Este endpoint é usado pelo Kubernetes para verificar se a aplicação está pronta
   * para receber tráfego. Verifica dependências como banco de dados, Redis, etc.
   * 
   * Caminho: GET /health/ready (excluído do prefixo global 'api')
   */
  @Get('ready')
  @Public()
  @HealthCheck()
  @ApiOperation({
    summary: 'Health Check - Readiness Probe',
    description: 'Verifica se a aplicação está pronta para receber tráfego, incluindo dependências externas. Usado pelo Kubernetes como readiness probe.',
  })
  @ApiResponse({
    status: 200,
    description: 'Aplicação e dependências estão funcionando',
  })
  @ApiResponse({
    status: 503,
    description: 'Uma ou mais dependências estão indisponíveis',
  })
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
          path: process.platform === 'win32' ? 'C:\\' : '/',
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
   * 
   * Retorna apenas status OK se a aplicação estiver funcionando.
   * Mais leve que o endpoint de liveness, ideal para monitoramento básico.
   * 
   * Caminho: GET /health/ping (excluído do prefixo global 'api')
   */
  @Get('ping')
  @Public()
  @ApiOperation({
    summary: 'Health Check - Ping',
    description: 'Endpoint ultra-rápido para verificação básica de funcionamento da aplicação.',
  })
  @ApiResponse({
    status: 200,
    description: 'Aplicação respondendo',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', format: 'date-time' },
        service: { type: 'string', example: 'pgben-api' },
        version: { type: 'string', example: '1.0.0' },
      },
    },
  })
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
   * 
   * Endpoint específico para verificar a conectividade com PostgreSQL.
   * Útil para diagnósticos isolados de problemas de banco de dados.
   * 
   * Caminho: GET /health/db (excluído do prefixo global 'api')
   */
  @Get('db')
  @Public()
  @HealthCheck()
  @ApiOperation({
    summary: 'Health Check - Database',
    description: 'Verifica especificamente a conectividade com o banco de dados PostgreSQL.',
  })
  @ApiResponse({
    status: 200,
    description: 'Banco de dados acessível',
  })
  @ApiResponse({
    status: 503,
    description: 'Banco de dados inacessível',
  })
  checkDatabase() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }

  /**
   * Verifica uso de recursos do sistema
   * 
   * Endpoint específico para verificar recursos do sistema como memória e disco.
   * Útil para monitoramento de performance e capacidade.
   * 
   * Caminho: GET /health/system (excluído do prefixo global 'api')
   */
  @Get('system')
  @Public()
  @HealthCheck()
  @ApiOperation({
    summary: 'Health Check - System Resources',
    description: 'Verifica o uso de recursos do sistema como memória heap, RSS e espaço em disco.',
  })
  @ApiResponse({
    status: 200,
    description: 'Recursos do sistema dentro dos limites',
  })
  @ApiResponse({
    status: 503,
    description: 'Recursos do sistema acima dos limites configurados',
  })
  checkSystem() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
      () =>
        this.disk.checkStorage('disk', {
          path: process.platform === 'win32' ? 'C:\\' : '/',
          thresholdPercent: 0.9,
        }),
    ]);
  }

  /**
   * Verifica a disponibilidade do Redis
   * 
   * Endpoint específico para verificar a conectividade com Redis.
   * Considera a configuração DISABLE_REDIS para ambientes sem Redis.
   * 
   * Caminho: GET /health/redis (excluído do prefixo global 'api')
   */
  @Get('redis')
  @Public()
  @HealthCheck()
  @ApiOperation({
    summary: 'Health Check - Redis',
    description: 'Verifica especificamente a conectividade com Redis. Respeita a configuração DISABLE_REDIS.',
  })
  @ApiResponse({
    status: 200,
    description: 'Redis acessível ou desabilitado por configuração',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['up', 'down', 'disabled'] },
        info: {
          type: 'object',
          properties: {
            redis: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['up', 'down', 'disabled'] },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
  })
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
   * 
   * Endpoint específico para verificar a conectividade com o serviço de armazenamento.
   * Suporta tanto S3 quanto MinIO dependendo da configuração.
   * 
   * Caminho: GET /health/storage (excluído do prefixo global 'api')
   */
  @Get('storage')
  @Public()
  @ApiOperation({
    summary: 'Health Check - Storage',
    description: 'Verifica especificamente a conectividade com o serviço de armazenamento (S3/MinIO).',
  })
  @ApiResponse({
    status: 200,
    description: 'Serviço de armazenamento acessível',
    schema: {
      type: 'object',
      properties: {
        storage: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['up', 'down'] },
            provider: { type: 'string', example: 'minio' },
            message: { type: 'string' },
            details: { type: 'object' },
            lastChecked: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
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
