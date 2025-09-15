/**
 * Interface para metadados do documento PDF
 */
export interface IPdfMetadados {
  /**
   * Título do documento (opcional)
   */
  titulo?: string;

  /**
   * Autor do documento (opcional)
   */
  autor?: string;

  /**
   * Assunto do documento (opcional)
   */
  assunto?: string;

  /**
   * Palavras-chave do documento (opcional)
   */
  palavrasChave?: string[];

  /**
   * Criador do documento (opcional)
   */
  criador?: string;
}