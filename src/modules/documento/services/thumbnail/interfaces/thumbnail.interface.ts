/**
 * Interface para o serviço de geração de thumbnails
 */
export interface IThumbnailService {
  /**
   * Gera thumbnail para um documento
   * @param buffer Buffer do arquivo original
   * @param mimeType Tipo MIME do arquivo
   * @param documentoId ID do documento
   * @returns Thumbnail gerado ou null se não suportado
   */
  generateThumbnail(
    buffer: Buffer,
    mimeType: string,
    documentoId: string,
  ): Promise<{ thumbnailBuffer: Buffer; thumbnailPath: string } | null>;

  /**
   * Verifica se um thumbnail existe para o documento
   * @param documentoId ID do documento
   * @returns True se o thumbnail existe
   */
  thumbnailExists(documentoId: string): Promise<boolean>;

  /**
   * Remove thumbnail de um documento
   * @param documentoId ID do documento
   */
  removeThumbnail(documentoId: string): Promise<void>;
}

/**
 * Resultado da geração de thumbnail
 */
export interface ThumbnailGenerationResult {
  /** Buffer do thumbnail gerado */
  thumbnailBuffer: Buffer;
  /** Caminho onde o thumbnail foi armazenado */
  thumbnailPath: string;
  /** Tamanho do thumbnail em bytes */
  size: number;
  /** Formato do thumbnail (sempre 'jpeg') */
  format: 'jpeg';
  /** Timestamp da geração */
  generatedAt: Date;
}

/**
 * Configurações para geração de thumbnail
 */
export interface ThumbnailConfig {
  /** Largura do thumbnail */
  width: number;
  /** Altura do thumbnail */
  height: number;
  /** Qualidade JPEG (1-100) */
  quality: number;
  /** Modo de redimensionamento */
  fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  /** Posição para crop (quando fit='cover') */
  position: 'center' | 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Tipos de arquivo suportados para thumbnail
 */
export enum SupportedThumbnailTypes {
  PDF = 'application/pdf',
  JPEG = 'image/jpeg',
  PNG = 'image/png',
  GIF = 'image/gif',
  WEBP = 'image/webp',
  DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  DOC = 'application/msword',
  XLS = 'application/vnd.ms-excel',
}

/**
 * Metadados do thumbnail
 */
export interface ThumbnailMetadata {
  /** ID do documento original */
  originalDocumentId: string;
  /** Tipo MIME do documento original */
  originalMimeType: string;
  /** Tamanho do arquivo original */
  originalSize: number;
  /** Configurações usadas na geração */
  config: ThumbnailConfig;
  /** Data de geração */
  generatedAt: Date;
  /** Versão do algoritmo de geração */
  version: string;
}