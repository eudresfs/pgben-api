import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { UploadDocumentoDto } from '../../dto/upload-documento.dto';
import { Documento } from '@/entities/documento.entity';
import { FileProcessingResult } from './interfaces/documento-file-processing.interface';
import { UploadMetadata } from './interfaces/documento-metadata.interface';
import { LoggingService } from '../../../../shared/logging/logging.service';
import { IDocumentoPersistenceService } from './interfaces/documento-persistence.interface';
import { DocumentoUrlService } from '../documento-url.service';
import { AuditEventEmitter } from '../../../auditoria/events/emitters/audit-event.emitter';
import { AuditContextHolder } from '../../../../common/interceptors/audit-context.interceptor';
import { AuditEventType } from '../../../auditoria/events/types/audit-event.types';

/**
 * Serviço especializado para persistência de documentos
 * Responsável por salvar documentos no banco de dados e gerenciar relações
 */
@Injectable()
export class DocumentoPersistenceService
  implements IDocumentoPersistenceService
{
  constructor(
    @InjectRepository(Documento)
    private readonly documentoRepository: Repository<Documento>,
    private readonly logger: LoggingService,
    private readonly documentoUrlService: DocumentoUrlService,
    private readonly auditEventEmitter: AuditEventEmitter,
  ) {}

  /**
   * Salva documento no banco de dados
   * @param arquivo Arquivo original
   * @param uploadDocumentoDto DTO com dados do upload
   * @param usuarioId ID do usuário
   * @param fileProcessing Resultado do processamento do arquivo
   * @param storagePath Caminho no storage
   * @param metadata Metadados do upload
   * @param uploadId ID único do upload
   * @returns Documento salvo com relações
   */
  @Transactional()
  async saveDocument(
    arquivo: any,
    uploadDocumentoDto: UploadDocumentoDto,
    usuarioId: string,
    fileProcessing: FileProcessingResult,
    storagePath: string,
    metadata: UploadMetadata,
    uploadId: string,
  ): Promise<Documento> {
    const startTime = Date.now();
    const auditContext = this.getAuditContext();

    this.logger.debug(
      `Salvando documento no banco de dados [${uploadId}]`,
      DocumentoPersistenceService.name,
      {
        uploadId,
        cidadaoId: uploadDocumentoDto.cidadao_id,
        tipoId: uploadDocumentoDto.tipo,
        usuarioId,
        storagePath,
        fileHash: fileProcessing.fileHash,
      },
    );

    try {
      // Criar entidade do documento
      const documento = this.documentoRepository.create({
        cidadao_id: uploadDocumentoDto.cidadao_id,
        solicitacao_id: uploadDocumentoDto.solicitacao_id,
        tipo: uploadDocumentoDto.tipo,
        usuario_upload_id: usuarioId,
        nome_arquivo: fileProcessing.fileName,
        nome_original: fileProcessing.originalName,
        caminho: storagePath,
        tamanho: fileProcessing.size,
        mimetype: fileProcessing.mimetype,
        hash_arquivo: fileProcessing.fileHash,
        descricao: uploadDocumentoDto.descricao,
        upload_session_id: uploadDocumentoDto.upload_session_id,
        metadados: metadata as any,
        data_upload: new Date(),
      });

      // Validar dados antes de salvar
      if (!this.validateDocumentData(documento)) {
        throw new Error('Dados do documento são inválidos');
      }

      // Salvar documento
      const savedDocument = (await this.documentoRepository.save(
        documento,
      )) as unknown as Documento;

      // Gerar URL pública após salvar o documento
      try {
        const urlPublica = await this.documentoUrlService.generatePublicUrl(
          savedDocument.id,
        );

        // Atualizar documento com a URL pública
        await this.documentoRepository.update(savedDocument.id, {
          url_publica: urlPublica,
        });

        // Atualizar o objeto em memória
        savedDocument.url_publica = urlPublica;

        this.logger.debug(
          `URL pública gerada e salva [${uploadId}]`,
          DocumentoPersistenceService.name,
          {
            uploadId,
            documentoId: savedDocument.id,
            urlPublica,
          },
        );
      } catch (urlError) {
        this.logger.warn(
          `Erro ao gerar URL pública [${uploadId}] - documento salvo sem URL`,
          DocumentoPersistenceService.name,
          {
            uploadId,
            documentoId: savedDocument.id,
            error: urlError.message,
          },
        );
        // Não falha o upload se a URL pública não puder ser gerada
      }

      this.logger.debug(
        `Documento salvo com sucesso [${uploadId}]`,
        DocumentoPersistenceService.name,
        {
          uploadId,
          documentoId: savedDocument.id,
          cidadaoId: savedDocument.cidadao_id,
          tipoId: savedDocument.tipo,
          hasUrlPublica: !!savedDocument.url_publica,
        },
      );

      // Carregar relações
      const documentWithRelations = await this.loadDocumentRelations(
        savedDocument,
        uploadDocumentoDto,
      );

      // Registrar evento de auditoria de sucesso
      await this.auditEventEmitter.emitSecurityEvent(
        AuditEventType.SUSPICIOUS_ACTIVITY,
        auditContext.userId,
        {
          action: 'DOCUMENTO_PERSISTIDO_BANCO',
          severity: 'INFO',
          description: 'Documento persistido com sucesso no banco de dados',
          userAgent: auditContext.userAgent,
          ip: auditContext.ipAddress,
          details: {
            uploadId,
            documentoId: savedDocument.id,
            cidadaoId: uploadDocumentoDto.cidadao_id,
            solicitacaoId: uploadDocumentoDto.solicitacao_id,
            tipoDocumento: uploadDocumentoDto.tipo,
            usuarioUploadId: usuarioId,
            nomeArquivo: fileProcessing.fileName,
            nomeOriginal: fileProcessing.originalName,
            tamanhoBytes: fileProcessing.size,
            mimeType: fileProcessing.mimetype,
            hashArquivo: fileProcessing.fileHash,
            caminhoStorage: storagePath,
            urlPublica: savedDocument.url_publica,
            uploadSessionId: uploadDocumentoDto.upload_session_id,
            metadados: metadata,
            duracaoMs: Date.now() - startTime,
            timestampPersistencia: new Date().toISOString(),
          },
        }
      );

      return documentWithRelations;
    } catch (error) {
      // Registrar evento de auditoria de erro
      await this.auditEventEmitter.emitSecurityEvent(
        AuditEventType.SUSPICIOUS_ACTIVITY,
        auditContext.userId,
        {
          action: 'ERRO_PERSISTIR_DOCUMENTO_BANCO',
          severity: 'ERROR',
          description: 'Erro ao persistir documento no banco de dados',
          userAgent: auditContext.userAgent,
          ip: auditContext.ipAddress,
          details: {
            uploadId,
            cidadaoId: uploadDocumentoDto.cidadao_id,
            solicitacaoId: uploadDocumentoDto.solicitacao_id,
            tipoDocumento: uploadDocumentoDto.tipo,
            usuarioUploadId: usuarioId,
            nomeArquivo: fileProcessing.fileName,
            nomeOriginal: fileProcessing.originalName,
            tamanhoBytes: fileProcessing.size,
            mimeType: fileProcessing.mimetype,
            hashArquivo: fileProcessing.fileHash,
            caminhoStorage: storagePath,
            uploadSessionId: uploadDocumentoDto.upload_session_id,
            erro: error.message,
            stackTrace: error.stack,
            duracaoMs: Date.now() - startTime,
            timestampErro: new Date().toISOString(),
          },
        }
      );

      this.logger.error(
        `Erro ao salvar documento no banco de dados [${uploadId}]`,
        error.stack,
        DocumentoPersistenceService.name,
        {
          uploadId,
          error: error.message,
          cidadaoId: uploadDocumentoDto.cidadao_id,
          tipoId: uploadDocumentoDto.tipo,
        },
      );
      throw error;
    }
  }

  /**
   * Cria relações do documento com outras entidades
   * @param documento Documento base
   * @param uploadDocumentoDto DTO com dados do upload
   * @returns Documento com relações carregadas
   */
  async loadDocumentRelations(
    documento: Documento,
    uploadDocumentoDto: UploadDocumentoDto,
  ): Promise<Documento> {
    this.logger.debug(
      `Carregando relações do documento [${documento.id}]`,
      DocumentoPersistenceService.name,
      {
        documentoId: documento.id,
        cidadaoId: documento.cidadao_id,
        tipoId: documento.tipo,
      },
    );

    try {
      const documentWithRelations = await this.documentoRepository
        .createQueryBuilder('documento')
        .leftJoinAndSelect('documento.cidadao', 'cidadao')
        .leftJoinAndSelect('documento.usuario_upload', 'usuario_upload')
        .where('documento.id = :id', { id: documento.id })
        .getOne();

      if (!documentWithRelations) {
        throw new Error(
          `Documento não encontrado após salvamento: ${documento.id}`,
        );
      }

      this.logger.debug(
        `Relações carregadas com sucesso [${documento.id}]`,
        DocumentoPersistenceService.name,
        {
          documentoId: documento.id,
          hasCidadao: !!documentWithRelations.cidadao,
          hasTipo: !!documentWithRelations.tipo,
          hasUsuario: !!documentWithRelations.usuario_upload_id,
        },
      );

      return documentWithRelations;
    } catch (error) {
      this.logger.error(
        `Erro ao carregar relações do documento [${documento.id}]`,
        error.stack,
        DocumentoPersistenceService.name,
        {
          documentoId: documento.id,
          error: error.message,
        },
      );
      throw error;
    }
  }

  /**
   * Valida dados antes da persistência
   * @param documentData Dados do documento
   * @returns True se válidos
   */
  validateDocumentData(documentData: Partial<Documento>): boolean {
    const errors: string[] = [];

    // Validar campos obrigatórios
    if (!documentData.cidadao_id) {
      errors.push('cidadao_id é obrigatório');
    }

    if (!documentData.usuario_upload_id) {
      errors.push('usuario_upload_id é obrigatório');
    }

    if (!documentData.nome_arquivo) {
      errors.push('nome_arquivo é obrigatório');
    }

    if (!documentData.nome_arquivo) {
      errors.push('nome_arquivo é obrigatório');
    }

    if (!documentData.caminho) {
      errors.push('caminho é obrigatório');
    }

    if (!documentData.hash_arquivo) {
      errors.push('hash_arquivo é obrigatório');
    }

    if (!documentData.tamanho || documentData.tamanho <= 0) {
      errors.push('tamanho deve ser maior que zero');
    }

    // Validar formato do hash
    if (
      documentData.hash_arquivo &&
      !/^[a-f0-9]{64}$/i.test(documentData.hash_arquivo)
    ) {
      errors.push('hash_arquivo deve ser um SHA-256 válido');
    }

    // Validar tipo MIME
    if (documentData.mimetype && !documentData.mimetype.includes('/')) {
      errors.push('mimetype deve ter formato válido (tipo/subtipo)');
    }

    const isValid = errors.length === 0;

    if (!isValid) {
      this.logger.warn(
        `Dados do documento são inválidos`,
        DocumentoPersistenceService.name,
        {
          errors,
          documentData: {
            cidadaoId: documentData.cidadao_id,
            usuarioId: documentData.usuario_upload_id,
            nomeArquivo: documentData.nome_arquivo,
            hash_arquivo: documentData.hash_arquivo,
          },
        },
      );
    }

    return isValid;
  }

  /**
   * Obtém o contexto de auditoria atual
   * @returns Contexto de auditoria com informações do usuário e requisição
   */
  private getAuditContext() {
    const context = AuditContextHolder.get();
    return {
      userAgent: context?.userAgent || 'unknown',
      ipAddress: context?.ip || 'unknown',
      userId: context?.userId || 'system',
    };
  }
}
