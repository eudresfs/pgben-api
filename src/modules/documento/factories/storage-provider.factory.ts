import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  StorageProvider,
  TipoStorageProvider,
} from '../interfaces/storage-provider.interface';
import { S3StorageAdapter } from '../adapters/s3-storage.adapter';
import { LocalStorageAdapter } from '../adapters/local-storage.adapter';
import { MinioService } from '../../../shared/services/minio.service';
import { normalizeEnumValue } from '../../../shared/utils/enum-normalizer.util';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Factory para criação de provedores de armazenamento
 *
 * Permite selecionar o provedor de armazenamento adequado
 * com base na configuração do sistema
 */
@Injectable()
export class StorageProviderFactory {
  private readonly logger = new Logger(StorageProviderFactory.name);
  private readonly defaultProvider: TipoStorageProvider;

  constructor(
    private readonly configService: ConfigService,
    private readonly s3StorageAdapter: S3StorageAdapter,
    private readonly localStorageAdapter: LocalStorageAdapter,
    private readonly minioService: MinioService,
  ) {
    // Obter e normalizar o valor do provedor de armazenamento
    const storageProviderValue = this.configService.get<string>(
      'STORAGE_PROVIDER',
      'minio',
    );
    
    // Normalizar o valor para lowercase para compatibilidade com o enum
    const normalizedValue = normalizeEnumValue(storageProviderValue) as TipoStorageProvider;
    
    // Validar se o valor normalizado é um valor válido do enum
    if (Object.values(TipoStorageProvider).includes(normalizedValue)) {
      this.defaultProvider = normalizedValue;
    } else {
      this.logger.warn(
        `Valor de STORAGE_PROVIDER inválido: ${storageProviderValue}. Usando padrão: ${TipoStorageProvider.MINIO}`,
      );
      this.defaultProvider = TipoStorageProvider.MINIO;
    }

    this.logger.log(
      `Provedor de armazenamento padrão: ${this.defaultProvider}`,
    );

    // Inicializar o diretório de uploads local se necessário
    if (this.defaultProvider === TipoStorageProvider.LOCAL) {
      const uploadsDir = this.configService.get<string>(
        'UPLOADS_DIR',
        path.join(process.cwd(), 'uploads'),
      );
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        this.logger.log(`Diretório de uploads criado: ${uploadsDir}`);
      }
    }
  }

  /**
   * Obtém o provedor de armazenamento padrão
   * @returns Provedor de armazenamento
   */
  getProvider(): StorageProvider {
    return this.createProvider(this.defaultProvider);
  }

  /**
   * Cria um provedor de armazenamento com base no tipo especificado
   * @param type Tipo de provedor de armazenamento (opcional, usa o padrão se não especificado)
   * @returns Provedor de armazenamento
   */
  createProvider(type?: TipoStorageProvider): StorageProvider {
    const providerType = type || this.defaultProvider;

    this.logger.debug(`Criando provedor de armazenamento: ${providerType}`);

    switch (providerType) {
      case TipoStorageProvider.S3:
        if (!this.s3StorageAdapter) {
          this.logger.warn(
            'S3 não está configurado. Usando armazenamento local como fallback.',
          );
          return this.localStorageAdapter;
        }
        return this.s3StorageAdapter;

      case TipoStorageProvider.MINIO:
        return this.createMinioAdapter();

      case TipoStorageProvider.LOCAL:
        return this.localStorageAdapter;

      default:
        this.logger.warn(
          `Tipo de provedor desconhecido: ${providerType}. Usando provedor padrão: ${this.defaultProvider}`,
        );
        // Evitar recursão infinita usando diretamente o provedor padrão
        if (this.defaultProvider === TipoStorageProvider.S3) {
          if (!this.s3StorageAdapter) {
            this.logger.warn(
              'S3 não está configurado. Usando armazenamento local como fallback.',
            );
            return this.localStorageAdapter;
          }
          return this.s3StorageAdapter;
        } else if (this.defaultProvider === TipoStorageProvider.MINIO) {
          return this.createMinioAdapter();
        } else {
          return this.localStorageAdapter;
        }
    }
  }

  /**
   * Cria um adaptador para o MinIO que implementa a interface StorageProvider
   * @returns Adaptador para o MinIO
   */
  private createMinioAdapter(): StorageProvider {
    // Adaptar o MinioService para a interface StorageProvider
    return {
      nome: 'MinIO',

      salvarArquivo: async (
        buffer: Buffer,
        nomeArquivo: string,
        mimetype: string,
        metadados?: Record<string, any>,
      ): Promise<string> => {
        
        // Usar o novo método uploadArquivoHierarquico do MinioService
        const nomeOriginal = nomeArquivo.split('/').pop() || nomeArquivo;
        const tipoDocumento = metadados?.tipoDocumento || 'OUTRO';
        
        return await this.minioService.uploadArquivoHierarquico(
          buffer,
          nomeArquivo,
          nomeOriginal,
          mimetype,
          tipoDocumento,
        );
      },

      obterArquivo: async (caminho: string): Promise<Buffer> => {
        // Fazer download usando o MinioService
        const resultado = await this.minioService.downloadArquivo(caminho);
        return resultado.arquivo;
      },

      removerArquivo: async (caminho: string): Promise<void> => {
        await this.minioService.removerArquivo(caminho);
      },
      upload: async (
        buffer: Buffer,
        key: string,
        mimetype: string,
        metadata?: Record<string, any>,
      ): Promise<string> => {
        // Usar o método salvarArquivo para manter consistência
        return this.minioService
          .uploadArquivo(buffer, key, 'default', 'OUTRO')
          .then((result) => result.nomeArquivo);
      },

      download: async (key: string): Promise<Buffer> => {
        // Usar o método obterArquivo para manter consistência
        return this.minioService
          .downloadArquivo(key)
          .then((result) => result.arquivo);
      },

      delete: async (key: string): Promise<void> => {
        // Usar o método removerArquivo para manter consistência
        return this.minioService.removerArquivo(key);
      },

      getUrl: async (key: string, expiresIn?: number): Promise<string> => {
        return this.minioService.gerarUrlPreAssinada(key, expiresIn || 3600);
      },

      exists: async (key: string): Promise<boolean> => {
        try {
          // Tentar fazer download para verificar se existe
          await this.minioService.downloadArquivo(key);
          return true;
        } catch (error) {
          if (error.message && error.message.includes('not found')) {
            return false;
          }
          throw error; // Propagar outros erros
        }
      },

      copy: async (
        sourceKey: string,
        destinationKey: string,
      ): Promise<string> => {
        // Implementar cópia baixando e fazendo upload novamente
        const resultado = await this.minioService.downloadArquivo(sourceKey);

        // Extrair partes da chave de destino
        const parts = destinationKey.split('/');
        const solicitacaoId = parts[0] || 'default';
        const tipoDocumento = parts[1] || 'OUTRO';
        const nomeOriginal = parts.length > 2 ? parts[2] : destinationKey;

        // Fazer upload com a nova chave
        const resultadoUpload = await this.minioService.uploadArquivo(
          resultado.arquivo,
          nomeOriginal,
          solicitacaoId,
          tipoDocumento,
        );

        return resultadoUpload.nomeArquivo;
      },

      list: async (prefix: string, maxKeys?: number): Promise<string[]> => {
        try {
          // Implementação básica usando cliente Minio diretamente
          const client = (MinioService as any).client;
          if (client && typeof client.listObjects === 'function') {
            const objects: string[] = [];
            const stream = client.listObjects(
              process.env.MINIO_BUCKET_NAME || 'documents',
              prefix,
              true,
            );

            return new Promise((resolve, reject) => {
              stream.on('data', (obj: any) => {
                if (obj.name && (!maxKeys || objects.length < maxKeys)) {
                  objects.push(obj.name);
                }
              });
              stream.on('end', () => resolve(objects));
              stream.on('error', reject);
            });
          }

          this.logger.warn('Cliente MinIO não disponível para listagem');
          return [];
        } catch (error) {
          this.logger.error('Erro ao listar arquivos no MinIO:', error);
          return [];
        }
      },
    };
  }
}
