import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';
import { pipeline } from 'stream';
import archiver from 'archiver';
import { DocumentoService } from '../documento.service';
import { StorageProviderFactory } from '../../factories/storage-provider.factory';
import { env } from '../../../../config/env';
import { Documento } from '../../../../entities/documento.entity';
import { Usuario } from '../../../../entities/usuario.entity';
import {
  IDocumentoBatchFiltros,
  IDocumentoBatchMetadados,
  IDocumentoBatchProgresso,
  IDocumentoBatchResultado,
  IDocumentoBatchService,
} from '../../interfaces/documento-batch.interface';
import {
  BatchDownloadFiltros,
  BatchJobStatus,
  ZipStructure,
  ZipFileInfo,
  BatchDownloadDto,
  BatchDownloadResponseDto,
  BatchJobStatusResponseDto,
} from '../../dto/batch-download.dto';
import { TipoDocumentoEnum } from '../../../../enums';

const pipelineAsync = promisify(pipeline);

@Injectable()
export class DocumentoBatchService {
  private readonly logger = new Logger(DocumentoBatchService.name);
  private readonly jobs = new Map<string, BatchJobStatus>();

  // Configurações (carregadas do env.ts)
  private readonly batchTempDir =
    env.DOWNLOAD_LOTE_TEMP_DIR ||
    path.join(process.cwd(), 'temp', 'batch-downloads');
  private readonly maxJobAge =
    (env.DOWNLOAD_LOTE_TTL_HORAS || 24) * 60 * 60 * 1000;
  private readonly maxFileSize =
    (env.DOWNLOAD_LOTE_MAX_SIZE_MB || 500) * 1024 * 1024;
  private readonly MAX_DOCUMENTOS_POR_JOB =
    env.DOWNLOAD_LOTE_MAX_DOCUMENTOS || 1000;
  private readonly BATCH_SIZE = env.DOWNLOAD_LOTE_BATCH_SIZE || 50;
  private readonly TIMEOUT_MS = env.DOWNLOAD_LOTE_TIMEOUT_MS || 300000;

  constructor(
    @InjectRepository(Documento)
    private readonly documentoRepository: Repository<Documento>,
    private readonly documentoService: DocumentoService,
    private readonly storageProviderFactory: StorageProviderFactory,
  ) {
    this.ensureTempDirectory();
    this.startCleanupScheduler();
  }

  /**
   * Inicia um job de download em lote
   */
  async iniciarJob(
    filtros: IDocumentoBatchFiltros,
    usuario_id: string,
    metadados?: IDocumentoBatchMetadados,
  ): Promise<string> {
    this.logger.log(`Iniciando download em lote para usuário ${usuario_id}`);

    // Implementação do método iniciarJob
    const jobId = uuidv4();
    // TODO: Implementar lógica do iniciarJob
    return jobId;
  }

  /**
   * Método legado para compatibilidade
   */
  async startBatchDownload(
    filtros: BatchDownloadFiltros,
    usuario: Usuario,
  ): Promise<{ jobId: string; estimatedSize: number; documentCount: number }> {
    this.logger.log(`Iniciando download em lote para usuário ${usuario.id}`);

    // Validar filtros
    this.validateFilters(filtros);

    // Buscar documentos com base nos filtros
    const documentos = await this.findDocumentsByFilters(filtros, usuario);

    if (documentos.length === 0) {
      throw new BadRequestException(
        'Nenhum documento encontrado com os filtros especificados',
      );
    }

    // Estimar tamanho
    const estimatedSize = await this.estimateZipSize(documentos);

    if (estimatedSize > this.maxFileSize) {
      throw new BadRequestException(
        `O tamanho estimado do arquivo (${this.formatFileSize(estimatedSize)}) excede o limite máximo de ${this.formatFileSize(this.maxFileSize)}`,
      );
    }

    // Criar job
    const jobId = uuidv4();
    const job: BatchJobStatus = {
      id: jobId,
      status: 'PROCESSING',
      usuarioId: usuario.id,
      filtros,
      documentos,
      estimatedSize,
      documentCount: documentos.length,
      createdAt: new Date(),
      progress: 0,
    };

    this.jobs.set(jobId, job);

    // Processar assincronamente
    this.processJob(jobId).catch((error) => {
      this.logger.error(`Erro no processamento do job ${jobId}:`, error);
      this.markJobAsFailed(jobId, error.message);
    });

    return {
      jobId,
      estimatedSize,
      documentCount: documentos.length,
    };
  }

  /**
   * Valida os filtros fornecidos para o download em lote
   */
  async validarFiltros(
    filtros: BatchDownloadDto,
    usuarioId?: string,
  ): Promise<any> {
    const validacao = {
      valido: true,
      erros: [] as string[],
      avisos: [] as string[],
      estimativa: {
        total_documentos: 0,
        tamanho_estimado: 0,
      },
    };

    try {
      // Validar se pelo menos um filtro foi fornecido
      const temFiltros = Object.keys(filtros).some((key) => {
        const valor = filtros[key];
        return valor !== null && valor !== undefined && valor !== '';
      });

      if (!temFiltros) {
        validacao.valido = false;
        validacao.erros.push('Pelo menos um filtro deve ser fornecido');
        return validacao;
      }

      // Construir query para estimar quantidade de documentos
      const queryBuilder = this.documentoRepository
        .createQueryBuilder('documento')
        .leftJoinAndSelect('documento.cidadao', 'cidadao')
        .leftJoinAndSelect('documento.solicitacao', 'solicitacao');

      // Aplicar filtros
      if (filtros.cidadaoIds && filtros.cidadaoIds.length > 0) {
        queryBuilder.andWhere('documento.cidadao_id IN (:...cidadaoIds)', {
          cidadaoIds: filtros.cidadaoIds,
        });
      }

      if (filtros.solicitacaoIds && filtros.solicitacaoIds.length > 0) {
        queryBuilder.andWhere(
          'documento.solicitacao_id IN (:...solicitacaoIds)',
          { solicitacaoIds: filtros.solicitacaoIds },
        );
      }

      if (filtros.tiposDocumento && filtros.tiposDocumento.length > 0) {
        queryBuilder.andWhere('documento.tipo IN (:...tipos)', {
          tipos: filtros.tiposDocumento,
        });
      }

      if (filtros.dataInicio) {
        queryBuilder.andWhere('documento.data_upload >= :dataInicio', {
          dataInicio: filtros.dataInicio,
        });
      }

      if (filtros.dataFim) {
        queryBuilder.andWhere('documento.data_upload <= :dataFim', {
          dataFim: filtros.dataFim,
        });
      }

      if (filtros.apenasVerificados !== undefined) {
        queryBuilder.andWhere('documento.verificado = :verificado', {
          verificado: filtros.apenasVerificados,
        });
      }

      // Contar documentos
      const totalDocumentos = await queryBuilder.getCount();
      validacao.estimativa.total_documentos = totalDocumentos;

      // Verificar limites
      if (totalDocumentos > this.MAX_DOCUMENTOS_POR_JOB) {
        validacao.valido = false;
        validacao.erros.push(
          `Número de documentos (${totalDocumentos}) excede o limite máximo (${this.MAX_DOCUMENTOS_POR_JOB})`,
        );
      }

      if (totalDocumentos === 0) {
        validacao.avisos.push(
          'Nenhum documento encontrado com os filtros especificados',
        );
      }

      // Estimar tamanho (aproximado)
      const tamanhoMedioMB = 2; // Estimativa de 2MB por documento
      validacao.estimativa.tamanho_estimado = totalDocumentos * tamanhoMedioMB;

      if (
        validacao.estimativa.tamanho_estimado >
        this.maxFileSize / (1024 * 1024)
      ) {
        validacao.avisos.push(
          `Tamanho estimado (${validacao.estimativa.tamanho_estimado}MB) pode exceder o limite máximo`,
        );
      }
    } catch (error) {
      this.logger.error('Erro ao validar filtros:', error);
      validacao.valido = false;
      validacao.erros.push('Erro interno ao validar filtros');
    }

    return validacao;
  }

  /**
   * Obtém estatísticas gerais do serviço de download em lote
   */
  async obterEstatisticas(): Promise<Record<string, any>> {
    const totalJobs = this.jobs.size;
    const jobsPorStatus = {
      pendente: 0,
      processando: 0,
      concluido: 0,
      erro: 0,
      cancelado: 0,
    };

    // Conta jobs por status
    for (const job of this.jobs.values()) {
      if (job.status in jobsPorStatus) {
        jobsPorStatus[job.status]++;
      }
    }

    // Calcula estatísticas de diretório temporário
    let estatisticasTemp = {
      totalArquivos: 0,
      tamanhoTotal: 0,
    };

    try {
      if (fs.existsSync(this.batchTempDir)) {
        const arquivos = fs.readdirSync(this.batchTempDir);
        let tamanhoTotal = 0;

        for (const arquivo of arquivos) {
          const caminhoCompleto = path.join(this.batchTempDir, arquivo);
          try {
            const stats = fs.statSync(caminhoCompleto);
            if (stats.isFile()) {
              tamanhoTotal += stats.size;
            }
          } catch (error) {
            // Ignora arquivos que não podem ser acessados
          }
        }

        estatisticasTemp = {
          totalArquivos: arquivos.length,
          tamanhoTotal,
        };
      }
    } catch (error) {
      this.logger.warn(
        'Erro ao obter estatísticas do diretório temporário:',
        error,
      );
    }

    return {
      jobs: {
        total: totalJobs,
        por_status: jobsPorStatus,
      },
      diretorio_temporario: {
        total_arquivos: estatisticasTemp.totalArquivos,
        tamanho_total_bytes: estatisticasTemp.tamanhoTotal,
        tamanho_total_mb:
          Math.round((estatisticasTemp.tamanhoTotal / (1024 * 1024)) * 100) /
          100,
      },
      configuracao: {
        max_documentos_por_job: this.MAX_DOCUMENTOS_POR_JOB,
        batch_size: this.BATCH_SIZE,
        max_file_size_mb: Math.round(this.maxFileSize / (1024 * 1024)),
        max_job_age_horas: Math.round(this.maxJobAge / (1000 * 60 * 60)),
      },
    };
  }

  /**
   * Obtém o status de um job
   */
  getBatchStatus(jobId: string, usuarioId: string): BatchJobStatus {
    const job = this.jobs.get(jobId);

    if (!job) {
      throw new NotFoundException('Job não encontrado');
    }

    if (job.usuarioId !== usuarioId) {
      throw new NotFoundException('Job não encontrado');
    }

    return job;
  }

  /**
   * Faz o download do arquivo ZIP gerado
   */
  async downloadBatchFile(
    jobId: string,
    usuarioId: string,
  ): Promise<{ filePath: string; fileName: string }> {
    const job = this.getBatchStatus(jobId, usuarioId);

    if (job.status !== 'COMPLETED') {
      throw new BadRequestException('Job ainda não foi concluído');
    }

    if (!job.zipPath || !fs.existsSync(job.zipPath)) {
      throw new NotFoundException('Arquivo ZIP não encontrado');
    }

    const fileName = `documentos_lote_${jobId.substring(0, 8)}.zip`;
    return { filePath: job.zipPath, fileName };
  }

  /**
   * Lista jobs do usuário
   */
  getUserJobs(usuarioId: string): BatchJobStatus[] {
    return Array.from(this.jobs.values())
      .filter((job) => job.usuarioId === usuarioId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Cancela um job em processamento
   */
  cancelJob(jobId: string, usuarioId: string): void {
    const job = this.getBatchStatus(jobId, usuarioId);

    if (job.status !== 'PROCESSING') {
      throw new BadRequestException(
        'Apenas jobs em processamento podem ser cancelados',
      );
    }

    this.markJobAsFailed(jobId, 'Cancelado pelo usuário');
  }

  /**
   * Processa um job de download em lote
   */
  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      this.logger.log(
        `Processando job ${jobId} com ${job.documentos.length} documentos`,
      );

      // Criar estrutura do ZIP
      const zipStructure = await this.createZipStructure(
        job.documentos,
        job.filtros,
      );
      this.updateJobProgress(jobId, 20);

      // Criar diretório temporário para este job
      const jobTempDir = path.join(this.batchTempDir, jobId);
      await fs.promises.mkdir(jobTempDir, { recursive: true });

      // Criar arquivo ZIP
      const zipPath = path.join(jobTempDir, 'documentos.zip');
      await this.createZipFile(zipStructure, zipPath, jobId);

      // Atualizar job como concluído
      const stats = await fs.promises.stat(zipPath);
      job.zipPath = zipPath;
      job.actualSize = stats.size;
      job.status = 'COMPLETED';
      job.completedAt = new Date();
      job.progress = 100;

      this.logger.log(
        `Job ${jobId} concluído. Arquivo: ${this.formatFileSize(stats.size)}`,
      );
    } catch (error) {
      this.logger.error(`Erro no processamento do job ${jobId}:`, error);
      this.markJobAsFailed(jobId, error.message);
    }
  }

  /**
   * Cria a estrutura do ZIP organizando os documentos
   */
  private async createZipStructure(
    documentos: Documento[],
    filtros: BatchDownloadFiltros,
  ): Promise<ZipStructure> {
    const structure: ZipStructure = {
      folders: new Map(),
      files: [],
    };

    // Agrupar documentos por cidadão e solicitação
    const groupedByCidadao = this.groupBy(documentos, 'cidadao_id');

    for (const [cidadaoId, cidadaoDocumentos] of Object.entries(
      groupedByCidadao,
    )) {
      const cidadaoFolder = `Cidadao_${cidadaoId.substring(0, 8)}`;

      // Agrupar por solicitação dentro do cidadão
      const groupedBySolicitacao = this.groupBy(
        cidadaoDocumentos,
        'solicitacao_id',
      );

      for (const [solicitacaoId, solicitacaoDocumentos] of Object.entries(
        groupedBySolicitacao,
      )) {
        const solicitacaoFolder = `${cidadaoFolder}/Solicitacao_${solicitacaoId?.substring(0, 8) || 'Sem_Solicitacao'}`;

        // Separar recibos/comprovantes dos demais documentos
        const recibos = solicitacaoDocumentos.filter((doc) =>
          this.isReciboOrComprovante(doc),
        );
        const outrosDocumentos = solicitacaoDocumentos.filter(
          (doc) => !this.isReciboOrComprovante(doc),
        );

        // Adicionar documentos principais
        for (const documento of outrosDocumentos) {
          const fileName = this.generateFileName(documento);
          const zipPath = `${solicitacaoFolder}/${fileName}`;
          structure.files.push({ documento, zipPath });
        }

        // Adicionar recibos em subpasta
        if (recibos.length > 0) {
          for (const recibo of recibos) {
            const fileName = this.generateFileName(recibo);
            const zipPath = `${solicitacaoFolder}/Recibos_Comprovantes/${fileName}`;
            structure.files.push({ documento: recibo, zipPath });
          }
        }
      }
    }

    return structure;
  }

  /**
   * Cria o arquivo ZIP
   */
  private async createZipFile(
    structure: ZipStructure,
    zipPath: string,
    jobId: string,
  ): Promise<void> {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);

    let processedFiles = 0;
    const totalFiles = structure.files.length;

    // Adicionar arquivo de índice
    const indexContent = this.generateBatchIndex(structure.files);
    archive.append(indexContent, { name: 'INDICE.txt' });

    // Adicionar arquivos
    for (const fileInfo of structure.files) {
      try {
        const storageProvider = this.storageProviderFactory.getProvider();
        const fileBuffer = await storageProvider.obterArquivo(
          fileInfo.documento.caminho,
        );
        archive.append(fileBuffer, { name: fileInfo.zipPath });

        processedFiles++;
        const progress = 20 + Math.floor((processedFiles / totalFiles) * 70); // 20-90%
        this.updateJobProgress(jobId, progress);
      } catch (error) {
        this.logger.warn(
          `Erro ao adicionar arquivo ${fileInfo.documento.caminho} ao ZIP:`,
          error,
        );
        // Continuar com os outros arquivos
      }
    }

    this.updateJobProgress(jobId, 95);
    await archive.finalize();

    return new Promise((resolve, reject) => {
      output.on('close', resolve);
      output.on('error', reject);
      archive.on('error', reject);
    });
  }

  /**
   * Busca documentos com base nos filtros
   */
  private async findDocumentsByFilters(
    filtros: BatchDownloadFiltros,
    usuario: Usuario,
  ): Promise<Documento[]> {
    const queryBuilder = this.documentoRepository
      .createQueryBuilder('documento')
      .leftJoinAndSelect('documento.cidadao', 'cidadao')
      .leftJoinAndSelect('documento.solicitacao', 'solicitacao')
      .where('documento.removed_at IS NULL');

    // Aplicar filtros
    if (filtros.cidadaoIds?.length) {
      queryBuilder.andWhere('documento.cidadao_id IN (:...cidadaoIds)', {
        cidadaoIds: filtros.cidadaoIds,
      });
    }

    if (filtros.solicitacaoIds?.length) {
      queryBuilder.andWhere(
        'documento.solicitacao_id IN (:...solicitacaoIds)',
        {
          solicitacaoIds: filtros.solicitacaoIds,
        },
      );
    }

    if (filtros.tiposDocumento?.length) {
      queryBuilder.andWhere('documento.tipo IN (:...tipos)', {
        tipos: filtros.tiposDocumento,
      });
    }

    if (filtros.dataInicio) {
      queryBuilder.andWhere('documento.created_at >= :dataInicio', {
        dataInicio: filtros.dataInicio,
      });
    }

    if (filtros.dataFim) {
      queryBuilder.andWhere('documento.created_at <= :dataFim', {
        dataFim: filtros.dataFim,
      });
    }

    if (filtros.apenasVerificados) {
      queryBuilder.andWhere('documento.verificado = :verificado', {
        verificado: true,
      });
    }

    // Verificar permissões de acesso
    // TODO: Implementar verificação de permissões baseada no usuário
    // Por enquanto, assumindo que o usuário tem acesso a todos os documentos retornados

    return queryBuilder.getMany();
  }

  /**
   * Estima o tamanho do ZIP
   */
  private async estimateZipSize(documentos: Documento[]): Promise<number> {
    let totalSize = 0;

    for (const documento of documentos) {
      try {
        const storageProvider = this.storageProviderFactory.getProvider();
        // Estimativa baseada no tamanho médio dos arquivos (500KB por documento)
        const estimatedSize = 500 * 1024; // 500KB
        totalSize += estimatedSize;
      } catch (error) {
        this.logger.warn(
          `Erro ao obter tamanho do arquivo ${documento.caminho}:`,
          error,
        );
        // Estimar 1MB por arquivo não encontrado
        totalSize += 1024 * 1024;
      }
    }

    // Aplicar fator de compressão (estimativa de 70% do tamanho original)
    return Math.floor(totalSize * 0.7);
  }

  /**
   * Métodos auxiliares
   */
  private validateFilters(filtros: BatchDownloadFiltros): void {
    if (
      filtros.dataInicio &&
      filtros.dataFim &&
      filtros.dataInicio > filtros.dataFim
    ) {
      throw new BadRequestException(
        'Data de início deve ser anterior à data de fim',
      );
    }

    const hasFilter =
      filtros.cidadaoIds?.length ||
      filtros.solicitacaoIds?.length ||
      filtros.tiposDocumento?.length ||
      filtros.dataInicio ||
      filtros.dataFim;

    if (!hasFilter) {
      throw new BadRequestException(
        'Pelo menos um filtro deve ser especificado',
      );
    }
  }

  private isReciboOrComprovante(documento: Documento): boolean {
    const tiposRecibo = [
      TipoDocumentoEnum.COMPROVANTE_RESIDENCIA,
      TipoDocumentoEnum.COMPROVANTE_RENDA,
      // Adicionar outros tipos conforme necessário
    ];
    return tiposRecibo.includes(documento.tipo as TipoDocumentoEnum);
  }

  private generateFileName(documento: Documento): string {
    const sanitizedName = this.sanitizeFileName(
      documento.nome_original || 'documento',
    );
    const extension = path.extname(sanitizedName) || '.pdf';
    const baseName = path.basename(sanitizedName, extension);
    const timestamp = documento.created_at.toISOString().split('T')[0];

    return `${baseName}_${timestamp}_${documento.id.substring(0, 8)}${extension}`;
  }

  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 100);
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce(
      (groups, item) => {
        const groupKey = String(item[key] || 'undefined');
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(item);
        return groups;
      },
      {} as Record<string, T[]>,
    );
  }

  private generateBatchIndex(files: ZipFileInfo[]): string {
    const lines = [
      '=== ÍNDICE DE DOCUMENTOS ===',
      `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
      `Total de arquivos: ${files.length}`,
      '',
      'ESTRUTURA:',
    ];

    files.forEach((file, index) => {
      lines.push(`${index + 1}. ${file.zipPath}`);
      lines.push(`   Tipo: ${file.documento.tipo}`);
      lines.push(
        `   Data: ${file.documento.created_at.toLocaleDateString('pt-BR')}`,
      );
      lines.push('');
    });

    return lines.join('\n');
  }

  private updateJobProgress(jobId: string, progress: number): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.progress = Math.min(progress, 100);
    }
  }

  private markJobAsFailed(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'FAILED';
      job.error = error;
      job.completedAt = new Date();
    }
  }

  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  private ensureTempDirectory(): void {
    if (!fs.existsSync(this.batchTempDir)) {
      fs.mkdirSync(this.batchTempDir, { recursive: true });
    }
  }

  private startCleanupScheduler(): void {
    // Executar limpeza a cada hora
    setInterval(
      () => {
        this.cleanupOldJobs();
      },
      60 * 60 * 1000,
    );
  }

  private cleanupOldJobs(): void {
    const now = Date.now();
    const jobsToDelete: string[] = [];

    for (const [jobId, job] of this.jobs.entries()) {
      const jobAge = now - job.createdAt.getTime();

      if (jobAge > this.maxJobAge) {
        jobsToDelete.push(jobId);

        // Remover arquivo ZIP se existir
        if (job.zipPath && fs.existsSync(job.zipPath)) {
          try {
            const jobDir = path.dirname(job.zipPath);
            fs.rmSync(jobDir, { recursive: true, force: true });
          } catch (error) {
            this.logger.warn(
              `Erro ao remover diretório do job ${jobId}:`,
              error,
            );
          }
        }
      }
    }

    jobsToDelete.forEach((jobId) => {
      this.jobs.delete(jobId);
      this.logger.log(`Job ${jobId} removido por expiração`);
    });
  }
}
