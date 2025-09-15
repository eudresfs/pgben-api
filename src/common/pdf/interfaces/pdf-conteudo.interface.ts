/**
 * Interface para definir o conteúdo de um PDF
 */
export interface IPdfConteudo {
  /**
   * Tipo do conteúdo
   */
  tipo: 'texto' | 'tabela' | 'lista' | 'imagem';

  /**
   * Dados do conteúdo (formato varia conforme o tipo)
   */
  dados: any;

  /**
   * Estilo a ser aplicado (opcional)
   */
  estilo?: string;

  /**
   * Configurações específicas do conteúdo (opcional)
   */
  configuracao?: any;
}