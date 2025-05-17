/**
 * Interface para metadados de documentos
 *
 * Define a estrutura dos metadados que podem ser armazenados
 * junto com os documentos no sistema
 */
export interface MetadadosDocumento {
  /**
   * Indica se o documento contém dados sensíveis
   */
  sensivel?: boolean;

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
   * Indica se o documento está criptografado
   */
  criptografado?: boolean;

  /**
   * Dados de criptografia
   */
  criptografia?: {
    iv: string;
    authTag: string;
    algoritmo: string;
  };
  
  /**
   * Vetor de inicialização para criptografia (legado)
   */
  iv?: string;

  /**
   * Tag de autenticação para criptografia (legado)
   */
  authTag?: string;

  /**
   * Hash do conteúdo do documento (para verificação de integridade)
   */
  hash?: string;

  /**
   * Data de validade do documento
   */
  validade?: string;

  /**
   * Indica se o documento foi verificado por um usuário autorizado
   */
  verificado?: boolean;

  /**
   * Observações sobre o documento
   */
  observacoes?: string;

  /**
   * Versão do esquema de metadados
   */
  schema_version?: string;

  /**
   * Localização geográfica onde o documento foi criado
   */
  localizacao?: {
    latitude?: number;
    longitude?: number;
    endereco?: string;
  };

  /**
   * Dispositivo usado para criar o documento
   */
  dispositivo?: {
    tipo?: string;
    sistema_operacional?: string;
    navegador?: string;
  };

  /**
   * Informações de verificação de malware
   */
  verificacao_malware?: {
    verificado_em?: string;
    resultado?: 'limpo' | 'infectado' | 'suspeito' | string;
    detalhes?: string;
  };
  
  /**
   * Informações de upload
   */
  upload_info?: {
    data: string;
    usuario_id: string;
    ip: string;
    user_agent: string;
  };
  
  /**
   * Informações de detecção de tipo MIME
   */
  deteccao_mime?: {
    mime_declarado: string;
    mime_detectado: string;
    extensao_detectada: string;
  };
  
  /**
   * Informações de verificação do documento
   */
  verificacao?: {
    data: string;
    usuario_id: string;
    observacoes: string;
  };
  
  /**
   * Informações de última atualização
   */
  ultima_atualizacao?: {
    data: string;
    usuario_id: string;
  };

  /**
   * Informações sobre miniaturas geradas
   */
  miniaturas?: {
    pequena?: string;
    media?: string;
    grande?: string;
    gerado_em?: string;
  };

  /**
   * Campos personalizados específicos para cada tipo de documento
   */
  campos_personalizados?: Record<string, any>;
}
