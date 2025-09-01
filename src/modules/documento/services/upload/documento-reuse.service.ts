import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadDocumentoDto } from '../../dto/upload-documento.dto';
import { Documento } from '@/entities/documento.entity';
import { LoggingService } from '../../../../shared/logging/logging.service';
import {
  IDocumentoReuseService,
  DocumentReusabilityCheck,
} from './interfaces/documento-reuse.interface';
import { AuditEventEmitter } from '../../../auditoria/events/emitters/audit-event.emitter';
import { AuditContextHolder } from '../../../../common/interceptors/audit-context.interceptor';
import { AuditEventType } from '../../../auditoria/events/types/audit-event.types';
import { SYSTEM_USER_UUID } from '../../../../shared/constants/system.constants';

/**
 * Serviço especializado para verificação de reutilização de documentos
 * Responsável por identificar documentos existentes que podem ser reutilizados
 */
@Injectable()
export class DocumentoReuseService implements IDocumentoReuseService {
  constructor(
    @InjectRepository(Documento)
    private readonly documentoRepository: Repository<Documento>,
    private readonly logger: LoggingService,
    private readonly auditEventEmitter: AuditEventEmitter,
  ) {}

  /**
   * Verifica se um documento pode ser reutilizado
   * @param uploadDocumentoDto DTO com dados do upload
   * @param fileHash Hash do arquivo
   * @param uploadId ID único do upload
   * @returns Resultado da verificação de reutilização
   */
  async checkReusability(
    uploadDocumentoDto: UploadDocumentoDto,
    fileHash: string,
    uploadId: string,
  ): Promise<DocumentReusabilityCheck> {
    this.logger.debug(
      `Verificando reutilização de documento [${uploadId}]`,
      DocumentoReuseService.name,
      {
        uploadId,
        fileHash,
        cidadaoId: uploadDocumentoDto.cidadao_id,
        tipo: uploadDocumentoDto.tipo,
      },
    );

    // Buscar documento existente
    const existingDocument = await this.findExistingDocument(
      fileHash,
      uploadDocumentoDto,
    );

    if (!existingDocument) {
      this.logger.debug(
        `Nenhum documento reutilizável encontrado [${uploadId}]`,
        DocumentoReuseService.name,
        { uploadId, fileHash },
      );

      return {
        canReuse: false,
        reason: 'Nenhum documento existente encontrado com o mesmo hash',
      };
    }

    // Verificar se pode ser reutilizado
    const canReuse = this.canReuseDocument(
      existingDocument,
      uploadDocumentoDto,
    );

    const result: DocumentReusabilityCheck = {
      canReuse,
      existingDocument: canReuse ? existingDocument : undefined,
      reason: canReuse
        ? 'Documento existente pode ser reutilizado'
        : 'Documento existente não atende aos critérios de reutilização',
    };

    // Auditoria - Verificação de reutilização
    const auditContext = this.getAuditContext(SYSTEM_USER_UUID);
    this.auditEventEmitter.emitSecurityEvent(
      AuditEventType.SUSPICIOUS_ACTIVITY,
      auditContext.userId,
      {
        action: 'VERIFICACAO_REUTILIZACAO_DOCUMENTO',
        severity: canReuse ? 'info' : 'warning',
        description: `Verificação de reutilização ${canReuse ? 'bem-sucedida' : 'sem resultado'}`,
        userAgent: auditContext.userAgent,
        ip: auditContext.ipAddress,
        additionalContext: {
          uploadId,
          fileHash,
          canReuse,
          existingDocumentId: existingDocument?.id,
          existingDocumentInfo: existingDocument ? {
            nomeOriginal: existingDocument.nome_original,
            mimetype: existingDocument.mimetype,
            tamanho: existingDocument.tamanho,
            tipo: existingDocument.tipo,
            verificado: existingDocument.verificado,
            dataUpload: existingDocument.created_at,
          } : undefined,
          cidadaoId: uploadDocumentoDto.cidadao_id,
          tipoSolicitado: uploadDocumentoDto.tipo,
          reason: result.reason,
          criteriosVerificados: {
            mesmoHash: !!existingDocument,
            mesmoCidadao: existingDocument?.cidadao_id === uploadDocumentoDto.cidadao_id,
            mesmoTipo: !uploadDocumentoDto.tipo || existingDocument?.tipo === uploadDocumentoDto.tipo,
            documentoAtivo: !existingDocument?.removed_at,
            arquivoIntegro: !!(existingDocument?.caminho && existingDocument?.hash_arquivo),
          },
        },
      }
    );

    this.logger.debug(
      `Verificação de reutilização concluída [${uploadId}]`,
      DocumentoReuseService.name,
      {
        uploadId,
        canReuse,
        existingDocumentId: existingDocument.id,
        reason: result.reason,
      },
    );

    return result;
  }

  /**
   * Busca documento existente por hash e critérios
   * @param fileHash Hash do arquivo
   * @param uploadDocumentoDto DTO com dados do upload
   * @returns Documento existente se encontrado
   */
  async findExistingDocument(
    fileHash: string,
    uploadDocumentoDto: UploadDocumentoDto,
  ): Promise<Documento | null> {
    const queryBuilder = this.documentoRepository
      .createQueryBuilder('documento')
      .leftJoinAndSelect('documento.cidadao', 'cidadao')
      .leftJoinAndSelect('documento.usuario_upload', 'usuario_upload')
      .where('documento.hash_arquivo = :hash', { hash: fileHash })
      .andWhere('documento.cidadao_id = :cidadaoId', {
        cidadaoId: uploadDocumentoDto.cidadao_id,
      });

    // Se tipo foi especificado, filtrar por tipo
    if (uploadDocumentoDto.tipo) {
      queryBuilder.andWhere('documento.tipo = :tipo', {
        tipo: uploadDocumentoDto.tipo,
      });
    }

    // Buscar apenas documentos não removidos
    queryBuilder.andWhere('documento.removed_at IS NULL');

    return await queryBuilder.getOne();
  }

  /**
   * Verifica se um documento existente pode ser reutilizado
   * @param existingDocument Documento existente
   * @param uploadDocumentoDto DTO com dados do upload
   * @returns True se pode ser reutilizado
   */
  private canReuseDocument(
    existingDocument: Documento,
    uploadDocumentoDto: UploadDocumentoDto,
  ): boolean {
    // Verificar se documento está ativo (não foi removido)
    if (existingDocument.removed_at) {
      return false;
    }

    // Verificar se é do mesmo cidadão
    if (existingDocument.cidadao_id !== uploadDocumentoDto.cidadao_id) {
      return false;
    }

    // Verificar se é do mesmo tipo (se especificado)
    if (
      uploadDocumentoDto.tipo &&
      existingDocument.tipo !== uploadDocumentoDto.tipo
    ) {
      return false;
    }

    // Verificar se não está corrompido ou com problemas
    if (!existingDocument.caminho || !existingDocument.hash_arquivo) {
      return false;
    }

    return true;
  }

  /**
   * Obtém o contexto de auditoria (userAgent, IP, userId)
   * @param userId ID do usuário
   * @returns Contexto de auditoria
   */
  private getAuditContext(userId: string) {
    const context = AuditContextHolder.get();
    return {
      userAgent: context?.userAgent || 'unknown',
      ipAddress: context?.ip || 'unknown',
      userId: userId || context?.userId || 'unknown',
    };
  }
}
