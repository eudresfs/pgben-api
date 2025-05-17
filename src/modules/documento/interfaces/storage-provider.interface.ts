/**
 * Interface para provedores de armazenamento
 *
 * Define os métodos que devem ser implementados por qualquer
 * provedor de armazenamento de documentos (local, S3, Azure, etc.)
 */
export interface StorageProvider {
  /**
   * Nome do provedor de armazenamento
   */
  readonly nome: string;

  /**
   * Salva um arquivo no armazenamento
   * @param buffer Buffer do arquivo
   * @param nomeArquivo Nome do arquivo
   * @param mimetype Tipo MIME do arquivo
   * @param metadados Metadados opcionais do arquivo
   * @returns Caminho ou identificador do arquivo armazenado
   */
  salvarArquivo(
    buffer: Buffer,
    nomeArquivo: string,
    mimetype: string,
    metadados?: Record<string, any>,
  ): Promise<string>;

  /**
   * Obtém um arquivo do armazenamento
   * @param caminho Caminho ou identificador do arquivo
   * @returns Buffer do arquivo
   */
  obterArquivo(caminho: string): Promise<Buffer>;

  /**
   * Remove um arquivo do armazenamento
   * @param caminho Caminho ou identificador do arquivo
   */
  removerArquivo(caminho: string): Promise<void>;
  /**
   * Faz upload de um arquivo (alias para salvarArquivo)
   * @param buffer Buffer do arquivo
   * @param key Chave única para identificar o arquivo
   * @param mimetype Tipo MIME do arquivo
   * @param metadata Metadados opcionais do arquivo
   * @returns Caminho ou URL do arquivo armazenado
   */
  upload(
    buffer: Buffer,
    key: string,
    mimetype: string,
    metadata?: Record<string, any>,
  ): Promise<string>;

  /**
   * Faz download de um arquivo (alias para obterArquivo)
   * @param key Chave do arquivo
   * @returns Buffer do arquivo
   */
  download(key: string): Promise<Buffer>;

  /**
   * Remove um arquivo (alias para removerArquivo)
   * @param key Chave do arquivo
   */
  delete(key: string): Promise<void>;

  /**
   * Obtém a URL de acesso a um arquivo
   * @param key Chave do arquivo
   * @param expiresIn Tempo de expiração da URL em segundos (opcional)
   * @returns URL de acesso ao arquivo
   */
  getUrl(key: string, expiresIn?: number): string | Promise<string>;

  /**
   * Verifica se um arquivo existe
   * @param key Chave do arquivo
   * @returns true se o arquivo existe, false caso contrário
   */
  exists(key: string): Promise<boolean>;

  /**
   * Copia um arquivo de uma chave para outra
   * @param sourceKey Chave do arquivo de origem
   * @param destinationKey Chave do arquivo de destino
   * @returns Caminho ou URL do arquivo copiado
   */
  copy(sourceKey: string, destinationKey: string): Promise<string>;

  /**
   * Lista arquivos com um prefixo específico
   * @param prefix Prefixo para filtrar arquivos
   * @param maxKeys Número máximo de chaves a retornar
   * @returns Lista de chaves de arquivos
   */
  list(prefix: string, maxKeys?: number): Promise<string[]>;
}

/**
 * Tipos de provedores de armazenamento suportados
 */
export enum TipoStorageProvider {
  LOCAL = 'local',
  S3 = 's3',
  MINIO = 'minio',
}
