import { UploadDocumentoDto } from '../../../dto/upload-documento.dto';

/**
 * Interface para validação de uploads de documentos
 */
export interface IDocumentoUploadValidationService {
  /**
   * Valida as configurações necessárias para upload
   * @throws {InternalServerErrorException} Se configurações estão inválidas
   */
  validateConfiguration(): void;

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
  ): UploadValidationResult;
}

/**
 * Resultado da validação de upload
 */
export interface UploadValidationResult {
  isValid: boolean;
  errors: string[];
  uploadId: string;
}