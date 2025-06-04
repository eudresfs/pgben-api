/**
 * Enum que define os tipos de parâmetros de configuração suportados pelo sistema.
 * Cada tipo determina como o valor do parâmetro será convertido e validado.
 */
export enum ParametroTipoEnum {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  JSON = 'json',
  DATE = 'date',
}
