/**
 * Interface para dados criptografados
 * Define a estrutura dos dados criptografados trocados com o WhatsApp
 */
export interface IEncryptedData {
  /** Dados criptografados em base64 */
  encrypted_flow_data: string;

  /** Chave AES criptografada com RSA em base64 */
  encrypted_aes_key: string;

  /** Vetor de inicialização em base64 */
  initial_vector: string;

  /** Tag de autenticação para verificação de integridade */
  auth_tag?: string;

  /** Algoritmo de criptografia usado */
  algorithm?: string;

  /** Versão do protocolo de criptografia */
  version?: string;
}

/**
 * Interface para dados descriptografados
 * Estrutura dos dados após descriptografia
 */
export interface IDecryptedData {
  /** Dados do flow em formato JSON */
  flow_data: any;

  /** Metadados da descriptografia */
  metadata: {
    /** Timestamp da descriptografia */
    decrypted_at: Date;

    /** Algoritmo usado */
    algorithm: string;

    /** Versão do protocolo */
    version: string;

    /** Hash dos dados originais para verificação */
    data_hash?: string;
  };
}

/**
 * Interface para configuração de criptografia
 * Define parâmetros para operações criptográficas
 */
export interface ICryptographyConfig {
  /** Chave privada RSA para descriptografar a chave AES */
  privateKey: string;

  /** Chave pública RSA para criptografar a chave AES */
  publicKey: string;

  /** Passphrase da chave privada (se houver) */
  passphrase?: string;

  /** Algoritmo AES a ser usado (padrão: aes-256-gcm) */
  aesAlgorithm?: string;

  /** Algoritmo RSA a ser usado (padrão: RSA-OAEP-256) */
  rsaAlgorithm?: string;

  /** Tamanho da chave AES em bits (padrão: 256) */
  aesKeySize?: number;

  /** Tamanho do IV em bytes (padrão: 16) */
  ivSize?: number;

  /** Timeout para operações criptográficas em ms */
  timeout?: number;
}

/**
 * Interface para resultado de operação criptográfica
 * Retorna informações sobre o sucesso/falha da operação
 */
export interface ICryptographyResult<T = any> {
  /** Indica se a operação foi bem-sucedida */
  success: boolean;

  /** Dados resultantes da operação */
  data?: T;

  /** Mensagem de erro (se houver) */
  error?: string;

  /** Código do erro para tratamento específico */
  errorCode?: string;

  /** Detalhes adicionais sobre a operação */
  details?: {
    /** Tempo de processamento em ms */
    processingTime: number;

    /** Algoritmo usado */
    algorithm: string;

    /** Tamanho dos dados processados */
    dataSize: number;

    /** Hash dos dados para verificação */
    dataHash?: string;
  };
}

/**
 * Interface para validação de dados criptografados
 * Define critérios para validação de integridade
 */
export interface ICryptographyValidation {
  /** Valida a estrutura dos dados criptografados */
  validateStructure(data: IEncryptedData): boolean;

  /** Valida a integridade dos dados usando hash */
  validateIntegrity(data: IEncryptedData, expectedHash?: string): boolean;

  /** Valida o timestamp para evitar replay attacks */
  validateTimestamp(timestamp: number, maxAgeMinutes?: number): boolean;

  /** Valida a assinatura HMAC do WhatsApp */
  validateHmacSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean;
}

/**
 * Interface para serviço de criptografia
 * Define o contrato principal do serviço
 */
export interface ICryptographyService {
  /**
   * Descriptografa uma requisição do WhatsApp Flow
   * Implementação baseada no exemplo oficial da Meta
   * @param body Objeto com encrypted_aes_key, encrypted_flow_data e initial_vector
   * @returns Objeto com decryptedBody, aesKeyBuffer e initialVectorBuffer
   */
  decryptRequest(body: {
    encrypted_aes_key: string;
    encrypted_flow_data: string;
    initial_vector: string;
  }): {
    decryptedBody: any;
    aesKeyBuffer: Buffer;
    initialVectorBuffer: Buffer;
  };

  /**
   * Criptografa uma resposta para o WhatsApp Flow
   * Implementação baseada no exemplo oficial da Meta
   * @param response Dados a serem criptografados
   * @param aesKeyBuffer Chave AES do decryptRequest
   * @param initialVectorBuffer IV original do decryptRequest
   * @returns Dados criptografados em base64
   */
  encryptResponse(
    response: any,
    aesKeyBuffer: Buffer,
    initialVectorBuffer: Buffer
  ): string;

  /**
   * Deriva uma chave AES a partir de dados fornecidos
   * @param keyMaterial Material para derivação da chave
   * @param salt Salt para a derivação
   * @returns Chave AES derivada
   */
  deriveAESKey(keyMaterial: Buffer, salt: Buffer): Promise<Buffer>;

  /**
   * Valida dados criptografados
   * @param data Dados para validação
   * @returns Resultado da validação
   */
  validateEncryptedData(data: IEncryptedData): ICryptographyResult<boolean>;

  /**
   * Gera hash dos dados para verificação de integridade
   * @param data Dados para gerar hash
   * @param algorithm Algoritmo de hash (padrão: sha256)
   * @returns Hash dos dados
   */
  generateHash(data: any, algorithm?: string): string;

  /**
   * Verifica hash dos dados
   * @param data Dados originais
   * @param hash Hash para verificação
   * @param algorithm Algoritmo de hash
   * @returns True se o hash for válido
   */
  verifyHash(data: any, hash: string, algorithm?: string): boolean;
}

/**
 * Interface para métricas de criptografia
 * Usado para monitoramento e debugging
 */
export interface ICryptographyMetrics {
  /** Número total de operações de criptografia */
  totalEncryptions: number;

  /** Número total de operações de descriptografia */
  totalDecryptions: number;

  /** Número de falhas de criptografia */
  encryptionFailures: number;

  /** Número de falhas de descriptografia */
  decryptionFailures: number;

  /** Tempo médio de criptografia em ms */
  averageEncryptionTime: number;

  /** Tempo médio de descriptografia em ms */
  averageDecryptionTime: number;

  /** Última operação realizada */
  lastOperation: {
    type: 'encrypt' | 'decrypt';
    timestamp: Date;
    success: boolean;
    processingTime: number;
  };

  /** Estatísticas por período */
  periodStats: {
    /** Operações na última hora */
    lastHour: number;

    /** Operações no último dia */
    lastDay: number;

    /** Operações na última semana */
    lastWeek: number;
  };
}

/**
 * Interface para configuração de segurança
 * Define parâmetros de segurança para criptografia
 */
export interface ISecurityConfig {
  /** Habilitar validação de timestamp */
  enableTimestampValidation: boolean;

  /** Idade máxima permitida para requisições em minutos */
  maxRequestAgeMinutes: number;

  /** Habilitar validação de assinatura HMAC */
  enableHmacValidation: boolean;

  /** Secret para validação HMAC */
  hmacSecret: string;

  /** Habilitar rate limiting por IP */
  enableRateLimit: boolean;

  /** Máximo de requisições por minuto por IP */
  maxRequestsPerMinute: number;

  /** Habilitar logging de operações criptográficas */
  enableCryptoLogging: boolean;

  /** Nível de logging (debug, info, warn, error) */
  logLevel: 'debug' | 'info' | 'warn' | 'error';

  /** Habilitar métricas de performance */
  enableMetrics: boolean;
}