import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Request } from 'express';
import { FileUploadValidator, FileUploadValidationConfig } from '../validators';

/**
 * Interface para arquivos processados
 */
export interface ProcessedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  filename?: string;
  destination?: string;
  path?: string;
  stream?: any;
}

/**
 * Interface para dados do request processado
 */
export interface ProcessedRequest {
  body: any;
  files: ProcessedFile[];
  fileValidationErrors: string[];
}

/**
 * Interceptor para upload de arquivos
 */
@Injectable()
export class FileUploadInterceptor implements NestInterceptor {
  private validator: FileUploadValidator;

  constructor() {
    this.validator = new FileUploadValidator();
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();

    // Verificar se é uma requisição multipart/form-data
    if (!this.isMultipartRequest(request)) {
      return next.handle();
    }

    // Processar arquivos antes da execução do handler
    try {
      this.preprocessFiles(request);
    } catch (error) {
      return throwError(() => error);
    }

    return next.handle().pipe(
      map(data => {
        // Adicionar informações de validação na resposta se necessário
        if (request.files && Array.isArray(request.files) && request.files.length > 0) {
          return {
            ...data,
            uploadInfo: {
              filesProcessed: request.files.length,
              validationInfo: this.validator.getValidationInfo()
            }
          };
        }
        return data;
      }),
      catchError(error => {
        // Tratar erros específicos de upload
        if (error.code === 'LIMIT_FILE_SIZE') {
          throw new PayloadTooLargeException(
            `Arquivo muito grande. Tamanho máximo: ${this.formatFileSize(this.validator.getValidationInfo().maxFileSize)}`
          );
        }

        if (error.code === 'LIMIT_FILE_COUNT') {
          throw new BadRequestException(
            `Muitos arquivos. Máximo permitido: ${this.validator.getValidationInfo().maxFiles}`
          );
        }

        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
          throw new BadRequestException(
            'Campo de arquivo inesperado ou não permitido'
          );
        }

        if (error.message && error.message.includes('Unsupported media type')) {
          throw new UnsupportedMediaTypeException(
            'Tipo de arquivo não suportado'
          );
        }

        throw error;
      })
    );
  }

  /**
   * Verifica se a requisição é multipart/form-data
   */
  private isMultipartRequest(request: Request): boolean {
    const contentType = request.headers['content-type'];
    return contentType && contentType.includes('multipart/form-data');
  }

  /**
   * Pré-processa arquivos da requisição
   */
  private preprocessFiles(request: Request): void {
    if (!request.files) {
      return;
    }

    const files = Array.isArray(request.files) ? request.files : Object.values(request.files).flat();
    
    if (files.length === 0) {
      return;
    }

    // Validar arquivos
    try {
      this.validator.validateFiles(files as Express.Multer.File[]);
    } catch (error) {
      throw new BadRequestException(error.message);
    }

    // Processar cada arquivo
    files.forEach((file, index) => {
      try {
        this.processFile(file as Express.Multer.File, index);
      } catch (error) {
        throw new BadRequestException(`Erro no arquivo ${index + 1}: ${error.message}`);
      }
    });
  }

  /**
   * Processa um arquivo individual
   */
  private processFile(file: Express.Multer.File, index: number): void {
    // Validar arquivo individual
    this.validator.validateFile(file, (error, accepted) => {
      if (error || !accepted) {
        throw new BadRequestException(error?.message || `Arquivo ${index + 1} não é válido`);
      }
    });

    // Adicionar metadados úteis
    (file as any).category = this.validator.getFileCategory(file.mimetype);
    (file as any).isImage = this.validator.isImage(file.mimetype);
    (file as any).isVideo = this.validator.isVideo(file.mimetype);
    (file as any).isDocument = this.validator.isDocument(file.mimetype);
    (file as any).isAudio = this.validator.isAudio(file.mimetype);
    (file as any).sizeFormatted = this.formatFileSize(file.size);
    (file as any).sanitizedName = this.validator.sanitizeFileName(file.originalname);
    (file as any).uniqueName = this.validator.generateUniqueFileName(file.originalname);

    // Validar integridade do buffer
    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException(`Arquivo ${index + 1} está corrompido ou vazio`);
    }

    // Verificar se o tamanho do buffer corresponde ao tamanho reportado
    if (file.buffer.length !== file.size) {
      throw new BadRequestException(
        `Arquivo ${index + 1}: tamanho do buffer (${file.buffer.length}) não corresponde ao tamanho reportado (${file.size})`
      );
    }
  }

  /**
   * Formata tamanho do arquivo
   */
  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = Math.round((bytes / Math.pow(1024, i)) * 100) / 100;
    
    return `${size} ${sizes[i]}`;
  }
}

/**
 * Interceptor específico para feedback com configurações otimizadas
 */
@Injectable()
export class FeedbackFileUploadInterceptor extends FileUploadInterceptor {
  constructor() {
    super();
  }
}

/**
 * Interceptor para arquivos de imagem apenas
 */
@Injectable()
export class ImageUploadInterceptor extends FileUploadInterceptor {
  constructor() {
    super();
  }
}

/**
 * Interceptor para documentos apenas
 */
@Injectable()
export class DocumentUploadInterceptor extends FileUploadInterceptor {
  constructor() {
    super();
  }
}