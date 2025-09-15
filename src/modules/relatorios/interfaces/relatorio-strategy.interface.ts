/**
 * Interface para estratégia de geração de relatórios
 *
 * Define o contrato para as diferentes estratégias de geração de relatórios
 * em formatos como PDF, Excel e CSV
 */
export interface RelatorioStrategy {
  /**
   * Gera o relatório no formato específico da estratégia
   * @param tipo Tipo de relatório (ex: beneficios-concedidos, solicitacoes-por-status)
   * @param dados Dados a serem incluídos no relatório
   * @param opcoes Opções de formatação e configuração do relatório
   * @returns Buffer ou string com o conteúdo do relatório
   */
  gerar(tipo: string, dados: any, opcoes: any): Promise<Buffer | string>;

  /**
   * Retorna o tipo MIME do formato de relatório
   * @returns String com o tipo MIME
   */
  getMimeType(): string;

  /**
   * Retorna a extensão de arquivo do formato de relatório
   * @returns String com a extensão (sem ponto)
   */
  getExtensao(): string;
}
