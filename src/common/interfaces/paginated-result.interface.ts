/**
 * Interface para resultados paginados
 * 
 * Esta interface padroniza a estrutura de retorno para endpoints
 * que implementam paginação, facilitando o consumo pelo frontend.
 */
export interface PaginatedResult<T> {
  /**
   * Array com os dados retornados
   */
  data: T[];

  /**
   * Metadados da paginação
   */
  meta: {
    /**
     * Página atual
     */
    page: number;

    /**
     * Limite de itens por página
     */
    limit: number;

    /**
     * Total de itens disponíveis
     */
    total: number;

    /**
     * Total de páginas disponíveis
     */
    totalPages: number;
  };
}
