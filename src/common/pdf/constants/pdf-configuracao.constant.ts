import { PdfOrientacao, PdfTamanhoPapel } from '../enums';

/**
 * Configuração padrão para documentos PDF
 */
export const CONFIGURACAO_PADRAO = {
  orientacao: PdfOrientacao.RETRATO,
  tamanho: PdfTamanhoPapel.A4,
  margens: [50, 60, 50, 60] as [number, number, number, number],
  incluirCabecalho: true,
  incluirRodape: true,
  estilosCustomizados: {}
} as const;

/**
 * Margens por tipo de documento
 * [esquerda, superior, direita, inferior]
 */
export const MARGENS_POR_TIPO = {
  relatorio: [50, 80, 50, 80] as [number, number, number, number],
  documento: [40, 60, 40, 60] as [number, number, number, number],
  comprovante: [30, 40, 30, 40] as [number, number, number, number]
};

/**
 * Configurações de página
 */
export const CONFIGURACAO_PAGINA = {
  pageSize: PdfTamanhoPapel.A4,
  pageOrientation: PdfOrientacao.RETRATO,
  pageMargins: [40, 60, 40, 60], // [left, top, right, bottom]
  defaultStyle: {
    font: 'Gotham-Medium',
    fontSize: 11,
    lineHeight: 1.2
  },
  header: {
    margin: [40, 20, 40, 0]
  },
  footer: {
    margin: [40, 0, 40, 20]
  }
} as const;

/**
 * Configuração de fontes
 */
export const CONFIGURACAO_FONTES = {
  padrao: 'Gotham-Medium',
  titulo: 'Gotham-Medium',
  texto: 'Gotham-Medium'
} as const;

/**
 * Configuração de imagens
 */
export const CONFIGURACAO_IMAGEM = {
  qualidade: 0.8,
  maxWidth: 500,
  maxHeight: 300,
  fit: 'contain',
  alignment: 'center',
  margin: [0, 10, 0, 10] as [number, number, number, number]
} as const;