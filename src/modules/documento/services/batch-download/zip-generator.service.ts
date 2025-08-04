import { Injectable, Logger } from '@nestjs/common';
import { Readable, PassThrough } from 'stream';
import archiver = require('archiver');
import { StorageProviderFactory } from '../../factories/storage-provider.factory';
import { Documento } from '../../../../entities/documento.entity';

interface ZipFileInfo {
  documento: Documento;
  zipPath: string;
  tamanho: number;
}

interface StreamOptions {
  compressionLevel?: number;
  bufferSize?: number;
  highWaterMark?: number;
}

/**
 * Serviço especializado para geração de arquivos ZIP com streaming otimizado
 * Implementa controle de backpressure e gestão eficiente de memória
 */
@Injectable()
export class ZipGeneratorService {
  private readonly logger = new Logger(ZipGeneratorService.name);

  // Configurações de streaming otimizadas
  private readonly DEFAULT_COMPRESSION_LEVEL = 6; // Balanceio entre velocidade e compressão
  private readonly DEFAULT_BUFFER_SIZE = 64 * 1024; // 64KB buffer
  private readonly DEFAULT_HIGH_WATER_MARK = 16 * 1024; // 16KB high water mark
  private readonly MAX_CONCURRENT_FILES = 3; // Máximo 3 arquivos sendo processados simultaneamente

  constructor(
    private readonly storageProviderFactory: StorageProviderFactory,
  ) {}

  /**
   * Gera um stream de ZIP otimizado com controle de backpressure
   */
  async gerarZipStream(
    documentos: Documento[],
    jobId: string,
    options: StreamOptions = {},
  ): Promise<{
    stream: NodeJS.ReadableStream;
    estimatedSize?: number;
  }> {
    const {
      compressionLevel = this.DEFAULT_COMPRESSION_LEVEL,
      bufferSize = this.DEFAULT_BUFFER_SIZE,
      highWaterMark = this.DEFAULT_HIGH_WATER_MARK,
    } = options;

    this.logger.log(
      `Iniciando geração de ZIP para ${documentos.length} documentos (Job: ${jobId})`,
    );

    // Criar estrutura do ZIP
    const zipStructure = await this.criarEstruturaZip(documentos);

    // Configurar archiver com otimizações
    const archive = archiver('zip', {
      zlib: {
        level: compressionLevel,
        chunkSize: bufferSize,
      },
      store: false, // Sempre comprimir
    });

    // Criar stream de saída com controle de backpressure
    const outputStream = new PassThrough({
      highWaterMark,
      objectMode: false,
    });

    // Configurar pipe com controle de erro
    archive.pipe(outputStream);

    // Configurar handlers de evento
    this.configurarEventHandlers(archive, outputStream, jobId);

    // Processar arquivos de forma assíncrona
    this.processarArquivosAsync(archive, zipStructure.files, jobId)
      .then(() => {
        this.logger.log(`Finalizando ZIP para job ${jobId}`);
        archive.finalize();
      })
      .catch((error) => {
        this.logger.error(
          `Erro ao processar arquivos para job ${jobId}:`,
          error,
        );
        archive.destroy(error);
      });

    return {
      stream: outputStream,
      estimatedSize: zipStructure.estimatedSize,
    };
  }

  /**
   * Cria a estrutura do ZIP com informações dos arquivos
   */
  private async criarEstruturaZip(documentos: Documento[]): Promise<{
    files: ZipFileInfo[];
    estimatedSize: number;
  }> {
    const files: ZipFileInfo[] = [];
    let estimatedSize = 0;

    // Agrupar documentos por tipo para organização
    const documentosPorTipo = this.agruparDocumentosPorTipo(documentos);

    for (const [tipo, docs] of Object.entries(documentosPorTipo)) {
      for (let i = 0; i < docs.length; i++) {
        const documento = docs[i];
        const extensao = this.obterExtensaoArquivo(documento.nome_arquivo);
        const nomeSeguro = this.sanitizarNomeArquivo(documento.nome_arquivo);

        // Criar caminho único no ZIP
        const zipPath = `${tipo}/${String(i + 1).padStart(3, '0')}_${nomeSeguro}`;

        files.push({
          documento,
          zipPath,
          tamanho: documento.tamanho || 0,
        });

        estimatedSize += documento.tamanho || 0;
      }
    }

    return { files, estimatedSize };
  }

  /**
   * Processa arquivos de forma assíncrona com controle de concorrência
   */
  private async processarArquivosAsync(
    archive: archiver.Archiver,
    files: ZipFileInfo[],
    jobId: string,
  ): Promise<void> {
    // Adicionar arquivo de índice primeiro
    const indexContent = this.gerarIndiceDocumentos(files, jobId);
    archive.append(indexContent, { name: 'INDICE.txt' });

    // Processar arquivos em lotes para controlar uso de memória
    const batchSize = this.MAX_CONCURRENT_FILES;

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);

      // Processar lote atual
      await Promise.allSettled(
        batch.map((fileInfo) =>
          this.adicionarArquivoAoZip(archive, fileInfo, jobId),
        ),
      );

      // Log de progresso
      const progresso = Math.min(i + batchSize, files.length);
      this.logger.debug(
        `Processados ${progresso}/${files.length} arquivos (Job: ${jobId})`,
      );
    }
  }

  /**
   * Adiciona um arquivo individual ao ZIP com tratamento de erro
   */
  private async adicionarArquivoAoZip(
    archive: archiver.Archiver,
    fileInfo: ZipFileInfo,
    jobId: string,
  ): Promise<void> {
    try {
      const storageProvider = this.storageProviderFactory.getProvider();

      // Obter arquivo do storage usando StorageProviderFactory
      const arquivoBuffer = await storageProvider.obterArquivo(
        fileInfo.documento.caminho,
      );

      if (!arquivoBuffer) {
        this.logger.warn(
          `Arquivo não encontrado: ${fileInfo.documento.caminho} (${fileInfo.documento.nome_arquivo})`,
        );
        return;
      }

      // Adicionar ao ZIP usando buffer
      archive.append(arquivoBuffer, {
        name: fileInfo.zipPath,
        date: fileInfo.documento.created_at,
      });
    } catch (error) {
      this.logger.warn(
        `Erro ao adicionar arquivo ${fileInfo.documento.caminho} ao ZIP (Job: ${jobId}):`,
        error.message,
      );

      // Adicionar arquivo de erro em vez do arquivo original
      const errorContent = `ERRO: Não foi possível incluir este arquivo.\nMotivo: ${error.message}\nArquivo: ${fileInfo.documento.nome_arquivo}`;
      archive.append(errorContent, {
        name: `${fileInfo.zipPath}_ERRO.txt`,
      });
    }
  }

  /**
   * Configura handlers de eventos para o archiver e stream
   */
  private configurarEventHandlers(
    archive: archiver.Archiver,
    outputStream: PassThrough,
    jobId: string,
  ): void {
    // Eventos do archiver
    archive.on('error', (error) => {
      this.logger.error(`Erro no archiver (Job: ${jobId}):`, error);
      outputStream.destroy(error);
    });

    archive.on('warning', (warning) => {
      this.logger.warn(`Aviso do archiver (Job: ${jobId}):`, warning);
    });

    archive.on('progress', (progress) => {
      this.logger.debug(
        `Progresso ZIP (Job: ${jobId}): ${progress.entries.processed}/${progress.entries.total}`,
      );
    });

    // Eventos do stream de saída
    outputStream.on('error', (error) => {
      this.logger.error(`Erro no stream de saída (Job: ${jobId}):`, error);
    });

    outputStream.on('close', () => {
      this.logger.log(`Stream de ZIP finalizado (Job: ${jobId})`);
    });
  }

  /**
   * Agrupa documentos por tipo para organização no ZIP
   */
  private agruparDocumentosPorTipo(
    documentos: Documento[],
  ): Record<string, Documento[]> {
    return documentos.reduce(
      (grupos, documento) => {
        const tipo = documento.tipo || 'outros';
        if (!grupos[tipo]) {
          grupos[tipo] = [];
        }
        grupos[tipo].push(documento);
        return grupos;
      },
      {} as Record<string, Documento[]>,
    );
  }

  /**
   * Sanitiza nome de arquivo para uso seguro no ZIP
   */
  private sanitizarNomeArquivo(nomeArquivo: string): string {
    return nomeArquivo
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 100); // Limitar tamanho
  }

  /**
   * Obtém extensão do arquivo
   */
  private obterExtensaoArquivo(nomeArquivo: string): string {
    const match = nomeArquivo.match(/\.([^.]+)$/);
    return match ? match[1].toLowerCase() : 'bin';
  }

  /**
   * Gera conteúdo do arquivo de índice
   */
  private gerarIndiceDocumentos(files: ZipFileInfo[], jobId: string): string {
    const lines = [
      '=== ÍNDICE DE DOCUMENTOS ===',
      `Job ID: ${jobId}`,
      `Gerado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
      `Total de arquivos: ${files.length}`,
      '',
      'ESTRUTURA:',
      '',
    ];

    // Agrupar por tipo para o índice
    const porTipo = files.reduce(
      (grupos, file) => {
        const tipo = file.zipPath.split('/')[0];
        if (!grupos[tipo]) grupos[tipo] = [];
        grupos[tipo].push(file);
        return grupos;
      },
      {} as Record<string, ZipFileInfo[]>,
    );

    for (const [tipo, arquivos] of Object.entries(porTipo)) {
      lines.push(`📁 ${tipo.toUpperCase()} (${arquivos.length} arquivos)`);

      arquivos.forEach((file, index) => {
        const tamanhoFormatado = file.tamanho
          ? this.formatarTamanho(file.tamanho)
          : 'N/A';
        lines.push(
          `   ${index + 1}. ${file.documento.nome_arquivo} (${tamanhoFormatado})`,
        );
      });

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Formata tamanho de arquivo para exibição
   */
  private formatarTamanho(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}
