import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider } from '../interfaces/storage-provider.interface';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Readable } from 'stream';

/**
 * Adaptador para armazenamento de documentos no sistema de arquivos local
 *
 * Implementa a interface StorageProvider para integração com o sistema de arquivos
 */
@Injectable()
export class LocalStorageAdapter implements StorageProvider {
  readonly nome = 'Armazenamento Local';
  private readonly logger = new Logger(LocalStorageAdapter.name);
  private readonly baseDir: string;

  constructor(private configService: ConfigService) {
    this.baseDir = this.configService.get<string>(
      'UPLOADS_DIR',
      path.join(process.cwd(), 'uploads'),
    );

    // Garantir que o diretório base existe
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }

    this.logger.log(
      `Adaptador de armazenamento local inicializado para diretório: ${this.baseDir}`,
    );
  }

  /**
   * Salva um arquivo no sistema de arquivos local
   * @param buffer Buffer do arquivo
   * @param nomeArquivo Nome do arquivo
   * @param mimetype Tipo MIME do arquivo
   * @param metadados Metadados opcionais do arquivo
   * @returns Caminho relativo do arquivo armazenado
   */
  async salvarArquivo(
    buffer: Buffer,
    nomeArquivo: string,
    mimetype: string,
    metadados?: Record<string, any>,
  ): Promise<string> {
    try {
      // Extrair informações dos metadados
      const solicitacaoId = metadados?.solicitacaoId || 'default';
      const tipoDocumento = metadados?.tipoDocumento || 'OUTRO';

      // Criar estrutura de diretórios
      const dirPath = path.join(this.baseDir, solicitacaoId, tipoDocumento);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // Gerar nome de arquivo único
      const timestamp = Date.now();
      const randomString = crypto.randomBytes(8).toString('hex');
      const fileExtension = path.extname(nomeArquivo);
      const fileName = `${timestamp}-${randomString}${fileExtension}`;

      // Caminho completo do arquivo
      const filePath = path.join(dirPath, fileName);

      // Salvar arquivo
      fs.writeFileSync(filePath, buffer);

      // Salvar metadados em arquivo separado
      if (metadados) {
        const metadataPath = `${filePath}.metadata.json`;
        fs.writeFileSync(
          metadataPath,
          JSON.stringify(
            {
              ...metadados,
              mimetype,
              originalName: nomeArquivo,
              timestamp,
            },
            null,
            2,
          ),
        );
      }

      // Retornar caminho relativo
      const relativePath = path.join(solicitacaoId, tipoDocumento, fileName);
      this.logger.debug(`Arquivo salvo com sucesso: ${relativePath}`);

      return relativePath.replace(/\\/g, '/'); // Normalizar para formato de caminho com barras
    } catch (error) {
      this.logger.error(`Erro ao salvar arquivo: ${error.message}`);
      throw new Error(`Erro ao salvar arquivo: ${error.message}`);
    }
  }

  /**
   * Obtém um arquivo do sistema de arquivos local
   * @param caminho Caminho relativo do arquivo
   * @returns Buffer do arquivo
   */
  async obterArquivo(caminho: string): Promise<Buffer> {
    try {
      const filePath = path.join(this.baseDir, caminho);

      if (!fs.existsSync(filePath)) {
        throw new Error(`Arquivo não encontrado: ${caminho}`);
      }

      const buffer = fs.readFileSync(filePath);
      this.logger.debug(
        `Arquivo obtido com sucesso: ${caminho} (${buffer.length} bytes)`,
      );

      return buffer;
    } catch (error) {
      this.logger.error(`Erro ao obter arquivo: ${error.message}`);
      throw new Error(`Erro ao obter arquivo: ${error.message}`);
    }
  }

  /**
   * Obtém um stream de leitura de um arquivo do sistema de arquivos local
   * @param caminho Caminho relativo do arquivo
   * @returns Stream de leitura do arquivo
   */
  async obterArquivoStream(caminho: string): Promise<Readable> {
    try {
      const filePath = path.join(this.baseDir, caminho);

      if (!fs.existsSync(filePath)) {
        throw new Error(`Arquivo não encontrado: ${caminho}`);
      }

      // Criar stream de leitura do arquivo
      const readStream = fs.createReadStream(filePath);

      this.logger.debug(`Stream de arquivo criado com sucesso: ${caminho}`);

      return readStream;
    } catch (error) {
      this.logger.error(`Erro ao criar stream do arquivo: ${error.message}`);
      throw new Error(`Erro ao criar stream do arquivo: ${error.message}`);
    }
  }

  /**
   * Remove um arquivo do sistema de arquivos local
   * @param caminho Caminho relativo do arquivo
   */
  async removerArquivo(caminho: string): Promise<void> {
    try {
      const filePath = path.join(this.baseDir, caminho);
      const metadataPath = `${filePath}.metadata.json`;

      // Remover arquivo principal
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      } else {
        this.logger.warn(`Arquivo não encontrado para remoção: ${caminho}`);
      }

      // Remover arquivo de metadados se existir
      if (fs.existsSync(metadataPath)) {
        fs.unlinkSync(metadataPath);
      }

      this.logger.debug(`Arquivo removido com sucesso: ${caminho}`);
    } catch (error) {
      this.logger.error(`Erro ao remover arquivo: ${error.message}`);
      throw new Error(`Erro ao remover arquivo: ${error.message}`);
    }
  }

  /**
   * Faz upload de um arquivo para o sistema de arquivos local
   * @param buffer Buffer do arquivo
   * @param key Caminho relativo do arquivo
   * @param mimetype Tipo MIME do arquivo
   * @param metadata Metadados opcionais do arquivo
   * @returns Caminho relativo do arquivo armazenado
   */
  async upload(
    buffer: Buffer,
    key: string,
    mimetype: string,
    metadata?: Record<string, any>,
  ): Promise<string> {
    return this.salvarArquivo(buffer, key, mimetype, metadata);
  }

  /**
   * Faz download de um arquivo do sistema de arquivos local
   * @param key Caminho relativo do arquivo
   * @returns Buffer do arquivo
   */
  async download(key: string): Promise<Buffer> {
    return this.obterArquivo(key);
  }

  /**
   * Remove um arquivo do sistema de arquivos local
   * @param key Caminho relativo do arquivo
   */
  async delete(key: string): Promise<void> {
    return this.removerArquivo(key);
  }

  /**
   * Obtém a URL de acesso a um arquivo no sistema de arquivos local
   * @param key Caminho relativo do arquivo
   * @param expiresIn Tempo de expiração da URL em segundos (não utilizado para armazenamento local)
   * @returns Caminho absoluto do arquivo
   */
  async getUrl(key: string, expiresIn?: number): Promise<string> {
    try {
      const filePath = path.join(this.baseDir, key);

      if (!fs.existsSync(filePath)) {
        throw new Error(`Arquivo não encontrado: ${key}`);
      }

      // Para armazenamento local, retornamos o caminho absoluto
      // Em um ambiente web real, isso poderia ser uma URL para um endpoint que serve o arquivo
      const baseUrl = this.configService.get<string>(
        'BASE_URL',
        'http://localhost:3000',
      );
      return `${baseUrl}/documentos/arquivo/${key}`;
    } catch (error) {
      this.logger.error(`Erro ao gerar URL: ${error.message}`);
      throw new Error(`Erro ao gerar URL: ${error.message}`);
    }
  }

  /**
   * Verifica se um arquivo existe no sistema de arquivos local
   * @param key Caminho relativo do arquivo
   * @returns true se o arquivo existe, false caso contrário
   */
  async exists(key: string): Promise<boolean> {
    try {
      const filePath = path.join(this.baseDir, key);
      return fs.existsSync(filePath);
    } catch (error) {
      this.logger.error(
        `Erro ao verificar existência do arquivo: ${error.message}`,
      );
      throw new Error(
        `Erro ao verificar existência do arquivo: ${error.message}`,
      );
    }
  }

  /**
   * Copia um arquivo de um caminho para outro no sistema de arquivos local
   * @param sourceKey Caminho relativo do arquivo de origem
   * @param destinationKey Caminho relativo do arquivo de destino
   * @returns Caminho relativo do arquivo copiado
   */
  async copy(sourceKey: string, destinationKey: string): Promise<string> {
    try {
      const sourceFilePath = path.join(this.baseDir, sourceKey);
      const destFilePath = path.join(this.baseDir, destinationKey);
      const sourceMetadataPath = `${sourceFilePath}.metadata.json`;
      const destMetadataPath = `${destFilePath}.metadata.json`;

      // Verificar se o arquivo de origem existe
      if (!fs.existsSync(sourceFilePath)) {
        throw new Error(`Arquivo de origem não encontrado: ${sourceKey}`);
      }

      // Criar diretório de destino se não existir
      const destDir = path.dirname(destFilePath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      // Copiar arquivo
      fs.copyFileSync(sourceFilePath, destFilePath);

      // Copiar metadados se existirem
      if (fs.existsSync(sourceMetadataPath)) {
        fs.copyFileSync(sourceMetadataPath, destMetadataPath);
      }

      this.logger.debug(
        `Arquivo copiado com sucesso de ${sourceKey} para ${destinationKey}`,
      );

      return destinationKey;
    } catch (error) {
      this.logger.error(`Erro ao copiar arquivo: ${error.message}`);
      throw new Error(`Erro ao copiar arquivo: ${error.message}`);
    }
  }

  /**
   * Lista arquivos com um prefixo específico no sistema de arquivos local
   * @param prefix Prefixo para filtrar arquivos
   * @param maxKeys Número máximo de chaves a retornar (padrão: 1000)
   * @returns Lista de caminhos relativos de arquivos
   */
  async list(prefix: string, maxKeys: number = 1000): Promise<string[]> {
    try {
      const prefixPath = path.join(this.baseDir, prefix);
      const prefixDir =
        fs.existsSync(prefixPath) && fs.statSync(prefixPath).isDirectory()
          ? prefixPath
          : path.dirname(prefixPath);

      if (!fs.existsSync(prefixDir)) {
        return [];
      }

      // Função recursiva para listar arquivos
      const listFilesRecursively = (
        dir: string,
        basePath: string,
        results: string[] = [],
        depth: number = 0,
      ): string[] => {
        // Limitar profundidade da recursão
        if (depth > 10 || results.length >= maxKeys) {
          return results;
        }

        const files = fs.readdirSync(dir);

        for (const file of files) {
          if (results.length >= maxKeys) {
            break;
          }

          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);

          if (stat.isDirectory()) {
            listFilesRecursively(filePath, basePath, results, depth + 1);
          } else if (!file.endsWith('.metadata.json')) {
            // Ignorar arquivos de metadados
            const relativePath = path
              .relative(this.baseDir, filePath)
              .replace(/\\/g, '/');
            if (relativePath.startsWith(prefix)) {
              results.push(relativePath);
            }
          }
        }

        return results;
      };

      const results = listFilesRecursively(prefixDir, this.baseDir);
      this.logger.debug(
        `Encontrados ${results.length} arquivos com prefixo: ${prefix}`,
      );

      return results.slice(0, maxKeys);
    } catch (error) {
      this.logger.error(`Erro ao listar arquivos: ${error.message}`);
      throw new Error(`Erro ao listar arquivos: ${error.message}`);
    }
  }
}
