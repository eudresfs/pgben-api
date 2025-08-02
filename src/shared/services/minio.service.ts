import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { CriptografiaService } from './criptografia.service';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import {
  DocumentoNaoEncontradoException,
  AcessoNegadoDocumentoException,
  IntegridadeDocumentoException,
  ConfiguracaoStorageException,
  DescriptografiaDocumentoException,
  StorageIndisponivelException,
} from '../../modules/documento/exceptions/documento.exceptions';

/**
 * Serviço de integração com MinIO
 *
 * Responsável por gerenciar o armazenamento de documentos no MinIO,
 * com suporte a criptografia para dados sensíveis.
 */
@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private minioClient: Minio.Client;
  private readonly bucketName: string;
  private readonly tempDir: string;

  // Removida lista de documentos sensíveis - agora usa a lista centralizada no CriptografiaService

  constructor(
    private configService: ConfigService,
    private criptografiaService: CriptografiaService,
  ) {
    // Configuração do cliente MinIO
    const useSSL = this.configService.get('MINIO_USE_SSL') === 'true';
    const region = this.configService.get<string>('MINIO_REGION', 'us-east-1');
    this.logger.log(`Configurando MinIO com SSL: ${useSSL}, Região: ${region}`);

    this.minioClient = new Minio.Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT', 'localhost'),
      port: this.configService.get<number>('MINIO_PORT', 9000),
      useSSL: useSSL,
      accessKey: this.configService.get<string>(
        'MINIO_ACCESS_KEY',
        'minioadmin',
      ),
      secretKey: this.configService.get<string>(
        'MINIO_SECRET_KEY',
        'minioadmin',
      ),
      region: region,
    });

    // Nome do bucket para armazenamento de documentos
    this.bucketName = this.configService.get<string>(
      'MINIO_BUCKET_NAME',
      'pgben-documentos',
    );
    this.logger.log(`Usando bucket: ${this.bucketName}`);

    // Diretório temporário para arquivos em processamento
    this.tempDir = path.join(os.tmpdir(), 'pgben-temp');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Inicialização do módulo
   * Verifica se o bucket existe e cria se necessário de forma assíncrona
   */
  async onModuleInit() {
    // Inicialização assíncrona sem bloqueio
    setImmediate(async () => {
      try {
        this.logger.log('Verificando conexão com MinIO...');

        // Timeout para evitar travamento
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error('Timeout na conexão com MinIO')),
            5000,
          );
        });

        const bucketCheckPromise = this.minioClient.bucketExists(
          this.bucketName,
        );

        const bucketExists = (await Promise.race([
          bucketCheckPromise,
          timeoutPromise,
        ])) as boolean;

        if (!bucketExists) {
          const region = this.configService.get<string>(
            'MINIO_REGION',
            'us-east-1',
          );
          await this.minioClient.makeBucket(this.bucketName, region);
          this.logger.log(
            `Bucket '${this.bucketName}' criado com sucesso na região ${region}`,
          );
        } else {
          this.logger.log(`Bucket '${this.bucketName}' já existe`);
        }
      } catch (error) {
        this.logger.warn(
          `MinIO não disponível: ${error.message}. Continuando sem storage externo.`,
        );
        // Não falha a inicialização se MinIO não estiver disponível
      }
    });
  }

  /**
   * Verifica se um tipo de documento deve ser criptografado
   * @param tipoDocumento Tipo do documento
   * @returns true se o documento deve ser criptografado, false caso contrário
   */
  private documentoRequerCriptografia(tipoDocumento: string): boolean {
    return this.criptografiaService.deveSerCriptografado(tipoDocumento);
  }

  /**
   * Gera um nome único para o arquivo no MinIO
   * @param nomeOriginal Nome original do arquivo
   * @param solicitacaoId ID da solicitação
   * @param tipoDocumento Tipo do documento
   * @returns Nome único para o arquivo
   */
  private gerarNomeArquivo(
    nomeOriginal: string,
    solicitacaoId: string,
    tipoDocumento: string,
  ): string {
    const extensao = path.extname(nomeOriginal);
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    return `${solicitacaoId}/${tipoDocumento}/${timestamp}-${randomString}${extensao}`;
  }

  /**
   * Faz upload de um arquivo para o MinIO com caminho hierárquico personalizado
   * @param arquivo Buffer do arquivo
   * @param caminhoCompleto Caminho completo hierárquico do arquivo
   * @param nomeOriginal Nome original do arquivo
   * @param mimetype Tipo MIME do arquivo
   * @param tipoDocumento Tipo do documento para verificar criptografia
   * @returns Caminho do arquivo armazenado
   */
  async uploadArquivoHierarquico(
    arquivo: Buffer,
    caminhoCompleto: string,
    nomeOriginal: string,
    mimetype: string,
    tipoDocumento: string,
  ): Promise<string> {
    // Validar arquivo antes do cálculo do hash
    if (!arquivo || !Buffer.isBuffer(arquivo)) {
      this.logger.error(
        `Arquivo inválido para upload: tipo=${typeof arquivo}, isBuffer=${Buffer.isBuffer(arquivo)}`,
      );
      throw new Error('Arquivo deve ser um Buffer válido');
    }

    if (arquivo.length === 0) {
      this.logger.error('Tentativa de upload de arquivo vazio');
      throw new Error('Arquivo não pode estar vazio');
    }

    this.logger.debug(
      `Iniciando cálculo de hash para arquivo de ${arquivo.length} bytes`,
    );

    // Calcular hash do arquivo original para verificação de integridade
    let hash: string;
    try {
      hash = this.criptografiaService.gerarHash(arquivo);
      this.logger.debug(`Hash calculado com sucesso: ${hash}`);
    } catch (error) {
      this.logger.error(`Falha ao calcular hash do arquivo: ${error.message}`);
      throw new Error(
        `Não foi possível calcular hash do arquivo: ${error.message}`,
      );
    }

    // Validar se o hash foi gerado corretamente
    if (!hash || typeof hash !== 'string' || hash.length !== 64) {
      this.logger.error(`Hash inválido gerado: ${hash}`);
      throw new Error('Hash gerado é inválido');
    }

    // Verificar se o documento deve ser criptografado
    const criptografar = this.documentoRequerCriptografia(tipoDocumento);

    let arquivoFinal = arquivo;
    const metadados: any = {
      'Content-Type': mimetype,
      'X-Amz-Meta-Original-Name': nomeOriginal,
      'X-Amz-Meta-Hash': hash,
      'X-Amz-Meta-Encrypted': criptografar ? 'true' : 'false',
    };

    // Se o documento for sensível, criptografar
    if (criptografar) {
      try {
        // Criptografar o arquivo
        const { dadosCriptografados, iv, authTag } =
          this.criptografiaService.criptografarBuffer(arquivo);

        // Usar o arquivo criptografado
        arquivoFinal = dadosCriptografados;

        // Adicionar metadados de criptografia
        metadados['X-Amz-Meta-IV'] = iv.toString('base64');
        metadados['X-Amz-Meta-AuthTag'] = authTag.toString('base64');

        this.logger.log(`Arquivo ${caminhoCompleto} criptografado com sucesso`);
      } catch (error) {
        this.logger.error(`Erro ao criptografar arquivo: ${error.message}`);
        throw new Error(`Falha ao criptografar documento: ${error.message}`);
      }
    }

    try {
      this.logger.debug(
        `Metadados que serão salvos: ${JSON.stringify(metadados)}`,
      );

      // Fazer upload do arquivo para o MinIO
      await this.minioClient.putObject(
        this.bucketName,
        caminhoCompleto,
        arquivoFinal,
        arquivoFinal.length,
        metadados,
      );

      this.logger.log(
        `Arquivo ${caminhoCompleto} enviado para o MinIO com sucesso`,
      );

      // Verificar se os metadados foram salvos corretamente
      try {
        const statVerificacao = await this.minioClient.statObject(
          this.bucketName,
          caminhoCompleto,
        );
        this.logger.debug(
          `Metadados retornados pelo MinIO: ${JSON.stringify(statVerificacao.metaData)}`,
        );

        const hashSalvo =
          statVerificacao.metaData['x-amz-meta-hash'] ||
          statVerificacao.metaData['X-Amz-Meta-Hash'] ||
          statVerificacao.metaData['hash'];
        this.logger.debug(
          `Verificação pós-upload - Hash salvo: ${hashSalvo}, Hash esperado: ${hash}`,
        );

        if (hashSalvo !== hash) {
          this.logger.warn(
            `Hash nos metadados não corresponde ao esperado. Salvo: ${hashSalvo}, Esperado: ${hash}`,
          );
        }
      } catch (verifyError) {
        this.logger.warn(
          `Não foi possível verificar metadados pós-upload: ${verifyError.message}`,
        );
      }

      return caminhoCompleto;
    } catch (error) {
      this.logger.error(
        `Erro ao enviar arquivo para o MinIO: ${error.message}`,
      );
      throw new Error(`Falha ao armazenar documento: ${error.message}`);
    }
  }

  /**
   * Faz upload de um arquivo para o MinIO
   * @param arquivo Buffer do arquivo
   * @param nomeOriginal Nome original do arquivo
   * @param solicitacaoId ID da solicitação
   * @param tipoDocumento Tipo do documento
   * @returns Metadados do arquivo armazenado
   */
  async uploadArquivo(
    arquivo: Buffer,
    nomeOriginal: string,
    solicitacaoId: string,
    tipoDocumento: string,
  ): Promise<{
    nomeArquivo: string;
    tamanho: number;
    hash: string;
    criptografado: boolean;
    metadados: any;
  }> {
    // Gerar nome único para o arquivo
    const nomeArquivo = this.gerarNomeArquivo(
      nomeOriginal,
      solicitacaoId,
      tipoDocumento,
    );

    // Validar arquivo antes do cálculo do hash
    if (!arquivo || !Buffer.isBuffer(arquivo)) {
      this.logger.error(
        `Arquivo inválido para upload: tipo=${typeof arquivo}, isBuffer=${Buffer.isBuffer(arquivo)}`,
      );
      throw new Error('Arquivo deve ser um Buffer válido');
    }

    if (arquivo.length === 0) {
      this.logger.error('Tentativa de upload de arquivo vazio');
      throw new Error('Arquivo não pode estar vazio');
    }

    this.logger.debug(
      `Iniciando cálculo de hash para arquivo de ${arquivo.length} bytes`,
    );

    // Calcular hash do arquivo original para verificação de integridade
    let hash: string;
    try {
      hash = this.criptografiaService.gerarHash(arquivo);
      this.logger.debug(`Hash calculado com sucesso: ${hash}`);
    } catch (error) {
      this.logger.error(`Falha ao calcular hash do arquivo: ${error.message}`);
      throw new Error(
        `Não foi possível calcular hash do arquivo: ${error.message}`,
      );
    }

    // Validar se o hash foi gerado corretamente
    if (!hash || typeof hash !== 'string' || hash.length !== 64) {
      this.logger.error(`Hash inválido gerado: ${hash}`);
      throw new Error('Hash gerado é inválido');
    }

    // Verificar se o documento deve ser criptografado
    const criptografar = this.documentoRequerCriptografia(tipoDocumento);

    let arquivoFinal = arquivo;
    const metadados: any = {
      'Content-Type': this.detectarMimeType(nomeOriginal),
      'X-Amz-Meta-Original-Name': nomeOriginal,
      'X-Amz-Meta-Hash': hash,
      'X-Amz-Meta-Encrypted': criptografar ? 'true' : 'false',
    };

    // Se o documento for sensível, criptografar
    if (criptografar) {
      try {
        // Criptografar o arquivo
        const { dadosCriptografados, iv, authTag } =
          this.criptografiaService.criptografarBuffer(arquivo);

        // Usar o arquivo criptografado
        arquivoFinal = dadosCriptografados;

        // Adicionar metadados de criptografia
        metadados['X-Amz-Meta-IV'] = iv.toString('base64');
        metadados['X-Amz-Meta-AuthTag'] = authTag.toString('base64');

        this.logger.log(`Arquivo ${nomeArquivo} criptografado com sucesso`);
      } catch (error) {
        this.logger.error(`Erro ao criptografar arquivo: ${error.message}`);
        throw new Error(`Falha ao criptografar documento: ${error.message}`);
      }
    }

    try {
      this.logger.debug(
        `Metadados que serão salvos: ${JSON.stringify(metadados)}`,
      );

      // Fazer upload do arquivo para o MinIO
      await this.minioClient.putObject(
        this.bucketName,
        nomeArquivo,
        arquivoFinal,
        arquivoFinal.length,
        metadados,
      );

      this.logger.log(
        `Arquivo ${arquivoFinal} enviado para o MinIO com sucesso`,
      );

      this.logger.debug(
        `Upload concluído - Caminho completo no MinIO: ${arquivoFinal}`,
      );

      // Verificar se os metadados foram salvos corretamente
      try {
        const statVerificacao = await this.minioClient.statObject(
          this.bucketName,
          nomeArquivo,
        );
        const hashSalvo = statVerificacao.metaData['x-amz-meta-hash'];
        this.logger.debug(
          `Verificação pós-upload - Hash salvo: ${hashSalvo}, Hash esperado: ${hash}`,
        );

        if (hashSalvo !== hash) {
          this.logger.warn(
            `Hash nos metadados não corresponde ao esperado. Salvo: ${hashSalvo}, Esperado: ${hash}`,
          );
        }
      } catch (verifyError) {
        this.logger.warn(
          `Não foi possível verificar metadados pós-upload: ${verifyError.message}`,
        );
      }

      return {
        nomeArquivo,
        tamanho: arquivo.length, // Tamanho original, não o criptografado
        hash,
        criptografado: criptografar,
        metadados: {
          tipoDocumento,
          solicitacaoId,
          nomeOriginal,
        },
      };
    } catch (error) {
      this.logger.error(
        `Erro ao enviar arquivo para o MinIO: ${error.message}`,
      );
      throw new Error(`Falha ao armazenar documento: ${error.message}`);
    }
  }

  /**
   * Obtém um stream de leitura de um arquivo do MinIO
   * @param nomeArquivo Nome do arquivo no MinIO
   * @returns Stream de leitura do arquivo
   */
  async getObjectStream(nomeArquivo: string): Promise<any> {
    try {
      this.logger.debug(
        `Criando stream para arquivo do MinIO: ${nomeArquivo} do bucket: ${this.bucketName}`,
      );

      // Obter stream diretamente do MinIO
      const stream = await this.minioClient.getObject(
        this.bucketName,
        nomeArquivo,
      );

      this.logger.debug(
        `Stream criado com sucesso para arquivo: ${nomeArquivo}`,
      );

      return stream;
    } catch (error) {
      // Tratamento específico para diferentes tipos de erro
      if (
        error.code === 'NoSuchKey' ||
        error.message?.includes('Not Found') ||
        error.message?.includes('does not exist')
      ) {
        this.logger.warn(
          `Arquivo não encontrado no MinIO: ${nomeArquivo} (bucket: ${this.bucketName})`,
        );
        throw new DocumentoNaoEncontradoException(undefined, nomeArquivo);
      }

      this.logger.error(
        `Erro ao criar stream do arquivo do MinIO: ${error.message}`,
      );
      throw new StorageIndisponivelException(`Falha ao obter stream do documento: ${error.message}`);
    }
  }

  /**
   * Baixa um arquivo do MinIO
   * @param nomeArquivo Nome do arquivo no MinIO
   * @returns Buffer com o conteúdo original do arquivo (descriptografado se necessário)
   */
  async downloadArquivo(nomeArquivo: string): Promise<{
    arquivo: Buffer;
    metadados: any;
  }> {
    try {
      this.logger.debug(
        `Tentando baixar arquivo do MinIO: ${nomeArquivo} do bucket: ${this.bucketName}`,
      );

      // Obter metadados do arquivo
      const stat = await this.minioClient.statObject(
        this.bucketName,
        nomeArquivo,
      );

      this.logger.debug(
        `Baixando arquivo ${nomeArquivo}, tamanho: ${stat.size}`,
      );

      // Baixar arquivo do MinIO usando stream para evitar problemas de arquivo temporário
      const stream = await this.minioClient.getObject(
        this.bucketName,
        nomeArquivo,
      );

      // Converter stream para buffer
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const arquivoCriptografado = Buffer.concat(chunks);

      this.logger.debug(
        `Arquivo baixado com sucesso, tamanho do buffer: ${arquivoCriptografado.length}`,
      );

      // Verificar se o arquivo está criptografado
      const encryptedMeta =
        stat.metaData['x-amz-meta-encrypted'] ||
        stat.metaData['encrypted'] ||
        stat.metaData['X-Amz-Meta-Encrypted'];
      const criptografado = encryptedMeta === 'true';

      let arquivoFinal = arquivoCriptografado;

      // Se estiver criptografado, descriptografar
      if (criptografado) {
        const ivMeta =
          stat.metaData['x-amz-meta-iv'] ||
          stat.metaData['iv'] ||
          stat.metaData['X-Amz-Meta-IV'];
        const authTagMeta =
          stat.metaData['x-amz-meta-authtag'] ||
          stat.metaData['authtag'] ||
          stat.metaData['X-Amz-Meta-AuthTag'];

        const iv = Buffer.from(ivMeta, 'base64');
        const authTag = Buffer.from(authTagMeta, 'base64');

        try {
          arquivoFinal = this.criptografiaService.descriptografarBuffer(
            arquivoCriptografado,
            iv,
            authTag,
          );

          this.logger.log(
            `Arquivo ${nomeArquivo} descriptografado com sucesso`,
          );
        } catch (error) {
          this.logger.error(
            `Erro ao descriptografar arquivo: ${error.message}`,
          );
          throw new DescriptografiaDocumentoException(
            `Falha ao descriptografar documento: ${error.message}`,
          );
        }
      }

      // Verificar integridade do arquivo
      this.logger.debug(
        `Metadados disponíveis: ${JSON.stringify(Object.keys(stat.metaData))}`,
      );

      // MinIO pode retornar metadados com chaves em diferentes formatos
      // Tentar múltiplas variações da chave do hash
      const hashOriginal =
        stat.metaData['x-amz-meta-hash'] ||
        stat.metaData['hash'] ||
        stat.metaData['X-Amz-Meta-Hash'];

      this.logger.debug(
        `Hash original dos metadados: ${hashOriginal} (tipo: ${typeof hashOriginal})`,
      );

      if (!hashOriginal) {
        this.logger.error(
          `Hash original não encontrado nos metadados. Metadados completos: ${JSON.stringify(stat.metaData)}`,
        );
        throw new Error(
          'Hash original não encontrado nos metadados do arquivo',
        );
      }

      let hashCalculado: string;
      try {
        hashCalculado = this.criptografiaService.gerarHash(arquivoFinal);
        this.logger.debug(`Hash calculado: ${hashCalculado}`);
      } catch (error) {
        this.logger.error(
          `Erro ao calcular hash para verificação: ${error.message}`,
        );
        throw new Error(
          `Falha na verificação de integridade: ${error.message}`,
        );
      }

      this.logger.debug(
        `Verificação de integridade - Hash original: ${hashOriginal}, Hash calculado: ${hashCalculado}`,
      );

      if (hashOriginal !== hashCalculado) {
        this.logger.error(
          `Integridade do arquivo ${nomeArquivo} comprometida. ` +
            `Hash original: ${hashOriginal}, Hash calculado: ${hashCalculado}, ` +
            `Tamanho arquivo final: ${arquivoFinal.length}, Criptografado: ${criptografado}`,
        );
        throw new IntegridadeDocumentoException(
          'A integridade do documento foi comprometida. O hash não corresponde ao original.',
        );
      }

      this.logger.debug(
        `Verificação de integridade bem-sucedida para ${nomeArquivo}`,
      );

      const nomeOriginalMeta =
        stat.metaData['x-amz-meta-original-name'] ||
        stat.metaData['original-name'] ||
        stat.metaData['X-Amz-Meta-Original-Name'];

      return {
        arquivo: arquivoFinal,
        metadados: {
          nomeOriginal: nomeOriginalMeta,
          contentType: stat.metaData['content-type'],
          tamanho: arquivoFinal.length,
          criptografado,
        },
      };
    } catch (error) {
      // Tratamento específico para diferentes tipos de erro
      if (
        error.code === 'NoSuchKey' ||
        error.message?.includes('Not Found') ||
        error.message?.includes('does not exist')
      ) {
        this.logger.warn(
          `Arquivo não encontrado no MinIO: ${nomeArquivo} (bucket: ${this.bucketName})`,
        );
        throw new DocumentoNaoEncontradoException(undefined, nomeArquivo);
      }

      if (error.code === 'NoSuchBucket') {
        this.logger.error(`Bucket não encontrado: ${this.bucketName}`);
        throw new ConfiguracaoStorageException(
          `Bucket de armazenamento '${this.bucketName}' não encontrado`,
        );
      }

      if (error.code === 'AccessDenied') {
        this.logger.error(`Acesso negado ao arquivo: ${nomeArquivo}`);
        throw new AcessoNegadoDocumentoException();
      }

      if (error.code === 'InvalidBucketName') {
        this.logger.error(`Nome do bucket inválido: ${this.bucketName}`);
        throw new ConfiguracaoStorageException(
          `Nome do bucket '${this.bucketName}' é inválido`,
        );
      }

      if (error.code === 'ECONNREFUSED' || error.message?.includes('connection')) {
        this.logger.error(`Erro de conexão com MinIO: ${error.message}`);
        throw new StorageIndisponivelException(
          'Não foi possível conectar ao sistema de armazenamento',
        );
      }

      // Log detalhado para outros erros
      this.logger.error(`Erro ao baixar arquivo do MinIO: ${error.message}`, {
        nomeArquivo,
        bucket: this.bucketName,
        errorCode: error.code,
        errorName: error.name,
        stack: error.stack,
      });

      throw new StorageIndisponivelException(
        `Falha ao recuperar documento: ${error.message}`,
      );
    }
  }

  /**
   * Remove um arquivo do MinIO
   * @param nomeArquivo Nome do arquivo no MinIO
   */
  async removerArquivo(nomeArquivo: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucketName, nomeArquivo);
      this.logger.log(`Arquivo ${nomeArquivo} removido do MinIO com sucesso`);
    } catch (error) {
      // Tratamento específico para diferentes tipos de erro
      if (
        error.code === 'NoSuchKey' ||
        error.message?.includes('Not Found') ||
        error.message?.includes('does not exist')
      ) {
        this.logger.warn(
          `Arquivo não encontrado para remoção: ${nomeArquivo} (bucket: ${this.bucketName})`,
        );
        // Para remoção, não é necessariamente um erro se o arquivo não existe
        this.logger.log(`Arquivo ${nomeArquivo} já não existe no MinIO`);
        return;
      }

      if (error.code === 'NoSuchBucket') {
        this.logger.error(`Bucket não encontrado: ${this.bucketName}`);
        throw new ConfiguracaoStorageException(
          `Bucket de armazenamento '${this.bucketName}' não encontrado`,
        );
      }

      if (error.code === 'AccessDenied') {
        this.logger.error(`Acesso negado para remover arquivo: ${nomeArquivo}`);
        throw new AcessoNegadoDocumentoException();
      }

      // Log detalhado para outros erros
      this.logger.error(`Erro ao remover arquivo do MinIO: ${error.message}`, {
        nomeArquivo,
        bucket: this.bucketName,
        errorCode: error.code,
        errorName: error.name,
        stack: error.stack,
      });

      throw new StorageIndisponivelException(`Falha ao remover documento: ${error.message}`);
    }
  }

  /**
   * Detecta o tipo MIME de um arquivo com base na extensão
   * @param nomeArquivo Nome do arquivo
   * @returns Tipo MIME do arquivo
   */
  private detectarMimeType(nomeArquivo: string): string {
    const extensao = path.extname(nomeArquivo).toLowerCase();

    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.tiff': 'image/tiff',
      '.tif': 'image/tiff',
      '.doc': 'application/msword',
      '.docx':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx':
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.7z': 'application/x-7z-compressed',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip',
    };

    return mimeTypes[extensao] || 'application/octet-stream';
  }

  /**
   * Gera uma URL pré-assinada para acesso temporário a um arquivo
   * @param nomeArquivo Nome do arquivo no MinIO
   * @param expiracaoSegundos Tempo de expiração da URL em segundos
   * @returns URL pré-assinada
   */
  async gerarUrlPreAssinada(
    nomeArquivo: string,
    expiracaoSegundos = 3600,
  ): Promise<string> {
    try {
      return await this.minioClient.presignedGetObject(
        this.bucketName,
        nomeArquivo,
        expiracaoSegundos,
      );
    } catch (error) {
      this.logger.error(`Erro ao gerar URL pré-assinada: ${error.message}`);
      throw new StorageIndisponivelException(
        `Falha ao gerar URL para acesso ao documento: ${error.message}`,
      );
    }
  }
}
