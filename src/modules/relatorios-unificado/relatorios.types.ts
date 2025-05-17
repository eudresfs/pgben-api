/**
 * Arquivo de tipos para o módulo de relatórios unificado
 *
 * Este arquivo define os tipos básicos utilizados no módulo de relatórios
 * para garantir a consistência e a segurança de tipos.
 */

/**
 * Opções de formato para geração de relatórios
 */
export type RelatorioFormato = 'pdf' | 'excel' | 'csv';

/**
 * Opções para geração de relatório de benefícios concedidos
 */
export interface RelatorioBeneficiosOptions {
  dataInicio: string;
  dataFim: string;
  unidadeId?: string;
  tipoBeneficioId?: string;
  formato: RelatorioFormato;
  user: any;
}

/**
 * Opções para geração de relatório de solicitações por status
 */
export interface RelatorioSolicitacoesOptions {
  dataInicio: string;
  dataFim: string;
  unidadeId?: string;
  formato: RelatorioFormato;
  user: any;
}

/**
 * Opções para geração de relatório de atendimentos por unidade
 */
export interface RelatorioAtendimentosOptions {
  dataInicio: string;
  dataFim: string;
  formato: RelatorioFormato;
  user: any;
}

/**
 * Configurações para a geração de relatórios
 */
export interface RelatorioConfig {
  titulos: {
    [key: string]: string;
  };
  arquivos: {
    [key: string]: {
      [formato in RelatorioFormato]: string;
    };
  };
}

/**
 * Resultado de unidade para relatório de atendimentos
 */
export interface RelatorioUnidadeResult {
  unidade: any;
  totalSolicitacoes: number;
  solicitacoesLiberadas: number;
  solicitacoesPendentes: number;
}
