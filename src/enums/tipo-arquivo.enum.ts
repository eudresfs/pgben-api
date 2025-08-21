/**
 * Enum para tipos de arquivo suportados no sistema
 * Define os tipos de documentos que podem ser anexados
 */
export enum TipoArquivo {
  /** Documento PDF */
  PDF = 'pdf',
  
  /** Imagem JPEG */
  JPEG = 'jpeg',
  
  /** Imagem JPG */
  JPG = 'jpg',
  
  /** Imagem PNG */
  PNG = 'png',
  
  /** Documento Word */
  DOCX = 'docx',
  
  /** Documento Word legado */
  DOC = 'doc',
  
  /** Planilha Excel */
  XLSX = 'xlsx',
  
  /** Planilha Excel legado */
  XLS = 'xls',
  
  /** Arquivo de texto */
  TXT = 'txt',
  
  /** Arquivo CSV */
  CSV = 'csv'
}

/**
 * Mapeamento de tipos MIME para TipoArquivo
 */
export const MIME_TYPE_MAP: Record<string, TipoArquivo> = {
  'application/pdf': TipoArquivo.PDF,
  'image/jpeg': TipoArquivo.JPEG,
  'image/jpg': TipoArquivo.JPG,
  'image/png': TipoArquivo.PNG,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': TipoArquivo.DOCX,
  'application/msword': TipoArquivo.DOC,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': TipoArquivo.XLSX,
  'application/vnd.ms-excel': TipoArquivo.XLS,
  'text/plain': TipoArquivo.TXT,
  'text/csv': TipoArquivo.CSV
};

/**
 * Extensões de arquivo válidas
 */
export const EXTENSOES_VALIDAS = Object.values(TipoArquivo);

/**
 * Tamanho máximo de arquivo em bytes (10MB)
 */
export const TAMANHO_MAXIMO_ARQUIVO = 10 * 1024 * 1024;