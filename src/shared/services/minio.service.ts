import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { CriptografiaService } from './criptografia.service';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

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

  // Lista de tipos de documentos considerados sensíveis
  private readonly documentosSensiveis = [
    'CPF',
    'RG',
    'COMPROVANTE_RENDA',
    'COMPROVANTE_RESIDENCIA',
    'LAUDO_MEDICO',
    'CERTIDAO_NASCIMENTO',
    'CERTIDAO_CASAMENTO',
    'CARTAO_NIS',
    'CARTAO_BOLSA_FAMILIA',
    'DECLARACAO_VULNERABILIDADE'
  ];

  constructor(
    private configService: ConfigService,
    private criptografiaService: CriptografiaService
  ) {
    // Configuração do cliente MinIO
    this.minioClient = new Minio.Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT', 'localhost'),
      port: this.configService.get<number>('MINIO_PORT', 9000),
      useSSL: this.configService.get<boolean>('MINIO_USE_SSL', false),
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY', 'minioadmin')
    });

    // Nome do bucket para armazenamento de documentos
    this.bucketName = this.configService.get<string>('MINIO_BUCKET', 'documents');

    // Diretório temporário para arquivos em processamento
    this.tempDir = path.join(os.tmpdir(), 'pgben-temp');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Inicialização do módulo
   * Verifica se o bucket existe e cria se necessário
   */
  async onModuleInit() {
    try {
      const bucketExists = await this.minioClient.bucketExists(this.bucketName);
      if (!bucketExists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`Bucket '${this.bucketName}' criado com sucesso`);
      } else {
        this.logger.log(`Bucket '${this.bucketName}' já existe`);
      }
    } catch (error) {
      this.logger.error(`Erro ao verificar/criar bucket: ${error.message}`);
    }
  }

  /**
   * Verifica se um tipo de documento deve ser criptografado
   * @param tipoDocumento Tipo do documento
   * @returns true se o documento deve ser criptografado, false caso contrário
   */
  private documentoRequerCriptografia(tipoDocumento: string): boolean {
    return this.documentosSensiveis.includes(tipoDocumento);
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
    tipoDocumento: string
  ): string {
    const extensao = path.extname(nomeOriginal);
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    return `${solicitacaoId}/${tipoDocumento}/${timestamp}-${randomString}${extensao}`;
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
    tipoDocumento: string
  ): Promise<{
    nomeArquivo: string;
    tamanho: number;
    hash: string;
    criptografado: boolean;
    metadados: any;
  }> {
    // Gerar nome único para o arquivo
    const nomeArquivo = this.gerarNomeArquivo(nomeOriginal, solicitacaoId, tipoDocumento);
    
    // Calcular hash do arquivo original para verificação de integridade
    const hash = this.criptografiaService.gerarHash(arquivo);
    
    // Verificar se o documento deve ser criptografado
    const criptografar = this.documentoRequerCriptografia(tipoDocumento);
    
    let arquivoFinal = arquivo;
    let metadados: any = {
      'Content-Type': this.detectarMimeType(nomeOriginal),
      'X-Amz-Meta-Original-Name': nomeOriginal,
      'X-Amz-Meta-Hash': hash,
      'X-Amz-Meta-Encrypted': criptografar ? 'true' : 'false'
    };
    
    // Se o documento for sensível, criptografar
    if (criptografar) {
      try {
        // Criptografar o arquivo
        const { dadosCriptografados, iv, authTag } = this.criptografiaService.criptografarBuffer(arquivo);
        
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
      // Fazer upload do arquivo para o MinIO
      await this.minioClient.putObject(
        this.bucketName,
        nomeArquivo,
        arquivoFinal,
        arquivoFinal.length,
        metadados
      );
      
      this.logger.log(`Arquivo ${nomeArquivo} enviado para o MinIO com sucesso`);
      
      return {
        nomeArquivo,
        tamanho: arquivo.length, // Tamanho original, não o criptografado
        hash,
        criptografado: criptografar,
        metadados: {
          tipoDocumento,
          solicitacaoId,
          nomeOriginal
        }
      };
    } catch (error) {
      this.logger.error(`Erro ao enviar arquivo para o MinIO: ${error.message}`);
      throw new Error(`Falha ao armazenar documento: ${error.message}`);
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
      // Obter metadados do arquivo
      const stat = await this.minioClient.statObject(this.bucketName, nomeArquivo);
      
      // Criar arquivo temporário para download
      const tempFilePath = path.join(this.tempDir, `download-${Date.now()}-${path.basename(nomeArquivo)}`);
      
      // Baixar arquivo do MinIO
      await this.minioClient.fGetObject(this.bucketName, nomeArquivo, tempFilePath);
      
      // Ler arquivo baixado
      const arquivoCriptografado = fs.readFileSync(tempFilePath);
      
      // Verificar se o arquivo está criptografado
      const criptografado = stat.metaData['x-amz-meta-encrypted'] === 'true';
      
      let arquivoFinal = arquivoCriptografado;
      
      // Se estiver criptografado, descriptografar
      if (criptografado) {
        const iv = Buffer.from(stat.metaData['x-amz-meta-iv'], 'base64');
        const authTag = Buffer.from(stat.metaData['x-amz-meta-authtag'], 'base64');
        
        try {
          arquivoFinal = this.criptografiaService.descriptografarBuffer(
            arquivoCriptografado,
            iv,
            authTag
          );
          
          this.logger.log(`Arquivo ${nomeArquivo} descriptografado com sucesso`);
        } catch (error) {
          this.logger.error(`Erro ao descriptografar arquivo: ${error.message}`);
          throw new Error(`Falha ao descriptografar documento: ${error.message}`);
        }
      }
      
      // Verificar integridade do arquivo
      const hashOriginal = stat.metaData['x-amz-meta-hash'];
      const hashCalculado = this.criptografiaService.gerarHash(arquivoFinal);
      
      if (hashOriginal !== hashCalculado) {
        this.logger.error(`Integridade do arquivo ${nomeArquivo} comprometida`);
        throw new Error('A integridade do documento foi comprometida. O hash não corresponde ao original.');
      }
      
      // Remover arquivo temporário
      fs.unlinkSync(tempFilePath);
      
      return {
        arquivo: arquivoFinal,
        metadados: {
          nomeOriginal: stat.metaData['x-amz-meta-original-name'],
          contentType: stat.metaData['content-type'],
          tamanho: arquivoFinal.length,
          criptografado
        }
      };
    } catch (error) {
      this.logger.error(`Erro ao baixar arquivo do MinIO: ${error.message}`);
      throw new Error(`Falha ao recuperar documento: ${error.message}`);
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
      this.logger.error(`Erro ao remover arquivo do MinIO: ${error.message}`);
      throw new Error(`Falha ao remover documento: ${error.message}`);
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
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.7z': 'application/x-7z-compressed',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip'
    };
    
    return mimeTypes[extensao] || 'application/octet-stream';
  }

  /**
   * Gera uma URL pré-assinada para acesso temporário a um arquivo
   * @param nomeArquivo Nome do arquivo no MinIO
   * @param expiracaoSegundos Tempo de expiração da URL em segundos
   * @returns URL pré-assinada
   */
  async gerarUrlPreAssinada(nomeArquivo: string, expiracaoSegundos = 3600): Promise<string> {
    try {
      return await this.minioClient.presignedGetObject(
        this.bucketName,
        nomeArquivo,
        expiracaoSegundos
      );
    } catch (error) {
      this.logger.error(`Erro ao gerar URL pré-assinada: ${error.message}`);
      throw new Error(`Falha ao gerar URL para acesso ao documento: ${error.message}`);
    }
  }
}
