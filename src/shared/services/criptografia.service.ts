import { Injectable, Logger } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { ChaveMonitorService } from './chave-monitor.service';

/**
 * Serviço de Criptografia
 *
 * Responsável por criptografar e descriptografar dados sensíveis,
 * especialmente documentos armazenados no MinIO.
 * Implementa criptografia AES-256-GCM para garantir confidencialidade
 * e integridade dos dados.
 */
@Injectable()
export class CriptografiaService {
  private readonly logger = new Logger(CriptografiaService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly authTagLength = 16; // 128 bits
  private readonly masterKey: Buffer;
  private readonly keyPath: string;

  constructor(
    private configService: ConfigService,
    private chaveMonitorService?: ChaveMonitorService,
  ) {
    // Obter a chave da variável de ambiente ou do arquivo
    const envKey = this.configService.get<string>('ENCRYPTION_KEY');
    
    if (envKey) {
      // Usar a chave da variável de ambiente
      this.masterKey = Buffer.from(envKey);
      this.logger.log('Usando chave de criptografia da variável de ambiente');
    } else {
      // Caminho padrão para o arquivo de chave
      this.keyPath =
        this.configService.get<string>('ENCRYPTION_KEY_PATH') ||
        path.join(process.cwd(), 'config', 'encryption.key');

      // Garantir que o diretório da chave existe
      const keyDir = path.dirname(this.keyPath);
      if (!fs.existsSync(keyDir)) {
        fs.mkdirSync(keyDir, { recursive: true });
      }

      // Verificar se a chave já existe, caso contrário, criar uma nova
      if (fs.existsSync(this.keyPath)) {
        this.masterKey = fs.readFileSync(this.keyPath);
        this.logger.log('Chave de criptografia carregada do arquivo');
        
        // Verificar integridade da chave se o monitor estiver disponível
        if (this.chaveMonitorService) {
          const integridadeOk = this.chaveMonitorService.verificarIntegridade();
          if (!integridadeOk) {
            this.logger.warn('Alerta de segurança: Possível comprometimento da chave de criptografia');
          }
        }
      } else {
        this.masterKey = crypto.randomBytes(this.keyLength);
        fs.writeFileSync(this.keyPath, this.masterKey, { mode: 0o600 });
        this.logger.log('Nova chave de criptografia gerada e salva');
        
        // Criar backup da chave se o monitor estiver disponível
        if (this.chaveMonitorService) {
          this.chaveMonitorService.criarBackup();
        }
      }
    }

    // Verificar o tamanho da chave
    if (this.masterKey.length !== this.keyLength) {
      throw new Error(`A chave de criptografia deve ter ${this.keyLength} bytes (${this.keyLength * 8} bits)`);
    }
  }

  /**
   * Criptografa um buffer de dados
   * @param data Buffer a ser criptografado
   * @returns Objeto com dados criptografados, IV e tag de autenticação
   */
  criptografarBuffer(data: Buffer): {
    dadosCriptografados: Buffer;
    iv: Buffer;
    authTag: Buffer;
  } {
    // Gerar IV (Initialization Vector) aleatório
    const iv = crypto.randomBytes(this.ivLength);

    // Criar cipher com algoritmo, chave e IV
    const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv, {
      authTagLength: this.authTagLength,
    });

    // Criptografar dados
    const dadosCriptografados = Buffer.concat([
      cipher.update(data),
      cipher.final(),
    ]);

    // Obter tag de autenticação
    const authTag = cipher.getAuthTag();

    return { dadosCriptografados, iv, authTag };
  }

  /**
   * Descriptografa um buffer de dados
   * @param dadosCriptografados Buffer criptografado
   * @param iv Initialization Vector usado na criptografia
   * @param authTag Tag de autenticação para verificar integridade
   * @returns Buffer descriptografado
   */
  descriptografarBuffer(
    dadosCriptografados: Buffer,
    iv: Buffer,
    authTag: Buffer,
  ): Buffer {
    try {
      // Criar decipher com algoritmo, chave e IV
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.masterKey,
        iv,
        {
          authTagLength: this.authTagLength,
        },
      );

      // Definir tag de autenticação para verificação
      decipher.setAuthTag(authTag);

      // Descriptografar dados
      const dadosDescriptografados = Buffer.concat([
        decipher.update(dadosCriptografados),
        decipher.final(),
      ]);

      return dadosDescriptografados;
    } catch (error) {
      this.logger.error(`Erro ao descriptografar dados: ${error.message}`);
      throw new Error(
        'Falha na descriptografia. Os dados podem ter sido corrompidos ou adulterados.',
      );
    }
  }

  /**
   * Criptografa um arquivo
   * @param caminhoArquivo Caminho do arquivo a ser criptografado
   * @param caminhoDestino Caminho onde o arquivo criptografado será salvo
   * @returns Metadados de criptografia (IV e tag de autenticação)
   */
  criptografarArquivo(
    caminhoArquivo: string,
    caminhoDestino: string,
  ): {
    iv: string;
    authTag: string;
  } {
    // Ler arquivo
    const dados = fs.readFileSync(caminhoArquivo);

    // Criptografar dados
    const { dadosCriptografados, iv, authTag } = this.criptografarBuffer(dados);

    // Salvar arquivo criptografado
    fs.writeFileSync(caminhoDestino, dadosCriptografados);

    // Retornar metadados de criptografia em formato base64
    return {
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  }

  /**
   * Descriptografa um arquivo
   * @param caminhoArquivo Caminho do arquivo criptografado
   * @param caminhoDestino Caminho onde o arquivo descriptografado será salvo
   * @param iv Initialization Vector em formato base64
   * @param authTag Tag de autenticação em formato base64
   */
  descriptografarArquivo(
    caminhoArquivo: string,
    caminhoDestino: string,
    iv: string,
    authTag: string,
  ): void {
    // Ler arquivo criptografado
    const dadosCriptografados = fs.readFileSync(caminhoArquivo);

    // Converter IV e authTag de base64 para Buffer
    const ivBuffer = Buffer.from(iv, 'base64');
    const authTagBuffer = Buffer.from(authTag, 'base64');

    // Descriptografar dados
    const dadosDescriptografados = this.descriptografarBuffer(
      dadosCriptografados,
      ivBuffer,
      authTagBuffer,
    );

    // Salvar arquivo descriptografado
    fs.writeFileSync(caminhoDestino, dadosDescriptografados);
  }

  /**
   * Criptografa um buffer e retorna um único buffer contendo
   * todos os dados necessários para descriptografia
   * @param data Buffer a ser criptografado
   * @returns Buffer contendo IV, authTag e dados criptografados
   */
  criptografarParaTransporte(data: Buffer): Buffer {
    // Criptografar dados
    const { dadosCriptografados, iv, authTag } = this.criptografarBuffer(data);

    // Criar buffer com formato: [IV_LENGTH(2)][IV(16)][AUTH_TAG_LENGTH(2)][AUTH_TAG(16)][ENCRYPTED_DATA]
    const resultado = Buffer.alloc(
      4 + iv.length + authTag.length + dadosCriptografados.length,
    );

    // Escrever tamanho do IV (2 bytes)
    resultado.writeUInt16BE(iv.length, 0);

    // Escrever IV
    iv.copy(resultado, 2);

    // Escrever tamanho da tag de autenticação (2 bytes)
    resultado.writeUInt16BE(authTag.length, 2 + iv.length);

    // Escrever tag de autenticação
    authTag.copy(resultado, 4 + iv.length);

    // Escrever dados criptografados
    dadosCriptografados.copy(resultado, 4 + iv.length + authTag.length);

    return resultado;
  }

  /**
   * Descriptografa um buffer que foi criptografado com criptografarParaTransporte
   * @param data Buffer contendo IV, authTag e dados criptografados
   * @returns Buffer descriptografado
   */
  descriptografarDeTransporte(data: Buffer): Buffer {
    // Ler tamanho do IV (2 bytes)
    const ivLength = data.readUInt16BE(0);

    // Ler IV
    const iv = data.slice(2, 2 + ivLength);

    // Ler tamanho da tag de autenticação (2 bytes)
    const authTagLength = data.readUInt16BE(2 + ivLength);

    // Ler tag de autenticação
    const authTag = data.slice(4 + ivLength, 4 + ivLength + authTagLength);

    // Ler dados criptografados
    const dadosCriptografados = data.slice(4 + ivLength + authTagLength);

    // Descriptografar dados
    return this.descriptografarBuffer(dadosCriptografados, iv, authTag);
  }

  /**
   * Gera um hash SHA-256 de um buffer
   * @param data Buffer para calcular o hash
   * @returns Hash SHA-256 em formato hexadecimal
   */
  gerarHash(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verifica se um buffer corresponde a um hash SHA-256
   * @param data Buffer para verificar
   * @param hash Hash SHA-256 em formato hexadecimal
   * @returns true se o hash corresponder, false caso contrário
   */
  verificarHash(data: Buffer, hash: string): boolean {
    const calculatedHash = this.gerarHash(data);
    return calculatedHash === hash;
  }
}
