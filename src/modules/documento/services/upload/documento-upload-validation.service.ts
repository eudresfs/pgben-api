import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { UploadDocumentoDto } from '../../dto/upload-documento.dto';
import { StorageProviderFactory } from '../../factories/storage-provider.factory';
import { LoggingService } from '../../../../shared/logging/logging.service';
import {
  IDocumentoUploadValidationService,
  UploadValidationResult,
} from './interfaces/documento-upload-validation.interface';
import { AuditEventEmitter } from '../../../auditoria/events/emitters/audit-event.emitter';
import { AuditContextHolder } from '../../../../common/interceptors/audit-context.interceptor';
import { AuditEventType } from '../../../auditoria/events/types/audit-event.types';

/**
 * Serviço especializado para validação de uploads de documentos
 * Responsável por validar configurações e dados de entrada
 */
@Injectable()
export class DocumentoUploadValidationService
  implements IDocumentoUploadValidationService
{
  constructor(
    private readonly storageProviderFactory: StorageProviderFactory,
    private readonly logger: LoggingService,
    private readonly auditEventEmitter: AuditEventEmitter,
  ) {}

  /**
   * Valida as configurações necessárias para upload
   * @throws {InternalServerErrorException} Se configurações estão inválidas
   */
  validateConfiguration(): void {
    const storageProvider = this.storageProviderFactory.getProvider();
    const isValid = !!storageProvider;
    
    // Auditoria - Validação de configuração
    const auditContext = this.getAuditContext('system');
    this.auditEventEmitter.emitSecurityEvent(
      AuditEventType.SUSPICIOUS_ACTIVITY,
      auditContext.userId,
      {
        action: 'VALIDACAO_CONFIGURACAO_STORAGE',
        severity: isValid ? 'info' : 'error',
        description: `Validação de configuração de storage ${isValid ? 'bem-sucedida' : 'falhou'}`,
        userAgent: auditContext.userAgent,
        ip: auditContext.ipAddress,
        additionalContext: {
          storageProviderConfigured: isValid,
          providerName: storageProvider?.nome || 'não configurado',
          validationTimestamp: new Date().toISOString(),
        },
      }
    );
    
    if (!storageProvider) {
      throw new InternalServerErrorException(
        'Provedor de storage não configurado',
      );
    }

    this.logger.debug(
      `Usando provedor de storage: ${storageProvider.nome}`,
      DocumentoUploadValidationService.name,
    );
  }

  /**
   * Valida os dados de entrada do upload
   * @param arquivo Arquivo a ser validado
   * @param uploadDocumentoDto DTO com dados do upload
   * @param usuarioId ID do usuário que está fazendo upload
   * @returns Resultado da validação com ID único do upload
   */
  validateInput(
    arquivo: any,
    uploadDocumentoDto: UploadDocumentoDto,
    usuarioId: string,
  ): UploadValidationResult {
    const uploadId = uuidv4();
    const errors: string[] = [];

    // Validar arquivo
    if (!arquivo || !arquivo.buffer || arquivo.buffer.length === 0) {
      errors.push('Arquivo não fornecido ou vazio');
    }

    // Validar dados obrigatórios
    if (!uploadDocumentoDto.cidadao_id) {
      errors.push('ID do cidadão é obrigatório');
    }

    if (!usuarioId) {
      errors.push('ID do usuário é obrigatório');
    }

    if (!uploadDocumentoDto.tipo) {
      errors.push('Tipo do documento é obrigatório');
    }

    // Validar tamanho do arquivo
    if (arquivo && arquivo.size > 50 * 1024 * 1024) {
      // 50MB
      errors.push('Arquivo muito grande (máximo 50MB)');
    }

    // Validar nome do arquivo
    if (arquivo && arquivo.originalname) {
      const fileName = arquivo.originalname.toLowerCase();
      const allowedExtensions = [
        '.pdf',
        '.jpg',
        '.jpeg',
        '.png',
        '.doc',
        '.docx',
      ];
      const hasValidExtension = allowedExtensions.some((ext) =>
        fileName.endsWith(ext),
      );

      if (!hasValidExtension) {
        errors.push(
          `Tipo de arquivo não permitido. Extensões aceitas: ${allowedExtensions.join(', ')}`,
        );
      }
    }

    const isValid = errors.length === 0;

    // Auditoria - Validação de upload
    const auditContext = this.getAuditContext(usuarioId);
    this.auditEventEmitter.emitSecurityEvent(
      AuditEventType.SUSPICIOUS_ACTIVITY,
      auditContext.userId,
      {
        action: 'VALIDACAO_UPLOAD_DOCUMENTO',
        severity: isValid ? 'info' : 'warning',
        description: `Validação de upload ${isValid ? 'bem-sucedida' : 'falhou'}`,
        userAgent: auditContext.userAgent,
        ip: auditContext.ipAddress,
        additionalContext: {
          uploadId,
          isValid,
          errors: errors.length > 0 ? errors : undefined,
          arquivo: arquivo
            ? {
                nome: arquivo.originalname,
                tamanho: arquivo.size,
                mimetype: arquivo.mimetype,
              }
            : undefined,
          tipo: uploadDocumentoDto.tipo,
          cidadaoId: uploadDocumentoDto.cidadao_id,
          extensoes_permitidas: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'],
          tamanho_maximo: '50MB',
        },
      }
    );

    this.logger.debug(
      `Validação de entrada [${uploadId}]: ${isValid ? 'VÁLIDA' : 'INVÁLIDA'}`,
      DocumentoUploadValidationService.name,
      {
        uploadId,
        isValid,
        errors: errors.length > 0 ? errors : undefined,
        arquivo: arquivo
          ? {
              nome: arquivo.originalname,
              tamanho: arquivo.size,
              mimetype: arquivo.mimetype,
            }
          : undefined,
        tipo: uploadDocumentoDto.tipo,
        cidadaoId: uploadDocumentoDto.cidadao_id,
      },
    );

    return {
      isValid,
      errors,
      uploadId,
    };
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
