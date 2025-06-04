/**
 * Configuração de Validação MIME
 *
 * Define tipos MIME permitidos e configurações de segurança
 * para upload de documentos no sistema SEMTAS
 */

export interface MimeValidationConfig {
  allowedMimeTypes: string[];
  maxFileSize: number;
  allowedExtensions: string[];
  strictValidation: boolean;
  scanForMalware: boolean;
}

/**
 * Tipos MIME permitidos para documentos oficiais
 */
export const ALLOWED_MIME_TYPES = {
  // Documentos PDF
  PDF: 'application/pdf',

  // Imagens
  JPEG: 'image/jpeg',
  JPG: 'image/jpg',
  PNG: 'image/png',

  // Documentos do Microsoft Office
  DOC: 'application/msword',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  XLS: 'application/vnd.ms-excel',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

  // Documentos do LibreOffice/OpenOffice
  ODT: 'application/vnd.oasis.opendocument.text',
  ODS: 'application/vnd.oasis.opendocument.spreadsheet',

  // Texto simples
  TXT: 'text/plain',
} as const;

/**
 * Extensões de arquivo permitidas
 */
export const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.odt',
  '.ods',
  '.txt',
] as const;

/**
 * Configuração padrão de validação MIME
 */
export const DEFAULT_MIME_VALIDATION_CONFIG: MimeValidationConfig = {
  allowedMimeTypes: Object.values(ALLOWED_MIME_TYPES),
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedExtensions: [...ALLOWED_EXTENSIONS],
  strictValidation: true,
  scanForMalware: false, // Pode ser habilitado em produção
};

/**
 * Configuração específica por tipo de benefício
 */
export const BENEFIT_SPECIFIC_MIME_CONFIG = {
  AUXILIO_NATALIDADE: {
    ...DEFAULT_MIME_VALIDATION_CONFIG,
    allowedMimeTypes: [
      ALLOWED_MIME_TYPES.PDF,
      ALLOWED_MIME_TYPES.JPEG,
      ALLOWED_MIME_TYPES.JPG,
      ALLOWED_MIME_TYPES.PNG,
    ],
    maxFileSize: 5 * 1024 * 1024, // 5MB para documentos de natalidade
  },

  ALUGUEL_SOCIAL: {
    ...DEFAULT_MIME_VALIDATION_CONFIG,
    allowedMimeTypes: [
      ALLOWED_MIME_TYPES.PDF,
      ALLOWED_MIME_TYPES.JPEG,
      ALLOWED_MIME_TYPES.JPG,
      ALLOWED_MIME_TYPES.PNG,
      ALLOWED_MIME_TYPES.DOC,
      ALLOWED_MIME_TYPES.DOCX,
    ],
    maxFileSize: 8 * 1024 * 1024, // 8MB para documentos de aluguel
  },

  DEFAULT: DEFAULT_MIME_VALIDATION_CONFIG,
} as const;

/**
 * Mapeamento de extensão para tipo MIME
 */
export const EXTENSION_TO_MIME_MAP = {
  '.pdf': ALLOWED_MIME_TYPES.PDF,
  '.jpg': ALLOWED_MIME_TYPES.JPEG,
  '.jpeg': ALLOWED_MIME_TYPES.JPEG,
  '.png': ALLOWED_MIME_TYPES.PNG,
  '.doc': ALLOWED_MIME_TYPES.DOC,
  '.docx': ALLOWED_MIME_TYPES.DOCX,
  '.xls': ALLOWED_MIME_TYPES.XLS,
  '.xlsx': ALLOWED_MIME_TYPES.XLSX,
  '.odt': ALLOWED_MIME_TYPES.ODT,
  '.ods': ALLOWED_MIME_TYPES.ODS,
  '.txt': ALLOWED_MIME_TYPES.TXT,
} as const;

/**
 * Tipos MIME perigosos que devem ser sempre rejeitados
 */
export const DANGEROUS_MIME_TYPES = [
  'application/x-executable',
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-msi',
  'application/x-bat',
  'application/x-sh',
  'application/javascript',
  'text/javascript',
  'application/x-javascript',
  'text/html',
  'application/x-php',
  'application/x-httpd-php',
  'application/x-python-code',
  'application/java-archive',
  'application/x-java-archive',
] as const;

/**
 * Função para obter configuração MIME por tipo de benefício
 */
export function getMimeConfigForBenefit(
  tipoBeneficio?: string,
): MimeValidationConfig {
  if (!tipoBeneficio) {
    return BENEFIT_SPECIFIC_MIME_CONFIG.DEFAULT;
  }

  const normalizedType = tipoBeneficio.toUpperCase().replace(/\s+/g, '_');

  return (
    (BENEFIT_SPECIFIC_MIME_CONFIG as any)[normalizedType] ||
    BENEFIT_SPECIFIC_MIME_CONFIG.DEFAULT
  );
}

/**
 * Função para validar se um tipo MIME é permitido
 */
export function isMimeTypeAllowed(
  mimeType: string,
  config: MimeValidationConfig,
): boolean {
  // Verificar se não é um tipo perigoso
  if (DANGEROUS_MIME_TYPES.includes(mimeType as any)) {
    return false;
  }

  // Verificar se está na lista de permitidos
  return config.allowedMimeTypes.includes(mimeType);
}

/**
 * Função para validar extensão de arquivo
 */
export function isExtensionAllowed(
  filename: string,
  config: MimeValidationConfig,
): boolean {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return config.allowedExtensions.includes(extension);
}

/**
 * Função para obter tipo MIME esperado baseado na extensão
 */
export function getExpectedMimeType(filename: string): string | null {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return (
    EXTENSION_TO_MIME_MAP[extension as keyof typeof EXTENSION_TO_MIME_MAP] ||
    null
  );
}
