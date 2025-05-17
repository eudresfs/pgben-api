/**
 * Constantes para tipos MIME permitidos no sistema
 *
 * Define os tipos MIME permitidos para upload de documentos,
 * agrupados por categoria (documentos, imagens, planilhas, etc.)
 */
export const MIME_TYPES_PERMITIDOS = {
  DOCUMENTOS: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  IMAGENS: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'image/webp',
  ],
  PLANILHAS: [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/vnd.oasis.opendocument.spreadsheet',
  ],
  APRESENTACOES: [
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.presentation',
  ],
  TEXTO: ['text/plain', 'text/markdown', 'text/html', 'application/rtf'],
  COMPACTADOS: [
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/gzip',
  ],
};

/**
 * Lista de todos os tipos MIME permitidos
 */
export const TODOS_MIME_TYPES_PERMITIDOS = Object.values(
  MIME_TYPES_PERMITIDOS,
).flat();

/**
 * Alias para TODOS_MIME_TYPES_PERMITIDOS para compatibilidade com o serviço
 */
export const ALLOWED_MIME_TYPES = TODOS_MIME_TYPES_PERMITIDOS;

/**
 * Extensões de arquivo correspondentes aos tipos MIME
 */
export const EXTENSOES_PERMITIDAS = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    '.docx',
  ],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/bmp': ['.bmp'],
  'image/tiff': ['.tiff', '.tif'],
  'image/webp': ['.webp'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
    '.xlsx',
  ],
  'text/csv': ['.csv'],
  'application/vnd.oasis.opendocument.spreadsheet': ['.ods'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': [
    '.pptx',
  ],
  'application/vnd.oasis.opendocument.presentation': ['.odp'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md', '.markdown'],
  'text/html': ['.html', '.htm'],
  'application/rtf': ['.rtf'],
  'application/zip': ['.zip'],
  'application/x-rar-compressed': ['.rar'],
  'application/x-7z-compressed': ['.7z'],
  'application/gzip': ['.gz', '.gzip'],
};

/**
 * Obtém a categoria de um tipo MIME
 * @param mimeType Tipo MIME
 * @returns Nome da categoria ou 'DESCONHECIDO'
 */
export function getCategoriaMimeType(mimeType: string): string {
  for (const [categoria, tipos] of Object.entries(MIME_TYPES_PERMITIDOS)) {
    if (tipos.includes(mimeType)) {
      return categoria;
    }
  }
  return 'DESCONHECIDO';
}

/**
 * Verifica se um tipo MIME é permitido
 * @param mimeType Tipo MIME a ser verificado
 * @returns true se o tipo MIME é permitido, false caso contrário
 */
export function isMimeTypePermitido(mimeType: string): boolean {
  return TODOS_MIME_TYPES_PERMITIDOS.includes(mimeType);
}

/**
 * Obtém as extensões permitidas para um tipo MIME
 * @param mimeType Tipo MIME
 * @returns Array de extensões permitidas ou array vazio se o tipo MIME não for reconhecido
 */
export function getExtensoesParaMimeType(mimeType: string): string[] {
  return EXTENSOES_PERMITIDAS[mimeType] || [];
}
