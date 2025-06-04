import { Injectable } from '@nestjs/common';
import fileType from 'file-type';
import {
  MIME_TYPE_CONFIGS,
  BLOCKED_MIME_TYPES,
  BLOCKED_EXTENSIONS,
  SECURITY_CONFIG,
  isMimeTypePermitido,
  getMaxFileSize,
  requiresEncryption,
  allowsThumbnail,
} from '../config/documento.config';
import * as crypto from 'crypto';

export interface MimeTypeValidationResult {
  isValid: boolean;
  detectedMimeType?: string;
  declaredMimeType?: string;
  fileExtension?: string;
  fileSize?: number;
  securityFlags?: SecurityFlags;
  message?: string;
}

export interface SecurityFlags {
  isSuspicious: boolean;
  hasEmbeddedContent: boolean;
  exceedsMaxSize: boolean;
  hasDangerousExtension: boolean;
  isBlockedMimeType: boolean;
  magicNumberMismatch: boolean;
}

@Injectable()
export class MimeTypeValidator {
  /**
   * Valida o tipo MIME de um arquivo com verificações de segurança avançadas
   */
  async validateMimeType(
    buffer: Buffer,
    declaredMimeType: string,
    originalFilename: string,
    fileSize: number,
  ): Promise<MimeTypeValidationResult> {
    try {
      const fileExtension = this.extractFileExtension(originalFilename);
      const securityFlags: SecurityFlags = {
        isSuspicious: false,
        hasEmbeddedContent: false,
        exceedsMaxSize: false,
        hasDangerousExtension: false,
        isBlockedMimeType: false,
        magicNumberMismatch: false,
      };

      // 1. Verificar extensão perigosa
      if (BLOCKED_EXTENSIONS.includes(fileExtension)) {
        securityFlags.hasDangerousExtension = true;
        return {
          isValid: false,
          declaredMimeType,
          fileExtension,
          fileSize,
          securityFlags,
          message: `Extensão de arquivo não permitida: .${fileExtension}`,
        };
      }

      // 2. Verificar tipo MIME bloqueado
      if (BLOCKED_MIME_TYPES.includes(declaredMimeType)) {
        securityFlags.isBlockedMimeType = true;
        return {
          isValid: false,
          declaredMimeType,
          fileExtension,
          fileSize,
          securityFlags,
          message: `Tipo MIME bloqueado por motivos de segurança: ${declaredMimeType}`,
        };
      }

      // 3. Detectar o tipo real do arquivo usando magic numbers
      const fileTypeResult = await fileType.fromBuffer(buffer);

      if (!fileTypeResult && SECURITY_CONFIG.VERIFY_MAGIC_NUMBERS) {
        // Para alguns tipos como text/plain, file-type pode não detectar
        if (declaredMimeType !== 'text/plain') {
          return {
            isValid: false,
            declaredMimeType,
            fileExtension,
            fileSize,
            securityFlags,
            message: 'Não foi possível verificar a assinatura do arquivo',
          };
        }
      }

      const detectedMimeType = fileTypeResult?.mime || declaredMimeType;

      // 4. Verificar se o tipo detectado está na lista de permitidos
      if (!isMimeTypePermitido(detectedMimeType)) {
        return {
          isValid: false,
          detectedMimeType,
          declaredMimeType,
          fileExtension,
          fileSize,
          securityFlags,
          message: `Tipo de arquivo não permitido: ${detectedMimeType}`,
        };
      }

      // 5. Verificar correspondência entre tipo declarado e detectado
      if (fileTypeResult && declaredMimeType !== detectedMimeType) {
        securityFlags.magicNumberMismatch = true;
        return {
          isValid: false,
          detectedMimeType,
          declaredMimeType,
          fileExtension,
          fileSize,
          securityFlags,
          message: `Tipo declarado (${declaredMimeType}) não corresponde ao tipo real (${detectedMimeType})`,
        };
      }

      // 6. Verificar tamanho do arquivo
      const maxSize = getMaxFileSize(detectedMimeType);
      if (fileSize > maxSize) {
        securityFlags.exceedsMaxSize = true;
        return {
          isValid: false,
          detectedMimeType,
          declaredMimeType,
          fileExtension,
          fileSize,
          securityFlags,
          message: `Arquivo excede o tamanho máximo permitido: ${fileSize} bytes > ${maxSize} bytes`,
        };
      }

      // 7. Verificar tamanho global
      if (fileSize > SECURITY_CONFIG.MAX_FILE_SIZE) {
        securityFlags.exceedsMaxSize = true;
        return {
          isValid: false,
          detectedMimeType,
          declaredMimeType,
          fileExtension,
          fileSize,
          securityFlags,
          message: `Arquivo excede o tamanho máximo global: ${fileSize} bytes > ${SECURITY_CONFIG.MAX_FILE_SIZE} bytes`,
        };
      }

      // 8. Verificações de conteúdo suspeito
      if (SECURITY_CONFIG.SCAN_CONTENT) {
        const contentAnalysis = this.analyzeFileContent(
          buffer,
          detectedMimeType,
        );
        if (contentAnalysis.isSuspicious) {
          securityFlags.isSuspicious = true;
          securityFlags.hasEmbeddedContent = contentAnalysis.hasEmbeddedContent;

          if (SECURITY_CONFIG.QUARANTINE_SUSPICIOUS) {
            return {
              isValid: false,
              detectedMimeType,
              declaredMimeType,
              fileExtension,
              fileSize,
              securityFlags,
              message: `Arquivo contém conteúdo suspeito: ${contentAnalysis.reason}`,
            };
          }
        }
      }

      return {
        isValid: true,
        detectedMimeType,
        declaredMimeType,
        fileExtension,
        fileSize,
        securityFlags,
      };
    } catch (error) {
      return {
        isValid: false,
        declaredMimeType,
        fileExtension: this.extractFileExtension(originalFilename),
        fileSize,
        message: `Erro na validação do tipo MIME: ${error.message}`,
      };
    }
  }

  /**
   * Extrai a extensão do arquivo
   */
  private extractFileExtension(filename: string): string {
    const parts = filename.toLowerCase().split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  /**
   * Analisa o conteúdo do arquivo em busca de padrões suspeitos
   */
  private analyzeFileContent(
    buffer: Buffer,
    mimeType: string,
  ): {
    isSuspicious: boolean;
    hasEmbeddedContent: boolean;
    reason?: string;
  } {
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 1024)); // Primeiros 1KB

    // Padrões suspeitos comuns
    const suspiciousPatterns = [
      /<script[^>]*>/i, // Tags de script
      /javascript:/i, // URLs javascript
      /vbscript:/i, // URLs vbscript
      /on\w+\s*=/i, // Event handlers (onclick, onload, etc.)
      /%3Cscript/i, // Script tags codificados
      /\x00/, // Null bytes
      /\\x[0-9a-f]{2}/i, // Sequências de escape hexadecimal
    ];

    // Verificar padrões suspeitos
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        return {
          isSuspicious: true,
          hasEmbeddedContent: true,
          reason: `Padrão suspeito detectado: ${pattern.source}`,
        };
      }
    }

    // Verificações específicas por tipo MIME
    if (mimeType === 'application/pdf') {
      // PDFs podem conter JavaScript
      if (content.includes('/JavaScript') || content.includes('/JS')) {
        return {
          isSuspicious: true,
          hasEmbeddedContent: true,
          reason: 'PDF contém JavaScript incorporado',
        };
      }
    }

    // Verificar densidade de caracteres não-ASCII (possível ofuscação)
    const nonAsciiCount = (content.match(/[\x80-\xFF]/g) || []).length;
    const nonAsciiRatio = nonAsciiCount / content.length;

    if (nonAsciiRatio > 0.3 && mimeType.startsWith('text/')) {
      return {
        isSuspicious: true,
        hasEmbeddedContent: false,
        reason: 'Alta densidade de caracteres não-ASCII em arquivo de texto',
      };
    }

    return {
      isSuspicious: false,
      hasEmbeddedContent: false,
    };
  }

  /**
   * Gera hash do arquivo para detecção de duplicatas e verificação de integridade
   */
  generateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Verifica se o arquivo requer criptografia
   */
  requiresEncryption(mimeType: string): boolean {
    return requiresEncryption(mimeType);
  }

  /**
   * Verifica se é possível gerar thumbnail
   */
  allowsThumbnail(mimeType: string): boolean {
    return allowsThumbnail(mimeType);
  }
}
