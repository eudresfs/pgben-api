/**
 * Interfaces para os indicadores do dashboard organizados por segmentos
 */

/**
 * 1. SEGMENTO: IMPACTO SOCIAL
 * Foco: Comunicação e Narrativa de Sucesso
 */
export interface ImpactoSocialIndicadores {
  // Indicadores Primários
  familiasBeneficiadas: number;
  pessoasImpactadas: number;
  investimentoSocialTotal: number;
  evolucaoMensal: Array<{
    mes: string;
    familias: number;
    investimento: number;
  }>;

  // Indicadores Secundários
  distribuicaoPorTipoBeneficio: Array<{
    tipo: string;
    quantidade: number;
    percentual: number;
  }>;
  valorMedioPorFamilia: number;
  taxaCoberturaSocial: number;
}

/**
 * 2. SEGMENTO: EFICIÊNCIA OPERACIONAL
 * Foco: Melhoria de Processos e Produtividade
 */
export interface EficienciaOperacionalIndicadores {
  // Indicadores Primários
  tempoMedioProcessamento: number; // em dias
  taxaAprovacao: number; // percentual
  pendenciasAtivas: number;
  produtividadePorTecnico: number; // processos/dia
  taxaRetrabalho: number;
  backlogSolicitacoes: number;
}

/**
 * 3. SEGMENTO: GESTÃO ORÇAMENTÁRIA
 * Foco: Controle Financeiro e Execução
 */
export interface GestaoOrcamentariaIndicadores {
  // Indicadores Primários
  execucaoOrcamentaria: number; // percentual
  valorTotalInvestido: number;
  custoMedioPorBeneficio: Array<{
    tipo: string;
    custo: number;
  }>;
  projecaoVsRealizado: Array<{
    mes: string;
    projetado: number;
    realizado: number;
  }>;

  // Indicadores Secundários
  distribuicaoOrcamentaria: Array<{
    tipo: string;
    valor: number;
    percentual: number;
  }>;
  eficienciaGasto: number;
  margemOrcamentariaDisponivel: number;
  sazonalidadeGastos: Array<{
    mes: string;
    valor: number;
  }>;
}

/**
 * 4. SEGMENTO: PERFORMANCE DAS UNIDADES
 * Foco: Gestão de Equipes e Recursos
 */
export interface PerformanceUnidadesIndicadores {
  // Indicadores Primários
  solicitacoesPorUnidade: Array<{
    unidade: string;
    quantidade: number;
  }>;
  tempoMedioPorUnidade: Array<{
    unidade: string;
    tempo: number;
  }>;
  taxaAprovacaoPorUnidade: Array<{
    unidade: string;
    taxa: number;
  }>;
  utilizacaoOrcamentaria: Array<{
    unidade: string;
    utilizado: number;
    disponivel: number;
  }>;

  // Indicadores Secundários
  produtividadeIndividual: Array<{
    tecnico: string;
    unidade: string;
    processos: number;
  }>;
  rankingPerformance: Array<{
    unidade: string;
    pontuacao: number;
    posicao: number;
  }>;
  capacidadeInstalada: Array<{
    unidade: string;
    utilizacao: number;
    disponibilidade: number;
  }>;
  distribuicaoCarga: Array<{
    unidade: string;
    carga: number;
    equilibrio: number;
  }>;
}

/**
 * 5. SEGMENTO: ANÁLISE TERRITORIAL
 * Foco: Distribuição Geográfica e Vulnerabilidade
 */
export interface AnaliseTerritorialIndicadores {
  // Indicadores Primários
  densidadeDemanda: Array<{
    bairro: string;
    densidade: number;
    coordenadas?: {
      lat: number;
      lng: number;
    };
  }>;
  mapaVulnerabilidade: Array<{
    regiao: string;
    nivelRisco: 'baixo' | 'medio' | 'alto' | 'critico';
    quantidade: number;
  }>;
  coberturaTerritorial: {
    bairrosAtendidos: number;
    bairrosTotal: number;
    percentualCobertura: number;
  };
  acessibilidade: {
    distanciaMediaKm: number;
    tempoMedioMinutos: number;
  };

  // Indicadores Secundários
  rankingBairros: Array<{
    bairro: string;
    atendimentos: number;
    posicao: number;
  }>;
  distribuicaoPerCapita: Array<{
    regiao: string;
    populacao: number;
    atendimentos: number;
    indicePerCapita: number;
  }>;
  gapsCobertura: Array<{
    area: string;
    populacaoEstimada: number;
    demandaPotencial: number;
  }>;
  fluxoOrigemDestino: Array<{
    origem: string;
    destino: string;
    quantidade: number;
  }>;
}

/**
 * 6. SEGMENTO: PERFIL DOS BENEFICIÁRIOS
 * Foco: Características Socioeconômicas
 */
export interface PerfilBeneficiariosIndicadores {
  // Indicadores Primários
  composicaoFamiliarMedia: number;
  rendaFamiliarMedia: number;
  faixaEtariaPredominante: Array<{
    faixa: string;
    quantidade: number;
    percentual: number;
  }>;
  situacoesVulnerabilidade: Array<{
    situacao: string;
    quantidade: number;
    percentual: number;
  }>;

  // Indicadores Secundários
  taxaReincidencia: number;
  escolaridadeMedia: Array<{
    nivel: string;
    quantidade: number;
    percentual: number;
  }>;
  vinculacaoOutrosProgramas: Array<{
    programa: string;
    quantidade: number;
    percentual: number;
  }>;
  perfilMoradia: Array<{
    tipo: string;
    quantidade: number;
    percentual: number;
  }>;
}

/**
 * 7. SEGMENTO: CONFORMIDADE E QUALIDADE
 * Foco: Aderência Legal e Satisfação
 */
export interface ConformidadeQualidadeIndicadores {
  // Indicadores Primários
  conformidadeLegal: {
    aderenciaLei: number; // percentual
    violacoesDetectadas: number;
  };
  complianceLGPD: {
    conformidade: number; // percentual
    incidentes: number;
  };
  auditabilidade: {
    processosRastreaveis: number; // percentual
    documentosCompletos: number; // percentual
  };
  satisfacaoUsuarios: {
    notaMedia: number;
    avaliacoes: number;
  };

  // Indicadores Secundários
  documentacaoCompleta: number; // percentual
  tempoResposta: number; // em horas
  taxaReclamacoes: number; // percentual
  aderenciaPrazos: number; // percentual
}

/**
 * 8. SEGMENTO: COMUNICAÇÃO E CAMPANHAS
 * Foco: Narrativas para Mídia e Comunicação Externa
 */
export interface ComunicacaoCampanhasIndicadores {
  mensagensFormatadas: {
    impactoGeral: string;
    evolucaoMensal: string;
    destaquesBeneficios: Array<{
      tipo: string;
      mensagem: string;
    }>;
  };
  comparativosTemporais: Array<{
    periodo: string;
    crescimento: number;
    destaque: string;
  }>;
  impactoConsolidado: {
    numeroImpressionate: string;
    contexto: string;
    comparacao: string;
  };
  casesSucesso: Array<{
    titulo: string;
    historia: string;
    impacto: string;
  }>;
}

/**
 * Interface consolidada para todos os indicadores do dashboard
 */
export interface DashboardIndicadoresCompletos {
  impactoSocial: ImpactoSocialIndicadores;
  eficienciaOperacional: EficienciaOperacionalIndicadores;
  gestaoOrcamentaria: GestaoOrcamentariaIndicadores;
  performanceUnidades: PerformanceUnidadesIndicadores;
  analiseterritorial: AnaliseTerritorialIndicadores;
  perfilBeneficiarios: PerfilBeneficiariosIndicadores;
  comunicacaoCampanhas: ComunicacaoCampanhasIndicadores;

  // Metadados
  ultimaAtualizacao: Date;
  periodoReferencia: {
    inicio: Date;
    fim: Date;
  };
  escopo: {
    tipo: 'global' | 'unidade' | 'proprio';
    unidadeId?: number;
    userId?: number;
  };
}

/**
 * Interface para filtros dos indicadores
 */
export interface FiltrosIndicadores {
  dataInicio?: Date;
  dataFim?: Date;
  unidade_ids?: number[];
  tipos_beneficio?: string[];
  status_solicitacao?: string[];
  segmentos?: Array<keyof DashboardIndicadoresCompletos>;
}

/**
 * Interface para configuração de exibição dos indicadores
 */
export interface ConfiguracaoExibicaoIndicadores {
  segmentosVisiveis: Array<keyof DashboardIndicadoresCompletos>;
  indicadoresPrioritarios: string[];
  formatoExibicao: 'resumido' | 'detalhado' | 'executivo';
  atualizacaoAutomatica: boolean;
  intervalosAtualizacao: number; // em minutos
}
