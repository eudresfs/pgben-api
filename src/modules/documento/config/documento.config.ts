/**
 * Configuração consolidada para o módulo de documentos
 *
 * Este arquivo centraliza todas as configurações relacionadas a documentos,
 * incluindo tipos MIME permitidos e configurações de upload.
 */

export interface MimeTypeConfig {
  extension: string;
  mimeTypes: string[];
  maxSize: number; // em bytes
  description: string;
  allowThumbnail: boolean;
  category: 'DOCUMENTOS' | 'IMAGENS' | 'PLANILHAS' | 'TEXTO';
}

/**
 * Configuração detalhada de tipos MIME permitidos
 */
export const MIME_TYPE_CONFIGS: Record<string, MimeTypeConfig> = {
  // Documentos PDF
  pdf: {
    extension: 'pdf',
    mimeTypes: ['application/pdf'],
    maxSize: 10 * 1024 * 1024, // 10MB
    description: 'Documento PDF',
    allowThumbnail: true,
    category: 'DOCUMENTOS',
  },

  // Documentos do Microsoft Office
  docx: {
    extension: 'docx',
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    maxSize: 5 * 1024 * 1024, // 5MB
    description: 'Documento Word',
    allowThumbnail: false,
    category: 'DOCUMENTOS',
  },

  // Imagens
  jpg: {
    extension: 'jpg',
    mimeTypes: ['image/jpeg'],
    maxSize: 5 * 1024 * 1024, // 5MB
    description: 'Imagem JPEG',
    allowThumbnail: true,
    category: 'IMAGENS',
  },

  png: {
    extension: 'png',
    mimeTypes: ['image/png'],
    maxSize: 5 * 1024 * 1024, // 5MB
    description: 'Imagem PNG',
    allowThumbnail: true,
    category: 'IMAGENS',
  },

  // Texto
  txt: {
    extension: 'txt',
    mimeTypes: ['text/plain'],
    maxSize: 1 * 1024 * 1024, // 1MB
    description: 'Arquivo de texto',
    allowThumbnail: false,
    category: 'TEXTO',
  },
};

/**
 * Lista de todos os tipos MIME permitidos (extraída das configurações)
 */
export const TODOS_MIME_TYPES_PERMITIDOS = Object.values(
  MIME_TYPE_CONFIGS,
).flatMap((config) => config.mimeTypes);

/**
 * Mapeamento de tipos MIME por categoria
 */
export const MIME_TYPES_POR_CATEGORIA = {
  DOCUMENTOS: Object.values(MIME_TYPE_CONFIGS)
    .filter((config) => config.category === 'DOCUMENTOS')
    .flatMap((config) => config.mimeTypes),
  IMAGENS: Object.values(MIME_TYPE_CONFIGS)
    .filter((config) => config.category === 'IMAGENS')
    .flatMap((config) => config.mimeTypes),
  PLANILHAS: Object.values(MIME_TYPE_CONFIGS)
    .filter((config) => config.category === 'PLANILHAS')
    .flatMap((config) => config.mimeTypes),
  // APRESENTACOES: Categoria não definida na interface MimeTypeConfig
  TEXTO: Object.values(MIME_TYPE_CONFIGS)
    .filter((config) => config.category === 'TEXTO')
    .flatMap((config) => config.mimeTypes),
};

/**
 * Extensões de arquivo correspondentes aos tipos MIME
 */
export const EXTENSOES_PERMITIDAS = Object.values(MIME_TYPE_CONFIGS).reduce(
  (acc, config) => {
    config.mimeTypes.forEach((mimeType) => {
      if (!acc[mimeType]) {
        acc[mimeType] = [];
      }
      acc[mimeType].push(`.${config.extension}`);
    });
    return acc;
  },
  {} as Record<string, string[]>,
);

/**
 * Lista de extensões perigosas que devem ser sempre bloqueadas
 */
export const BLOCKED_EXTENSIONS = [
  // Executáveis
  'exe',
  'bat',
  'cmd',
  'com',
  'scr',
  'pif',
  'msi',
  'dll',
  // Scripts
  'js',
  'vbs',
  'ps1',
  'sh',
  'py',
  'pl',
  'php',
  'asp',
  'jsp',
  // Arquivos compactados (podem conter malware)
  'zip',
  'rar',
  '7z',
  'tar',
  'gz',
  // Outros formatos perigosos
  'html',
  'htm',
  'xml',
  'svg',
];

/**
 * Lista de tipos MIME perigosos que devem ser sempre bloqueados
 */
export const BLOCKED_MIME_TYPES = [
  // Executáveis
  'application/x-msdownload',
  'application/x-executable',
  'application/x-dosexec',
  // Scripts
  'text/javascript',
  'application/javascript',
  'text/html',
  'application/x-httpd-php',
  // Arquivos compactados
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  // XML/SVG (podem conter scripts)
  'image/svg+xml',
  'application/xml',
  'text/xml',
];

/**
 * Configurações de segurança para validação de arquivos
 */
export const SECURITY_CONFIG = {
  // Tamanho máximo global para qualquer arquivo (20MB)
  MAX_FILE_SIZE: 20 * 1024 * 1024,

  // Número máximo de arquivos por upload
  MAX_FILES_PER_UPLOAD: 5,

  // Verificar magic numbers (assinatura do arquivo)
  VERIFY_MAGIC_NUMBERS: true,

  // Escanear conteúdo em busca de padrões suspeitos
  SCAN_CONTENT: true,

  // Verificar vírus/malware
  MALWARE_SCAN: true,

  // Criptografar documentos sensíveis
  ENCRYPT_SENSITIVE_DOCS: true,

  // Colocar arquivos suspeitos em quarentena
  QUARANTINE_SUSPICIOUS: true,
};

/**
 * Configurações de upload
 */
export const UPLOAD_CONFIG = {
  // Diretório temporário para uploads
  TEMP_DIR: 'uploads/temp',

  // Diretório final para documentos
  DOCS_DIR: 'uploads/documentos',

  // Diretório para thumbnails
  THUMBNAILS_DIR: 'uploads/thumbnails',

  // Tempo limite para upload (em segundos)
  UPLOAD_TIMEOUT: 300,

  // Número máximo de tentativas de upload
  MAX_UPLOAD_RETRIES: 3,
};

/**
 * Funções utilitárias
 */

/**
 * Obtém a configuração de um tipo MIME
 */
export function getMimeTypeConfig(
  mimeType: string,
): MimeTypeConfig | undefined {
  return Object.values(MIME_TYPE_CONFIGS).find((config) =>
    config.mimeTypes.includes(mimeType),
  );
}

/**
 * Verifica se um tipo MIME é permitido
 */
export function isMimeTypePermitido(mimeType: string): boolean {
  return TODOS_MIME_TYPES_PERMITIDOS.includes(mimeType);
}

/**
 * Obtém a categoria de um tipo MIME
 */
export function getCategoriaMimeType(mimeType: string): string {
  const config = getMimeTypeConfig(mimeType);
  return config?.category || 'DESCONHECIDO';
}

/**
 * Obtém as extensões permitidas para um tipo MIME
 */
export function getExtensoesParaMimeType(mimeType: string): string[] {
  return EXTENSOES_PERMITIDAS[mimeType] || [];
}

/**
 * Verifica se um arquivo requer criptografia
 */
export function requiresEncryption(mimeType: string): boolean {
  // Funcionalidade de criptografia não implementada ainda
  return false;
}

/**
 * Verifica se um arquivo permite thumbnail
 */
export function allowsThumbnail(mimeType: string): boolean {
  const config = getMimeTypeConfig(mimeType);
  return config?.allowThumbnail || false;
}

/**
 * Obtém o tamanho máximo permitido para um tipo MIME
 */
export function getMaxFileSize(mimeType: string): number {
  const config = getMimeTypeConfig(mimeType);
  return config?.maxSize || SECURITY_CONFIG.MAX_FILE_SIZE;
}
