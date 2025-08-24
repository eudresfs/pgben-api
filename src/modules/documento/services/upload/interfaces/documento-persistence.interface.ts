import { UploadDocumentoDto } from '../../../dto/upload-documento.dto';
import { Documento } from '@/entities/documento.entity';
import { FileProcessingResult } from './documento-file-processing.interface';
import { UploadMetadata } from './documento-metadata.interface';

/**
 * Interface para persistência de documentos no banco de dados
 */
export interface IDocumentoPersistenceService {
  /**
   * Salva documento no banco de dados
   * @param arquivo Arquivo original
   * @param uploadDocumentoDto DTO com dados do upload
   * @param usuarioId ID do usuário
   * @param fileProcessing Resultado do processamento do arquivo
   * @param storagePath Caminho no storage
   * @param metadata Metadados do upload
   * @param uploadId ID único do upload
   * @returns Documento salvo com relações
   */
  saveDocument(
    arquivo: any,
    uploadDocumentoDto: UploadDocumentoDto,
    usuarioId: string,
    fileProcessing: FileProcessingResult,
    storagePath: string,
    metadata: UploadMetadata,
    uploadId: string,
  ): Promise<Documento>;

  /**
   * Cria relações do documento com outras entidades
   * @param documento Documento base
   * @param uploadDocumentoDto DTO com dados do upload
   * @returns Documento com relações carregadas
   */
  loadDocumentRelations(
    documento: Documento,
    uploadDocumentoDto: UploadDocumentoDto,
  ): Promise<Documento>;

  /**
   * Valida dados antes da persistência
   * @param documentData Dados do documento
   * @returns True se válidos
   */
  validateDocumentData(documentData: Partial<Documento>): boolean;
}
