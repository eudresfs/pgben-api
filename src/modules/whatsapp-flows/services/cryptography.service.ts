import { Injectable, Logger, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { FlowEndpointException } from '../exceptions/flow-endpoint.exception';

/**
 * Serviço de Criptografia para WhatsApp Flows
 * Implementa criptografia AES-GCM para comunicação segura com WhatsApp Business API
 * Baseado no exemplo oficial da Meta
 */
@Injectable()
export class CryptographyService {
  private readonly logger = new Logger(CryptographyService.name);
  private readonly algorithm = 'aes-128-gcm';
  private readonly keyLength = 16; // 128 bits
  private readonly ivLength = 12; // 96 bits para GCM
  private readonly authTagLength = 16; // 128 bits
  private readonly privateKey: string;
  private readonly passphrase: string;

  constructor(private configService: ConfigService) {
    // Obter chave privada e passphrase das variáveis de ambiente
    this.privateKey = this.configService.get<string>('WHATSAPP_PRIVATE_KEY');
    this.passphrase = this.configService.get<string>('WHATSAPP_PASSPHRASE') || '';

    if (!this.privateKey) {
      this.logger.error(
        'Chave privada do WhatsApp não configurada',
      );
      throw new Error(
        'Configuração de criptografia do WhatsApp incompleta',
      );
    }

    // Validar se a chave privada está no formato correto
    try {
      this.validatePrivateKey();
      this.logger.log('Serviço de criptografia WhatsApp Flows inicializado com sucesso');
    } catch (error) {
      this.logger.error(`Erro ao validar chave privada: ${error.message}`);
      throw error;
    }
  }

  /**
   * Descriptografa o payload recebido do WhatsApp
   * Implementação baseada no exemplo oficial da Meta
   * @param body Objeto contendo encrypted_aes_key, encrypted_flow_data e initial_vector
   * @returns Objeto com dados descriptografados, chave AES e IV
   */
  decryptRequest(body: {
    encrypted_aes_key: string;
    encrypted_flow_data: string;
    initial_vector: string;
  }): {
    decryptedBody: any;
    aesKeyBuffer: Buffer;
    initialVectorBuffer: Buffer;
  } {
    const { encrypted_aes_key, encrypted_flow_data, initial_vector } = body;

    const privateKey = crypto.createPrivateKey({ 
      key: this.privateKey, 
      passphrase: this.passphrase 
    });
    
    let decryptedAesKey = null;
    try {
      // decrypt AES key created by client
      decryptedAesKey = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: "sha256",
        },
        Buffer.from(encrypted_aes_key, "base64")
      );
    } catch (error) {
      this.logger.error(`Failed to decrypt AES key: ${error.message}`);
      /* 
      Failed to decrypt. Please verify your private key.
      If you change your public key. You need to return HTTP status code 421 to refresh the public key on the client 
      */
      throw new HttpException(
        'Failed to decrypt the request. Please verify your private key.',
        421
      );
    }

    // decrypt flow data
    const flowDataBuffer = Buffer.from(encrypted_flow_data, "base64");
    const initialVectorBuffer = Buffer.from(initial_vector, "base64");

    const TAG_LENGTH = 16;
    const encrypted_flow_data_body = flowDataBuffer.subarray(0, -TAG_LENGTH);
    const encrypted_flow_data_tag = flowDataBuffer.subarray(-TAG_LENGTH);

    const decipher = crypto.createDecipheriv(
      "aes-128-gcm",
      decryptedAesKey,
      initialVectorBuffer
    );
    decipher.setAuthTag(encrypted_flow_data_tag);

    const decryptedJSONString = Buffer.concat([
      decipher.update(encrypted_flow_data_body),
      decipher.final(),
    ]).toString("utf-8");

    return {
      decryptedBody: JSON.parse(decryptedJSONString),
      aesKeyBuffer: decryptedAesKey,
      initialVectorBuffer,
    };
  }

  /**
   * Criptografa a resposta para envio ao WhatsApp
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
  ): string {
    // flip initial vector
    const flipped_iv = [];
    for (const pair of initialVectorBuffer.entries()) {
      flipped_iv.push(~pair[1]);
    }

    // encrypt response data
    const cipher = crypto.createCipheriv(
      "aes-128-gcm",
      aesKeyBuffer,
      Buffer.from(flipped_iv)
    );
    
    return Buffer.concat([
      cipher.update(JSON.stringify(response), "utf-8"),
      cipher.final(),
      cipher.getAuthTag(),
    ]).toString("base64");
  }

  /**
   * Método legado para compatibilidade - será removido em versões futuras
   * @deprecated Use encryptResponse(response, aesKeyBuffer, initialVectorBuffer) instead
   */
  encryptResponseLegacy(data: any): {
    encrypted_data: string;
    iv: string;
    auth_tag: string;
  } {
    try {
      this.logger.debug('Iniciando criptografia de resposta WhatsApp (método legado)');

      // Converter dados para JSON string se necessário
      const jsonData = typeof data === 'string' ? data : JSON.stringify(data);

      // Gerar IV aleatório
      const iv = crypto.randomBytes(12); // 96 bits para compatibilidade

      // Derivar chave AES a partir da chave privada
      const aesKey = this.deriveAESKey();

      // Criar cipher
      const cipher = crypto.createCipheriv(this.algorithm, aesKey, iv, {
        authTagLength: this.authTagLength,
      });

      // Criptografar dados
      let encrypted = cipher.update(jsonData, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      // Obter tag de autenticação
      const authTag = cipher.getAuthTag();

      this.logger.debug('Criptografia de resposta concluída com sucesso');

      return {
        encrypted_data: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        auth_tag: authTag.toString('base64'),
      };
    } catch (error) {
      this.logger.error(
        `Erro ao criptografar resposta WhatsApp: ${error.message}`,
      );
      throw new Error('Falha na criptografia da resposta');
    }
  }

  /**
   * Valida se a chave privada RSA está no formato correto
   * @throws Error se a chave for inválida
   */
  private validatePrivateKey(): void {
    try {
      // Verificar se a chave privada tem o formato básico PEM
      if (!this.privateKey || !this.privateKey.includes('-----BEGIN')) {
        throw new Error('Chave privada não está no formato PEM');
      }

      // Tentar criar um objeto de chave privada para validar o formato
      const keyOptions: any = {
        key: this.privateKey,
        format: 'pem',
      };
      
      // Só adicionar passphrase se ela não estiver vazia
      if (this.passphrase && this.passphrase.trim() !== '') {
        keyOptions.passphrase = this.passphrase;
      }
      
      crypto.createPrivateKey(keyOptions);
      this.logger.debug('Chave privada RSA validada com sucesso');
    } catch (error) {
      this.logger.error(`Chave privada RSA inválida: ${error.message}`);
      throw new Error('Formato de chave privada RSA inválido');
    }
  }

  /**
   * Descriptografa a chave AES usando RSA
   * @param encryptedAesKey Chave AES criptografada com RSA
   * @returns Buffer contendo a chave AES descriptografada
   */
  private decryptAESKeyWithRSA(encryptedAesKey: Buffer): Buffer {
    try {
      this.logger.debug('Iniciando descriptografia da chave AES com RSA');
      
      // Preparar opções da chave privada
      const keyOptions: any = {
        key: this.privateKey,
        format: 'pem',
      };
      
      // Só adicionar passphrase se ela não estiver vazia
      if (this.passphrase && this.passphrase.trim() !== '') {
        keyOptions.passphrase = this.passphrase;
      }

      // Descriptografar a chave AES usando RSA-OAEP
      const aesKey = crypto.privateDecrypt(
        {
          ...keyOptions,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        encryptedAesKey
      );

      this.logger.debug(`Chave AES descriptografada com RSA, length: ${aesKey.length}`);
      
      // Validar se a chave tem o tamanho correto (32 bytes para AES-256)
      if (aesKey.length !== 32) {
        throw new Error(`Invalid AES key length: ${aesKey.length}, expected: 32`);
      }

      return aesKey;
    } catch (error) {
      this.logger.error(`Erro ao descriptografar chave AES com RSA: ${error.message}`);
      /*
      Failed to decrypt. Please verify your private key.
      If you change your public key. You need to return HTTP status code 421 to refresh the public key on the client
      */
      throw new FlowEndpointException(
        421,
        'Failed to decrypt the request. Please verify your private key.'
      );
    }
  }

  /**
   * Deriva uma chave AES-128 a partir da chave privada RSA
   * usando PBKDF2 com a passphrase
   * @returns Chave AES de 128 bits
   */
  private deriveAESKey(): Buffer {
    try {
      // Método simplificado para derivação de chave AES
      // Usar hash da chave privada como salt
      const salt = crypto
        .createHash('sha256')
        .update(this.privateKey)
        .digest()
        .slice(0, 16); // Usar apenas os primeiros 16 bytes como salt

      // Usar a passphrase ou uma string padrão como base para derivação
      const derivationBase = this.passphrase && this.passphrase.trim() !== '' 
        ? this.passphrase 
        : 'default-derivation-key';

      const key = crypto.pbkdf2Sync(
        derivationBase,
        salt,
        10000, // 10k iterações
        this.keyLength,
        'sha256',
      );

      return key;
    } catch (error) {
      this.logger.error(`Erro ao derivar chave AES: ${error.message}`);
      throw new Error('Falha na derivação da chave de criptografia');
    }
  }

  /**
   * Valida se os dados criptografados estão no formato correto
   * @param encryptedData Dados criptografados
   * @param iv Vetor de inicialização
   * @param authTag Tag de autenticação
   * @returns true se válido, false caso contrário
   */
  validateEncryptedData(
    encryptedData: string,
    iv: string,
    authTag: string,
  ): boolean {
    try {
      // Verificar se são strings base64 válidas
      if (!encryptedData || !iv || !authTag) {
        return false;
      }

      // Tentar converter de base64
      Buffer.from(encryptedData, 'base64');
      Buffer.from(iv, 'base64');
      Buffer.from(authTag, 'base64');

      // Verificar tamanhos esperados
      const ivBuffer = Buffer.from(iv, 'base64');
      const authTagBuffer = Buffer.from(authTag, 'base64');

      if (ivBuffer.length !== this.ivLength) {
        this.logger.warn(
          `IV com tamanho inválido: ${ivBuffer.length}`,
        );
        return false;
      }

      if (authTagBuffer.length !== this.authTagLength) {
        this.logger.warn(
          `AuthTag com tamanho inválido: ${authTagBuffer.length}, esperado: ${this.authTagLength}`,
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.warn(
        `Dados criptografados inválidos: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Gera um hash SHA-256 para verificação de integridade
   * @param data Dados para gerar hash
   * @returns Hash em formato hexadecimal
   */
  generateHash(data: string): string {
    try {
      return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
    } catch (error) {
      this.logger.error(`Erro ao gerar hash: ${error.message}`);
      throw new Error('Falha ao gerar hash de verificação');
    }
  }

  /**
   * Verifica se um hash corresponde aos dados fornecidos
   * @param data Dados originais
   * @param hash Hash para verificação
   * @returns true se o hash corresponder, false caso contrário
   */
  verifyHash(data: string, hash: string): boolean {
    try {
      const calculatedHash = this.generateHash(data);
      return calculatedHash === hash;
    } catch (error) {
      this.logger.error(`Erro ao verificar hash: ${error.message}`);
      return false;
    }
  }
}