import { Injectable } from '@nestjs/common';
import { UploadDocumentoDto } from '../../dto/upload-documento.dto';
import { FileProcessingResult } from './interfaces/documento-file-processing.interface';
import { LoggingService } from '../../../../shared/logging/logging.service';
import {
  IDocumentoMetadataService,
  UploadMetadata,
} from './interfaces/documento-metadata.interface';

/**
 * Serviço especializado para criação e gerenciamento de metadados
 * Responsável por criar, enriquecer e validar metadados de upload
 */
@Injectable()
export class DocumentoMetadataService implements IDocumentoMetadataService {
  constructor(private readonly logger: LoggingService) {}

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
  ): UploadMetadata {
    this.logger.debug(
      `Criando metadados para upload [${uploadId}]`,
      DocumentoMetadataService.name,
      {
        uploadId,
        fileHash: fileProcessing.fileHash,
        fileName: fileProcessing.fileName,
        originalName: fileProcessing.originalName,
      },
    );

    const metadata: UploadMetadata = {
      uploadId,
      timestamp: new Date().toISOString(),
      fileHash: fileProcessing.fileHash,
      validationResult: fileProcessing.validationResult,
      storageProvider: this.getStorageProviderName(),
      additionalData: {
        originalName: fileProcessing.originalName,
        fileName: fileProcessing.fileName,
        size: fileProcessing.size,
        mimetype: fileProcessing.mimetype,
        cidadaoId: uploadDocumentoDto.cidadao_id,
        tipoId: uploadDocumentoDto.tipo,
        descricao: uploadDocumentoDto.descricao,
        uploadSession: uploadDocumentoDto.upload_session_id,
      },
    };

    this.logger.debug(
      `Metadados criados com sucesso [${uploadId}]`,
      DocumentoMetadataService.name,
      {
        uploadId,
        timestamp: metadata.timestamp,
        storageProvider: metadata.storageProvider,
        hasAdditionalData: !!metadata.additionalData,
      },
    );

    return metadata;
  }

  /**
   * Enriquece metadados com informações adicionais
   * @param metadata Metadados base
   * @param additionalData Dados adicionais
   * @returns Metadados enriquecidos
   */
  enrichMetadata(
    metadata: UploadMetadata,
    additionalData: Record<string, any>,
  ): UploadMetadata {
    this.logger.debug(
      `Enriquecendo metadados [${metadata.uploadId}]`,
      DocumentoMetadataService.name,
      {
        uploadId: metadata.uploadId,
        additionalKeys: Object.keys(additionalData),
      },
    );

    const enrichedMetadata: UploadMetadata = {
      ...metadata,
      additionalData: {
        ...metadata.additionalData,
        ...additionalData,
        enrichedAt: new Date().toISOString(),
      },
    };

    return enrichedMetadata;
  }

  /**
   * Valida estrutura dos metadados
   * @param metadata Metadados a serem validados
   * @returns True se válidos
   */
  validateMetadata(metadata: UploadMetadata): boolean {
    const errors: string[] = [];

    // Validar campos obrigatórios
    if (!metadata.uploadId) {
      errors.push('uploadId é obrigatório');
    }

    if (!metadata.timestamp) {
      errors.push('timestamp é obrigatório');
    }

    if (!metadata.fileHash) {
      errors.push('fileHash é obrigatório');
    }

    if (!metadata.validationResult) {
      errors.push('validationResult é obrigatório');
    }

    if (!metadata.storageProvider) {
      errors.push('storageProvider é obrigatório');
    }

    // Validar formato do timestamp
    if (metadata.timestamp) {
      try {
        const date = new Date(metadata.timestamp);
        if (isNaN(date.getTime())) {
          errors.push('timestamp deve ser uma data válida');
        }
      } catch {
        errors.push('timestamp deve ser uma data válida');
      }
    }

    // Validar formato do hash
    if (metadata.fileHash && !/^[a-f0-9]{64}$/i.test(metadata.fileHash)) {
      errors.push('fileHash deve ser um hash SHA-256 válido');
    }

    // Validar resultado da validação
    if (metadata.validationResult) {
      if (typeof metadata.validationResult.isValid !== 'boolean') {
        errors.push('validationResult.isValid deve ser boolean');
      }
    }

    const isValid = errors.length === 0;

    if (!isValid) {
      this.logger.warn(
        `Metadados inválidos [${metadata.uploadId}]`,
        DocumentoMetadataService.name,
        {
          uploadId: metadata.uploadId,
          errors,
        },
      );
    } else {
      this.logger.debug(
        `Metadados validados com sucesso [${metadata.uploadId}]`,
        DocumentoMetadataService.name,
        {
          uploadId: metadata.uploadId,
        },
      );
    }

    return isValid;
  }

  /**
   * Obtém o nome do provedor de storage atual
   * @returns Nome do provedor de storage
   */
  private getStorageProviderName(): string {
    // Por enquanto retorna um valor padrão
    // Pode ser injetado via configuração ou factory
    return process.env.STORAGE_PROVIDER || 'minio';
  }
}