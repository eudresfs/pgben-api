/**
 * Interface para métricas de impacto social
 * Define a estrutura de dados retornada pelo endpoint GET /api/dashboard/impacto-social
 */

// Métricas principais de impacto social
export interface ImpactoSocialMetricas {
  familias_beneficiadas: number;
  pessoas_impactadas: number;
  bairros_impactados: number;
  investimento_total: number;
}

// Indicadores calculados de impacto social
export interface ImpactoSocialIndicadores {
  valor_medio_por_familia: number;
  taxa_cobertura_social: number;
}

// Dados para gráfico de evolução mensal
export interface EvolucaoMensalItem {
  mes: string;
  familias: number;
  pessoas: number;
  investimento: number;
}

// Dados para gráfico de distribuição de benefícios
export interface DistribuicaoBeneficiosItem {
  tipo: string;
  quantidade: number;
  percentual: number;
}

// Dados para gráfico de recursos por faixa etária
export interface RecursosFaixaEtariaItem {
  faixa_etaria: string;
  recursos: number;
  percentual: number;
}

// Dados para gráfico de recursos por tipo de benefício
export interface RecursosTipoBeneficioItem {
  tipo_beneficio: string;
  recursos: number;
  percentual: number;
}

// Dados para gráfico de recursos e impacto por tipo
export interface RecursosImpactoTipoItem {
  tipo_beneficio: string;
  recursos: number;
  familias: number;
  pessoas: number;
}

// Dados para gráfico de recursos por bairros
export interface RecursosBairrosItem {
  bairro: string;
  recursos: number;
  percentual: number;
}

// Estrutura completa dos gráficos de impacto social
export interface ImpactoSocialGraficos {
  evolucao_mensal: EvolucaoMensalItem[];
  distribuicao_beneficios: DistribuicaoBeneficiosItem[];
  recursos_faixa_etaria: RecursosFaixaEtariaItem[];
  recursos_tipo_beneficio: RecursosTipoBeneficioItem[];
  recursos_impacto_tipo: RecursosImpactoTipoItem[];
  recursos_bairros: RecursosBairrosItem[];
}

// Estrutura completa dos dados de impacto social
export interface ImpactoSocialData {
  metricas: ImpactoSocialMetricas;
  indicadores: ImpactoSocialIndicadores;
  graficos: ImpactoSocialGraficos;
}

// Resposta completa do endpoint de impacto social
export interface ImpactoSocialResponse {
  success: boolean;
  data: ImpactoSocialData;
  message: string;
  timestamp: string;
}