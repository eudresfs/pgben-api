import { BadRequestException } from '@nestjs/common';
import { validate as isUUID } from 'uuid';

/**
 * Utilitários para transformação e validação de filtros avançados
 * 
 * Fornece funções reutilizáveis para:
 * - Transformação de valores em arrays
 * - Validação de UUIDs
 * - Sanitização de strings
 * - Normalização de dados
 * 
 * Implementa o princípio DRY evitando duplicação de código
 */

/**
 * Transforma valores em arrays de strings, incluindo parsing de JSON
 * 
 * @param value - Valor a ser transformado
 * @param maxItems - Número máximo de itens permitidos
 * @returns Array filtrado ou undefined se vazio
 */
export function transformToStringArray(
  value: any,
  maxItems: number = 50
): string[] | undefined {
  if (!value || value === '' || (Array.isArray(value) && value.length === 0)) {
    return undefined;
  }
  
  let result: string[] = [];
  
  // Se é uma string que parece ser JSON array, tenta fazer o parse
  if (typeof value === 'string' && value.trim().startsWith('[') && value.trim().endsWith(']')) {
    try {
      const parsed = JSON.parse(value.trim());
      if (Array.isArray(parsed)) {
        result = parsed
          .filter(v => v && typeof v === 'string' && v.trim() !== '')
          .map(v => v.trim());
      }
    } catch (error) {
      // Fallback: usar regex para extrair valores de array
      const arrayMatch = value.trim().match(/^\[(.+)\]$/);
      if (arrayMatch) {
        const content = arrayMatch[1];
        result = content
          .split(',')
          .map(item => item.trim().replace(/["']/g, ''))
          .filter(item => item !== '');
      } else {
        // Se falhar o parse, trata como string normal
        result = [value.trim()];
      }
    }
  }
  // Se já é um array
  else if (Array.isArray(value)) {
    result = value
      .filter(v => v && typeof v === 'string' && v.trim() !== '')
      .map(v => v.trim());
  }
  // Se é uma string simples
  else if (typeof value === 'string') {
    result = value.trim() !== '' ? [value.trim()] : [];
  }
  
  // Validar tamanho máximo
  if (result.length > maxItems) {
    throw new BadRequestException(
      `Máximo de ${maxItems} itens permitidos. Recebido: ${result.length}`
    );
  }
  
  return result.length > 0 ? result : undefined;
}

/**
 * Transforma valores em arrays de UUIDs válidos
 * 
 * @param value - Valor a ser transformado
 * @param maxItems - Número máximo de itens permitidos
 * @returns Array de UUIDs válidos ou undefined se vazio
 */
export function transformToUUIDArray(
  value: any,
  maxItems: number = 50
): string[] | undefined {
  const stringArray = transformToStringArray(value, maxItems);
  
  if (!stringArray) {
    return undefined;
  }
  
  // Validar cada UUID
  const invalidUUIDs: string[] = [];
  const validUUIDs = stringArray.filter(uuid => {
    const isValid = isUUID(uuid);
    if (!isValid) {
      invalidUUIDs.push(uuid);
    }
    return isValid;
  });
  
  if (invalidUUIDs.length > 0) {
    throw new BadRequestException(
      `UUIDs inválidos encontrados: ${invalidUUIDs.join(', ')}`
    );
  }
  
  return validUUIDs.length > 0 ? validUUIDs : undefined;
}

/**
 * Transforma valores em arrays de enums válidos
 * 
 * @param value - Valor a ser transformado
 * @param enumObject - Objeto enum para validação
 * @param maxItems - Número máximo de itens permitidos
 * @returns Array de valores enum válidos ou undefined se vazio
 */
export function transformToEnumArray<T extends Record<string, string>>(
  value: any,
  enumObject: T,
  maxItems: number = 20
): Array<T[keyof T]> | undefined {
  const stringArray = transformToStringArray(value, maxItems);
  
  if (!stringArray) {
    return undefined;
  }
  
  const enumValues = Object.values(enumObject);
  const invalidValues: string[] = [];
  
  const validValues = stringArray.filter(val => {
    const isValid = enumValues.includes(val as T[keyof T]);
    if (!isValid) {
      invalidValues.push(val);
    }
    return isValid;
  }) as Array<T[keyof T]>;
  
  if (invalidValues.length > 0) {
    throw new BadRequestException(
      `Valores inválidos encontrados: ${invalidValues.join(', ')}. ` +
      `Valores permitidos: ${enumValues.join(', ')}`
    );
  }
  
  return validValues.length > 0 ? validValues : undefined;
}

/**
 * Sanitiza string removendo caracteres especiais perigosos
 * 
 * @param value - String a ser sanitizada
 * @returns String sanitizada
 */
export function sanitizeString(value: string): string {
  if (!value || typeof value !== 'string') {
    return '';
  }
  
  return value
    .trim()
    .replace(/[<>"'&]/g, '') // Remove caracteres HTML perigosos
    .replace(/\s+/g, ' ') // Normaliza espaços
    .substring(0, 255); // Limita tamanho
}

/**
 * Sanitiza array de strings
 * 
 * @param values - Array de strings a serem sanitizadas
 * @returns Array de strings sanitizadas
 */
export function sanitizeStringArray(values: string[]): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  
  return values
    .map(sanitizeString)
    .filter(val => val.length > 0);
}

/**
 * Valida e transforma valor booleano
 * 
 * @param value - Valor a ser transformado
 * @param defaultValue - Valor padrão se inválido
 * @returns Valor booleano
 */
export function transformToBoolean(
  value: any,
  defaultValue: boolean = false
): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  
  if (typeof value === 'string') {
    const normalized = value.toLowerCase().trim();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
      return true;
    }
    if (normalized === 'false' || normalized === '0' || normalized === 'no') {
      return false;
    }
  }
  
  if (typeof value === 'number') {
    return value !== 0;
  }
  
  return defaultValue;
}

/**
 * Valida e transforma valor numérico
 * 
 * @param value - Valor a ser transformado
 * @param min - Valor mínimo permitido
 * @param max - Valor máximo permitido
 * @param defaultValue - Valor padrão se inválido
 * @returns Valor numérico
 */
export function transformToNumber(
  value: any,
  min: number = 0,
  max: number = Number.MAX_SAFE_INTEGER,
  defaultValue: number = 0
): number {
  let num: number;
  
  if (typeof value === 'number') {
    num = value;
  } else if (typeof value === 'string') {
    num = parseInt(value, 10);
  } else {
    return defaultValue;
  }
  
  if (isNaN(num)) {
    return defaultValue;
  }
  
  // Aplicar limites
  if (num < min) {
    return min;
  }
  
  if (num > max) {
    return max;
  }
  
  return num;
}

/**
 * Valida formato de data ISO 8601
 * 
 * @param value - String de data a ser validada
 * @returns true se válida, false caso contrário
 */
export function isValidISODate(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  
  const date = new Date(value);
  return !isNaN(date.getTime()) && date.toISOString() === value;
}

/**
 * Transforma e valida string de data
 * 
 * @param value - Valor a ser transformado
 * @returns String de data válida ou undefined
 */
export function transformToDateString(value: any): string | undefined {
  if (!value) {
    return undefined;
  }
  
  if (typeof value !== 'string') {
    return undefined;
  }
  
  const trimmed = value.trim();
  if (trimmed === '') {
    return undefined;
  }
  
  // Tentar criar data para validar
  const date = new Date(trimmed);
  if (isNaN(date.getTime())) {
    throw new BadRequestException(`Data inválida: ${trimmed}`);
  }
  
  return trimmed;
}

/**
 * Remove valores undefined, null e vazios de um objeto
 * 
 * @param obj - Objeto a ser limpo
 * @returns Objeto limpo
 */
export function removeEmptyValues<T extends Record<string, any>>(
  obj: T
): Partial<T> {
  const cleaned: Partial<T> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        if (value.length > 0) {
          cleaned[key as keyof T] = value as T[keyof T];
        }
      } else {
        cleaned[key as keyof T] = value as T[keyof T];
      }
    }
  }
  
  return cleaned;
}

/**
 * Gera chave de cache baseada em filtros
 * 
 * @param filtros - Objeto de filtros
 * @param prefixo - Prefixo para a chave
 * @returns Chave de cache única
 */
export function gerarChaveCache(
  filtros: Record<string, any>,
  prefixo: string = 'filtros'
): string {
  const normalized = removeEmptyValues(filtros);
  const sorted = Object.keys(normalized)
    .sort()
    .reduce((result, key) => {
      result[key] = normalized[key];
      return result;
    }, {} as Record<string, any>);
  
  const hash = Buffer.from(JSON.stringify(sorted))
    .toString('base64')
    .replace(/[+/=]/g, '')
    .substring(0, 16);
  
  return `${prefixo}:${hash}`;
}