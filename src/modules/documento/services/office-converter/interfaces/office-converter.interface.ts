/**
 * Interface para o serviço de conversão de documentos Office
 */
export interface IOfficeConverterService {
  /**
   * Converte um documento Office para PDF
   * @param buffer Buffer do documento original
   * @param mimeType Tipo MIME do documento
   * @param originalFileName Nome original do arquivo (opcional)
   * @returns Resultado da conversão
   */
  convertToPdf(
    buffer: Buffer,
    mimeType: string,
    originalFileName?: string,
  ): Promise<ConversionResult>;

  /**
   * Verifica se o LibreOffice está disponível no sistema
   */
  checkLibreOfficeAvailability(): Promise<boolean>;

  /**
   * Verifica se o serviço está disponível
   */
  get isAvailable(): boolean;

  /**
   * Obtém estatísticas do serviço
   */
  getStats(): OfficeConverterStats;
}

/**
 * Resultado da conversão de documento
 */
export interface ConversionResult {
  success: boolean;
  pdfBuffer?: Buffer;
  error?: string;
  originalSize: number;
  convertedSize?: number;
  conversionTime: number;
}

/**
 * Configuração do OfficeConverter
 */
export interface OfficeConverterConfig {
  enabled: boolean;
  libreOfficePath: string;
  timeout: number;
  tempDir: string;
  maxRetries: number;
  retryDelay: number;
}

/**
 * Estatísticas do OfficeConverter
 */
export interface OfficeConverterStats {
  enabled: boolean;
  libreOfficeAvailable: boolean;
  libreOfficePath: string;
  timeout: number;
  maxRetries: number;
}

/**
 * Tipos MIME suportados para conversão
 */
export enum SupportedMimeTypes {
  DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  DOC = 'application/msword',
  XLS = 'application/vnd.ms-excel',
  PPT = 'application/vnd.ms-powerpoint',
  ODT = 'application/vnd.oasis.opendocument.text',
  ODS = 'application/vnd.oasis.opendocument.spreadsheet',
  ODP = 'application/vnd.oasis.opendocument.presentation',
  RTF = 'text/rtf',
}

/**
 * Extensões de arquivo suportadas
 */
export enum SupportedExtensions {
  DOCX = 'docx',
  XLSX = 'xlsx',
  PPTX = 'pptx',
  DOC = 'doc',
  XLS = 'xls',
  PPT = 'ppt',
  ODT = 'odt',
  ODS = 'ods',
  ODP = 'odp',
  RTF = 'rtf',
}

/**
 * Mapeamento de tipos MIME para extensões
 */
export const MIME_TO_EXTENSION: Record<string, string> = {
  [SupportedMimeTypes.DOCX]: SupportedExtensions.DOCX,
  [SupportedMimeTypes.XLSX]: SupportedExtensions.XLSX,
  [SupportedMimeTypes.PPTX]: SupportedExtensions.PPTX,
  [SupportedMimeTypes.DOC]: SupportedExtensions.DOC,
  [SupportedMimeTypes.XLS]: SupportedExtensions.XLS,
  [SupportedMimeTypes.PPT]: SupportedExtensions.PPT,
  [SupportedMimeTypes.ODT]: SupportedExtensions.ODT,
  [SupportedMimeTypes.ODS]: SupportedExtensions.ODS,
  [SupportedMimeTypes.ODP]: SupportedExtensions.ODP,
  [SupportedMimeTypes.RTF]: SupportedExtensions.RTF,
};

/**
 * Configurações padrão do LibreOffice por sistema operacional
 */
export const DEFAULT_LIBREOFFICE_PATHS: Record<string, string> = {
  win32: 'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
  darwin: '/Applications/LibreOffice.app/Contents/MacOS/soffice',
  linux: '/usr/bin/libreoffice',
};

/**
 * Limites de recursos para conversão
 */
export const CONVERSION_LIMITS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  DEFAULT_TIMEOUT: 30000, // 30 segundos
  MAX_TIMEOUT: 120000, // 2 minutos
  DEFAULT_MAX_RETRIES: 2,
  MAX_RETRIES: 5,
  DEFAULT_RETRY_DELAY: 1000, // 1 segundo
  MAX_RETRY_DELAY: 5000, // 5 segundos
};
