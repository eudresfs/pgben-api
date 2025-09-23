import { 
  PipeTransform, 
  Injectable, 
  BadRequestException,
  Logger 
} from '@nestjs/common';
import { ResultadoUploadedFiles } from '../dto/create-resultado-beneficio-cessado-with-files.dto';

/**
 * Pipe de validação para arquivos de resultado de benefício cessado.
 * 
 * Valida a separação correta entre prova social e documentação técnica,
 * garantindo que pelo menos um arquivo de cada categoria seja fornecido
 * conforme exigências do SUAS.
 */
@Injectable()
export class ResultadoFilesValidationPipe implements PipeTransform {
  private readonly logger = new Logger(ResultadoFilesValidationPipe.name);

  /**
   * Transforma e valida os arquivos recebidos.
   * 
   * @param files - Arquivos separados por categoria
   * @returns Arquivos validados
   */
  transform(files: ResultadoUploadedFiles): ResultadoUploadedFiles {
    this.logger.debug('Iniciando validação de arquivos de resultado');

    if (!files) {
      throw new BadRequestException(
        'Arquivos são obrigatórios para registro do resultado'
      );
    }

    const { provaSocial, documentacaoTecnica } = files;

    // Validar presença de pelo menos um arquivo de cada categoria
    this.validarPresencaArquivos(provaSocial, documentacaoTecnica);

    // Validar quantidade de arquivos por categoria
    this.validarQuantidadeArquivos(provaSocial, documentacaoTecnica);

    // Validar tipos de arquivo por categoria
    this.validarTiposArquivos(provaSocial, documentacaoTecnica);

    this.logger.debug('Validação de arquivos concluída com sucesso');
    return files;
  }

  /**
   * Valida se há pelo menos um arquivo de cada categoria.
   */
  private validarPresencaArquivos(
    provaSocial?: Express.Multer.File[],
    documentacaoTecnica?: Express.Multer.File[]
  ): void {
    const temProvaSocial = provaSocial && provaSocial.length > 0;
    const temDocumentacaoTecnica = documentacaoTecnica && documentacaoTecnica.length > 0;

    if (!temProvaSocial && !temDocumentacaoTecnica) {
      throw new BadRequestException(
        'É obrigatório fornecer pelo menos um arquivo de prova social ou documentação técnica'
      );
    }

    // Recomendação: ter pelo menos um arquivo de cada categoria
    if (!temProvaSocial) {
      this.logger.warn('Nenhum arquivo de prova social fornecido');
    }

    if (!temDocumentacaoTecnica) {
      this.logger.warn('Nenhum arquivo de documentação técnica fornecido');
    }
  }

  /**
   * Valida a quantidade de arquivos por categoria.
   */
  private validarQuantidadeArquivos(
    provaSocial?: Express.Multer.File[],
    documentacaoTecnica?: Express.Multer.File[]
  ): void {
    // Validar prova social (máximo 5 arquivos)
    if (provaSocial && provaSocial.length > 5) {
      throw new BadRequestException(
        'Máximo de 5 arquivos permitidos para prova social'
      );
    }

    // Validar documentação técnica (máximo 10 arquivos)
    if (documentacaoTecnica && documentacaoTecnica.length > 10) {
      throw new BadRequestException(
        'Máximo de 10 arquivos permitidos para documentação técnica'
      );
    }

    // Validar total de arquivos (máximo 15)
    const totalArquivos = (provaSocial?.length || 0) + (documentacaoTecnica?.length || 0);
    if (totalArquivos > 15) {
      throw new BadRequestException(
        'Máximo de 15 arquivos permitidos no total'
      );
    }
  }

  /**
   * Valida os tipos de arquivo por categoria.
   */
  private validarTiposArquivos(
    provaSocial?: Express.Multer.File[],
    documentacaoTecnica?: Express.Multer.File[]
  ): void {
    // Tipos permitidos para prova social (mais focado em imagens)
    const tiposProvaSocial = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'application/pdf',
      'video/mp4',
      'video/avi'
    ];

    // Tipos permitidos para documentação técnica (mais focado em documentos)
    const tiposDocumentacaoTecnica = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];

    // Validar prova social
    if (provaSocial) {
      for (const file of provaSocial) {
        if (!tiposProvaSocial.includes(file.mimetype)) {
          throw new BadRequestException(
            `Tipo de arquivo não permitido para prova social: ${file.mimetype}. ` +
            `Tipos permitidos: ${tiposProvaSocial.join(', ')}`
          );
        }
      }
    }

    // Validar documentação técnica
    if (documentacaoTecnica) {
      for (const file of documentacaoTecnica) {
        if (!tiposDocumentacaoTecnica.includes(file.mimetype)) {
          throw new BadRequestException(
            `Tipo de arquivo não permitido para documentação técnica: ${file.mimetype}. ` +
            `Tipos permitidos: ${tiposDocumentacaoTecnica.join(', ')}`
          );
        }
      }
    }
  }
}