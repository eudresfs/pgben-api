import { Transform } from 'class-transformer';

/**
 * Decorator que transforma strings vazias em undefined
 * Útil para campos opcionais que podem vir como string vazia nos query parameters
 */
export function TransformEmptyString() {
  return Transform(({ value }) => {
    if (typeof value === 'string' && value.trim() === '') {
      return undefined;
    }
    return value;
  });
}

/**
 * Decorator específico para campos UUID que transforma strings vazias em undefined
 */
export function TransformEmptyUuid() {
  return Transform(({ value }) => {
    if (typeof value === 'string' && (value.trim() === '' || value === 'undefined' || value === 'null')) {
      return undefined;
    }
    return value;
  });
}