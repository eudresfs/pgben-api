import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggingService } from '../../../shared/logging/logging.service';
import { StorageProviderFactory } from '../factories/storage-provider.factory';

export interface StorageHealthStatus {
  isHealthy: boolean;
  provider: string;
  details: {
    connectivity: boolean;
    configuration: boolean;
    permissions: boolean;
    latency?: number;
    error?: string;
  };
  timestamp: Date;
}

@Injectable()
export class StorageHealthService {
  private readonly testFileName = 'health-check-test.txt';
  private readonly testContent = Buffer.from('Health check test file');

  constructor(
    private readonly storageProviderFactory: StorageProviderFactory,
    private readonly configService: ConfigService,
    private readonly logger: LoggingService,
  ) {}

  /**
   * Executa verificação completa de saúde do storage
   */
  async checkHealth(): Promise<StorageHealthStatus> {
    const startTime = Date.now();
    const timestamp = new Date();

    try {
      const storageProvider = this.storageProviderFactory.getProvider();
      const providerName = this.getProviderName();

      this.logger.debug(
        'Iniciando verificação de saúde do storage',
        StorageHealthService.name,
        {
          provider: providerName,
        },
      );

      // 1. Verificar configuração
      const configurationCheck = await this.checkConfiguration();
      if (!configurationCheck) {
        return {
          isHealthy: false,
          provider: providerName,
          details: {
            connectivity: false,
            configuration: false,
            permissions: false,
            error: 'Configuração inválida ou ausente',
          },
          timestamp,
        };
      }

      // 2. Teste de conectividade e permissões
      const connectivityResult = await this.testConnectivity(storageProvider);
      const latency = Date.now() - startTime;

      const healthStatus: StorageHealthStatus = {
        isHealthy: connectivityResult.success,
        provider: providerName,
        details: {
          connectivity: connectivityResult.success,
          configuration: true,
          permissions: connectivityResult.success,
          latency,
          error: connectivityResult.errorMessage,
        },
        timestamp,
      };

      if (healthStatus.isHealthy) {
        this.logger.info(
          'Verificação de saúde do storage concluída com sucesso',
          StorageHealthService.name,
          {
            providerName,
            latency,
            timestamp,
          },
        );
      } else {
        this.logger.error(
          'Verificação de saúde do storage falhou',
          new Error('Falha na verificação de saúde'),
          StorageHealthService.name,
          {
            providerName,
            latency,
            timestamp,
            details: healthStatus.details,
          },
        );
      }

      return healthStatus;
    } catch (error) {
      const latency = Date.now() - startTime;

      this.logger.error(
        'Erro na verificação de saúde do storage',
        error,
        StorageHealthService.name,
        {
          stack: error.stack,
          latency,
        },
      );

      return {
        isHealthy: false,
        provider: 'unknown',
        details: {
          connectivity: false,
          configuration: false,
          permissions: false,
          latency,
          error: `Erro interno: ${error.message}`,
        },
        timestamp,
      };
    }
  }

  /**
   * Verifica se as configurações necessárias estão presentes
   */
  private async checkConfiguration(): Promise<boolean> {
    try {
      const storageType = this.configService.get<string>(
        'STORAGE_TYPE',
        'minio',
      );

      if (storageType === 's3') {
        const requiredS3Configs = [
          'AWS_S3_BUCKET',
          'AWS_REGION',
          'AWS_ACCESS_KEY_ID',
          'AWS_SECRET_ACCESS_KEY',
        ];

        const missingConfigs = requiredS3Configs.filter(
          (config) => !this.configService.get(config),
        );

        if (missingConfigs.length > 0) {
          this.logger.warn(
            'Configurações S3 ausentes',
            StorageHealthService.name,
            { missingConfigs },
          );
          return false;
        }
      } else if (storageType === 'minio') {
        const requiredMinioConfigs = [
          'MINIO_ENDPOINT',
          'MINIO_ACCESS_KEY',
          'MINIO_SECRET_KEY',
          'MINIO_BUCKET',
        ];

        const missingConfigs = requiredMinioConfigs.filter(
          (config) => !this.configService.get(config),
        );

        if (missingConfigs.length > 0) {
          this.logger.warn(
            'Configurações MinIO ausentes',
            StorageHealthService.name,
            { missingConfigs },
          );
          return false;
        }
      }

      return true;
    } catch (error) {
      this.logger.error(
        'Erro ao verificar configuração',
        error,
        StorageHealthService.name,
      );
      return false;
    }
  }

  /**
   * Testa conectividade fazendo upload, download e remoção de um arquivo de teste
   */
  private async testConnectivity(
    storageProvider: any,
  ): Promise<{ success: boolean; errorMessage?: string }> {
    const testKey = `health-checks/${Date.now()}-${this.testFileName}`;
    let storedKey: string | undefined;

    try {
      // Teste 1: Upload
      this.logger.debug(
        'Testando upload para storage',
        StorageHealthService.name,
        { testKey },
      );
      storedKey = await storageProvider.salvarArquivo(
        this.testContent,
        testKey,
        'text/plain',
        { healthCheck: true },
      );
      // Caso o provedor retorne undefined, usar a chave original
      const keyToCheck = storedKey ?? testKey;

      // Teste 2: Download
      this.logger.debug(
        'Testando download do storage',
        StorageHealthService.name,
        { keyToCheck },
      );
      const downloadedContent = await storageProvider.obterArquivo(keyToCheck);

      if (!downloadedContent || !downloadedContent.equals(this.testContent)) {
        throw new Error('Conteúdo baixado não confere com o enviado');
      }

      // Teste 3: Remoção
      this.logger.debug(
        'Testando remoção do storage',
        StorageHealthService.name,
        { keyToCheck },
      );
      await storageProvider.removerArquivo(keyToCheck);

      return { success: true };
    } catch (error) {
      // Tentar limpar o arquivo de teste em caso de erro
      try {
        await storageProvider.removerArquivo(storedKey ?? testKey);
      } catch (cleanupError) {
        this.logger.warn(
          'Erro ao limpar arquivo de teste',
          StorageHealthService.name,
          {
            key: storedKey ?? testKey,
            cleanupError: cleanupError.message,
          },
        );
      }

      return { success: false, errorMessage: error.message };
    }
  }

  /**
   * Obtém o nome do provedor de storage configurado
   */
  private getProviderName(): string {
    const storageType = this.configService.get<string>('STORAGE_TYPE', 'minio');
    return storageType.toUpperCase();
  }

  /**
   * Executa verificação rápida (apenas configuração)
   */
  async quickHealthCheck(): Promise<{ isHealthy: boolean; provider: string }> {
    try {
      const configurationCheck = await this.checkConfiguration();
      const providerName = this.getProviderName();

      return {
        isHealthy: configurationCheck,
        provider: providerName,
      };
    } catch (error) {
      return {
        isHealthy: false,
        provider: 'unknown',
      };
    }
  }
}
