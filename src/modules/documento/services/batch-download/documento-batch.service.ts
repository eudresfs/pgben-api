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

    // Validar filtros
    const validacao = await this.validarFiltros(filtros as any, usuario_id);
    if (!validacao.valido) {
      throw new BadRequestException(
        `Filtros inválidos: ${validacao.erros.join(', ')}`,
      );
    }

    // Buscar documentos
    const documentos = await this.findDocumentsByFilters(
      filtros as any,
      { id: usuario_id } as Usuario,
    );

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

    // Criar job na base de dados
    const job = this.batchJobRepository.create({
      usuario_id,
      status: StatusDownloadLoteEnum.PENDING,
      filtros: filtros,
      metadados: metadados || {},
      total_documentos: documentos.length,
      documentos_processados: 0,
      progresso_percentual: 0,
      tamanho_estimado: estimatedSize,
      created_at: new Date(),
      data_expiracao: new Date(Date.now() + this.maxJobAge),
    });

    const savedJob = await this.batchJobRepository.save(job);

    // Processar assincronamente
    this.processJobWithEntity(savedJob.id).catch((error) => {
      this.logger.error(`Erro no processamento do job ${savedJob.id}:`, error);
      this.markJobAsFailedInDB(savedJob.id, error.message);
    });

    return savedJob.id;
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
      tamanho_estimado: job.tamanho_estimado,
      tempo_decorrido: this.calculateElapsedTime(job),
      tempo_estimado_restante: this.calculateRemainingTime(job),
      erros: job.erro_detalhes ? [job.erro_detalhes] : [],
      avisos: [],
      data_inicio: job.created_at,
      updated_at: job.updated_at,
      mensagem_status: job.erro_detalhes || this.getStatusMessage(job.status),
    };
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
      tamanho_arquivo: job.tamanho_real,
      erros: job.erro_detalhes ? [job.erro_detalhes] : [],
      avisos: [],
      arquivo_zip: {
        nome: job.nome_arquivo || `lote_${job.id}.zip`,
        tamanho: job.tamanho_real || 0,
        url_download: `/api/v1/documento/download-lote/${job.id}/download`,
        data_expiracao: job.data_expiracao,
      },
      estatisticas: {
        total_documentos: job.total_documentos,
        documentos_processados: job.documentos_processados,
        documentos_com_erro: job.total_documentos - job.documentos_processados,
        tamanho_total: job.tamanho_real || 0,
        tamanho_processado: job.tamanho_real || 0,
        tempo_processamento: this.calculateProcessingTime(job),
        arquivos_por_tipo: {},
        erros_por_tipo: {},
      },
      estrutura: [],
      data_conclusao: job.data_conclusao,
      metadados: job.metadados || {},
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
      throw new NotFoundException('Job não encontrado');
    }

    if (job.status !== StatusDownloadLoteEnum.COMPLETED) {
      throw new BadRequestException('Job ainda não foi concluído');
    }

    // Buscar documentos novamente para recriar o ZIP em memória
    const documentos = await this.findDocumentsByFilters(
      job.filtros as any,
      { id: job.usuario_id } as Usuario,
    );

    if (documentos.length === 0) {
      throw new NotFoundException('Nenhum documento encontrado para download');
    }

    // Criar stream de ZIP em memória
    const archive = archiver('zip', { zlib: { level: 9 } });

    // Configurar o stream
    const { PassThrough } = require('stream');
    const outputStream = new PassThrough();
    archive.pipe(outputStream);

    // Processar documentos em paralelo e adicionar ao ZIP
    this.processDocumentosParaStream(archive, documentos, jobId)
      .then(() => {
        archive.finalize();
      })
      .catch((error) => {
        this.logger.error('Erro ao criar stream de download:', error);
        outputStream.destroy(error);
      });

    return {
      stream: outputStream,
      filename:
        job.nome_arquivo || `documentos_lote_${jobId.substring(0, 8)}.zip`,
      size: job.tamanho_real,
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

    await this.batchJobRepository.update(job_id, {
      status: StatusDownloadLoteEnum.CANCELLED,
      updated_at: new Date(),
      erro_detalhes: 'Cancelado pelo usuário',
    });

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
      tamanho_arquivo: job.tamanho_real,
      total_documentos: job.total_documentos,
      documentos_processados: job.documentos_processados,
      documentos_com_erro: job.total_documentos - job.documentos_processados,
      tempo_processamento: this.calculateProcessingTime(job),
      url_download:
        job.status === StatusDownloadLoteEnum.COMPLETED
          ? `/api/v1/documento/download-lote/${job.id}/arquivo`
          : undefined,
      data_expiracao: job.data_expiracao,
      erros: job.erro_detalhes ? [job.erro_detalhes] : [],
      avisos: [],
      estatisticas: {
        total_documentos: job.total_documentos,
        documentos_processados: job.documentos_processados,
        documentos_com_erro: job.total_documentos - job.documentos_processados,
        tamanho_total: job.tamanho_real || 0,
        tamanho_processado: job.tamanho_real || 0,
        tempo_estimado_restante: this.calculateRemainingTime(job),
        velocidade_processamento: 0,
        arquivos_por_tipo: {},
        erros_por_tipo: {},
      },
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
      folders: new Map(),
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
   * Cria o arquivo ZIP com processamento paralelo
   */
  private async createZipFile(
    structure: ZipStructure,
    zipPath: string,
    jobId: string,
  ): Promise<void> {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);

    const totalFiles = structure.files.length;
    let processedFiles = 0;

    // Adicionar arquivo de índice
    const indexContent = this.generateBatchIndex(structure.files);
    archive.append(indexContent, { name: 'INDICE.txt' });

    // Processar arquivos em paralelo com controle de concorrência
    const fileBuffers = await this.processWithConcurrencyLimit(
      structure.files,
      async (fileInfo, index) => {
        try {
          const storageProvider = this.storageProviderFactory.getProvider();
          const fileBuffer = await storageProvider.obterArquivo(
            fileInfo.documento.caminho,
          );

          // Atualizar progresso de forma thread-safe
          processedFiles++;
          const progress = 20 + Math.floor((processedFiles / totalFiles) * 70); // 20-90%
          await this.updateJobProgress(jobId, progress);

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

    await this.updateJobProgress(jobId, 95);
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
      queryBuilder.andWhere('documento.tipo IN (:...tiposDocumento)', {
        tiposDocumento: filtros.tiposDocumento,
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
   * Calcula o tempo decorrido desde o início do job
   */
  private calculateElapsedTime(job: DocumentoBatchJob): number {
    return Math.round((Date.now() - job.created_at.getTime()) / 1000);
  }

  /**
   * Calcula o tempo restante estimado para conclusão do job
   */
  private calculateRemainingTime(job: DocumentoBatchJob): number | undefined {
    if (
      job.status !== StatusDownloadLoteEnum.PROCESSING ||
      job.progresso_percentual === 0
    ) {
      return undefined;
    }

    const tempoDecorrido = Date.now() - job.created_at.getTime();
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
   */
  private calculateProcessingTime(job: DocumentoBatchJob): number {
    if (!job.data_conclusao) {
      return 0;
    }

    return Math.round(
      (job.data_conclusao.getTime() - job.created_at.getTime()) / 1000,
    );
  }

  /**
   * Processa um job usando a entidade DocumentoBatchJob
   */
  private async processJobWithEntity(jobId: string): Promise<void> {
    const job = await this.batchJobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      this.logger.error(`Job ${jobId} não encontrado para processamento`);
      return;
    }

    try {
      // Atualizar status para processando
      await this.batchJobRepository.update(jobId, {
        status: StatusDownloadLoteEnum.PROCESSING,
        updated_at: new Date(),
      });

      // Buscar documentos baseado nos filtros
      const documentos = await this.findDocumentsByFilters(
        job.filtros as any,
        { id: job.usuario_id } as Usuario,
      );

      // Criar estrutura do ZIP
      const zipStructure = await this.createZipStructure(
        documentos,
        job.filtros as any,
      );
      await this.batchJobRepository.update(jobId, {
        progresso_percentual: 20,
        updated_at: new Date(),
      });

      // Gerar arquivo ZIP
      const zipPath = await this.generateZipFile(jobId, zipStructure);
      await this.batchJobRepository.update(jobId, {
        progresso_percentual: 80,
        updated_at: new Date(),
      });

      // Finalizar job
      const zipStats = fs.statSync(zipPath);
      await this.batchJobRepository.update(jobId, {
        status: StatusDownloadLoteEnum.COMPLETED,
        progresso_percentual: 100,
        documentos_processados: documentos.length,
        tamanho_real: zipStats.size,
        caminho_arquivo: zipPath,
        // estrutura_zip: zipStructure, // Campo removido da entidade
        data_conclusao: new Date(),
        updated_at: new Date(),
      });

      this.logger.log(`Job ${jobId} processado com sucesso`);
    } catch (error) {
      this.logger.error(`Erro no processamento do job ${jobId}:`, error);
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
    await this.batchJobRepository.update(jobId, {
      status: StatusDownloadLoteEnum.FAILED,
      erro_detalhes: errorMessage,
      updated_at: new Date(),
    });
  }
}
