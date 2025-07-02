import { UploadDocumentoDto } from '../../../dto/upload-documento.dto';
import { FileProcessingResult } from './documento-file-processing.interface';
import { MimeValidationResult } from '../../mime-validation.service';

/**
 * Interface para criação e gerenciamento de metadados de documentos
 */
export interface IDocumentoMetadataService {
  /**
   * Cria metadados para o upload
   * @param uploadId ID único do upload
   * @param fileProcessing Resultado do processamento do arquivo
   * @param uploadDocumentoDto DTO com dados do upload
   * @returns Metadados criados
   */
  createMetadata(
    uploadId: string,
    fileProcessing: FileProcessingResult,
    uploadDocumentoDto: UploadDocumentoDto,
  ): UploadMetadata;

  /**
   * Enriquece metadados com informações adicionais
   * @param metadata Metadados base
   * @param additionalData Dados adicionais
   * @returns Metadados enriquecidos
   */
  enrichMetadata(
    metadata: UploadMetadata,
    additionalData: Record<string, any>,
  ): UploadMetadata;

  /**
   * Valida estrutura dos metadados
   * @param metadata Metadados a serem validados
   * @returns True se válidos
   */
  validateMetadata(metadata: UploadMetadata): boolean;
}

/**
 * Metadados do upload
 */
export interface UploadMetadata {
  uploadId: string;
  timestamp: string;
  fileHash: string;
  validationResult: MimeValidationResult;
  storageProvider: string;
  additionalData?: Record<string, any>;
}
