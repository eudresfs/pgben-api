/**
 * Enum para tipos de conteúdo suportados no PDF
 */
export enum PdfTipoConteudo {
  /**
   * Conteúdo de texto simples
   */
  TEXTO = 'texto',

  /**
   * Conteúdo em formato de tabela
   */
  TABELA = 'tabela',

  /**
   * Conteúdo em formato de lista
   */
  LISTA = 'lista',

  /**
   * Conteúdo de imagem
   */
  IMAGEM = 'imagem',

  /**
   * Quebra de página
   */
  QUEBRA_PAGINA = 'quebra_pagina',

  /**
   * Espaçamento vertical
   */
  ESPACAMENTO = 'espacamento',

  /**
   * Parágrafo
   */
  PARAGRAFO = 'paragrafo'
}