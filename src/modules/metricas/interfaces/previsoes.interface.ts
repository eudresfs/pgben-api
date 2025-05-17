/**
 * Interface para um ponto de previsão com intervalo de confiança
 */
export interface PontoPrevisao {
    /** Data da previsão */
    data: Date;
    
    /** Valor previsto */
    valor: number;
    
    /** Intervalo de confiança da previsão */
    intervalo_confianca: {
      /** Valor mínimo do intervalo de confiança */
      minimo: number;
      
      /** Valor máximo do intervalo de confiança */
      maximo: number;
    };
  }
  
  /**
   * Resultado detalhado de uma previsão
   */
  export interface ResultadoPrevisao {
    /** Array de pontos de previsão */
    previsao: PontoPrevisao[];
    
    /** Coeficiente de determinação (R²) do modelo */
    r2: number;
    
    /** Erro médio absoluto do modelo */
    erro_medio: number;
    
    /** Modelo utilizado para a previsão */
    modelo?: string;
  }
  
  /**
   * Resultado completo de uma previsão de métrica
   */
  export interface PrevisaoMetrica {
    /** ID da métrica analisada */
    metrica_id: string;
    
    /** Código da métrica */
    metrica_codigo: string;
    
    /** Nome da métrica */
    metrica_nome: string;
    
    /** Resultado detalhado da previsão */
    resultado: ResultadoPrevisao;
    
    /** Dimensões utilizadas na previsão */
    dimensoes: Record<string, any>;
    
    /** Período histórico utilizado */
    periodo_historico: {
      inicio: Date;
      fim: Date;
    };
    
    /** Data e hora de geração da previsão */
    timestamp: Date;
  }