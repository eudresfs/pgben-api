import { PdfOrientacao, PdfTamanhoPapel } from '../enums';

/**
 * Interface para configurações do documento PDF
 */
export interface IPdfConfiguracao {
  /**
   * Orientação do documento
   */
  orientacao?: PdfOrientacao;

  /**
   * Tamanho do papel
   */
  tamanho?: PdfTamanhoPapel;

  /**
   * Margens do documento (em pontos)
   * [esquerda, superior, direita, inferior]
   */
  margens?: [number, number, number, number];

  /**
   * Incluir cabeçalho padrão
   */
  incluirCabecalho?: boolean;

  /**
   * Incluir rodapé padrão
   */
  incluirRodape?: boolean;

  /**
   * Estilos customizados para o documento
   */
  estilosCustomizados?: any;
}