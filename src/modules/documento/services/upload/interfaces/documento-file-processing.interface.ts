import { UploadDocumentoDto } from '../../../dto/upload-documento.dto';
import { MimeValidationResult } from '../../mime-validation.service';

/**
 * Interface para processamento de arquivos de documentos
 */
export interface IDocumentoFileProcessingService {
  /**
   * Processa e valida um arquivo para upload
   * @param arquivo Arquivo a ser processado
   * @param uploadDocumentoDto DTO com dados do upload
   * @param uploadId ID único do upload
   * @returns Resultado do processamento do arquivo
   */
  processFile(
    arquivo: any,
    uploadDocumentoDto: UploadDocumentoDto,
    uploadId: string,
  ): Promise<FileProcessingResult>;

  /**
   * Gera hash do arquivo para verificação de integridade
   * @param buffer Buffer do arquivo
   * @returns Hash SHA-256 do arquivo
   */
  generateFileHash(buffer: Buffer): string;

  /**
   * Gera nome único para o arquivo
   * @param originalName Nome original do arquivo
   * @param uploadId ID único do upload
   * @returns Nome único gerado
   */
  generateFileName(originalName: string, uploadId: string): string;
}

/**
 * Resultado do processamento de arquivo
 */
export interface FileProcessingResult {
  fileName: string;
  originalName: string;
  fileHash: string;
  size: number;
  mimetype: string;
  storagePath: string;
  mimeValidation: MimeValidationResult;
  validationResult: MimeValidationResult;
}