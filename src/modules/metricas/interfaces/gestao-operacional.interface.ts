/**
 * Interface para métricas de gestão operacional
 * Define a estrutura de dados retornada pelo endpoint GET /api/dashboard/gestao-operacional
 */

// Métricas gerais de gestão operacional
export interface GestaoOperacionalMetricasGerais {
  novos_beneficiarios: number;
  solicitacoes_iniciadas: number;
  concessoes: number;
  concessoes_judicializadas: number;
}

// Status das solicitações em tramitação
export interface SolicitacoesTramitacao {
  em_analise: number;
  pendentes: number;
  aprovadas: number;
  indeferidas: number;
}

// Métricas de performance operacional
export interface GestaoOperacionalPerformance {
  tempo_medio_solicitacao: number;
  tempo_medio_analise: number;
  solicitacoes_por_dia: number;
  concessoes_por_dia: number;
}

// Taxa de concessão
export interface TaxaConcessao {
  percentual_aprovacao: number;
  percentual_indeferimento: number;
}

// Dados para gráfico de evolução de concessões
export interface EvolucaoConcessoesItem {
  mes: string;
  aluguel_social: number;
  cesta_basica: number;
  beneficio_por_morte: number;
  beneficio_natalidade: number;
}

// Dados para gráfico de solicitações por dia da semana
export interface SolicitacoesDiaSemanaItem {
  dia: string;
  quantidade: number;
}

// Dados para gráfico de concessões por tipo de benefício
export interface ConcessoesTipoBeneficioItem {
  tipo: string;
  quantidade: number;
  percentual: number;
}

// Dados para gráfico de solicitações por unidade
export interface SolicitacoesUnidadeItem {
  unidade: string;
  quantidade: number;
  percentual: number;
}

// Estrutura completa dos gráficos de gestão operacional
export interface GestaoOperacionalGraficos {
  evolucao_concessoes: EvolucaoConcessoesItem[];
  solicitacoes_dia_semana: SolicitacoesDiaSemanaItem[];
  concessoes_tipo_beneficio: ConcessoesTipoBeneficioItem[];
  solicitacoes_unidade: SolicitacoesUnidadeItem[];
}

// Estrutura completa dos dados de gestão operacional
export interface GestaoOperacionalData {
  metricas_gerais: GestaoOperacionalMetricasGerais;
  solicitacoes_tramitacao: SolicitacoesTramitacao;
  performance: GestaoOperacionalPerformance;
  taxa_concessao: TaxaConcessao;
  graficos: GestaoOperacionalGraficos;
}

// Resposta completa do endpoint de gestão operacional
export interface GestaoOperacionalResponse {
  success: boolean;
  data: GestaoOperacionalData;
  message: string;
  timestamp: string;
}