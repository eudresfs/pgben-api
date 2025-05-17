import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Serviço de criptografia para documentos
 *
 * Responsável por criptografar e descriptografar documentos sensíveis
 * utilizando o algoritmo AES-256-GCM
 */
@Injectable()
export class CriptografiaService {
  private readonly logger = new Logger(CriptografiaService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private configService: ConfigService) {
    // Obter chave de criptografia da configuração ou gerar uma nova
    const keyString = this.configService.get<string>('ENCRYPTION_KEY');

    if (!keyString) {
      this.logger.warn(
        'Chave de criptografia não encontrada na configuração. Gerando chave temporária.',
      );
      this.logger.warn(
        'ATENÇÃO: Esta abordagem não é segura para produção. Configure uma chave persistente.',
      );

      // Gerar uma chave aleatória de 32 bytes (256 bits)
      this.key = crypto.randomBytes(32);
    } else {
      // Usar a chave configurada
      this.key = Buffer.from(keyString, 'hex');

      // Verificar se a chave tem o tamanho correto
      if (this.key.length !== 32) {
        throw new Error('A chave de criptografia deve ter 32 bytes (256 bits)');
      }
    }
  }

  /**
   * Criptografa um buffer
   * @param buffer Buffer a ser criptografado
   * @returns Objeto com o buffer criptografado e os metadados necessários para descriptografia
   */
  criptografar(buffer: Buffer): {
    bufferCriptografado: Buffer;
    iv: string;
    authTag: string;
  } {
    try {
      // Gerar vetor de inicialização aleatório
      const iv = crypto.randomBytes(16);

      // Criar cipher com o algoritmo, chave e IV
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

      // Criptografar o buffer
      const bufferCriptografado = Buffer.concat([
        cipher.update(buffer),
        cipher.final(),
      ]);

      // Obter tag de autenticação
      const authTag = cipher.getAuthTag();

      return {
        bufferCriptografado,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
      };
    } catch (error) {
      this.logger.error(`Erro ao criptografar documento: ${error.message}`);
      throw new Error(`Erro ao criptografar documento: ${error.message}`);
    }
  }

  /**
   * Descriptografa um buffer
   * @param bufferCriptografado Buffer criptografado
   * @param iv Vetor de inicialização usado na criptografia (em formato hexadecimal)
   * @param authTag Tag de autenticação gerada na criptografia (em formato hexadecimal)
   * @returns Buffer descriptografado
   */
  descriptografar(
    bufferCriptografado: Buffer,
    iv: string,
    authTag: string,
  ): Buffer {
    try {
      // Converter IV e authTag de hex para Buffer
      const ivBuffer = Buffer.from(iv, 'hex');
      const authTagBuffer = Buffer.from(authTag, 'hex');

      // Criar decipher com o algoritmo, chave e IV
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.key,
        ivBuffer,
      );

      // Definir tag de autenticação
      decipher.setAuthTag(authTagBuffer);

      // Descriptografar o buffer
      return Buffer.concat([
        decipher.update(bufferCriptografado),
        decipher.final(),
      ]);
    } catch (error) {
      this.logger.error(`Erro ao descriptografar documento: ${error.message}`);
      throw new Error(`Erro ao descriptografar documento: ${error.message}`);
    }
  }

  /**
   * Verifica se um tipo de documento deve ser criptografado
   * @param tipoDocumento Tipo de documento
   * @returns true se o documento deve ser criptografado, false caso contrário
   */
  deveSerCriptografado(tipoDocumento: string): boolean {
    // Lista de tipos de documentos que devem ser criptografados
    const tiposSensiveis = this.configService.get<string[]>(
      'TIPOS_DOCUMENTOS_SENSIVEIS',
      [
        'ATESTADO_MEDICO',
        'LAUDO_MEDICO',
        'DOCUMENTO_IDENTIDADE',
        'CPF',
        'CARTAO_NIS',
        'DECLARACAO_SAUDE',
        'PRONTUARIO_MEDICO',
      ],
    );

    return tiposSensiveis.includes(tipoDocumento);
  }
}
