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
import { pipeline, Readable } from 'stream';
import archiver from 'archiver';
import { DocumentoService } from '../documento.service';
import { StorageProviderFactory } from '../../factories/storage-provider.factory';
import { env } from '../../../../config/env';
import { Documento } from '../../../../entities/documento.entity';
import { Usuario } from '../../../../entities/usuario.entity';
import {
  DocumentoBatchJob,
  StatusDownloadLoteEnum,
} from '../../../../entities/documento-batch-job.entity';
import {
  IDocumentoBatchFiltros,
  IDocumentoBatchMetadados,
  IDocumentoBatchProgresso,
  IDocumentoBatchResultado,
  IDocumentoBatchService,
} from '../../interfaces/documento-batch.interface';
import {
  BatchDownloadFiltros,
  ZipStructure,
  ZipFileInfo,
  BatchDownloadDto,
} from '../../dto/batch-download.dto';
import { TipoDocumentoEnum } from '../../../../enums';
import { BatchJobManagerService } from './batch-job-manager.service';
import { ZipGeneratorService } from './zip-generator.service';
import { DocumentFilterService } from './document-filter.service';
import { AuditEventEmitter } from '../../../auditoria/events/emitters/audit-event.emitter';
import { AuditContextHolder } from '../../../../common/interceptors/audit-context.interceptor';

const pipelineAsync = promisify(pipeline);

@Injectable()
export class DocumentoBatchService {
  private readonly logger = new Logger(DocumentoBatchService.name);

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
  private readonly CONCURRENCY_LIMIT = env.DOWNLOAD_LOTE_CONCURRENCY_LIMIT || 8;

  constructor(
    @InjectRepository(Documento)
    private readonly documentoRepository: Repository<Documento>,
    @InjectRepository(DocumentoBatchJob)
    private readonly batchJobRepository: Repository<DocumentoBatchJob>,
    private readonly documentoService: DocumentoService,
    private readonly storageProviderFactory: StorageProviderFactory,
    private readonly batchJobManager: BatchJobManagerService,
    private readonly zipGenerator: ZipGeneratorService,
    private readonly documentFilterService: DocumentFilterService,
    private readonly auditEventEmitter: AuditEventEmitter,
  ) {
    this.ensureTempDirectory();
    this.startCleanupScheduler();
  }

  /**
   * Inicia um job de download em lote com métricas de performance
   */
  async iniciarJob(
    filtros: IDocumentoBatchFiltros,
    usuario_id: string,
    unidade_id: string,
    metadados?: IDocumentoBatchMetadados,
  ): Promise<{
    jobId: string;
    estimatedSize: number;
    documentCount: number;
  }> {
    const startTime = Date.now();
    const metricas = {
      inicio: startTime,
      validacao_tempo: 0,
      consulta_tempo: 0,
      processamento_tempo: 0,
      zip_tempo: 0,
      total_documentos: 0,
      tamanho_total: 0,
    };

    this.logger.log(`Iniciando download em lote para usuário ${usuario_id}`);

    try {
      // Verificar se o usuário pode iniciar um novo job (rate limiting)
      const podeIniciar = await this.batchJobManager.podeIniciarJob(usuario_id);
      if (!podeIniciar.pode) {
        throw new BadRequestException(podeIniciar.motivo);
      }

      // Validar filtros usando o DocumentFilterService
      const validacaoInicio = Date.now();
      const validacao = await this.documentFilterService.validarFiltros(
        filtros as any,
        usuario_id,
      );
      metricas.validacao_tempo = Date.now() - validacaoInicio;

      if (!validacao.valido) {
        this.logger.warn(
          `Validação falhou para usuário ${usuario_id}:`,
          validacao.erros,
        );
        throw new BadRequestException(
          `Filtros inválidos: ${validacao.erros.join(', ')}`,
        );
      }

      // Verificar se foram encontrados documentos na validação
      if (validacao.estimativa.total_documentos === 0) {
        throw new BadRequestException(
          'Nenhum documento encontrado com os filtros especificados',
        );
      }

      metricas.total_documentos = validacao.estimativa.total_documentos;
      metricas.tamanho_total = validacao.estimativa.tamanho_estimado;

      // Usar tamanho estimado da validação
      const estimatedSize = validacao.estimativa.tamanho_estimado;

      if (estimatedSize > this.maxFileSize) {
        throw new BadRequestException(
          `O tamanho estimado do arquivo (${this.formatFileSize(estimatedSize)}) excede o limite máximo de ${this.formatFileSize(this.maxFileSize)}`,
        );
      }

      // Criar job na base de dados
      const job = this.batchJobRepository.create({
        usuario_id,
        unidade_id,
        status: StatusDownloadLoteEnum.PENDING,
        filtros: filtros,
        metadados: { ...metadados, metricas },
        total_documentos: validacao.estimativa.total_documentos,
        documentos_processados: 0,
        progresso_percentual: 0,
        tamanho_estimado: estimatedSize,
        created_at: new Date(),
        updated_at: new Date(),
        data_expiracao: new Date(Date.now() + this.maxJobAge),
      });

      const savedJob = await this.batchJobRepository.save(job);

      // Auditoria - Job de download em lote criado
      const auditContext = this.getAuditContext(usuario_id);
      await this.auditEventEmitter.emitEntityCreated(
        'DocumentoBatchJob',
        savedJob.id,
        {
          id: savedJob.id,
          usuario_id: savedJob.usuario_id,
          unidade_id: savedJob.unidade_id,
          status: savedJob.status,
          filtros: savedJob.filtros,
          total_documentos: savedJob.total_documentos,
          tamanho_estimado: savedJob.tamanho_estimado,
          data_expiracao: savedJob.data_expiracao,
        },
        auditContext.userId
      );

      this.logger.log(
        `Job ${savedJob.id} criado para usuário ${usuario_id} - Estimativa: ${metricas.total_documentos} documentos, ${this.formatFileSize(metricas.tamanho_total)} (${podeIniciar.jobsAtivos + 1}/2 jobs ativos)`,
      );

      // Processar assincronamente
      this.processJobWithEntity(savedJob.id, metricas).catch((error) => {
        const tempoTotal = Date.now() - startTime;
        this.logger.error(
          `Erro no processamento do job ${savedJob.id} após ${tempoTotal}ms:`,
          error,
        );
        this.markJobAsFailedInDB(savedJob.id, error.message);
      });

      return {
        jobId: savedJob.id,
        estimatedSize: validacao.estimativa.tamanho_estimado,
        documentCount: validacao.estimativa.total_documentos,
      };
    } catch (error) {
      const tempoTotal = Date.now() - startTime;
      this.logger.error(
        `Erro ao iniciar job para usuário ${usuario_id} após ${tempoTotal}ms:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Obtém o progresso de um job
   */
  async obterProgresso(job_id: string): Promise<IDocumentoBatchProgresso> {
    const job = await this.batchJobRepository.findOne({
      where: { id: job_id },
    });

    if (!job) {
      throw new NotFoundException('Job não encontrado');
    }

    return {
      job_id: job.id,
      status: job.status as any,
      progresso: job.progresso_percentual,
      total_documentos: job.total_documentos,
      documentos_processados: job.documentos_processados,
      tempo_decorrido: this.calculateElapsedTime(job),
      erros: job.erro_detalhes ? [job.erro_detalhes] : [],
      data_inicio: job.data_inicio || job.created_at,
      updated_at: job.updated_at,
      metadados: job.metadados,
    };
  }

  /**
   * Obtém a entidade completa do job
   */
  async obterJobCompleto(job_id: string): Promise<DocumentoBatchJob> {
    const job = await this.batchJobRepository.findOne({
      where: { id: job_id },
    });

    if (!job) {
      throw new NotFoundException('Job não encontrado');
    }

    return job;
  }

  /**
   * Obtém o resultado de um job concluído
   */
  async obterResultado(job_id: string): Promise<IDocumentoBatchResultado> {
    const job = await this.batchJobRepository.findOne({
      where: { id: job_id },
    });

    if (!job) {
      throw new NotFoundException('Job não encontrado');
    }

    if (job.status !== StatusDownloadLoteEnum.COMPLETED) {
      throw new BadRequestException('Job ainda não foi concluído');
    }

    return {
      job_id: job.id,
      status: job.status,
      total_documentos: job.total_documentos,
      documentos_processados: job.documentos_processados,
      documentos_com_erro: job.total_documentos - job.documentos_processados,
      tempo_processamento: this.calculateProcessingTime(job),
      caminho_arquivo: job.caminho_arquivo,
      nome_arquivo: job.nome_arquivo,
      tamanho_estimado: job.tamanho_estimado,
      tamanho_real: job.tamanho_real,
      erros: job.erro_detalhes ? [job.erro_detalhes] : [],
      metadados: job.metadados,
      arquivo_zip: {
        nome: job.nome_arquivo || `lote_${job.id}.zip`,
        tamanho: job.tamanho_real || 0,
        url_download: `/api/v1/documento/download-lote/${job.id}/download`,
        data_expiracao: job.data_expiracao,
      },
      data_conclusao: job.data_conclusao,
    };
  }

  /**
   * Cria um stream de download direto sem usar arquivos temporários
   */
  async criarStreamDownload(jobId: string): Promise<{
    stream: NodeJS.ReadableStream;
    filename: string;
    size?: number;
  }> {
    const job = await this.batchJobRepository.findOne({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException(`Job ${jobId} não encontrado`);
    }

    if (job.status !== StatusDownloadLoteEnum.COMPLETED) {
      throw new BadRequestException(
        `Job ${jobId} não está concluído. Status atual: ${job.status}`,
      );
    }

    // Buscar documentos baseado nos filtros do job
    const documentos = await this.documentFilterService.aplicarFiltros(
      job.filtros as any,
      { id: job.usuario_id } as Usuario,
    );

    if (documentos.length === 0) {
      throw new NotFoundException('Nenhum documento encontrado para download');
    }

    this.logger.log(
      `Iniciando stream de download para job ${jobId} - ${documentos.length} documentos`,
    );

    // Usar o ZipGeneratorService para criar stream otimizado
    const result = await this.zipGenerator.gerarZipStream(
      documentos,
      job.filtros as any,
      {
        bufferSize: 128 * 1024, // 128KB buffer para melhor performance
        compressionLevel: 6, // Nível médio de compressão
      },
    );

    const filename = `documentos_lote_${jobId.substring(0, 8)}.zip`;

    // Auditoria - Download em lote iniciado
    const auditContext = this.getAuditContext(job.usuario_id);
    await this.auditEventEmitter.emitEntityAccessed(
      'DocumentoBatchJob',
      job.id,
      auditContext.userId
    );

    // Log de métricas para monitoramento
    this.logger.log(
      `Stream criado para job ${jobId}: ${filename}, tamanho estimado: ${this.formatFileSize(result.estimatedSize || 0)}`,
    );

    return {
      stream: result.stream,
      filename,
      size: result.estimatedSize,
    };
  }

  /**
   * Processa documentos para stream em paralelo
   */
  private async processDocumentosParaStream(
    archive: any,
    documentos: Documento[],
    jobId: string,
  ): Promise<void> {
    // Criar estrutura do ZIP
    const structure = await this.createZipStructure(
      documentos,
      {} as BatchDownloadFiltros,
    );

    // Adicionar arquivo de índice
    const indexContent = this.generateBatchIndex(structure.files);
    archive.append(indexContent, { name: 'INDICE.txt' });

    // Processar arquivos em paralelo
    const fileBuffers = await this.processWithConcurrencyLimit(
      structure.files,
      async (fileInfo) => {
        try {
          const storageProvider = this.storageProviderFactory.getProvider();
          const fileBuffer = await storageProvider.obterArquivo(
            fileInfo.documento.caminho,
          );
          return { fileInfo, fileBuffer };
        } catch (error) {
          this.logger.warn(
            `Erro ao obter arquivo ${fileInfo.documento.caminho}:`,
            error,
          );
          return null;
        }
      },
      this.CONCURRENCY_LIMIT,
    );

    // Adicionar arquivos válidos ao ZIP
    for (const result of fileBuffers) {
      if (result && result.fileBuffer) {
        archive.append(result.fileBuffer, { name: result.fileInfo.zipPath });
      }
    }
  }

  /**
   * Cancela um job
   */
  async cancelarJob(job_id: string): Promise<boolean> {
    const job = await this.batchJobRepository.findOne({
      where: { id: job_id },
    });

    if (!job) {
      throw new NotFoundException('Job não encontrado');
    }

    if (!['pendente', 'processando'].includes(job.status)) {
      throw new BadRequestException(
        'Apenas jobs pendentes ou em processamento podem ser cancelados',
      );
    }

    // Dados antigos para auditoria
    const oldData = {
      id: job.id,
      status: job.status,
      updated_at: job.updated_at,
      erro_detalhes: job.erro_detalhes,
    };

    await this.batchJobRepository.update(job_id, {
      status: StatusDownloadLoteEnum.CANCELLED,
      updated_at: new Date(),
      erro_detalhes: 'Cancelado pelo usuário',
    });

    // Auditoria - Job de download em lote cancelado
    const auditContext = this.getAuditContext(job.usuario_id);
    await this.auditEventEmitter.emitEntityUpdated(
      'DocumentoBatchJob',
      job.id,
      oldData,
      {
        id: job.id,
        status: StatusDownloadLoteEnum.CANCELLED,
        updated_at: new Date(),
        erro_detalhes: 'Cancelado pelo usuário',
      },
      auditContext.userId
    );

    return true;
  }

  /**
   * Lista jobs de um usuário
   */
  async listarJobs(
    usuario_id: string,
    status?: any[],
  ): Promise<IDocumentoBatchResultado[]> {
    const queryBuilder = this.batchJobRepository
      .createQueryBuilder('job')
      .where('job.usuario_id = :usuario_id', { usuario_id })
      .andWhere('job.removed_at is null')
      .orderBy('job.created_at', 'DESC');

    if (status && status.length > 0) {
      queryBuilder.andWhere('job.status IN (:...status)', { status });
    }

    const jobs = await queryBuilder.getMany();

    return jobs.map((job) => ({
      job_id: job.id,
      status: job.status as any,
      caminho_arquivo: job.caminho_arquivo,
      nome_arquivo: job.caminho_arquivo
        ? `documentos_lote_${job.id.substring(0, 8)}.zip`
        : undefined,
      tamanho_estimado: job.tamanho_estimado,
      tamanho_real: job.tamanho_real,
      total_documentos: job.total_documentos,
      documentos_processados: job.documentos_processados,
      documentos_com_erro: job.total_documentos - job.documentos_processados,
      tempo_processamento: this.calculateProcessingTime(job),
      url_download:
        job.status === StatusDownloadLoteEnum.COMPLETED
          ? `/api/v1/documento/download-lote/${job.id}/arquivo`
          : undefined,
      data_expiracao: job.data_expiracao,
      data_conclusao: job.data_conclusao,
      created_at: job.created_at,
      erros: job.erro_detalhes ? [job.erro_detalhes] : [],
      metadados: job.metadados,
    }));
  }

  /**
   * Limpa jobs expirados
   */
  async limparJobsExpirados(): Promise<number> {
    const agora = new Date();

    // Buscar jobs expirados
    const jobsExpirados = await this.batchJobRepository
      .createQueryBuilder('job')
      .where('job.data_expiracao < :agora', { agora })
      .getMany();

    let jobsRemovidos = 0;

    for (const job of jobsExpirados) {
      try {
        // Remover arquivo ZIP se existir
        if (job.caminho_arquivo && fs.existsSync(job.caminho_arquivo)) {
          const jobDir = path.dirname(job.caminho_arquivo);
          fs.rmSync(jobDir, { recursive: true, force: true });
        }

        // Remover job do banco
        await this.batchJobRepository.remove(job);
        jobsRemovidos++;

        this.logger.log(`Job expirado ${job.id} removido`);
      } catch (error) {
        this.logger.warn(`Erro ao remover job expirado ${job.id}:`, error);
      }
    }

    this.logger.log(`${jobsRemovidos} jobs expirados removidos`);
    return jobsRemovidos;
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
   * Cria a estrutura do ZIP organizando os documentos
   */
  private async createZipStructure(
    documentos: Documento[],
    filtros: BatchDownloadFiltros,
  ): Promise<ZipStructure> {
    const structure: ZipStructure = {
      files: [],
    };

    // Agrupar documentos por cidadão e solicitação
    const groupedByCidadao = this.groupBy(documentos, 'cidadao_id');

    for (const [cidadaoId, cidadaoDocumentos] of Object.entries(
      groupedByCidadao,
    )) {
      // Obter dados do cidadão para usar o CPF na nomenclatura
      const cidadao = cidadaoDocumentos[0]?.cidadao;
      const cidadaoFolder = cidadao?.cpf
        ? `cidadao_${cidadao.cpf}`
        : `Cidadao_${cidadaoId.substring(0, 8)}`;

      // Agrupar por solicitação dentro do cidadão
      const groupedBySolicitacao = this.groupBy(
        cidadaoDocumentos,
        'solicitacao_id',
      );

      for (const [solicitacaoId, solicitacaoDocumentos] of Object.entries(
        groupedBySolicitacao,
      )) {
        // Obter dados da solicitação para usar protocolo e data na nomenclatura
        const solicitacao = solicitacaoDocumentos[0]?.solicitacao;
        let solicitacaoFolder: string;

        if (solicitacao?.protocolo && solicitacao?.data_abertura) {
          const dataAbertura = new Date(solicitacao.data_abertura)
            .toISOString()
            .split('T')[0]
            .replace(/-/g, '');
          solicitacaoFolder = `${cidadaoFolder}/solicitacao_${solicitacao.protocolo}_${dataAbertura}`;
        } else {
          solicitacaoFolder = `${cidadaoFolder}/Solicitacao_${solicitacaoId?.substring(0, 8) || 'Sem_Solicitacao'}`;
        }

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
          structure.files.push({
            documento,
            zipPath,
            tamanho: documento.tamanho || 0,
          });
        }

        // Adicionar recibos em subpasta
        if (recibos.length > 0) {
          for (const recibo of recibos) {
            const fileName = this.generateFileName(recibo);
            const zipPath = `${solicitacaoFolder}/Recibos_Comprovantes/${fileName}`;
            structure.files.push({
              documento: recibo,
              zipPath,
              tamanho: recibo.tamanho || 0,
            });
          }
        }
      }
    }

    return structure;
  }

  /**
   * Gera o caminho e cria o arquivo ZIP
   */
  private async generateZipFile(
    jobId: string,
    structure: ZipStructure,
  ): Promise<string> {
    const jobDir = path.join(this.batchTempDir, jobId);
    if (!fs.existsSync(jobDir)) {
      fs.mkdirSync(jobDir, { recursive: true });
    }

    const zipPath = path.join(
      jobDir,
      `documentos_lote_${jobId.substring(0, 8)}.zip`,
    );
    await this.createZipFile(structure, zipPath, jobId);
    return zipPath;
  }

  /**
   * Função auxiliar para controlar concorrência em operações assíncronas
   */
  private async processWithConcurrencyLimit<T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>,
    limit: number = this.CONCURRENCY_LIMIT,
  ): Promise<R[]> {
    const results: R[] = [];
    const executing: Promise<void>[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      const promise = processor(item, i)
        .then((result) => {
          results[i] = result;
        })
        .catch((error) => {
          this.logger.warn(`Erro no processamento do item ${i}:`, error);
          // Continuar com outros itens mesmo se um falhar
          results[i] = null as R;
        });

      executing.push(promise);

      if (executing.length >= limit) {
        await Promise.race(executing);
        // Remove promises resolvidas
        const resolvedIndex = executing.findIndex(
          (p) => p === promise || (p as any).isResolved,
        );
        if (resolvedIndex !== -1) {
          executing.splice(resolvedIndex, 1);
        }
      }
    }

    // Aguardar todas as promises restantes
    await Promise.all(executing);
    return results;
  }

  /**
   * Cria o arquivo ZIP com streaming otimizado para reduzir uso de memória
   */
  private async createZipFile(
    structure: ZipStructure,
    zipPath: string,
    jobId: string,
  ): Promise<void> {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 6 }, // Reduzir nível de compressão para melhor performance
      store: false, // Habilitar compressão
    });

    archive.pipe(output);

    const totalFiles = structure.files.length;
    let processedFiles = 0;
    const STREAM_BATCH_SIZE = 5; // Processar apenas 5 arquivos por vez para otimizar memória

    // Adicionar arquivo de índice
    const indexContent = this.generateBatchIndex(structure.files);
    archive.append(indexContent, { name: 'INDICE.txt' });

    // Processar arquivos em lotes pequenos com streaming
    for (let i = 0; i < structure.files.length; i += STREAM_BATCH_SIZE) {
      const batch = structure.files.slice(i, i + STREAM_BATCH_SIZE);

      await Promise.all(
        batch.map(async (fileInfo) => {
          try {
            const storageProvider = this.storageProviderFactory.getProvider();

            // Usar stream em vez de buffer para arquivos grandes
            if (fileInfo.tamanho > 10 * 1024 * 1024) {
              // > 10MB
              const fileStream = await storageProvider.obterArquivoStream(
                fileInfo.documento.caminho,
              );

              // Garantir que o stream é compatível com Node.js Readable
              let readableStream: Readable;
              if (fileStream && typeof fileStream.pipe === 'function') {
                readableStream = fileStream as Readable;
              } else {
                // Converter para Readable se necessário
                readableStream = Readable.from(fileStream);
              }

              archive.append(readableStream, { name: fileInfo.zipPath });
            } else {
              // Para arquivos pequenos, usar buffer é mais eficiente
              const fileBuffer = await storageProvider.obterArquivo(
                fileInfo.documento.caminho,
              );
              archive.append(fileBuffer, { name: fileInfo.zipPath });
            }

            // Atualizar progresso
            processedFiles++;
            const progress =
              20 + Math.floor((processedFiles / totalFiles) * 70); // 20-90%
            await this.updateJobProgress(jobId, progress);

            this.logger.debug(
              `Arquivo processado: ${fileInfo.zipPath} (${processedFiles}/${totalFiles})`,
            );
          } catch (error) {
            this.logger.warn(
              `Erro ao processar arquivo ${fileInfo.documento.caminho}:`,
              error,
            );
            // Adicionar arquivo de erro em vez de falhar completamente
            const errorContent = `Erro ao processar arquivo: ${error.message}`;
            archive.append(errorContent, {
              name: `${fileInfo.zipPath}.error.txt`,
            });
          }
        }),
      );

      // Pequena pausa entre lotes para evitar sobrecarga
      if (i + STREAM_BATCH_SIZE < structure.files.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    await this.updateJobProgress(jobId, 95);

    // Finalizar arquivo ZIP
    await new Promise<void>((resolve, reject) => {
      archive.finalize();

      output.on('close', () => {
        this.logger.log(
          `ZIP criado com sucesso: ${zipPath} (${archive.pointer()} bytes)`,
        );
        resolve();
      });

      output.on('error', reject);
      archive.on('error', reject);

      // Timeout de segurança
      setTimeout(
        () => {
          reject(new Error('Timeout na criação do arquivo ZIP'));
        },
        30 * 60 * 1000,
      ); // 30 minutos
    });
  }

  /**
   * Atualiza o progresso do job no banco de dados
   */
  private async updateJobProgress(
    jobId: string,
    progress: number,
  ): Promise<void> {
    await this.batchJobRepository.update(jobId, {
      progresso_percentual: progress,
      updated_at: new Date(),
    });
  }

  /**
   * Métodos auxiliares
   */

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
      `Gerado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
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
    // Usar o método limparJobsExpirados() que trabalha com o banco de dados
    this.limparJobsExpirados().catch((error) => {
      this.logger.error('Erro na limpeza automática de jobs:', error);
    });
  }

  /**
   * Calcula o tempo decorrido desde o início do processamento do job
   * Usa data_inicio se disponível, senão usa created_at como fallback
   */
  private calculateElapsedTime(job: DocumentoBatchJob): number {
    const dataInicio = job.data_inicio || job.created_at;
    return Math.round((Date.now() - dataInicio.getTime()) / 1000);
  }

  /**
   * Calcula o tempo restante estimado para conclusão do job
   * Usa data_inicio se disponível, senão usa created_at como fallback
   */
  private calculateRemainingTime(job: DocumentoBatchJob): number | undefined {
    if (
      job.status !== StatusDownloadLoteEnum.PROCESSING ||
      job.progresso_percentual === 0
    ) {
      return undefined;
    }

    const dataInicio = job.data_inicio || job.created_at;
    const tempoDecorrido = Date.now() - dataInicio.getTime();
    const progressoDecimal = job.progresso_percentual / 100;
    const tempoEstimadoTotal = tempoDecorrido / progressoDecimal;
    const tempoRestante = tempoEstimadoTotal - tempoDecorrido;

    return Math.max(0, Math.round(tempoRestante / 1000)); // retorna em segundos
  }

  /**
   * Obtém mensagem de status baseada no status do job
   */
  private getStatusMessage(status: string): string {
    const messages = {
      pendente: 'Job aguardando processamento',
      processando: 'Processando documentos...',
      concluido: 'Download em lote concluído com sucesso',
      erro: 'Erro durante o processamento',
      cancelado: 'Job cancelado pelo usuário',
      expirado: 'Job expirado',
    };

    return messages[status] || 'Status desconhecido';
  }

  /**
   * Calcula o tempo total de processamento do job
   * Retorna o tempo em segundos entre data_inicio e data_conclusao
   * Se o job ainda não foi concluído, retorna 0
   */
  private calculateProcessingTime(job: DocumentoBatchJob): number {
    // Se não há data de conclusão, o job ainda não terminou
    if (!job.data_conclusao) {
      return 0;
    }

    // Se não há data de início, usar created_at como fallback
    const dataInicio = job.data_inicio || job.created_at;

    return Math.round(
      (job.data_conclusao.getTime() - dataInicio.getTime()) / 1000,
    );
  }

  /**
   * Processa um job usando a entidade DocumentoBatchJob com métricas de performance
   */
  private async processJobWithEntity(
    jobId: string,
    metricas?: any,
  ): Promise<void> {
    const job = await this.batchJobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      this.logger.error(`Job ${jobId} não encontrado para processamento`);
      return;
    }

    const processamentoInicio = Date.now();
    const jobMetricas = metricas || {
      inicio: processamentoInicio,
      validacao_tempo: 0,
      consulta_tempo: 0,
      processamento_tempo: 0,
      zip_tempo: 0,
      total_documentos: 0,
      tamanho_total: 0,
    };

    try {
      // Atualizar status para processando e definir data de início
      await this.batchJobRepository.update(jobId, {
        status: StatusDownloadLoteEnum.PROCESSING,
        data_inicio: new Date(),
        updated_at: new Date(),
      });

      // Buscar documentos baseado nos filtros usando DocumentFilterService
      const consultaInicio = Date.now();
      const documentos = await this.documentFilterService.aplicarFiltros(
        job.filtros as any,
        { id: job.usuario_id } as Usuario,
      );
      jobMetricas.consulta_tempo = Date.now() - consultaInicio;

      if (documentos.length === 0) {
        throw new Error(
          'Nenhum documento encontrado para os filtros especificados',
        );
      }

      this.logger.log(
        `Job ${jobId} - Consulta concluída em ${jobMetricas.consulta_tempo}ms: ${documentos.length} documentos`,
      );

      // Atualizar progresso inicial
      await this.batchJobRepository.update(jobId, {
        progresso_percentual: 20,
        updated_at: new Date(),
      });

      // Criar estrutura do ZIP usando o novo serviço
      const estruturaInicio = Date.now();
      const zipStructure = await this.createZipStructure(
        documentos,
        job.filtros as any,
      );
      const estruturaTempo = Date.now() - estruturaInicio;

      this.logger.log(
        `Job ${jobId} - Estrutura ZIP criada em ${estruturaTempo}ms`,
      );

      // Atualizar progresso
      await this.batchJobRepository.update(jobId, {
        progresso_percentual: 40,
        updated_at: new Date(),
      });

      // Gerar arquivo ZIP usando método existente (será otimizado posteriormente)
      const zipInicio = Date.now();
      const zipPath = await this.generateZipFile(jobId, zipStructure);
      jobMetricas.zip_tempo = Date.now() - zipInicio;

      this.logger.log(
        `Job ${jobId} - ZIP gerado em ${jobMetricas.zip_tempo}ms`,
      );

      // Atualizar progresso
      await this.batchJobRepository.update(jobId, {
        progresso_percentual: 80,
        updated_at: new Date(),
      });

      // Finalizar job
      const zipStats = fs.statSync(zipPath);
      jobMetricas.processamento_tempo = Date.now() - processamentoInicio;
      jobMetricas.tamanho_real = zipStats.size;

      await this.batchJobRepository.update(jobId, {
        status: StatusDownloadLoteEnum.COMPLETED,
        progresso_percentual: 100,
        documentos_processados: documentos.length,
        tamanho_real: zipStats.size,
        caminho_arquivo: zipPath,
        data_conclusao: new Date(),
        updated_at: new Date(),
        metadados: { ...job.metadados, metricas_finais: jobMetricas },
      });

      this.logger.log(
        `Job ${jobId} processado com sucesso - ${documentos.length} documentos, ${this.formatFileSize(zipStats.size)} em ${jobMetricas.processamento_tempo}ms (consulta: ${jobMetricas.consulta_tempo}ms, zip: ${jobMetricas.zip_tempo}ms)`,
      );
    } catch (error) {
      jobMetricas.processamento_tempo = Date.now() - processamentoInicio;
      this.logger.error(
        `Erro no processamento do job ${jobId} após ${jobMetricas.processamento_tempo}ms:`,
        error,
      );
      await this.markJobAsFailedInDB(jobId, error.message);
    }
  }

  /**
   * Marca um job como falhou no banco de dados
   */
  private async markJobAsFailedInDB(
    jobId: string,
    errorMessage: string,
  ): Promise<void> {
    try {
      await this.batchJobRepository.update(jobId, {
        status: StatusDownloadLoteEnum.FAILED,
        erro_detalhes: errorMessage,
        data_conclusao: new Date(),
        updated_at: new Date(),
      });
    } catch (updateError) {
      this.logger.error(
        `Erro ao atualizar status de falha do job ${jobId}:`,
        updateError,
      );
    }
  }

  /**
   * Obtém o contexto de auditoria atual
   */
  private getAuditContext(usuarioId: string) {
    const context = AuditContextHolder.get();
    return {
      userAgent: context?.userAgent || 'Unknown',
      ip: context?.ip || 'Unknown',
      userId: usuarioId,
    };
  }
}
