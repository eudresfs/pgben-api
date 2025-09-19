/**
 * Utilitário para sanitização de nomes de arquivo
 * Remove ou substitui caracteres problemáticos que podem causar erros no sistema de arquivos
 */

/**
 * Remove acentos e caracteres especiais de uma string
 */
export function removeAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s.-]/g, '');
}

/**
 * Sanitiza um nome de arquivo removendo caracteres problemáticos
 * Preserva a extensão do arquivo
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) {
    return 'arquivo_sem_nome';
  }

  // Separar nome e extensão
  const lastDotIndex = filename.lastIndexOf('.');
  let name = filename;
  let extension = '';

  if (lastDotIndex > 0) {
    name = filename.substring(0, lastDotIndex);
    extension = filename.substring(lastDotIndex);
  }

  // Sanitizar o nome
  const sanitizedName = removeAccents(name)
    .replace(/\s+/g, '_') // Substituir espaços por underscore
    .replace(/[^a-zA-Z0-9_-]/g, '') // Remover caracteres especiais
    .replace(/_{2,}/g, '_') // Substituir múltiplos underscores por um
    .replace(/^_+|_+$/g, '') // Remover underscores do início e fim
    .toLowerCase();

  // Sanitizar a extensão
  const sanitizedExtension = extension
    .replace(/[^a-zA-Z0-9.]/g, '')
    .toLowerCase();

  // Garantir que o nome não fique vazio
  const finalName = sanitizedName || 'arquivo';

  return `${finalName}${sanitizedExtension}`;
}

/**
 * Gera um nome de arquivo único adicionando timestamp
 */
export function generateUniqueFilename(originalFilename: string): string {
  const sanitized = sanitizeFilename(originalFilename);
  const timestamp = Date.now();
  
  // Separar nome e extensão do arquivo sanitizado
  const lastDotIndex = sanitized.lastIndexOf('.');
  if (lastDotIndex > 0) {
    const name = sanitized.substring(0, lastDotIndex);
    const extension = sanitized.substring(lastDotIndex);
    return `${name}_${timestamp}${extension}`;
  }
  
  return `${sanitized}_${timestamp}`;
}

/**
 * Valida se um nome de arquivo é seguro para uso no sistema de arquivos
 */
export function isFilenameSafe(filename: string): boolean {
  // Verificar se contém apenas caracteres seguros
  const safePattern = /^[a-zA-Z0-9._-]+$/;
  
  // Verificar se não é muito longo (limite de 255 caracteres)
  if (filename.length > 255) {
    return false;
  }
  
  // Verificar se não contém nomes reservados do Windows
  const reservedNames = [
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
  ];
  
  const nameWithoutExtension = filename.split('.')[0].toUpperCase();
  if (reservedNames.includes(nameWithoutExtension)) {
    return false;
  }
  
  return safePattern.test(filename);
}

/**
 * Trunca um nome de arquivo se for muito longo, preservando a extensão
 */
export function truncateFilename(filename: string, maxLength: number = 255): string {
  if (filename.length <= maxLength) {
    return filename;
  }
  
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex > 0) {
    const extension = filename.substring(lastDotIndex);
    const maxNameLength = maxLength - extension.length;
    const name = filename.substring(0, lastDotIndex);
    
    if (maxNameLength > 0) {
      return name.substring(0, maxNameLength) + extension;
    }
  }
  
  return filename.substring(0, maxLength);
}