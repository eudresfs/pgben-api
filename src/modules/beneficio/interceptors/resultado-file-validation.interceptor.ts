import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Interceptor para validação de arquivos de resultado de benefício cessado.
 * 
 * Implementa validações específicas para upload de arquivos com separação
 * entre prova social (fotos e testemunhos) e documentação técnica 
 * (laudos, entrevistas e relatórios).
 * 
 * Conforme diretrizes do SUAS para documentação de encerramento de benefícios.
 */
@Injectable()
export class ResultadoFileValidationInterceptor implements NestInterceptor {
  // Configurações de validação
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly MAX_FILES_PROVA_SOCIAL = 5;
  private readonly MAX_FILES_DOC_TECNICA = 10;

  // Tipos MIME permitidos para prova social (fotos e testemunhos)
  private readonly PROVA_SOCIAL_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf', // Para testemunhos escritos
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  // Tipos MIME permitidos para documentação técnica
  private readonly DOC_TECNICA_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/jpeg', // Para laudos digitalizados
    'image/jpg',
    'image/png',
  ];

  // Extensões permitidas para prova social
  private readonly PROVA_SOCIAL_EXTENSIONS = [
    '.jpg', '.jpeg', '.png', '.webp', '.pdf', '.txt', '.doc', '.docx'
  ];

  // Extensões permitidas para documentação técnica
  private readonly DOC_TECNICA_EXTENSIONS = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.jpg', '.jpeg', '.png'
  ];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const files = request.files;

    if (files) {
      this.validateFiles(files);
    }

    return next.handle();
  }

  /**
   * Valida os arquivos enviados separando por categoria
   */
  private validateFiles(files: any): void {
    const provaSocialFiles = files.provaSocial || [];
    const docTecnicaFiles = files.documentacaoTecnica || [];

    // Validar quantidade de arquivos
    if (provaSocialFiles.length > this.MAX_FILES_PROVA_SOCIAL) {
      throw new BadRequestException(
        `Máximo de ${this.MAX_FILES_PROVA_SOCIAL} arquivos permitidos para prova social`,
      );
    }

    if (docTecnicaFiles.length > this.MAX_FILES_DOC_TECNICA) {
      throw new BadRequestException(
        `Máximo de ${this.MAX_FILES_DOC_TECNICA} arquivos permitidos para documentação técnica`,
      );
    }

    // Arquivos são opcionais, mas se enviados devem ser válidos
    // A obrigatoriedade é definida pelas regras de negócio no service
    if (provaSocialFiles.length === 0 && docTecnicaFiles.length === 0) {
      // Permitir registro sem arquivos - validação de obrigatoriedade no service
      return;
    }

    // Validar arquivos de prova social
    provaSocialFiles.forEach((file: Express.Multer.File) => {
      this.validateFile(
        file,
        this.PROVA_SOCIAL_MIME_TYPES,
        this.PROVA_SOCIAL_EXTENSIONS,
        'prova social'
      );
    });

    // Validar arquivos de documentação técnica
    docTecnicaFiles.forEach((file: Express.Multer.File) => {
      this.validateFile(
        file,
        this.DOC_TECNICA_MIME_TYPES,
        this.DOC_TECNICA_EXTENSIONS,
        'documentação técnica'
      );
    });
  }

  /**
   * Valida um arquivo individual com verificações aprimoradas para documentos críticos.
   * 
   * Implementa validações de segurança e integridade conforme diretrizes
   * do SUAS para documentação de encerramento de benefícios.
   */
  private validateFile(
    file: Express.Multer.File,
    allowedMimeTypes: string[],
    allowedExtensions: string[],
    category: string,
  ): void {
    if (!file) {
      throw new BadRequestException(`Arquivo de ${category} não encontrado`);
    }

    // Validar integridade básica do arquivo
    if (!file.buffer && !file.path) {
      throw new BadRequestException(
        `Arquivo "${file.originalname}" está corrompido ou vazio para ${category}`
      );
    }

    // Validar tamanho mínimo (evitar arquivos vazios)
    if (file.size === 0) {
      throw new BadRequestException(
        `Arquivo "${file.originalname}" está vazio para ${category}`
      );
    }

    // Validar tamanho máximo
    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `Arquivo "${file.originalname}" excede o tamanho máximo de 10MB para ${category}`,
      );
    }

    // Validar tamanho mínimo para documentos críticos (1KB)
    const MIN_FILE_SIZE = 1024; // 1KB
    if (file.size < MIN_FILE_SIZE) {
      throw new BadRequestException(
        `Arquivo "${file.originalname}" muito pequeno (mínimo 1KB) para ${category}`
      );
    }

    // Validar tipo MIME
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de arquivo "${file.mimetype}" não permitido para ${category}. ` +
        `Tipos permitidos: ${allowedMimeTypes.join(', ')}`,
      );
    }

    // Validar extensão do arquivo
    const fileExtension = this.getFileExtension(file.originalname);
    if (!allowedExtensions.includes(fileExtension)) {
      throw new BadRequestException(
        `Extensão "${fileExtension}" não permitida para ${category}. ` +
        `Extensões permitidas: ${allowedExtensions.join(', ')}`,
      );
    }

    // Validar consistência entre MIME type e extensão
    this.validateMimeTypeExtensionConsistency(file.mimetype, fileExtension, category);

    // Validar nome do arquivo
    if (!file.originalname || file.originalname.trim() === '') {
      throw new BadRequestException(`Nome do arquivo de ${category} é obrigatório`);
    }

    // Validar comprimento do nome do arquivo
    if (file.originalname.length > 255) {
      throw new BadRequestException(
        `Nome do arquivo "${file.originalname}" muito longo (máximo 255 caracteres) para ${category}`
      );
    }

    // Validar caracteres no nome do arquivo
    const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (invalidChars.test(file.originalname)) {
      throw new BadRequestException(
        `Nome do arquivo "${file.originalname}" contém caracteres inválidos para ${category}`,
      );
    }

    // Validar que o nome não seja apenas espaços ou pontos
    const cleanName = file.originalname.replace(/[\s.]/g, '');
    if (cleanName.length === 0) {
      throw new BadRequestException(
        `Nome do arquivo "${file.originalname}" inválido para ${category}`
      );
    }
  }

  /**
   * Valida consistência entre tipo MIME e extensão do arquivo
   */
  private validateMimeTypeExtensionConsistency(
    mimetype: string,
    extension: string,
    category: string
  ): void {
    const mimeExtensionMap: Record<string, string[]> = {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
    };

    const expectedExtensions = mimeExtensionMap[mimetype];
    if (expectedExtensions && !expectedExtensions.includes(extension)) {
      throw new BadRequestException(
        `Inconsistência entre tipo de arquivo (${mimetype}) e extensão (${extension}) para ${category}`
      );
    }
  }

  /**
   * Extrai a extensão do arquivo
   */
  private getFileExtension(filename: string): string {
    return filename.toLowerCase().substring(filename.lastIndexOf('.'));
  }
}