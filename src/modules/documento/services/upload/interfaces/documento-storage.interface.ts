import { UploadDocumentoDto } from '../../../dto/upload-documento.dto';

/**
 * Interface para operações de storage de documentos
 */
export interface IDocumentoStorageService {
  /**
   * Salva arquivo no storage
   * @param arquivo Arquivo a ser salvo
   * @param storagePath Caminho no storage
   * @param uploadDocumentoDto DTO com dados do upload
   * @param uploadId ID único do upload
   * @returns Caminho final do arquivo no storage
   */
  saveFile(
    arquivo: any,
    storagePath: string,
    uploadDocumentoDto: UploadDocumentoDto,
    uploadId: string,
  ): Promise<string>;

  /**
   * Gera caminho hierárquico para o arquivo
   * @param uploadDocumentoDto DTO com dados do upload
   * @param fileName Nome do arquivo
   * @returns Caminho hierárquico gerado
   */
  generateStoragePath(
    uploadDocumentoDto: UploadDocumentoDto,
    fileName: string,
  ): string;

  /**
   * Remove arquivo do storage em caso de erro
   * @param storagePath Caminho do arquivo no storage
   * @param uploadId ID único do upload
   */
  cleanupFile(storagePath: string, uploadId: string): Promise<void>;

  /**
   * Verifica se o arquivo existe no storage
   * @param storagePath Caminho do arquivo no storage
   * @returns True se o arquivo existe
   */
  fileExists(storagePath: string): Promise<boolean>;
}