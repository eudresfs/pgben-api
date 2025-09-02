/**
 * Constantes utilizadas nos cálculos de métricas do dashboard
 * Centraliza valores configuráveis para facilitar manutenção
 */
export class MetricasConstants {
  /**
   * População base estimada para cálculo de taxa de cobertura social
   * Valor configurável que deve ser ajustado conforme dados demográficos reais
   */
  static readonly POPULACAO_BASE_DEFAULT = 50000;

  /**
   * Média estimada de pessoas por família
   * Utilizada para calcular impacto em pessoas baseado no número de famílias
   */
  static readonly MEDIA_PESSOAS_POR_FAMILIA = 3;

  /**
   * Período padrão em dias para filtros quando não especificado
   */
  static readonly PERIODO_PADRAO_DIAS = 30;

  /**
   * Número de meses para análise de evolução temporal
   */
  static readonly MESES_EVOLUCAO_TEMPORAL = 6;

  /**
   * Precisão decimal para cálculos monetários
   */
  static readonly PRECISAO_DECIMAL_MONETARIO = 2;

  /**
   * Precisão decimal para percentuais
   */
  static readonly PRECISAO_DECIMAL_PERCENTUAL = 1;

  /**
   * Multiplicador para conversão de percentual (base 100)
   */
  static readonly MULTIPLICADOR_PERCENTUAL = 100;

  /**
   * Multiplicador para arredondamento de valores monetários
   */
  static readonly MULTIPLICADOR_ARREDONDAMENTO_MONETARIO = 100;

  /**
   * Multiplicador para arredondamento de percentuais
   */
  static readonly MULTIPLICADOR_ARREDONDAMENTO_PERCENTUAL = 10;
}