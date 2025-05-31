/**
 * Interface para metadados de documentos
 *
 * Define a estrutura simplificada dos metadados que podem ser armazenados
 * junto com os documentos no sistema
 */
export interface MetadadosDocumento {
  /**
   * Título do documento
   */
  titulo?: string;

  /**
   * Descrição do documento
   */
  descricao?: string;

  /**
   * Autor do documento
   */
  autor?: string;

  /**
   * Data de criação do documento (formato ISO)
   */
  data_documento?: string;

  /**
   * Tags para categorização do documento
   */
  tags?: string[];

  /**
   * Categoria do documento
   */
  categoria?: string;

  /**
   * Observações adicionais
   */
  observacoes?: string;

  /**
   * Dados técnicos do arquivo
   */
  arquivo?: {
    /**
     * Tamanho original do arquivo em bytes
     */
    tamanho_original?: number;

    /**
     * Hash do arquivo para verificação de integridade
     */
    hash?: string;

    /**
     * Resolução da imagem (se aplicável)
     */
    resolucao?: {
      largura: number;
      altura: number;
    };

    /**
     * Duração do vídeo/áudio (se aplicável)
     */
    duracao?: number;
  };

  /**
   * Metadados customizados específicos do tipo de documento
   */
  customizados?: Record<string, any>;
}

/**
 * Interface para resultado de validação de metadados
 */
export interface MetadadosValidationResult {
  isValid: boolean;
  message: string;
  errors?: string[];
}

/**
 * Tipos de categoria de documentos
 */
export enum CategoriaDocumento {
  DOCUMENTOS = 'DOCUMENTOS',
  IMAGENS = 'IMAGENS',
  PLANILHAS = 'PLANILHAS',
  TEXTO = 'TEXTO',
}

/**
 * Tipos de documento suportados
 */
export enum TipoDocumento {
  RG = 'RG',
  CPF = 'CPF',
  COMPROVANTE_RESIDENCIA = 'COMPROVANTE_RESIDENCIA',
  COMPROVANTE_RENDA = 'COMPROVANTE_RENDA',
  OUTROS = 'OUTROS',
}
