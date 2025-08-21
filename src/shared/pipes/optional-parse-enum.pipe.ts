import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

/**
 * Pipe customizado para parsing de enums opcionais
 * 
 * @description
 * Este pipe resolve o problema de validação quando parâmetros de query
 * são enviados como strings vazias ou undefined. Diferente do ParseEnumPipe padrão,
 * este pipe trata strings vazias como valores undefined, evitando
 * erros de validação desnecessários.
 * 
 * @features
 * - Converte strings vazias em undefined
 * - Valida strings contra valores de enum permitidos
 * - Mantém valores undefined como undefined
 * - Fornece mensagens de erro claras
 * - Suporta valores padrão
 * 
 * @example
 * ```typescript
 * // No controller
 * @Query('periodo', new OptionalParseEnumPipe(['dia', 'semana', 'mes'])) 
 * periodo?: 'dia' | 'semana' | 'mes'
 * 
 * // Comportamento:
 * // ?periodo=dia -> 'dia'
 * // ?periodo= -> undefined
 * // ?periodo -> undefined
 * // ?periodo=invalid -> BadRequestException
 * ```
 * 
 * @author Sistema PGBEN
 * @since 2025-01-21
 */
@Injectable()
export class OptionalParseEnumPipe implements PipeTransform<string, string | undefined> {
  private readonly allowedValues: string[];
  private readonly enumName: string;

  /**
   * Construtor do pipe
   * 
   * @param allowedValues Array de valores permitidos para o enum
   * @param enumName Nome do enum para mensagens de erro (opcional)
   */
  constructor(allowedValues: string[], enumName?: string) {
    this.allowedValues = allowedValues;
    this.enumName = enumName || 'enum';
  }

  /**
   * Transforma o valor de entrada
   * 
   * @param value Valor a ser transformado
   * @param metadata Metadados do parâmetro
   * @returns Valor do enum ou undefined
   * @throws BadRequestException se o valor for inválido
   */
  transform(value: string | undefined): string | undefined {
    // Se o valor é undefined, null ou string vazia, retorna undefined
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    // Verifica se o valor está na lista de valores permitidos
    if (!this.allowedValues.includes(value)) {
      throw new BadRequestException(
        `Valor inválido para ${this.enumName}. ` +
        `Valores permitidos: ${this.allowedValues.join(', ')}. ` +
        `Valor recebido: '${value}'`
      );
    }

    return value;
  }

  /**
   * Método estático para criar uma instância com valores de enum
   * 
   * @param enumObject Objeto enum do TypeScript
   * @param enumName Nome do enum para mensagens de erro
   * @returns Nova instância do pipe
   */
  static forEnum<T extends Record<string, string>>(
    enumObject: T, 
    enumName?: string
  ): OptionalParseEnumPipe {
    const values = Object.values(enumObject);
    return new OptionalParseEnumPipe(values, enumName);
  }

  /**
   * Método estático para criar uma instância com array de valores
   * 
   * @param values Array de valores permitidos
   * @param enumName Nome do enum para mensagens de erro
   * @returns Nova instância do pipe
   */
  static forValues(
    values: string[], 
    enumName?: string
  ): OptionalParseEnumPipe {
    return new OptionalParseEnumPipe(values, enumName);
  }
}