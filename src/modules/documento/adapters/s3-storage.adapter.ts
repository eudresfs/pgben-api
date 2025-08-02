import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { StorageProvider } from '../interfaces/storage-provider.interface';
import { MetadadosDocumento } from '../interfaces/metadados.interface';
import { LoggingService } from '../../../shared/logging/logging.service';

/**
 * Adaptador para armazenamento de documentos no Amazon S3
 *
 * Implementa a interface StorageProvider para integração com o Amazon S3
 */
@Injectable()
export class S3StorageAdapter implements StorageProvider {
  readonly nome = 'S3';
  // Logger do NestJS substituído pelo LoggingService
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly loggingService: LoggingService,
  ) {
    // Só inicializar S3 se for o provider configurado
    const storageProvider = this.configService.get<string>(
      'STORAGE_PROVIDER',
      'minio',
    );

    if (storageProvider !== 's3') {
      this.loggingService.debug(
        'S3StorageAdapter não será inicializado - provider configurado é: ' +
          storageProvider,
        S3StorageAdapter.name,
      );
      return;
    }

    const bucketName = this.configService.get<string>('AWS_S3_BUCKET');
    if (!bucketName) {
      throw new Error('AWS_S3_BUCKET configuration is required');
    }
    this.bucketName = bucketName;

    this.maxRetries = this.configService.get<number>('STORAGE_MAX_RETRIES', 3);
    this.retryDelay = this.configService.get<number>(
      'STORAGE_RETRY_DELAY',
      1000,
    );

    const region = this.configService.get<string>('AWS_REGION');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'AWS credentials (AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) are required',
      );
    }

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      maxAttempts: this.maxRetries,
    });

    this.validateConfiguration();
  }

  private validateConfiguration(): void {
    const requiredConfigs = [
      'AWS_S3_BUCKET',
      'AWS_REGION',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
    ];

    const missingConfigs = requiredConfigs.filter(
      (config) => !this.configService.get(config),
    );

    if (missingConfigs.length > 0) {
      const error = `Configurações S3 ausentes: ${missingConfigs.join(', ')}`;
      this.loggingService.error(
        'Configuração S3 inválida',
        S3StorageAdapter.name,
        missingConfigs.join(', '),
      );
      throw new Error(error);
    }

    this.loggingService.debug(
      'Configuração S3 validada com sucesso',
      S3StorageAdapter.name,
      {
        bucket: this.bucketName,
        region: this.configService.get('AWS_REGION'),
        maxRetries: this.maxRetries,
      },
    );
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = this.maxRetries,
  ): Promise<T> {
    let lastError: Error = new Error(
      'Operação falhou após todas as tentativas',
    );

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === maxRetries) {
          this.loggingService.error(
            `Operação S3 falhou após ${maxRetries} tentativas: ${operationName}`,
            error,
            S3StorageAdapter.name,
            {
              operationName,
              attempts: maxRetries,
              error: error.message,
              errorCode: error.name,
            },
          );
          break;
        }

        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        this.loggingService.warn(
          `Tentativa ${attempt}/${maxRetries} falhou para ${operationName}, tentando novamente em ${delay}ms`,
          S3StorageAdapter.name,
          {
            operationName,
            attempt,
            maxRetries,
            delay,
            error: error.message,
          },
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  private handleS3Error(error: any, operation: string, key?: string): Error {
    const errorInfo = {
      operation,
      key,
      errorName: error.name,
      errorCode: error.$metadata?.httpStatusCode,
      errorMessage: error.message,
    };

    this.loggingService.error(
      `Erro S3 na operação ${operation}`,
      error,
      S3StorageAdapter.name,
    );

    if (error instanceof NoSuchKey) {
      return new Error(`Arquivo não encontrado: ${key}`);
    }

    if (error instanceof S3ServiceException) {
      const statusCode = error.$metadata?.httpStatusCode;
      if (statusCode === 403) {
        return new Error('Acesso negado ao S3. Verifique as credenciais.');
      }
      if (statusCode === 404) {
        return new Error(
          `Bucket ou arquivo não encontrado: ${key || this.bucketName}`,
        );
      }
      if (statusCode && statusCode >= 500) {
        return new Error('Erro interno do S3. Tente novamente.');
      }
    }

    return new Error(`Erro S3 na operação ${operation}: ${error.message}`);
  }

  /**
   * Salva um arquivo no armazenamento S3
   * @param buffer Buffer do arquivo
   * @param nomeArquivo Nome do arquivo
   * @param mimetype Tipo MIME do arquivo
   * @param metadados Metadados opcionais do arquivo
   * @returns Caminho ou identificador do arquivo armazenado
   */
  async salvarArquivo(
    buffer: Buffer,
    nomeArquivo: string,
    mimetype: string,
    metadados?: Record<string, any>,
  ): Promise<string> {
    return this.upload(buffer, nomeArquivo, mimetype, metadados);
  }

  /**
   * Obtém um arquivo do armazenamento S3
   * @param caminho Caminho ou identificador do arquivo
   * @returns Buffer do arquivo
   */
  async obterArquivo(caminho: string): Promise<Buffer> {
    return this.download(caminho);
  }

  /**
   * Obtém um stream de leitura de um arquivo do armazenamento S3
   * @param caminho Caminho ou identificador do arquivo
   * @returns Stream de leitura do arquivo
   */
  async obterArquivoStream(caminho: string): Promise<Readable> {
    const startTime = Date.now();

    try {
      this.loggingService.debug(
        `Iniciando stream S3`,
        S3StorageAdapter.name,
        {
          key: caminho,
          bucket: this.bucketName,
        },
      );

      // Obter stream do arquivo do S3 com retry
      const streamOperation = async () => {
        const command = new GetObjectCommand({
          Bucket: this.bucketName,
          Key: caminho,
        });

        return await this.s3Client.send(command);
      };

      const response = await this.retryOperation(
        streamOperation,
        `stream S3 [${caminho}]`,
      );

      const stream = response.Body as Readable;

      if (!stream) {
        throw new Error('Resposta do S3 não contém dados');
      }

      const duration = Date.now() - startTime;
      this.loggingService.debug(
        `Stream S3 criado com sucesso`,
        S3StorageAdapter.name,
        {
          key: caminho,
          bucket: this.bucketName,
          duracao: duration,
        },
      );

      return stream;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.loggingService.error(
        `Falha ao criar stream S3`,
        error,
        S3StorageAdapter.name,
        {
          key: caminho,
          bucket: this.bucketName,
          duracao: duration,
        },
      );

      throw this.handleS3Error(error, 'stream', caminho);
    }
  }

  /**
   * Remove um arquivo do armazenamento S3
   * @param caminho Caminho ou identificador do arquivo
   */
  async removerArquivo(caminho: string): Promise<void> {
    return this.delete(caminho);
  }

  /**
   * Faz upload de um arquivo para o S3
   * @param buffer Buffer do arquivo
   * @param key Chave única para identificar o arquivo
   * @param mimetype Tipo MIME do arquivo
   * @param metadata Metadados opcionais do arquivo
   * @returns Caminho do arquivo no S3
   */
  async upload(
    buffer: Buffer,
    key: string,
    mimetype: string,
    metadata?: Record<string, any>,
  ): Promise<string> {
    const startTime = Date.now();

    try {
      this.loggingService.debug(`Iniciando upload S3`, S3StorageAdapter.name, {
        key,
        mimetype,
        tamanho: buffer.length,
        bucket: this.bucketName,
        metadata,
      });

      // Preparar metadados para o S3
      const s3Metadata: Record<string, string> = {};
      if (metadata) {
        // Converter todos os valores para string, pois o S3 só aceita strings como metadados
        Object.entries(metadata).forEach(([k, v]) => {
          s3Metadata[k] = typeof v === 'string' ? v : JSON.stringify(v);
        });
      }

      // Enviar arquivo para o S3 com retry
      const uploadOperation = async () => {
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: buffer,
          ContentType: mimetype,
          Metadata: s3Metadata,
        });

        return await this.s3Client.send(command);
      };

      await this.retryOperation(uploadOperation, `upload S3 [${key}]`);

      const duration = Date.now() - startTime;
      this.loggingService.info(
        `Upload S3 concluído com sucesso`,
        S3StorageAdapter.name,
        {
          key,
          bucket: this.bucketName,
          tamanho: buffer.length,
          duracao: duration,
          mimetype,
        },
      );

      return key;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.loggingService.error(
        `Falha no upload S3`,
        error,
        S3StorageAdapter.name,
        {
          key,
          bucket: this.bucketName,
          tamanho: buffer.length,
          duracao: duration,
        },
      );

      throw this.handleS3Error(error, 'upload', key);
    }
  }

  /**
   * Faz download de um arquivo do S3
   * @param key Chave do arquivo
   * @returns Buffer do arquivo
   */
  async download(key: string): Promise<Buffer> {
    const startTime = Date.now();

    try {
      this.loggingService.debug(
        `Iniciando download S3`,
        S3StorageAdapter.name,
        {
          key,
          bucket: this.bucketName,
        },
      );

      // Obter arquivo do S3 com retry
      const downloadOperation = async () => {
        const command = new GetObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        });

        return await this.s3Client.send(command);
      };

      const response = await this.retryOperation(
        downloadOperation,
        `download S3 [${key}]`,
      );

      // Converter stream para buffer
      const chunks: Uint8Array[] = [];
      const stream = response.Body as Readable;

      if (!stream) {
        throw new Error('Resposta do S3 não contém dados');
      }

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);
      const duration = Date.now() - startTime;

      this.loggingService.info(
        `Download S3 concluído com sucesso`,
        S3StorageAdapter.name,
        {
          key,
          bucket: this.bucketName,
          tamanho: buffer.length,
          duracao: duration,
        },
      );

      return buffer;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.loggingService.error(
        `Falha no download S3`,
        error,
        S3StorageAdapter.name,
        {
          key,
          bucket: this.bucketName,
          duracao: duration,
        },
      );

      throw this.handleS3Error(error, 'download', key);
    }
  }

  /**
   * Remove um arquivo do S3
   * @param key Chave do arquivo
   */
  async delete(key: string): Promise<void> {
    const startTime = Date.now();

    try {
      this.loggingService.debug(`Iniciando remoção S3`, S3StorageAdapter.name, {
        key,
        bucket: this.bucketName,
      });

      // Remover arquivo do S3 com retry
      const deleteOperation = async () => {
        const command = new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        });

        return await this.s3Client.send(command);
      };

      await this.retryOperation(deleteOperation, `delete S3 [${key}]`);

      const duration = Date.now() - startTime;
      this.loggingService.info(
        `Remoção S3 concluída com sucesso`,
        S3StorageAdapter.name,
        {
          key,
          bucket: this.bucketName,
          duracao: duration,
        },
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.loggingService.error(
        `Falha na remoção S3`,
        error,
        S3StorageAdapter.name,
        {
          key,
          bucket: this.bucketName,
          duracao: duration,
        },
      );

      // Para delete, não é crítico se o arquivo não existir
      if (error instanceof NoSuchKey) {
        this.loggingService.warn(
          `Arquivo já não existe no S3`,
          S3StorageAdapter.name,
          { key },
        );
        return; // Sucesso silencioso
      }

      throw this.handleS3Error(error, 'delete', key);
    }
  }

  /**
   * Obtém a URL de acesso a um arquivo no S3
   * @param key Chave do arquivo
   * @param expiresIn Tempo de expiração da URL em segundos (padrão: 3600)
   * @returns URL assinada para acesso ao arquivo
   */
  async getUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      this.loggingService.debug(
        `Gerando URL assinada para: ${key} (expira em ${expiresIn}s)`,
      );

      // Gerar URL assinada
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      this.loggingService.error(`Erro ao gerar URL assinada: ${error.message}`);
      throw new Error(`Erro ao gerar URL assinada: ${error.message}`);
    }
  }

  /**
   * Verifica se um arquivo existe no S3
   * @param key Chave do arquivo
   * @returns true se o arquivo existe, false caso contrário
   */
  async exists(key: string): Promise<boolean> {
    try {
      this.loggingService.debug(`Verificando existência do arquivo: ${key}`);

      // Verificar se o arquivo existe
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound') {
        return false;
      }

      this.loggingService.error(
        `Erro ao verificar existência do arquivo: ${error.message}`,
      );
      throw new Error(
        `Erro ao verificar existência do arquivo: ${error.message}`,
      );
    }
  }

  /**
   * Copia um arquivo de uma chave para outra no S3
   * @param sourceKey Chave do arquivo de origem
   * @param destinationKey Chave do arquivo de destino
   * @returns Chave do arquivo copiado
   */
  async copy(sourceKey: string, destinationKey: string): Promise<string> {
    try {
      this.loggingService.debug(
        `Copiando arquivo de ${sourceKey} para ${destinationKey}`,
      );

      // Copiar arquivo
      const command = new CopyObjectCommand({
        Bucket: this.bucketName,
        CopySource: `${this.bucketName}/${sourceKey}`,
        Key: destinationKey,
      });

      await this.s3Client.send(command);
      this.loggingService.debug(
        `Arquivo copiado com sucesso para: ${destinationKey}`,
      );

      return destinationKey;
    } catch (error) {
      this.loggingService.error(`Erro ao copiar arquivo: ${error.message}`);
      throw new Error(`Erro ao copiar arquivo: ${error.message}`);
    }
  }

  /**
   * Lista arquivos com um prefixo específico no S3
   * @param prefix Prefixo para filtrar arquivos
   * @param maxKeys Número máximo de chaves a retornar (padrão: 1000)
   * @returns Lista de chaves de arquivos
   */
  async list(prefix: string, maxKeys: number = 1000): Promise<string[]> {
    try {
      this.loggingService.debug(
        `Listando arquivos com prefixo: ${prefix} (max: ${maxKeys})`,
      );

      // Listar arquivos
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
        MaxKeys: maxKeys,
      });

      const response = await this.s3Client.send(command);

      // Extrair chaves
      const keys = (response.Contents || [])
        .map((item) => item.Key)
        .filter(Boolean) as string[];
      this.loggingService.debug(
        `Encontrados ${keys.length} arquivos com prefixo: ${prefix}`,
      );

      return keys;
    } catch (error) {
      this.loggingService.error(`Erro ao listar arquivos: ${error.message}`);
      throw new Error(`Erro ao listar arquivos: ${error.message}`);
    }
  }
}
