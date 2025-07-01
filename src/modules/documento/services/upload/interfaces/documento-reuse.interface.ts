import { UploadDocumentoDto } from '../../../dto/upload-documento.dto';
import { Documento } from '@/entities/documento.entity';

/**
 * Interface para verificação de reutilização de documentos
 */
export interface IDocumentoReuseService {
  /**
   * Verifica se um documento pode ser reutilizado
   * @param uploadDocumentoDto DTO com dados do upload
   * @param fileHash Hash do arquivo
   * @param uploadId ID único do upload
   * @returns Resultado da verificação de reutilização
   */
  checkReusability(
    uploadDocumentoDto: UploadDocumentoDto,
    fileHash: string,
    uploadId: string,
  ): Promise<DocumentReusabilityCheck>;

  /**
   * Busca documento existente por hash e critérios
   * @param fileHash Hash do arquivo
   * @param uploadDocumentoDto DTO com dados do upload
   * @returns Documento existente se encontrado
   */
  findExistingDocument(
    fileHash: string,
    uploadDocumentoDto: UploadDocumentoDto,
  ): Promise<Documento | null>;
}

/**
 * Resultado da verificação de reutilização
 */
export interface DocumentReusabilityCheck {
  canReuse: boolean;
  existingDocument?: Documento;
  reason?: string;
}