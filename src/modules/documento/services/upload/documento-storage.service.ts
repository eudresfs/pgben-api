import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { join } from 'path';
import { UploadDocumentoDto } from '../../dto/upload-documento.dto';
import { StorageProviderFactory } from '../../factories/storage-provider.factory';
import { LoggingService } from '../../../../shared/logging/logging.service';
import { IDocumentoStorageService } from './interfaces/documento-storage.interface';
import { AuditEventEmitter } from '../../../auditoria/events/emitters/audit-event.emitter';
import { AuditContextHolder } from '../../../../common/interceptors/audit-context.interceptor';
import { AuditEventType } from '../../../auditoria/events/types/audit-event.types';

/**
 * Serviço especializado para operações de storage de documentos
 * Responsável por salvar, organizar e gerenciar arquivos no storage
 */
@Injectable()
export class DocumentoStorageService implements IDocumentoStorageService {
  constructor(
    private readonly storageProviderFactory: StorageProviderFactory,
    private readonly logger: LoggingService,
    private readonly auditEventEmitter: AuditEventEmitter,
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

    const auditContext = this.getAuditContext();
    const startTime = Date.now();

    try {
      const storageProvider = this.storageProviderFactory.getProvider();

      if (!storageProvider) {
        throw new InternalServerErrorException(
          'Nenhum provider de storage configurado',
        );
      }

      const finalPath = await storageProvider.salvarArquivo(
        arquivo.buffer,
        storagePath,
        arquivo.mimetype,
        {
          tipoDocumento: uploadDocumentoDto.tipo,
          cidadaoId: uploadDocumentoDto.cidadao_id,
          solicitacaoId: uploadDocumentoDto.solicitacao_id,
        },
      );
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Registrar auditoria de sucesso
      await this.auditEventEmitter.emitEntityCreated(
        'DocumentoStorage',
        uploadId,
        {
          uploadId,
          cidadaoId: uploadDocumentoDto.cidadao_id,
          tipoDocumento: uploadDocumentoDto.tipo,
          nomeArquivo: arquivo.originalname,
          tamanhoArquivo: arquivo.size,
          mimeType: arquivo.mimetype,
          caminhoStorage: storagePath,
          caminhoFinal: finalPath,
          providerStorage: storageProvider.nome,
          duracaoMs: duration,
          timestamp: new Date().toISOString(),
        },
        auditContext.userId,
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
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Registrar auditoria de erro
      await this.auditEventEmitter.emitSystemEvent(
        AuditEventType.SYSTEM_ERROR,
        {
          uploadId,
          cidadaoId: uploadDocumentoDto.cidadao_id,
          tipoDocumento: uploadDocumentoDto.tipo,
          nomeArquivo: arquivo.originalname,
          tamanhoArquivo: arquivo.size,
          caminhoStorage: storagePath,
          erro: error.message,
          duracaoMs: duration,
          timestamp: new Date().toISOString(),
          sucesso: false,
        },
      );

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

    // Adicionar tipo se fornecido
    if (uploadDocumentoDto.tipo) {
      pathParts.push(uploadDocumentoDto.tipo.toString());
    }

    pathParts.push(fileName);

    return join(...pathParts);
  }

  /**
   * Remove arquivo do storage
   * @param storagePath Caminho do arquivo no storage
   * @param uploadId ID único do upload
   */
  async cleanupFile(storagePath: string, uploadId: string): Promise<void> {
    if (!storagePath) {
      this.logger.warn(
        `Caminho de storage não fornecido para limpeza [${uploadId}]`,
        DocumentoStorageService.name,
      );
      return;
    }

    const auditContext = this.getAuditContext();
    const startTime = Date.now();

    try {
      const storageProvider = this.storageProviderFactory.getProvider();

      if (!storageProvider) {
        this.logger.warn(
          `Nenhum provider de storage configurado para limpeza [${uploadId}]`,
          DocumentoStorageService.name,
        );
        return;
      }

      // Verificar se arquivo existe antes de tentar remover
      const exists = await storageProvider.exists(storagePath);
      if (!exists) {
        this.logger.debug(
          `Arquivo não existe no storage, pulando limpeza [${uploadId}]`,
          DocumentoStorageService.name,
          {
            uploadId,
            storagePath,
          },
        );
        return;
      }

      await storageProvider.delete(storagePath);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Registrar auditoria de sucesso na limpeza
      await this.auditEventEmitter.emitEntityDeleted(
        'DocumentoStorage',
        uploadId,
        {
          uploadId,
          caminhoStorage: storagePath,
          providerStorage: storageProvider.nome,
          duracaoMs: duration,
          timestamp: new Date().toISOString(),
        },
        auditContext.userId,
      );

      this.logger.debug(
        `Arquivo removido do storage com sucesso [${uploadId}]`,
        DocumentoStorageService.name,
        {
          uploadId,
          storagePath,
        },
      );
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Registrar auditoria de erro na limpeza
      await this.auditEventEmitter.emitSystemEvent(
        AuditEventType.SYSTEM_ERROR,
        {
          uploadId,
          caminhoStorage: storagePath,
          erro: error.message,
          duracaoMs: duration,
          timestamp: new Date().toISOString(),
          action: 'ERRO_REMOVER_ARQUIVO_STORAGE',
          sucesso: false,
        },
      );

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

  /**
   * Obtém o contexto de auditoria atual
   * @returns Contexto de auditoria com userAgent, IP e userId
   */
  private getAuditContext() {
    const context = AuditContextHolder.get();
    return {
      userAgent: context?.userAgent || 'unknown',
      ipAddress: context?.ip || 'unknown',
      userId: context?.userId || null,
    };
  }
}
