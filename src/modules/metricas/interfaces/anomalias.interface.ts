/**
 * Nível de confiança para detecção de anomalias
 */
export enum NivelConfiancaAnomalia {
    BAIXO = 'baixo',     // Menos rigoroso (mais falsos positivos)
    MEDIO = 'medio',     // Equilíbrio entre falsos positivos e falsos negativos
    ALTO = 'alto',       // Mais rigoroso (mais falsos negativos)
  }
  
  /**
   * Resultado da detecção de anomalias
   */
  export interface ResultadoDeteccaoAnomalia {
    /** ID da métrica analisada */
    metrica_id: string;
    
    /** Código da métrica */
    metrica_codigo: string;
    
    /** Nome da métrica */
    metrica_nome: string;
    
    /** ID do snapshot analisado */
    snapshot_id: string;
    
    /** Valor do snapshot */
    valor: number;
    
    /** Valor médio histórico */
    valor_medio_historico: number;
    
    /** Desvio padrão histórico */
    desvio_padrao_historico: number;
    
    /** Z-score calculado */
    z_score: number;
    
    /** Indicador de se o valor é anomalia */
    e_anomalia: boolean;
    
    /** Gravidade da anomalia (desvios padrão) */
    gravidade: number;
    
    /** Dimensões do snapshot */
    dimensoes: Record<string, any>;
    
    /** Período do snapshot */
    periodo: {
      inicio: Date;
      fim: Date;
    };
    
    /** Timestamp da detecção */
    timestamp: Date;
  }
  
  /**
   * Interface para representar uma anomalia detectada
   */
  export interface AnomaliaDetectada {
    /** Data da ocorrência da anomalia */
    data: Date;
    
    /** Valor observado */
    valor: number;
    
    /** Desvio padrão (Z-score) */
    desvio_padrao: number;
    
    /** Nível de severidade da anomalia */
    severidade: 'baixa' | 'media' | 'alta';
    
    /** Dimensões do snapshot anomalo */
    dimensoes: Record<string, any>;
  }
  
  /**
   * Resultado da detecção de anomalias por código de métrica
   */
  export interface ResultadoDeteccaoAnomaliaPorCodigo {
    /** Código da métrica analisada */
    codigo: string;
    
    /** Nome da métrica */
    nome: string;
    
    /** Período analisado */
    periodo: {
      inicio: Date;
      fim: Date;
    };
    
    /** Total de snapshots analisados */
    total_snapshots: number;
    
    /** Estatísticas dos dados analisados */
    estatisticas: {
      media: number;
      desvio_padrao: number;
      mediana: number;
      min: number;
      max: number;
    };
    
    /** Lista de anomalias detectadas */
    anomalias: AnomaliaDetectada[];
    
    /** Total de anomalias encontradas */
    total_anomalias?: number;
    
    /** Mensagem explicativa (opcional) */
    mensagem?: string;
  }