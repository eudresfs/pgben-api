import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
import { MimeValidationService } from '../mime-validation.service';
import { LoggingService } from '../../../../shared/logging/logging.service';
import {
  IDocumentoFileProcessingService,
  FileProcessingResult,
} from './interfaces/documento-file-processing.interface';

/**
 * Serviço especializado para processamento de arquivos
 * Responsável por validação MIME, geração de hash e nomes únicos
 */
@Injectable()
export class DocumentoFileProcessingService
  implements IDocumentoFileProcessingService
{
  constructor(
    private readonly mimeValidationService: MimeValidationService,
    private readonly logger: LoggingService,
  ) {}

  /**
   * Processa e valida arquivo completo
   * @param arquivo Arquivo a ser processado
   * @param uploadId ID único do upload
   * @returns Resultado completo do processamento
   */
  async processFile(
    arquivo: any,
    uploadDocumentoDto: any,
    uploadId: string,
  ): Promise<FileProcessingResult> {
    this.logger.debug(
      `Iniciando processamento de arquivo [${uploadId}]`,
      DocumentoFileProcessingService.name,
      {
        uploadId,
        originalName: arquivo.originalname,
        size: arquivo.size,
        mimetype: arquivo.mimetype,
      },
    );

    // Gerar hash do arquivo
    const fileHash = this.generateFileHash(arquivo.buffer);

    // Validar MIME type
    const validationResult = await this.mimeValidationService.validateFile(
      arquivo,
      uploadDocumentoDto.tipo,
      uploadId,
    );

    // Gerar nome único do arquivo
    const fileName = this.generateFileName(arquivo.originalname);

    const result: FileProcessingResult = {
      fileHash,
      fileName,
      validationResult: validationResult,
      mimeValidation: validationResult,
      storagePath: '',
      originalName: arquivo.originalname,
      size: arquivo.size,
      mimetype: arquivo.mimetype,
    };

    this.logger.debug(
      `Processamento de arquivo concluído [${uploadId}]`,
      DocumentoFileProcessingService.name,
      {
        uploadId,
        fileHash,
        fileName,
        isValid: validationResult.isValid,
        detectedMimeType: validationResult.detectedMimeType,
      },
    );

    return result;
  }

  /**
   * Gera hash SHA-256 do arquivo
   * @param buffer Buffer do arquivo
   * @returns Hash SHA-256 em hexadecimal
   */
  generateFileHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Gera nome único para o arquivo mantendo a extensão original
   * @param originalName Nome original do arquivo
   * @returns Nome único gerado
   */
  generateFileName(originalName: string): string {
    const extension = extname(originalName);
    const uniqueId = uuidv4();
    const timestamp = Date.now();

    return `${timestamp}_${uniqueId}${extension}`;
  }
}
