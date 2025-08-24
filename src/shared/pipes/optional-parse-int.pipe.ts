import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

/**
 * Pipe customizado para parsing de inteiros opcionais
 * 
 * @description
 * Este pipe resolve o problema de validação quando parâmetros de query
 * são enviados como strings vazias. Diferente do ParseIntPipe padrão,
 * este pipe trata strings vazias como valores undefined, evitando
 * erros de validação desnecessários.
 * 
 * @features
 * - Converte strings vazias em undefined
 * - Converte strings numéricas válidas em números
 * - Mantém valores undefined como undefined
 * - Fornece mensagens de erro claras
 * - Suporta valores padrão
 * 
 * @example
 * ```typescript
 * // No controller
 * @Query('page', OptionalParseIntPipe) page: number = 1
 * 
 * // Comportamento:
 * // ?page=5 -> 5
 * // ?page= -> undefined (usa valor padrão)
 * // ?page -> undefined (usa valor padrão)
 * // ?page=abc -> BadRequestException
 * ```
 * 
 * @author Sistema PGBEN
 * @since 2025-01-21
 */
@Injectable()
export class OptionalParseIntPipe implements PipeTransform<string, number | undefined> {
  constructor(
    private readonly options?: {
      /** Valor mínimo permitido */
      min?: number;
      /** Valor máximo permitido */
      max?: number;
      /** Nome do campo para mensagens de erro mais específicas */
      fieldName?: string;
    }
  ) {}

  /**
   * Transforma o valor de entrada em um número ou undefined
   * 
   * @param value Valor a ser transformado
   * @returns Número válido ou undefined
   * @throws BadRequestException se o valor não for um número válido
   */
  transform(value: string | undefined): number | undefined {
    // Se o valor é undefined ou null, retorna undefined
    if (value === undefined || value === null) {
      return undefined;
    }

    // Se o valor é uma string vazia ou apenas espaços, retorna undefined
    if (typeof value === 'string' && value.trim() === '') {
      return undefined;
    }

    // Tenta converter para número
    const numericValue = parseInt(value, 10);

    // Verifica se a conversão foi bem-sucedida
    if (isNaN(numericValue)) {
      const fieldName = this.options?.fieldName || 'valor';
      throw new BadRequestException(
        `${fieldName} deve ser um número válido. Valor recebido: '${value}'`
      );
    }

    // Aplica validações de range se especificadas
    if (this.options?.min !== undefined && numericValue < this.options.min) {
      const fieldName = this.options?.fieldName || 'valor';
      throw new BadRequestException(
        `${fieldName} deve ser maior ou igual a ${this.options.min}. Valor recebido: ${numericValue}`
      );
    }

    if (this.options?.max !== undefined && numericValue > this.options.max) {
      const fieldName = this.options?.fieldName || 'valor';
      throw new BadRequestException(
        `${fieldName} deve ser menor ou igual a ${this.options.max}. Valor recebido: ${numericValue}`
      );
    }

    return numericValue;
  }
}

/**
 * Factory function para criar pipes com configurações específicas
 * 
 * @example
 * ```typescript
 * // Pipe para página com validação de range
 * @Query('page', createOptionalParseIntPipe({ min: 1, fieldName: 'página' }))
 * page: number = 1
 * 
 * // Pipe para limite com range específico
 * @Query('limit', createOptionalParseIntPipe({ min: 1, max: 100, fieldName: 'limite' }))
 * limit: number = 10
 * ```
 */
export function createOptionalParseIntPipe(options?: {
  min?: number;
  max?: number;
  fieldName?: string;
}): OptionalParseIntPipe {
  return new OptionalParseIntPipe(options);
}

/**
 * Pipes pré-configurados para casos comuns
 */
export const PagePipe = createOptionalParseIntPipe({
  min: 1,
  fieldName: 'página'
});

export const LimitPipe = createOptionalParseIntPipe({
  min: 1,
  max: 200,
  fieldName: 'limite'
});

export const OffsetPipe = createOptionalParseIntPipe({
  min: 0,
  fieldName: 'offset'
});