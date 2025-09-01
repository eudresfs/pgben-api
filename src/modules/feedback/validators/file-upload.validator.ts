import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { Request } from 'express';
import * as multer from 'multer';
import * as path from 'path';

/**
 * Configurações de validação de upload
 */
export interface FileUploadValidationConfig {
  maxFileSize: number;
  maxFiles: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
}

/**
 * Configuração padrão para upload de arquivos
 */
export const DEFAULT_UPLOAD_CONFIG: FileUploadValidationConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  allowedMimeTypes: [
    // Imagens
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Documentos
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/rtf',
    // Vídeos
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo', // .avi
    'video/x-ms-wmv', // .wmv
    // Áudio
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/mp4',
    'audio/x-m4a'
  ],
  allowedExtensions: [
    // Imagens
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
    // Documentos
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.txt', '.csv', '.rtf',
    // Vídeos
    '.mp4', '.webm', '.mov', '.avi', '.wmv',
    // Áudio
    '.mp3', '.wav', '.ogg', '.m4a'
  ]
};

/**
 * Classe para validação de uploads de arquivo
 */
export class FileUploadValidator {
  private config: FileUploadValidationConfig;

  constructor(config: Partial<FileUploadValidationConfig> = {}) {
    this.config = { ...DEFAULT_UPLOAD_CONFIG, ...config };
  }

  /**
   * Valida um único arquivo
   */
  validateFile(
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void
  ): void {
    try {
      // Validar tamanho
      if (file.size > this.config.maxFileSize) {
        throw new BadRequestException(
          `Arquivo muito grande. Tamanho máximo: ${this.formatFileSize(this.config.maxFileSize)}`
        );
      }

      // Validar tipo MIME
      if (!this.config.allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          `Tipo de arquivo não permitido: ${file.mimetype}. Tipos permitidos: ${this.config.allowedMimeTypes.join(', ')}`
        );
      }

      // Validar extensão
      const fileExtension = path.extname(file.originalname).toLowerCase();
      if (!this.config.allowedExtensions.includes(fileExtension)) {
        throw new BadRequestException(
          `Extensão de arquivo não permitida: ${fileExtension}. Extensões permitidas: ${this.config.allowedExtensions.join(', ')}`
        );
      }

      // Validar nome do arquivo
      if (!file.originalname || file.originalname.trim().length === 0) {
        throw new BadRequestException('Nome do arquivo é obrigatório');
      }

      // Validar caracteres especiais no nome
      const invalidChars = /[<>:"/\\|?*]/;
      if (invalidChars.test(file.originalname)) {
        throw new BadRequestException(
          'Nome do arquivo contém caracteres inválidos: < > : " / \\ | ? *'
        );
      }

      // Validar tamanho mínimo (evitar arquivos vazios)
      if (file.size === 0) {
        throw new BadRequestException('Arquivo não pode estar vazio');
      }

      cb(null, true);
    } catch (error) {
      cb(error as Error, false);
    }
  }

  /**
   * Valida múltiplos arquivos
   */
  validateFiles(files: Express.Multer.File[]): void {
    if (!files || files.length === 0) {
      return; // Arquivos são opcionais
    }

    // Validar número máximo de arquivos
    if (files.length > this.config.maxFiles) {
      throw new BadRequestException(
        `Muitos arquivos. Máximo permitido: ${this.config.maxFiles}`
      );
    }

    // Validar tamanho total
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const maxTotalSize = this.config.maxFileSize * this.config.maxFiles;
    
    if (totalSize > maxTotalSize) {
      throw new BadRequestException(
        `Tamanho total dos arquivos muito grande. Máximo: ${this.formatFileSize(maxTotalSize)}`
      );
    }

    // Validar cada arquivo individualmente
    files.forEach((file, index) => {
      this.validateFile(file, (error, accepted) => {
        if (error) {
          throw new BadRequestException(`Arquivo ${index + 1}: ${error.message}`);
        }
      });
    });

    // Validar nomes duplicados
    const fileNames = files.map(file => file.originalname.toLowerCase());
    const duplicates = fileNames.filter((name, index) => fileNames.indexOf(name) !== index);
    
    if (duplicates.length > 0) {
      throw new BadRequestException(
        `Arquivos com nomes duplicados: ${duplicates.join(', ')}`
      );
    }
  }

  /**
   * Cria configuração do Multer com validações
   */
  createMulterOptions(): MulterOptions {
    return {
      storage: multer.memoryStorage(),
      limits: {
        fileSize: this.config.maxFileSize,
        files: this.config.maxFiles
      },
      fileFilter: (req: Request, file: Express.Multer.File, cb) => {
        this.validateFile(file, cb);
      }
    };
  }

  /**
   * Valida se o tipo de arquivo é uma imagem
   */
  isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * Valida se o tipo de arquivo é um vídeo
   */
  isVideo(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  /**
   * Valida se o tipo de arquivo é um documento
   */
  isDocument(mimeType: string): boolean {
    const documentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'application/rtf'
    ];
    
    return documentTypes.includes(mimeType);
  }

  /**
   * Valida se o tipo de arquivo é áudio
   */
  isAudio(mimeType: string): boolean {
    return mimeType.startsWith('audio/');
  }

  /**
   * Obtém categoria do arquivo baseada no tipo MIME
   */
  getFileCategory(mimeType: string): 'image' | 'video' | 'document' | 'audio' | 'other' {
    if (this.isImage(mimeType)) return 'image';
    if (this.isVideo(mimeType)) return 'video';
    if (this.isDocument(mimeType)) return 'document';
    if (this.isAudio(mimeType)) return 'audio';
    return 'other';
  }

  /**
   * Valida extensão de arquivo
   */
  validateExtension(filename: string): boolean {
    const extension = path.extname(filename).toLowerCase();
    return this.config.allowedExtensions.includes(extension);
  }

  /**
   * Valida tipo MIME
   */
  validateMimeType(mimeType: string): boolean {
    return this.config.allowedMimeTypes.includes(mimeType);
  }

  /**
   * Valida tamanho do arquivo
   */
  validateFileSize(size: number): boolean {
    return size > 0 && size <= this.config.maxFileSize;
  }

  /**
   * Obtém informações de validação para o frontend
   */
  getValidationInfo(): {
    maxFileSize: number;
    maxFiles: number;
    allowedTypes: string[];
    allowedExtensions: string[];
    maxFileSizeFormatted: string;
  } {
    return {
      maxFileSize: this.config.maxFileSize,
      maxFiles: this.config.maxFiles,
      allowedTypes: this.config.allowedMimeTypes,
      allowedExtensions: this.config.allowedExtensions,
      maxFileSizeFormatted: this.formatFileSize(this.config.maxFileSize)
    };
  }

  /**
   * Formata tamanho do arquivo para exibição
   */
  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = Math.round((bytes / Math.pow(1024, i)) * 100) / 100;
    
    return `${size} ${sizes[i]}`;
  }

  /**
   * Sanitiza nome do arquivo
   */
  sanitizeFileName(filename: string): string {
    // Remove caracteres especiais e espaços extras
    return filename
      .replace(/[<>:"/\\|?*]/g, '') // Remove caracteres inválidos
      .replace(/\s+/g, '_') // Substitui espaços por underscore
      .replace(/_{2,}/g, '_') // Remove underscores duplicados
      .toLowerCase()
      .trim();
  }

  /**
   * Gera nome único para arquivo
   */
  generateUniqueFileName(originalName: string): string {
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    const sanitizedBaseName = this.sanitizeFileName(baseName);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    
    return `${sanitizedBaseName}_${timestamp}_${random}${extension}`;
  }
}

/**
 * Instância padrão do validador
 */
export const defaultFileValidator = new FileUploadValidator();

/**
 * Função helper para criar validador customizado
 */
export function createFileValidator(
  config: Partial<FileUploadValidationConfig>
): FileUploadValidator {
  return new FileUploadValidator(config);
}

/**
 * Decorator para validação de arquivos
 */
export function ValidateFiles(
  config?: Partial<FileUploadValidationConfig>
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const validator = new FileUploadValidator(config);

    descriptor.value = function (...args: any[]) {
      // Procurar por arquivos nos argumentos
      const files = args.find(arg => 
        Array.isArray(arg) && arg.length > 0 && arg[0].fieldname
      );

      if (files) {
        validator.validateFiles(files);
      }

      return method.apply(this, args);
    };
  };
}