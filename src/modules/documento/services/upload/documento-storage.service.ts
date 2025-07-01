import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { join } from 'path';
import { UploadDocumentoDto } from '../../dto/upload-documento.dto';
import { StorageProviderFactory } from '../../factories/storage-provider.factory';
import { LoggingService } from '../../../../shared/logging/logging.service';
import { IDocumentoStorageService } from './interfaces/documento-storage.interface';

/**
 * Serviço especializado para operações de storage de documentos
 * Responsável por salvar, organizar e gerenciar arquivos no storage
 */
@Injectable()
export class DocumentoStorageService implements IDocumentoStorageService {
  constructor(
    private readonly storageProviderFactory: StorageProviderFactory,
    private readonly logger: LoggingService,
  ) {}

  /**
   * Salva arquivo no storage
   * @param arquivo Arquivo a ser salvo
   * @param storagePath Caminho no storage
   * @param uploadDocumentoDto DTO com dados do upload
   * @param uploadId ID único do upload
   * @returns Caminho final do arquivo no storage
   */
  async saveFile(
    arquivo: any,
    storagePath: string,
    uploadDocumentoDto: UploadDocumentoDto,
    uploadId: string,
  ): Promise<string> {
    this.logger.debug(
      `Salvando arquivo no storage [${uploadId}]`,
      DocumentoStorageService.name,
      {
        uploadId,
        storagePath,
        fileName: arquivo.originalname,
        size: arquivo.size,
      },
    );

    try {
      const storageProvider = this.storageProviderFactory.getProvider();
      
      if (!storageProvider) {
        throw new InternalServerErrorException(
          'Provedor de storage não configurado',
        );
      }

      // Salvar arquivo usando o provedor de storage
      const finalPath = await storageProvider.salvarArquivo(
        arquivo.buffer,
        storagePath,
        arquivo.mimetype,
        {
          originalName: arquivo.originalname,
          size: arquivo.size,
          cidadao_id: uploadDocumentoDto.cidadao_id,
          tipo: uploadDocumentoDto.tipo,
        },
      );

      this.logger.debug(
        `Arquivo salvo com sucesso no storage [${uploadId}]`,
        DocumentoStorageService.name,
        {
          uploadId,
          finalPath,
          provider: storageProvider.nome,
        },
      );

      return finalPath;
    } catch (error) {
      this.logger.error(
        `Erro ao salvar arquivo no storage [${uploadId}]`,
        error.stack,
        DocumentoStorageService.name,
        {
          uploadId,
          storagePath,
          error: error.message,
        },
      );
      throw error;
    }
  }

  /**
   * Gera caminho hierárquico para o arquivo
   * @param uploadDocumentoDto DTO com dados do upload
   * @param fileName Nome do arquivo
   * @returns Caminho hierárquico gerado
   */
  generateStoragePath(
    uploadDocumentoDto: UploadDocumentoDto,
    fileName: string,
  ): string {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');

    // Estrutura: documentos/YYYY/MM/DD/cidadao_id/tipo_id/filename
    const pathParts = [
      'documentos',
      year,
      month,
      day,
      uploadDocumentoDto.cidadao_id.toString(),
    ];

    // Adicionar tipo se especificado
    if (uploadDocumentoDto.tipo) {
      pathParts.push(uploadDocumentoDto.tipo.toString());
    }

    pathParts.push(fileName);

    return join(...pathParts).replace(/\\/g, '/');
  }

  /**
   * Remove arquivo do storage em caso de erro
   * @param storagePath Caminho do arquivo no storage
   * @param uploadId ID único do upload
   */
  async cleanupFile(storagePath: string, uploadId: string): Promise<void> {
    if (!storagePath) {
      return;
    }

    this.logger.debug(
      `Removendo arquivo do storage [${uploadId}]`,
      DocumentoStorageService.name,
      {
        uploadId,
        storagePath,
      },
    );

    try {
      const storageProvider = this.storageProviderFactory.getProvider();
      
      if (!storageProvider) {
        this.logger.warn(
          `Provedor de storage não configurado para limpeza [${uploadId}]`,
          DocumentoStorageService.name,
          { uploadId, storagePath },
        );
        return;
      }

      // Verificar se arquivo existe antes de tentar remover
      const exists = await this.fileExists(storagePath);
      if (!exists) {
        this.logger.debug(
          `Arquivo não existe no storage, limpeza desnecessária [${uploadId}]`,
          DocumentoStorageService.name,
          { uploadId, storagePath },
        );
        return;
      }

      await storageProvider.removerArquivo(storagePath);

      this.logger.debug(
        `Arquivo removido do storage com sucesso [${uploadId}]`,
        DocumentoStorageService.name,
        {
          uploadId,
          storagePath,
        },
      );
    } catch (error) {
      this.logger.error(
        `Erro ao remover arquivo do storage [${uploadId}]`,
        error.stack,
        DocumentoStorageService.name,
        {
          uploadId,
          storagePath,
          error: error.message,
        },
      );
      // Não relançar erro de limpeza para não mascarar erro original
    }
  }

  /**
   * Verifica se o arquivo existe no storage
   * @param storagePath Caminho do arquivo no storage
   * @returns True se o arquivo existe
   */
  async fileExists(storagePath: string): Promise<boolean> {
    try {
      const storageProvider = this.storageProviderFactory.getProvider();
      
      if (!storageProvider) {
        return false;
      }

      return await storageProvider.exists(storagePath);
    } catch (error) {
      this.logger.warn(
        `Erro ao verificar existência do arquivo no storage`,
        DocumentoStorageService.name,
        {
          storagePath,
          error: error.message,
        },
      );
      return false;
    }
  }
}