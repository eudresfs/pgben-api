import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Serviço de Gerenciamento de Arquivos Temporários
 *
 * Responsável por criar, gerenciar e limpar arquivos temporários
 * utilizados durante a geração de relatórios.
 */
@Injectable()
export class TempFilesService implements OnModuleInit {
  [x: string]: any;
  private readonly logger = new Logger(TempFilesService.name);
  private readonly tempDir: string;
  private readonly intervalMs = 3600000; // 1 hora

  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'pgben-relatorios');
    this.logger.log(`Diretório temporário configurado: ${this.tempDir}`);
  }

  /**
   * Inicialização do serviço
   */
  onModuleInit() {
    // Criar diretório se não existir
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
      this.logger.log(`Diretório temporário criado: ${this.tempDir}`);
    }

    // Agendar limpeza periódica
    setInterval(() => this.limparArquivosAntigos(), this.intervalMs);
    this.logger.log(
      `Limpeza periódica agendada a cada ${this.intervalMs / 1000 / 60} minutos`,
    );

    // Executar limpeza inicial
    this.limparArquivosAntigos();
  }

  /**
   * Obtém caminho para um arquivo temporário
   * @param prefixo Prefixo para o nome do arquivo
   * @param extensao Extensão do arquivo
   * @returns Caminho completo para o arquivo temporário
   */
  getTempFilePath(prefixo: string, extensao: string): string {
    const fileName = `${prefixo}-${Date.now()}.${extensao}`;
    return path.join(this.tempDir, fileName);
  }

  /**
   * Cria arquivo temporário e retorna o caminho
   * @param prefixo Prefixo para o nome do arquivo
   * @param extensao Extensão do arquivo
   * @returns Caminho do arquivo temporário
   */
  createTempFile(prefixo: string, extensao: string): string {
    const filePath = this.getTempFilePath(prefixo, extensao);
    fs.writeFileSync(filePath, ''); // Cria o arquivo vazio
    return filePath;
  }

  /**
   * Limpa arquivos temporários antigos
   * Remove arquivos com mais de 24 horas
   */
  limparArquivosAntigos(): void {
    try {
      if (!fs.existsSync(this.tempDir)) {
        return;
      }

      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();
      let removidos = 0;

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);

        // Remover arquivos com mais de 24 horas
        if (now - stats.mtimeMs > 86400000) {
          try {
            fs.unlinkSync(filePath);
            removidos++;
          } catch (error) {
            this.logger.warn(
              `Erro ao remover arquivo temporário ${file}: ${error.message}`,
            );
          }
        }
      }

      if (removidos > 0) {
        this.logger.log(
          `${removidos} arquivos temporários antigos foram removidos`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Erro ao limpar arquivos temporários: ${error.message}`,
      );
    }
  }

  /**
   * Lê arquivo temporário para buffer e remove o arquivo
   * @param filePath Caminho do arquivo temporário
   * @returns Buffer com o conteúdo do arquivo
   */
  readAndRemove(filePath: string): Buffer {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Arquivo temporário não encontrado: ${filePath}`);
      }

      const buffer = fs.readFileSync(filePath);

      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        this.logger.warn(
          `Erro ao remover arquivo temporário ${filePath}: ${error.message}`,
        );
      }

      return buffer;
    } catch (error) {
      this.logger.error(
        `Erro ao ler e remover arquivo temporário: ${error.message}`,
      );
      throw error;
    }
  }
}
