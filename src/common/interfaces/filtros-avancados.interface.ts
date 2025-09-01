import { PeriodoPredefinido } from '../../enums/periodo-predefinido.enum';
import { Prioridade } from '../../enums/prioridade.enum';

/**
 * Interface base para filtros avançados
 * 
 * Define a estrutura padronizada para todos os filtros avançados
 * utilizados no sistema, garantindo consistência e type safety
 */
export interface IFiltrosAvancados {
  // ========== FILTROS POR MÚLTIPLOS ITENS (ARRAYS) ==========
  
  /** IDs das unidades para filtrar (máximo 50) */
  unidades?: string[];
  
  /** Nomes dos bairros para filtrar (máximo 50) */
  bairros?: string[];
  
  /** IDs dos usuários responsáveis para filtrar (máximo 50) */
  usuarios?: string[];
  
  /** Status para filtrar (máximo 20) */
  status?: string[];
  
  /** IDs dos benefícios para filtrar (máximo 50) */
  beneficios?: string[];
  
  /** Roles para filtrar (máximo 20) */
  roles?: string[];
  
  /** IDs dos setores para filtrar (máximo 50) */
  setores?: string[];

  /** Tipos de unidade para filtrar (máximo 20) */
  tipo?: string[];
  
  // ========== FILTROS DE BUSCA TEXTUAL ==========
  
  /** Termo de busca textual */
  search?: string;

  /**
   * Filtro para primeiro acesso do usuário
   */
  primeiro_acesso?: boolean;

  /**
   * Número mínimo de tentativas de login
   */
  tentativas_login_min?: number;

  /**
   * Número máximo de tentativas de login
   */
  tentativas_login_max?: number;
  
  // ========== FILTROS INDIVIDUAIS OBRIGATÓRIOS ==========
  
  /** Período predefinido para filtrar */
  periodo?: PeriodoPredefinido;
  
  /** Data de início personalizada (ISO 8601) */
  data_inicio?: string;
  
  /** Data de fim personalizada (ISO 8601) */
  data_fim?: string;
  
  /** Prioridade para filtrar */
  prioridade?: Prioridade;
  
  // ========== PAGINAÇÃO E CONFIGURAÇÕES ==========
  
  /** Limite de registros (1-10000, padrão: 1000) */
  limit?: number;
  
  /** Offset para paginação (mínimo: 0, padrão: 0) */
  offset?: number;
  
  /** Incluir dados arquivados/inativos (padrão: false) */
  incluir_arquivados?: boolean;
}

/**
 * Interface para período calculado
 * 
 * Representa um período de tempo calculado com base em um período predefinido
 * ou datas personalizadas
 */
export interface IPeriodoCalculado {
  /** Data de início do período */
  dataInicio?: Date;
  
  /** Data de fim do período */
  dataFim?: Date;
  
  /** Descrição legível do período */
  descricao?: string;
  
  /** Timezone utilizado no cálculo */
  timezone?: string;
}

/**
 * Interface para resultado de validação de período personalizado
 */
export interface IValidacaoPeriodo {
  /** Se o período é válido */
  valido: boolean;
  
  /** Mensagem de erro se inválido */
  erro?: string;
  
  /** Detalhes adicionais sobre a validação */
  detalhes?: {
    dataInicioValida?: boolean;
    dataFimValida?: boolean;
    intervaloValido?: boolean;
    dentroLimites?: boolean;
  };
}

/**
 * Interface para configuração de filtros por domínio
 * 
 * Permite personalizar quais filtros estão disponíveis para cada domínio
 */
export interface IConfiguracaoFiltros {
  /** Domínio/módulo ao qual se aplica */
  dominio: string;
  
  /** Filtros de array habilitados */
  filtrosArray: {
    unidades?: boolean;
    bairros?: boolean;
    usuarios?: boolean;
    status?: boolean;
    beneficios?: boolean;
    roles?: boolean;
  };
  
  /** Filtros individuais habilitados */
  filtrosIndividuais: {
    periodo?: boolean;
    prioridade?: boolean;
  };
  
  /** Configurações de paginação */
  paginacao: {
    limiteMaximo?: number;
    limitePadrao?: number;
  };
  
  /** Validações específicas do domínio */
  validacoes?: {
    statusPermitidos?: string[];
    rolesPermitidas?: string[];
    periodoMaximoDias?: number;
  };
}

/**
 * Interface para resultado de aplicação de filtros
 * 
 * Representa o resultado da aplicação de filtros em uma query
 */
export interface IResultadoFiltros<T = any> {
  /** Dados filtrados */
  items: T[];
  
  /** Total de registros (antes da paginação) */
  total: number;
  
  /** Filtros aplicados */
  filtros_aplicados: IFiltrosAvancados;
  
  /** Período calculado (se aplicável) */
  periodoCalculado?: IPeriodoCalculado;
  
  /** Metadados da paginação */
  meta: {
    limit: number;
    offset: number;
    page: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  
  /** Tempo de execução da query (em ms) */
  tempo_execucao?: number;
}

/**
 * Interface para estatísticas de filtros
 * 
 * Fornece informações sobre o uso e performance dos filtros
 */
export interface IEstatisticasFiltros {
  /** Filtros mais utilizados */
  filtrosMaisUsados: Array<{
    filtro: string;
    contador: number;
    percentual: number;
  }>;
  
  /** Tempo médio de execução por tipo de filtro */
  tempoMedioExecucao: Record<string, number>;
  
  /** Combinações de filtros mais comuns */
  combinacoesComuns: Array<{
    filtros: string[];
    contador: number;
  }>;
  
  /** Período de análise */
  periodoAnalise: {
    inicio: Date;
    fim: Date;
  };
}

/**
 * Interface para cache de filtros
 * 
 * Define a estrutura para cache de resultados de filtros
 */
export interface ICacheFiltros {
  /** Chave única do cache */
  chave: string;
  
  /** Filtros que geraram o cache */
  filtros: IFiltrosAvancados;
  
  /** Resultado em cache */
  resultado: any;
  
  /** Timestamp de criação */
  criadoEm: Date;
  
  /** Timestamp de expiração */
  expiraEm: Date;
  
  /** Número de hits do cache */
  hits: number;
  
  /** Tamanho do resultado em bytes */
  tamanho: number;
}