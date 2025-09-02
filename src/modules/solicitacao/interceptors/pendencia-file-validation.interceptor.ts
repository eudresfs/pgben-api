import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS } from '../../documento/config/mime-validation.config';

/**
 * Interceptor para validação de arquivos em uploads de pendências
 * 
 * Aplica validações específicas para documentos anexados a pendências:
 * - Tipos de arquivo permitidos
 * - Tamanho máximo por arquivo
 * - Número máximo de arquivos
 * - Validação de extensões
 */
@Injectable()
export class PendenciaFileValidationInterceptor implements NestInterceptor {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly MAX_FILES = 10;
  private readonly ALLOWED_TYPES = Object.values(ALLOWED_MIME_TYPES);
  private readonly ALLOWED_EXTS = [...ALLOWED_EXTENSIONS];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const files: Express.Multer.File[] = request.files;

    // Se não há arquivos, prosseguir normalmente
    if (!files || files.length === 0) {
      return next.handle();
    }

    // Validar número máximo de arquivos
    if (files.length > this.MAX_FILES) {
      throw new BadRequestException(
        `Número máximo de arquivos excedido. Máximo permitido: ${this.MAX_FILES}`,
      );
    }

    // Validar cada arquivo
    for (const file of files) {
      this.validateFile(file);
    }

    return next.handle();
  }

  /**
   * Valida um arquivo individual
   * @param file Arquivo a ser validado
   */
  private validateFile(file: Express.Multer.File): void {
    // Validar se o arquivo existe
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Arquivo vazio ou inválido');
    }

    // Validar tamanho do arquivo
    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `Arquivo "${file.originalname}" excede o tamanho máximo de ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    // Validar tipo MIME
    if (!this.ALLOWED_TYPES.includes(file.mimetype as any)) {
      throw new BadRequestException(
        `Tipo de arquivo "${file.mimetype}" não permitido para "${file.originalname}". ` +
        `Tipos aceitos: ${this.ALLOWED_TYPES.join(', ')}`,
      );
    }

    // Validar extensão do arquivo
    if (file.originalname) {
      const fileName = file.originalname.toLowerCase();
      const hasValidExtension = this.ALLOWED_EXTS.some((ext) =>
        fileName.endsWith(ext),
      );

      if (!hasValidExtension) {
        throw new BadRequestException(
          `Extensão de arquivo não permitida para "${file.originalname}". ` +
          `Extensões aceitas: ${this.ALLOWED_EXTS.join(', ')}`,
        );
      }
    }

    // Validar nome do arquivo
    if (!file.originalname || file.originalname.trim() === '') {
      throw new BadRequestException('Nome do arquivo é obrigatório');
    }

    // Validar caracteres especiais no nome do arquivo
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(file.originalname)) {
      throw new BadRequestException(
        `Nome do arquivo "${file.originalname}" contém caracteres inválidos`,
      );
    }
  }
}