import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Injectable, Logger } from '@nestjs/common';
import * as fileType from 'file-type';
import {
  TODOS_MIME_TYPES_PERMITIDOS,
  getCategoriaMimeType,
  getExtensoesParaMimeType,
} from '../constants/mime-types.constant';

/**
 * Interface para o resultado da validação de tipo MIME
 */
export interface MimeTypeValidationResult {
  isValid: boolean;
  message: string;
  detectedMimeType: string;
  detectedExtension: string;
  category?: string;
}

/**
 * Validador personalizado para tipos MIME
 *
 * Verifica se o tipo MIME de um arquivo está na lista de tipos permitidos
 * e se o conteúdo real do arquivo corresponde ao tipo MIME declarado
 */
@ValidatorConstraint({ name: 'mimeTypeValidator', async: true })
@Injectable()
export class MimeTypeValidator implements ValidatorConstraintInterface {
  private readonly logger = new Logger(MimeTypeValidator.name);
  /**
   * Valida o tipo MIME de um arquivo
   * @param buffer Buffer do arquivo a ser validado
   * @param declaredMimeType Tipo MIME declarado
   * @returns Objeto com o resultado da validação
   */
  /**
   * Método interno para validação de tipo MIME
   * @param buffer Buffer do arquivo a ser validado
   * @param declaredMimeType Tipo MIME declarado
   * @returns Objeto com o resultado da validação
   */
  async validateMimeType(
    buffer: Buffer,
    declaredMimeType: string,
  ): Promise<MimeTypeValidationResult> {
    if (!buffer) {
      return {
        isValid: false,
        message: 'Arquivo não fornecido',
        detectedMimeType: '',
        detectedExtension: '',
      };
    }

    // Verificar se o tipo MIME declarado está na lista de tipos permitidos
    if (!TODOS_MIME_TYPES_PERMITIDOS.includes(declaredMimeType)) {
      return {
        isValid: false,
        message: `Tipo de arquivo não permitido: ${declaredMimeType}. Tipos permitidos: ${this.getPermittedTypesMessage()}`,
        detectedMimeType: declaredMimeType,
        detectedExtension: '',
      };
    }

    // Verificar o conteúdo real do arquivo
    try {
      const sampleBuffer = buffer.slice(0, 4100); // Usar apenas os primeiros bytes para detecção
      const detectedType = await fileType.fileTypeFromBuffer(sampleBuffer);

      // Se não foi possível detectar o tipo, verificar se é um tipo de texto
      if (!detectedType) {
        // Para arquivos de texto, que podem não ser detectados corretamente
        if (declaredMimeType.startsWith('text/')) {
          // Verificar se o conteúdo parece ser texto
          const isText = this.isTextFile(sampleBuffer);
          if (isText) {
            return {
              isValid: true,
              message: 'Arquivo de texto válido',
              detectedMimeType: declaredMimeType,
              detectedExtension:
                getExtensoesParaMimeType(declaredMimeType)[0] || '',
              category: getCategoriaMimeType(declaredMimeType),
            };
          }
        }

        return {
          isValid: false,
          message: 'Não foi possível detectar o tipo de arquivo',
          detectedMimeType: 'application/octet-stream',
          detectedExtension: '.bin',
        };
      }

      // Verificar se o tipo detectado está na lista de tipos permitidos
      const isDetectedTypeAllowed = TODOS_MIME_TYPES_PERMITIDOS.includes(
        detectedType.mime,
      );

      if (!isDetectedTypeAllowed) {
        return {
          isValid: false,
          message: `Tipo de arquivo detectado não permitido: ${detectedType.mime}`,
          detectedMimeType: detectedType.mime,
          detectedExtension: `.${detectedType.ext}`,
        };
      }

      // Verificar se o tipo detectado corresponde ao tipo declarado
      const isTypeMatching = detectedType.mime === declaredMimeType;

      // Para alguns tipos relacionados, podemos considerar válido mesmo se não for exatamente o mesmo
      const isRelatedType = this.areRelatedTypes(
        detectedType.mime,
        declaredMimeType,
      );

      if (isTypeMatching || isRelatedType) {
        return {
          isValid: true,
          message: isTypeMatching
            ? 'Tipo MIME válido'
            : 'Tipo MIME relacionado válido',
          detectedMimeType: detectedType.mime,
          detectedExtension: `.${detectedType.ext}`,
          category: getCategoriaMimeType(detectedType.mime),
        };
      }

      return {
        isValid: false,
        message: `O tipo de arquivo detectado (${detectedType.mime}) não corresponde ao tipo declarado (${declaredMimeType})`,
        detectedMimeType: detectedType.mime,
        detectedExtension: `.${detectedType.ext}`,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao validar tipo MIME: ${error.message}`,
        error.stack,
      );
      return {
        isValid: false,
        message: `Erro ao validar tipo MIME: ${error.message}`,
        detectedMimeType: '',
        detectedExtension: '',
      };
    }
  }

  /**
   * Implementação da interface ValidatorConstraintInterface
   * @param value Valor a ser validado (deve ser um objeto Express.Multer.File)
   * @param args Argumentos de validação
   * @returns true se o tipo MIME é válido, false caso contrário
   */
  async validate(value: any, args?: ValidationArguments): Promise<boolean> {
    try {
      if (!value || !value.buffer || !value.mimetype) {
        return false;
      }

      const result = await this.validateMimeType(value.buffer, value.mimetype);
      return result.isValid;
    } catch (error) {
      this.logger.error(
        `Erro ao validar tipo MIME: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Mensagem de erro personalizada
   * @param args Argumentos de validação
   * @returns Mensagem de erro
   */
  defaultMessage(args: ValidationArguments): string {
    const file = args.value as Express.Multer.File;

    if (!file) {
      return 'Arquivo não fornecido';
    }

    if (!TODOS_MIME_TYPES_PERMITIDOS.includes(file.mimetype)) {
      return `Tipo de arquivo não permitido: ${file.mimetype}. Tipos permitidos: ${this.getPermittedTypesMessage()}`;
    }

    return 'O conteúdo do arquivo não corresponde ao tipo MIME declarado ou não é um tipo permitido';
  }

  /**
   * Verifica se dois tipos MIME são relacionados
   * @param detectedType Tipo MIME detectado
   * @param declaredType Tipo MIME declarado
   * @returns true se os tipos são relacionados, false caso contrário
   */
  private areRelatedTypes(detectedType: string, declaredType: string): boolean {
    // Relações conhecidas entre tipos MIME
    const relatedTypes: Record<string, string[]> = {
      'application/pdf': ['application/x-pdf'],
      'image/jpeg': ['image/jpg', 'image/pjpeg'],
      'image/png': ['image/x-png'],
      'application/msword': ['application/vnd.ms-word'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        ['application/msword'],
      'application/vnd.ms-excel': ['application/excel', 'application/x-excel'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
        'application/vnd.ms-excel',
      ],
      'text/plain': ['text/x-plain'],
    };

    // Verificar se o tipo detectado é relacionado ao tipo declarado
    if (
      relatedTypes[declaredType] &&
      relatedTypes[declaredType].includes(detectedType)
    ) {
      return true;
    }

    // Verificar a relação inversa
    for (const [type, related] of Object.entries(relatedTypes)) {
      if (type === detectedType && related.includes(declaredType)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Verifica se um buffer contém texto
   * @param buffer Buffer a ser verificado
   * @returns true se o buffer parece conter texto, false caso contrário
   */
  private isTextFile(buffer: Buffer): boolean {
    // Verificar se o buffer contém caracteres não imprimíveis (exceto quebras de linha, tabs, etc.)
    for (let i = 0; i < buffer.length; i++) {
      const byte = buffer[i];
      // Permitir caracteres ASCII imprimíveis e alguns caracteres de controle comuns
      if (byte < 9 || (byte > 13 && byte < 32) || byte > 126) {
        return false;
      }
    }
    return true;
  }

  /**
   * Obtém uma mensagem com os tipos MIME permitidos agrupados por categoria
   * @returns Mensagem formatada com os tipos permitidos
   */
  private getPermittedTypesMessage(): string {
    const categories = Object.keys(getCategoriaMimeType);
    return categories
      .map(
        (category) =>
          `${category}: ${TODOS_MIME_TYPES_PERMITIDOS.filter((mime) => getCategoriaMimeType(mime) === category).join(', ')}`,
      )
      .join('; ');
  }
}
