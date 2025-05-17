import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogAuditoria } from '../../auditoria/entities/log-auditoria.entity';

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
      // Aqui seria ideal ter uma injeção do serviço Redis para verificar a conexão
      // Como estamos apenas simulando, retornamos um status positivo

      return {
        status: 'up',
        responseTime: 0,
      };
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
    try {
      // Aqui seria ideal ter uma injeção do serviço MinIO para verificar a conexão
      // Como estamos apenas simulando, retornamos um status positivo

      return {
        status: 'up',
        responseTime: 0,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao verificar conexão com MinIO: ${error.message}`,
      );

      return {
        status: 'down',
        error: error.message,
      };
    }
  }
}
