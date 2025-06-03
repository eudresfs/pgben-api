import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UnifiedLoggerService } from '../../../shared/logging/unified-logger.service';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Express } from 'express';
import * as multer from 'multer';
import {
  MimeValidationConfig,
  getMimeConfigForBenefit,
  isMimeTypeAllowed,
  isExtensionAllowed,
  getExpectedMimeType,
  DANGEROUS_MIME_TYPES,
} from '../config/mime-validation.config';

/**
 * Resultado da validação MIME
 */
export interface MimeValidationResult {
  isValid: boolean;
  detectedMimeType: string;
  expectedMimeType: string | null;
  fileExtension: string;
  fileSize: number;
  validationErrors: string[];
  securityWarnings: string[];
  fileHash: string;
}

/**
 * Serviço de Validação MIME Avançada
 * 
 * Implementa validação rigorosa de tipos MIME, extensões de arquivo,
 * detecção de ameaças e verificação de integridade para uploads
 */
@Injectable()
export class MimeValidationService {
  private readonly maxRetries: number;
  private readonly enableStrictValidation: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: UnifiedLoggerService,
  ) {
    this.logger.setContext('MimeValidationService');
    this.maxRetries = this.configService.get<number>('MIME_VALIDATION_RETRIES', 3);
    this.enableStrictValidation = this.configService.get<boolean>('ENABLE_STRICT_MIME_VALIDATION', true);
  }

  /**
   * Valida arquivo completo incluindo MIME type, extensão e segurança
   */
  async validateFile(
    file: multer.File,
    tipoBeneficio?: string,
    validationId?: string
  ): Promise<MimeValidationResult> {
    const startTime = Date.now();
    const vId = validationId || crypto.randomUUID().substring(0, 8);
    
    this.logger.info('Iniciando validação MIME completa', {
      validationId: vId,
      filename: file.originalname,
      size: file.size,
      detectedMimeType: file.mimetype,
      tipoBeneficio,
    });

    try {
      const config = getMimeConfigForBenefit(tipoBeneficio);
      const result = await this.performValidation(file, config, vId);
      
      const processingTime = Date.now() - startTime;
      
      this.logger.info('Validação MIME concluída', {
        validationId: vId,
        isValid: result.isValid,
        processingTime,
        errorsCount: result.validationErrors.length,
        warningsCount: result.securityWarnings.length,
      });
      
      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      this.logger.error('Erro durante validação MIME', {
        validationId: vId,
        error: error.message,
        processingTime,
        filename: file.originalname,
      });
      
      throw new BadRequestException(
        `Falha na validação do arquivo: ${error.message}`
      );
    }
  }

  /**
   * Executa a validação completa do arquivo
   */
  private async performValidation(
    file: multer.File,
    config: MimeValidationConfig,
    validationId: string
  ): Promise<MimeValidationResult> {
    const validationErrors: string[] = [];
    const securityWarnings: string[] = [];
    
    // Extrair informações básicas do arquivo
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const detectedMimeType = file.mimetype;
    const expectedMimeType = getExpectedMimeType(file.originalname);
    const fileHash = this.calculateFileHash(file.buffer);
    
    this.logger.debug('Informações do arquivo extraídas', {
      validationId,
      fileExtension,
      detectedMimeType,
      expectedMimeType,
      fileHash: fileHash.substring(0, 16) + '...',
    });

    // 1. Validar tamanho do arquivo
    if (file.size > config.maxFileSize) {
      validationErrors.push(
        `Arquivo muito grande: ${this.formatFileSize(file.size)} (máximo: ${this.formatFileSize(config.maxFileSize)})`
      );
    }

    // 2. Verificar tipos MIME perigosos
    if (DANGEROUS_MIME_TYPES.includes(detectedMimeType as any)) {
      validationErrors.push(
        `Tipo de arquivo perigoso detectado: ${detectedMimeType}`
      );
      securityWarnings.push('Arquivo contém tipo MIME potencialmente malicioso');
    }

    // 3. Validar extensão do arquivo
    if (!isExtensionAllowed(file.originalname, config)) {
      validationErrors.push(
        `Extensão de arquivo não permitida: ${fileExtension}`
      );
    }

    // 4. Validar tipo MIME
    if (!isMimeTypeAllowed(detectedMimeType, config)) {
      validationErrors.push(
        `Tipo MIME não permitido: ${detectedMimeType}`
      );
    }

    // 5. Validação cruzada MIME vs Extensão (se habilitada)
    if (config.strictValidation && expectedMimeType) {
      if (detectedMimeType !== expectedMimeType) {
        const warning = `Inconsistência entre extensão e tipo MIME: esperado ${expectedMimeType}, detectado ${detectedMimeType}`;
        
        if (this.enableStrictValidation) {
          validationErrors.push(warning);
        } else {
          securityWarnings.push(warning);
        }
      }
    }

    // 6. Verificar assinatura do arquivo (magic numbers)
    const magicNumberValidation = this.validateMagicNumbers(file.buffer, detectedMimeType);
    if (!magicNumberValidation.isValid) {
      if (magicNumberValidation.error) {
        if (this.enableStrictValidation) {
          validationErrors.push(magicNumberValidation.error);
        } else {
          securityWarnings.push(magicNumberValidation.error);
        }
      }
    }

    // 7. Verificar nome do arquivo
    const filenameValidation = this.validateFilename(file.originalname);
    if (!filenameValidation.isValid && filenameValidation.error) {
      validationErrors.push(filenameValidation.error);
    }

    const isValid = validationErrors.length === 0;
    
    if (!isValid) {
      this.logger.warn('Arquivo rejeitado na validação', {
        validationId,
        filename: file.originalname,
        errors: validationErrors,
        warnings: securityWarnings,
      });
    }

    return {
      isValid,
      detectedMimeType,
      expectedMimeType,
      fileExtension,
      fileSize: file.size,
      validationErrors,
      securityWarnings,
      fileHash,
    };
  }

  /**
   * Valida magic numbers (assinatura do arquivo)
   */
  private validateMagicNumbers(buffer: Buffer, mimeType: string): { isValid: boolean; error?: string } {
    if (buffer.length < 4) {
      return { isValid: false, error: 'Arquivo muito pequeno para validação' };
    }

    const header = buffer.subarray(0, 8);
    
    // Verificações específicas por tipo MIME
    switch (mimeType) {
      case 'application/pdf':
        if (!header.subarray(0, 4).equals(Buffer.from([0x25, 0x50, 0x44, 0x46]))) { // %PDF
          return { isValid: false, error: 'Arquivo não é um PDF válido' };
        }
        break;
        
      case 'image/jpeg':
      case 'image/jpg':
        if (!header.subarray(0, 2).equals(Buffer.from([0xFF, 0xD8]))) {
          return { isValid: false, error: 'Arquivo não é um JPEG válido' };
        }
        break;
        
      case 'image/png':
        if (!header.equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
          return { isValid: false, error: 'Arquivo não é um PNG válido' };
        }
        break;
        
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        if (!header.subarray(0, 2).equals(Buffer.from([0x50, 0x4B]))) { // PK (ZIP)
          return { isValid: false, error: 'Arquivo Office não é válido' };
        }
        break;
    }

    return { isValid: true };
  }

  /**
   * Valida nome do arquivo
   */
  private validateFilename(filename: string): { isValid: boolean; error?: string } {
    // Verificar caracteres perigosos
    const dangerousChars = /[<>:"|?*\x00-\x1f]/;
    if (dangerousChars.test(filename)) {
      return { isValid: false, error: 'Nome do arquivo contém caracteres inválidos' };
    }

    // Verificar tamanho do nome
    if (filename.length > 255) {
      return { isValid: false, error: 'Nome do arquivo muito longo' };
    }

    // Verificar nomes reservados do Windows
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
    const nameWithoutExt = path.parse(filename).name;
    if (reservedNames.test(nameWithoutExt)) {
      return { isValid: false, error: 'Nome do arquivo é reservado pelo sistema' };
    }

    return { isValid: true };
  }

  /**
   * Calcula hash SHA-256 do arquivo
   */
  private calculateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Formata tamanho do arquivo para exibição
   */
  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Obtém configuração MIME para um tipo de benefício
   */
  getMimeConfig(tipoBeneficio?: string): MimeValidationConfig {
    return getMimeConfigForBenefit(tipoBeneficio);
  }

  /**
   * Verifica se um tipo MIME é permitido
   */
  isMimeTypeAllowed(mimeType: string, tipoBeneficio?: string): boolean {
    const config = getMimeConfigForBenefit(tipoBeneficio);
    return isMimeTypeAllowed(mimeType, config);
  }
}