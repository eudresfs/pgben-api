import { Injectable, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import sharp from 'sharp';
import { FeedbackAnexo } from '../entities/feedback-anexo.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Readable } from 'stream';
import { MinioService } from '../../../shared/services/minio.service';

/**
 * Configuração de upload
 */
interface UploadConfig {
  maxFileSize: number;
  allowedMimeTypes: string[];
}

/**
 * Interface para arquivo processado
 */
interface ProcessedFile {
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  objectName: string;
  hash: string;
  url?: string;
  metadata?: Record<string, any>;
}

/**
 * Serviço para upload e gerenciamento de arquivos usando MinIO
 */
@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);
  private readonly config: UploadConfig;

  constructor(
    @InjectRepository(FeedbackAnexo)
    private readonly anexoRepository: Repository<FeedbackAnexo>,
    private readonly configService: ConfigService,
    private readonly minioService: MinioService
  ) {
    // Configuração do upload
    this.config = {
      maxFileSize: this.configService.get<number>('UPLOAD_MAX_FILE_SIZE', 10 * 1024 * 1024), // 10MB
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
    };
  }



  /**
   * Processa um arquivo para upload
   */
  async processFile(file: Express.Multer.File): Promise<ProcessedFile> {
    try {
      // Validar arquivo
      this.validateFile(file);

      // Gerar hash do arquivo
      const hash = this.generateFileHash(file.buffer);

      // Verificar se arquivo já existe (deduplicação)
      const existingAnexo = await this.anexoRepository.findOne({
        where: { hash_arquivo: hash, ativo: true }
      });

      if (existingAnexo) {
        return {
          originalName: file.originalname,
          fileName: existingAnexo.nome_arquivo,
          mimeType: file.mimetype,
          size: file.size,
          objectName: existingAnexo.caminho_arquivo,
          hash,
          url: existingAnexo.url_publica,
          metadata: existingAnexo.metadados ? JSON.parse(existingAnexo.metadados) : {}
        };
      }

      // Gerar nome único para o arquivo
      const fileName = this.generateFileName(file.originalname, hash);
      const objectName = `feedback/${fileName}`;

      // Processar arquivo baseado no tipo
      let processedBuffer = file.buffer;
      let metadata: Record<string, any> = {};

      if (this.isImage(file.mimetype)) {
        const result = await this.processImage(file.buffer, file.mimetype);
        processedBuffer = result.buffer;
        metadata = result.metadata;
      } else if (this.isVideo(file.mimetype)) {
        metadata = await this.extractVideoMetadata(file.buffer);
      }

      // Upload usando MinioService
      const uploadResult = await this.minioService.uploadArquivoHierarquico(
        processedBuffer,
        objectName,
        file.originalname,
        file.mimetype,
        'feedback-anexo'
      );

      return {
        originalName: file.originalname,
        fileName,
        mimeType: file.mimetype,
        size: processedBuffer.length,
        objectName: uploadResult,
        hash,
        metadata
      };
    } catch (error) {
      this.logger.error(`Erro ao processar arquivo: ${error.message}`);
      throw new InternalServerErrorException('Erro ao processar arquivo');
    }
  }

  /**
   * Salva informações do anexo no banco
   */
  async saveAnexo(
    processedFile: ProcessedFile,
    feedbackId: string
  ): Promise<FeedbackAnexo> {
    const anexo = this.anexoRepository.create({
      nome_original: processedFile.originalName,
      nome_arquivo: processedFile.fileName,
      tipo_mime: processedFile.mimeType,
      tamanho: processedFile.size,
      caminho_arquivo: processedFile.objectName,
      hash_arquivo: processedFile.hash,
      url_publica: processedFile.url,
      metadados: processedFile.metadata ? JSON.stringify(processedFile.metadata) : null,
      ativo: true,
      feedback_id: feedbackId
    });

    return this.anexoRepository.save(anexo);
  }

  /**
   * Remove um anexo
   */
  async removeAnexo(anexoId: string): Promise<void> {
    const anexo = await this.anexoRepository.findOne({
      where: { id: anexoId }
    });

    if (!anexo) {
      throw new BadRequestException('Anexo não encontrado');
    }

    // Marcar como inativo
    anexo.ativo = false;
    await this.anexoRepository.save(anexo);

    // Verificar se outros anexos usam o mesmo arquivo
    const otherAnexos = await this.anexoRepository.count({
      where: {
        hash_arquivo: anexo.hash_arquivo,
        ativo: true
      }
    });

    // Se não há outros anexos usando o arquivo, remover usando MinioService
    if (otherAnexos === 0) {
      try {
        await this.minioService.removerArquivo(anexo.caminho_arquivo);
        this.logger.log(`Arquivo ${anexo.caminho_arquivo} removido do MinIO`);
      } catch (error) {
        this.logger.error(`Erro ao remover arquivo do MinIO: ${error.message}`);
      }
    }
  }

  /**
   * Obtém um anexo por ID
   */
  async getAnexo(anexoId: string): Promise<FeedbackAnexo> {
    const anexo = await this.anexoRepository.findOne({
      where: { id: anexoId, ativo: true }
    });

    if (!anexo) {
      throw new BadRequestException('Anexo não encontrado');
    }

    return anexo;
  }

  /**
   * Obtém o stream de um arquivo do MinIO
   */
  async getFileStream(objectName: string): Promise<Readable> {
    try {
      return await this.minioService.getObjectStream(objectName);
    } catch (error) {
      this.logger.error(`Erro ao obter stream do arquivo: ${error.message}`);
      throw new InternalServerErrorException('Erro ao acessar arquivo');
    }
  }

  /**
   * Lê um arquivo do MinIO como buffer
   */
  async readFile(objectName: string): Promise<Buffer> {
    try {
      const result = await this.minioService.downloadArquivo(objectName);
      return result.arquivo;
    } catch (error) {
      this.logger.error(`Erro ao ler arquivo: ${error.message}`);
      throw new InternalServerErrorException('Erro ao acessar arquivo');
    }
  }

  /**
   * Gera URL pré-assinada para download
   */
  async getPresignedUrl(objectName: string, expiry: number = 3600): Promise<string> {
    try {
      return await this.minioService.gerarUrlPreAssinada(objectName, expiry);
    } catch (error) {
      this.logger.error(`Erro ao gerar URL pré-assinada: ${error.message}`);
      throw new InternalServerErrorException('Erro ao gerar URL de download');
    }
  }

  /**
   * Valida um arquivo
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo fornecido');
    }

    if (file.size > this.config.maxFileSize) {
      throw new BadRequestException(
        `Arquivo muito grande. Tamanho máximo: ${this.formatFileSize(this.config.maxFileSize)}`
      );
    }

    if (!this.config.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de arquivo não permitido: ${file.mimetype}`
      );
    }
  }

  /**
   * Gera hash do arquivo
   */
  private generateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Gera nome único para o arquivo
   */
  private generateFileName(originalName: string, hash: string): string {
    const ext = originalName.substring(originalName.lastIndexOf('.'));
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    return `${timestamp}-${random}-${hash.substring(0, 8)}${ext}`;
  }

  /**
   * Verifica se é uma imagem
   */
  private isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * Verifica se é um vídeo
   */
  private isVideo(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  /**
   * Processa uma imagem
   */
  private async processImage(
    buffer: Buffer,
    mimeType: string
  ): Promise<{ buffer: Buffer; metadata: Record<string, any> }> {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      // Redimensionar se muito grande (máximo 2048px)
      let processedImage = image;
      if (metadata.width && metadata.width > 2048) {
        processedImage = image.resize(2048, null, {
          withoutEnlargement: true,
          fit: 'inside'
        });
      }

      // Otimizar qualidade
      if (mimeType === 'image/jpeg') {
        processedImage = processedImage.jpeg({ quality: 85 });
      } else if (mimeType === 'image/png') {
        processedImage = processedImage.png({ compressionLevel: 8 });
      }

      const processedBuffer = await processedImage.toBuffer();

      return {
        buffer: processedBuffer,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          channels: metadata.channels,
          density: metadata.density,
          hasAlpha: metadata.hasAlpha
        }
      };
    } catch (error) {
      // Se falhar o processamento, retornar buffer original
      this.logger.warn(`Falha no processamento da imagem: ${error.message}`);
      return {
        buffer,
        metadata: { error: 'Falha no processamento da imagem' }
      };
    }
  }

  /**
   * Extrai metadados de vídeo (implementação básica)
   */
  private async extractVideoMetadata(
    buffer: Buffer
  ): Promise<Record<string, any>> {
    // Implementação básica - em produção, usar ffprobe ou similar
    return {
      size: buffer.length,
      type: 'video',
      processed: false
    };
  }

  /**
   * Formata tamanho do arquivo
   */
  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Limpa arquivos órfãos do MinIO
   */
  async cleanupOrphanFiles(): Promise<number> {
    try {
      let removedCount = 0;
      
      // Obter lista de anexos ativos no banco
      const anexosAtivos = await this.anexoRepository.find({
        where: { ativo: true },
        select: ['caminho_arquivo']
      });
      
      const caminhosSalvos = new Set(anexosAtivos.map(anexo => anexo.caminho_arquivo));
      
      this.logger.log(`Iniciando limpeza de arquivos órfãos: ${caminhosSalvos.size} arquivos ativos encontrados`);
      
      // Obter lista de arquivos órfãos mais antigos que 24h
      const arquivosOrfaos = await this.minioService.listarArquivosOrfaos('feedback/', caminhosSalvos, 24);
      
      // Remover arquivos órfãos
      for (const arquivo of arquivosOrfaos) {
        try {
          await this.minioService.removerArquivo(arquivo);
          removedCount++;
          this.logger.log(`Arquivo órfão removido: ${arquivo}`);
        } catch (error) {
          this.logger.error(`Erro ao remover arquivo órfão ${arquivo}: ${error.message}`);
        }
      }
      
      this.logger.log(`Limpeza concluída: ${removedCount} arquivos órfãos removidos`);
      return removedCount;
    } catch (error) {
      this.logger.error(`Erro na limpeza de arquivos órfãos: ${error.message}`);
      return 0;
    }
  }

  /**
   * Obtém estatísticas de uso do storage
   */
  async getStorageStats(): Promise<{ totalFiles: number; totalSize: number }> {
    try {
      // Obter estatísticas diretamente do MinIO para dados mais precisos
      const storageStats = await this.minioService.obterEstatisticasStorage('feedback/');
      
      this.logger.log(`Estatísticas de storage obtidas: ${storageStats.totalFiles} arquivos, ${this.formatFileSize(storageStats.totalSize)}`);
      
      return storageStats;
    } catch (error) {
      this.logger.error(`Erro ao obter estatísticas do MinIO, usando fallback do banco: ${error.message}`);
      
      // Fallback: obter estatísticas baseadas nos anexos do banco de dados
      try {
        const anexosAtivos = await this.anexoRepository.find({
          where: { ativo: true },
          select: ['tamanho']
        });
        
        const totalFiles = anexosAtivos.length;
        const totalSize = anexosAtivos.reduce((sum, anexo) => sum + (anexo.tamanho || 0), 0);
        
        return { totalFiles, totalSize };
      } catch (dbError) {
        this.logger.error(`Erro ao obter estatísticas do banco: ${dbError.message}`);
        return { totalFiles: 0, totalSize: 0 };
      }
    }
  }
}