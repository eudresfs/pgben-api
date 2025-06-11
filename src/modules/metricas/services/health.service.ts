import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogAuditoria } from '../../../entities/log-auditoria.entity';
import { HealthCheckService } from '../../../shared/services/health-check.service';
import * as Minio from 'minio';

/**
 * Serviço responsável por verificar a saúde dos componentes do sistema
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(LogAuditoria)
    private readonly logAuditoriaRepository: Repository<LogAuditoria>,
    private readonly healthCheckService: HealthCheckService,
  ) {}

  /**
   * Verifica a saúde geral do sistema
   * @returns Status de saúde do sistema
   */
  async checkHealth(): Promise<any> {
    const checks = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkMinIO(),
    ]);

    const status = checks.every((check) => check.status === 'up')
      ? 'up'
      : 'down';

    return {
      status,
      timestamp: new Date(),
      info: {
        version: process.env.npm_package_version || '1.0.0',
        environment: this.configService.get('NODE_ENV', 'development'),
      },
      details: {
        database: checks[0],
        redis: checks[1],
        minio: checks[2],
      },
    };
  }

  /**
   * Verifica a conexão com o banco de dados
   * @returns Status da conexão com o banco de dados
   */
  private async checkDatabase(): Promise<any> {
    try {
      // Tenta executar uma consulta simples para verificar a conexão
      await this.logAuditoriaRepository.query('SELECT 1');

      return {
        status: 'up',
        responseTime: 0, // Idealmente, mediríamos o tempo de resposta
      };
    } catch (error) {
      this.logger.error(
        `Erro ao verificar conexão com banco de dados: ${error.message}`,
      );

      return {
        status: 'down',
        error: error.message,
      };
    }
  }

  /**
   * Verifica a conexão com o Redis
   * @returns Status da conexão com o Redis
   */
  private async checkRedis(): Promise<any> {
    try {
      // Utilizamos o serviço de health check para verificar a disponibilidade do Redis
      const startTime = Date.now();
      const isAvailable = await this.healthCheckService.isRedisAvailable();
      const responseTime = Date.now() - startTime;

      // Verificar se o Redis está desabilitado por configuração
      const disableRedis = this.configService.get('DISABLE_REDIS') === 'true';

      if (disableRedis) {
        return {
          status: 'disabled',
          message: 'Redis desabilitado por configuração',
          responseTime: 0,
        };
      }

      if (isAvailable) {
        return {
          status: 'up',
          responseTime,
        };
      } else {
        return {
          status: 'down',
          message: 'Não foi possível conectar ao Redis',
          responseTime,
        };
      }
    } catch (error) {
      this.logger.error(
        `Erro ao verificar conexão com Redis: ${error.message}`,
      );

      return {
        status: 'down',
        error: error.message,
      };
    }
  }

  /**
   * Verifica a conexão com o MinIO
   * @returns Status da conexão com o MinIO
   */
  private async checkMinIO(): Promise<any> {
    const startTime = Date.now();
    try {
      // Configurações do MinIO a partir das variáveis de ambiente
      const useSSL = this.configService.get('MINIO_USE_SSL') === 'true';
      const endPoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
      const port = parseInt(this.configService.get<string>('MINIO_PORT', '9000'), 10);
      const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY', 'minioadmin');
      const secretKey = this.configService.get<string>('MINIO_SECRET_KEY', 'minioadmin');
      const bucketName =
        this.configService.get<string>('MINIO_BUCKET_NAME') ||
        this.configService.get<string>('MINIO_BUCKET', 'pgben-documentos');

      // Inicializa cliente MinIO
      const minioClient = new Minio.Client({
        endPoint,
        port,
        useSSL,
        accessKey,
        secretKey,
      });

      // Verifica se o bucket existe (teste de conectividade e credenciais)
      await minioClient.bucketExists(bucketName);

      const responseTime = Date.now() - startTime;
      return {
        status: 'up',
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error(`Erro ao verificar conexão com MinIO: ${error.message}`);

      return {
        status: 'down',
        error: error.message,
        responseTime,
      };
    }
  }
}
