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
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageProvider } from '../interfaces/storage-provider.interface';

/**
 * Adaptador para armazenamento de documentos no Amazon S3
 *
 * Implementa a interface StorageProvider para integração com o Amazon S3
 */
@Injectable()
export class S3StorageAdapter implements StorageProvider {
  readonly nome = 'Amazon S3';
  private readonly logger = new Logger(S3StorageAdapter.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    this.bucket = this.configService.get<string>(
      'AWS_S3_BUCKET',
      'pgben-documentos',
    );

    // Configurar cliente S3
    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
          '',
        ),
      },
    });

    this.logger.log(
      `Adaptador S3 inicializado para bucket: ${this.bucket} na região: ${this.region}`,
    );
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
    try {
      this.logger.debug(`Iniciando upload para S3: ${key} (${mimetype})`);

      // Preparar metadados para o S3
      const s3Metadata: Record<string, string> = {};
      if (metadata) {
        // Converter todos os valores para string, pois o S3 só aceita strings como metadados
        Object.entries(metadata).forEach(([k, v]) => {
          s3Metadata[k] = typeof v === 'string' ? v : JSON.stringify(v);
        });
      }

      // Enviar arquivo para o S3
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
        Metadata: s3Metadata,
      });

      await this.s3Client.send(command);
      this.logger.debug(`Upload concluído com sucesso: ${key}`);

      return key;
    } catch (error) {
      this.logger.error(`Erro ao fazer upload para S3: ${error.message}`);
      throw new Error(`Erro ao fazer upload para S3: ${error.message}`);
    }
  }

  /**
   * Faz download de um arquivo do S3
   * @param key Chave do arquivo
   * @returns Buffer do arquivo
   */
  async download(key: string): Promise<Buffer> {
    try {
      this.logger.debug(`Iniciando download do S3: ${key}`);

      // Obter arquivo do S3
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      // Converter stream para buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);
      this.logger.debug(
        `Download concluído com sucesso: ${key} (${buffer.length} bytes)`,
      );

      return buffer;
    } catch (error) {
      this.logger.error(`Erro ao fazer download do S3: ${error.message}`);
      throw new Error(`Erro ao fazer download do S3: ${error.message}`);
    }
  }

  /**
   * Remove um arquivo do S3
   * @param key Chave do arquivo
   */
  async delete(key: string): Promise<void> {
    try {
      this.logger.debug(`Removendo arquivo do S3: ${key}`);

      // Remover arquivo do S3
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.debug(`Arquivo removido com sucesso: ${key}`);
    } catch (error) {
      this.logger.error(`Erro ao remover arquivo do S3: ${error.message}`);
      throw new Error(`Erro ao remover arquivo do S3: ${error.message}`);
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
      this.logger.debug(
        `Gerando URL assinada para: ${key} (expira em ${expiresIn}s)`,
      );

      // Gerar URL assinada
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      this.logger.error(`Erro ao gerar URL assinada: ${error.message}`);
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
      this.logger.debug(`Verificando existência do arquivo: ${key}`);

      // Verificar se o arquivo existe
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound') {
        return false;
      }

      this.logger.error(
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
      this.logger.debug(
        `Copiando arquivo de ${sourceKey} para ${destinationKey}`,
      );

      // Copiar arquivo
      const command = new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourceKey}`,
        Key: destinationKey,
      });

      await this.s3Client.send(command);
      this.logger.debug(`Arquivo copiado com sucesso para: ${destinationKey}`);

      return destinationKey;
    } catch (error) {
      this.logger.error(`Erro ao copiar arquivo: ${error.message}`);
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
      this.logger.debug(
        `Listando arquivos com prefixo: ${prefix} (max: ${maxKeys})`,
      );

      // Listar arquivos
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys,
      });

      const response = await this.s3Client.send(command);

      // Extrair chaves
      const keys = (response.Contents || [])
        .map((item) => item.Key)
        .filter(Boolean) as string[];
      this.logger.debug(
        `Encontrados ${keys.length} arquivos com prefixo: ${prefix}`,
      );

      return keys;
    } catch (error) {
      this.logger.error(`Erro ao listar arquivos: ${error.message}`);
      throw new Error(`Erro ao listar arquivos: ${error.message}`);
    }
  }
}
