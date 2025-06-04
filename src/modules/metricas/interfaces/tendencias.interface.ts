/**
 * Resultado da análise de tendências
 */
export interface ResultadoAnaliseTendencia {
  /** ID da métrica analisada */
  metrica_id: string;

  /** Código da métrica */
  metrica_codigo: string;

  /** Nome da métrica */
  metrica_nome: string;

  /** Direção da tendência (crescente, decrescente, estável) */
  direcao: 'crescente' | 'decrescente' | 'estavel';

  /** Intensidade da tendência (% de variação média) */
  intensidade: number;

  /** Confiança estatística da tendência (0-1) */
  confianca: number;

  /** Previsão para o próximo período */
  previsao: {
    valor: number;
    intervalo_confianca: {
      minimo: number;
      maximo: number;
    };
  };

  /** Valores utilizados na análise */
  valores_analisados: Array<{
    valor: number;
    periodo_inicio: Date;
    periodo_fim: Date;
  }>;

  /** Dimensões da análise */
  dimensoes: Record<string, any>;

  /** Período da análise */
  periodo: {
    inicio: Date;
    fim: Date;
  };

  /** Timestamp da análise */
  timestamp: Date;
}
