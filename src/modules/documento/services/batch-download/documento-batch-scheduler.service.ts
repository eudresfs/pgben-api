import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DocumentoBatchService } from './documento-batch.service';
import { env } from '../../../../config/env';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);

/**
 * Serviço responsável pela limpeza automática de arquivos temporários
 * e jobs antigos do sistema de download em lote
 */
@Injectable()
export class DocumentoBatchSchedulerService {
  private readonly logger = new Logger(DocumentoBatchSchedulerService.name);
  private readonly BATCH_TEMP_DIR = env.DOWNLOAD_LOTE_TEMP_DIR;
  private readonly DEFAULT_TTL_HORAS = env.DOWNLOAD_LOTE_TTL_HORAS;
  private readonly DEFAULT_TTL_ARQUIVOS_HORAS = env.DOWNLOAD_LOTE_TTL_HORAS;

  constructor(private readonly documentoBatchService: DocumentoBatchService) {}

  /**
   * Executa limpeza automática baseada na configuração do cron
   */
  @Cron(env.DOWNLOAD_LOTE_CLEANUP_CRON)
  async executarLimpezaAutomatica(): Promise<{
    jobsLimpos: number;
    arquivosLimpos: number;
    espacoLiberado: string;
    timestamp: Date;
    erro?: string;
  }> {
    this.logger.log(
      'Iniciando limpeza automática de jobs de download em lote...',
    );

    try {
      const estatisticasAntes = await this.obterEstatisticasTemp();

      // Limpar jobs expirados do banco de dados
      const jobsLimpos = await this.documentoBatchService.limparJobsExpirados();

      // Limpar arquivos temporários órfãos
      const arquivosLimpos = await this.limparArquivosTemporarios();

      const estatisticasDepois = await this.obterEstatisticasTemp();
      const espacoLiberado = this.formatFileSize(
        estatisticasAntes.tamanhoTotal - estatisticasDepois.tamanhoTotal,
      );

      const resultado = {
        jobsLimpos,
        arquivosLimpos,
        espacoLiberado,
        timestamp: new Date(),
      };

      this.logger.log(
        `Limpeza automática concluída: ${jobsLimpos} jobs e ${arquivosLimpos} arquivos removidos, ${espacoLiberado} liberados`,
      );
      return resultado;
    } catch (error) {
      this.logger.error('Erro durante limpeza automática:', error);
      return {
        jobsLimpos: 0,
        arquivosLimpos: 0,
        espacoLiberado: '0 MB',
        timestamp: new Date(),
        erro: error.message,
      };
    }
  }

  /**
   * Remove jobs que estão há mais de 24 horas no sistema
   */
  private async limparJobsAntigos(): Promise<number> {
    return await this.documentoBatchService.limparJobsExpirados();
  }

  /**
   * Remove arquivos ZIP temporários antigos
   */
  private async limparArquivosTemporarios(): Promise<number> {
    try {
      if (!fs.existsSync(this.BATCH_TEMP_DIR)) {
        return 0;
      }

      const arquivos = await readdir(this.BATCH_TEMP_DIR);
      const agora = Date.now();
      let arquivosRemovidos = 0;

      for (const arquivo of arquivos) {
        const caminhoCompleto = path.join(this.BATCH_TEMP_DIR, arquivo);

        try {
          const stats = await stat(caminhoCompleto);
          const idadeArquivo = agora - stats.mtime.getTime();

          if (idadeArquivo > this.DEFAULT_TTL_ARQUIVOS_HORAS * 60 * 60 * 1000) {
            await unlink(caminhoCompleto);
            arquivosRemovidos++;
            this.logger.debug(`Arquivo removido: ${arquivo}`);
          }
        } catch (error) {
          this.logger.warn(`Erro ao processar arquivo ${arquivo}:`, error);
        }
      }

      this.logger.log(`Removidos ${arquivosRemovidos} arquivos temporários`);
      return arquivosRemovidos;
    } catch (error) {
      this.logger.error('Erro ao limpar arquivos temporários:', error);
      return 0;
    }
  }

  /**
   * Executa limpeza manual (pode ser chamado via endpoint administrativo)
   */
  async executarLimpezaManual(): Promise<{
    jobsRemovidos: number;
    arquivosRemovidos: number;
    sucesso: boolean;
  }> {
    this.logger.log('Iniciando limpeza manual');

    try {
      const jobsRemovidos = await this.limparJobsAntigos();
      const arquivosRemovidos = await this.limparArquivosTemporarios();

      return {
        jobsRemovidos,
        arquivosRemovidos,
        sucesso: true,
      };
    } catch (error) {
      this.logger.error('Erro durante limpeza manual:', error);
      return {
        jobsRemovidos: 0,
        arquivosRemovidos: 0,
        sucesso: false,
      };
    }
  }

  /**
   * Obtém estatísticas do diretório temporário
   */
  async obterEstatisticasTemp(): Promise<{
    totalArquivos: number;
    tamanhoTotal: number;
    arquivoMaisAntigo?: Date;
    arquivoMaisRecente?: Date;
  }> {
    try {
      if (!fs.existsSync(this.BATCH_TEMP_DIR)) {
        return {
          totalArquivos: 0,
          tamanhoTotal: 0,
        };
      }

      const arquivos = await readdir(this.BATCH_TEMP_DIR);
      let tamanhoTotal = 0;
      let arquivoMaisAntigo: Date | undefined;
      let arquivoMaisRecente: Date | undefined;

      for (const arquivo of arquivos) {
        const caminhoCompleto = path.join(this.BATCH_TEMP_DIR, arquivo);

        try {
          const stats = await stat(caminhoCompleto);
          tamanhoTotal += stats.size;

          if (!arquivoMaisAntigo || stats.mtime < arquivoMaisAntigo) {
            arquivoMaisAntigo = stats.mtime;
          }

          if (!arquivoMaisRecente || stats.mtime > arquivoMaisRecente) {
            arquivoMaisRecente = stats.mtime;
          }
        } catch (error) {
          this.logger.warn(`Erro ao obter stats do arquivo ${arquivo}:`, error);
        }
      }

      return {
        totalArquivos: arquivos.length,
        tamanhoTotal,
        arquivoMaisAntigo,
        arquivoMaisRecente,
      };
    } catch (error) {
      this.logger.error('Erro ao obter estatísticas:', error);
      return {
        totalArquivos: 0,
        tamanhoTotal: 0,
      };
    }
  }

  /**
   * Formata tamanho de arquivo em formato legível
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
