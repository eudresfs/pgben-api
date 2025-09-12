/**
 * Estilos padrão para documentos PDF
 */
export const ESTILOS_PADRAO = {
  header: {
    fontSize: 16,
    bold: true,
    alignment: 'center' as const,
    font: 'Roboto',
    color: '#1e3a8a',
    margin: [0, 0, 0, 20] as [number, number, number, number]
  },
  subheader: {
    fontSize: 14,
    bold: true,
    alignment: 'center' as const,
    font: 'Roboto',
    color: '#374151',
    margin: [0, 10, 0, 10] as [number, number, number, number]
  },
  titulo: {
    fontSize: 12,
    bold: true,
    font: 'Roboto',
    margin: [0, 10, 0, 5] as [number, number, number, number],
    color: '#1f2937'
  },
  subtitulo: {
    fontSize: 11,
    bold: true,
    font: 'Roboto',
    margin: [0, 8, 0, 4] as [number, number, number, number],
    color: '#374151'
  },
  texto: {
    fontSize: 11,
    font: 'Roboto',
    alignment: 'justify' as const,
    lineHeight: 1.2,
    color: '#1f2937'
  },
  textoDestaque: {
    fontSize: 11,
    font: 'Roboto',
    bold: true,
    color: '#1e3a8a',
    alignment: 'center' as const
  },
  rodapeTexto: {
    fontSize: 9,
    font: 'Roboto',
    color: '#6b7280',
    alignment: 'center' as const
  },
  assinatura: {
    fontSize: 10,
    font: 'Roboto',
    alignment: 'center' as const,
    margin: [0, 30, 0, 5] as [number, number, number, number],
    color: '#1f2937'
  },
  assinaturaNome: {
    fontSize: 11,
    font: 'Roboto',
    bold: true,
    alignment: 'center' as const,
    margin: [0, 5, 0, 2] as [number, number, number, number],
    color: '#1f2937'
  },
  assinaturaCargo: {
    fontSize: 10,
    font: 'Roboto',
    alignment: 'center' as const,
    margin: [0, 0, 0, 5] as [number, number, number, number],
    color: '#6b7280'
  },
  tabela: {
    fontSize: 10,
    font: 'Roboto',
    color: '#1f2937'
  },
  tabelaCabecalho: {
    fontSize: 10,
    bold: true,
    font: 'Roboto',
    color: '#ffffff',
    fillColor: '#1e3a8a',
    alignment: 'center' as const
  },
  tabelaLinha: {
    fontSize: 10,
    font: 'Roboto',
    color: '#1f2937'
  },
  tabelaLinhaAlternada: {
    fontSize: 10,
    font: 'Roboto',
    color: '#1f2937',
    fillColor: '#f9fafb'
  },
  lista: {
    fontSize: 11,
    font: 'Roboto',
    color: '#1f2937',
    margin: [0, 2, 0, 2] as [number, number, number, number]
  },
  observacoes: {
    fontSize: 10,
    font: 'Roboto',
    color: '#6b7280',
    italics: true,
    margin: [0, 10, 0, 0] as [number, number, number, number]
  }
};

/**
 * Cores padrão do sistema
 */
export const CORES_PADRAO = {
  primaria: '#1e3a8a',
  secundaria: '#374151',
  texto: '#1f2937',
  textoSecundario: '#6b7280',
  fundo: '#ffffff',
  fundoAlternado: '#f9fafb',
  borda: '#e5e7eb',
  destaque: '#3b82f6',
  sucesso: '#10b981',
  aviso: '#f59e0b',
  erro: '#ef4444'
} as const;