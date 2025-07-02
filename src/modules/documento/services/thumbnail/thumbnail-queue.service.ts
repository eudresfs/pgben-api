import { Injectable } from '@nestjs/common';
import { LoggingService } from '../../../../shared/logging/logging.service';
import { ThumbnailService } from './thumbnail.service';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Documento } from '@/entities/documento.entity';

/**
 * Interface para job de geração de thumbnail
 */
export interface ThumbnailJob {
  documentoId: string;
  priority: 'high' | 'normal' | 'low';
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  scheduledFor?: Date;
}

/**
 * Serviço para processamento assíncrono de thumbnails
 * Gerencia fila de geração de thumbnails em background
 */
@Injectable()
export class ThumbnailQueueService {
  private readonly queue: Map<string, ThumbnailJob> = new Map();
  private readonly processing: Set<string> = new Set();
  private readonly maxConcurrentJobs = 3;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly thumbnailService: ThumbnailService,
    private readonly logger: LoggingService,
    @InjectRepository(Documento)
    private readonly documentoRepository: Repository<Documento>,
  ) {
    this.startProcessing();
  }

  /**
   * Adiciona documento à fila de geração de thumbnail
   * @param documentoId ID do documento
   * @param priority Prioridade do job
   * @param delay Delay em milissegundos antes do processamento
   */
  async addToQueue(
    documentoId: string,
    priority: 'high' | 'normal' | 'low' = 'normal',
    delay: number = 0,
  ): Promise<void> {
    // Verificar se já existe thumbnail
    const thumbnailExists = await this.thumbnailService.thumbnailExists(documentoId);
    if (thumbnailExists) {
      this.logger.debug(
        `Thumbnail já existe para documento ${documentoId}, ignorando`,
        ThumbnailQueueService.name,
      );
      return;
    }

    // Verificar se já está na fila
    if (this.queue.has(documentoId)) {
      this.logger.debug(
        `Documento ${documentoId} já está na fila de thumbnails`,
        ThumbnailQueueService.name,
      );
      return;
    }

    const job: ThumbnailJob = {
      documentoId,
      priority,
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date(),
      scheduledFor: delay > 0 ? new Date(Date.now() + delay) : undefined,
    };

    this.queue.set(documentoId, job);
    
    this.logger.info(
      `Documento ${documentoId} adicionado à fila de thumbnails (prioridade: ${priority})`,
      ThumbnailQueueService.name,
    );
  }

  /**
   * Remove documento da fila
   * @param documentoId ID do documento
   */
  removeFromQueue(documentoId: string): void {
    this.queue.delete(documentoId);
    this.processing.delete(documentoId);
  }

  /**
   * Obtém status da fila
   */
  getQueueStatus(): {
    queueSize: number;
    processing: number;
    byPriority: { high: number; normal: number; low: number };
  } {
    const byPriority = { high: 0, normal: 0, low: 0 };
    
    for (const job of this.queue.values()) {
      byPriority[job.priority]++;
    }

    return {
      queueSize: this.queue.size,
      processing: this.processing.size,
      byPriority,
    };
  }

  /**
   * Inicia o processamento da fila
   */
  private startProcessing(): void {
    if (this.processingInterval) {
      return;
    }

    this.processingInterval = setInterval(async () => {
      await this.processQueue();
    }, 5000); // Processar a cada 5 segundos

    this.logger.info(
      'Processamento de fila de thumbnails iniciado',
      ThumbnailQueueService.name,
    );
  }

  /**
   * Para o processamento da fila
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      
      this.logger.info(
        'Processamento de fila de thumbnails parado',
        ThumbnailQueueService.name,
      );
    }
  }

  /**
   * Processa jobs da fila
   */
  private async processQueue(): Promise<void> {
    if (this.processing.size >= this.maxConcurrentJobs) {
      return; // Máximo de jobs simultâneos atingido
    }

    const availableSlots = this.maxConcurrentJobs - this.processing.size;
    const jobsToProcess = this.getNextJobs(availableSlots);

    for (const job of jobsToProcess) {
      this.processJob(job).catch((error) => {
        this.logger.error(
          `Erro não tratado no processamento de thumbnail: ${error.message}`,
          error.stack,
          ThumbnailQueueService.name,
        );
      });
    }
  }

  /**
   * Obtém próximos jobs para processamento
   * @param count Número de jobs a obter
   */
  private getNextJobs(count: number): ThumbnailJob[] {
    const now = new Date();
    const availableJobs = Array.from(this.queue.values())
      .filter(job => {
        // Filtrar jobs que ainda não chegaram na hora de execução
        if (job.scheduledFor && job.scheduledFor > now) {
          return false;
        }
        // Filtrar jobs que já estão sendo processados
        return !this.processing.has(job.documentoId);
      })
      .sort((a, b) => {
        // Ordenar por prioridade e depois por data de criação
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        
        if (priorityDiff !== 0) {
          return priorityDiff;
        }
        
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

    return availableJobs.slice(0, count);
  }

  /**
   * Processa um job individual
   * @param job Job a ser processado
   */
  private async processJob(job: ThumbnailJob): Promise<void> {
    this.processing.add(job.documentoId);
    
    try {
      this.logger.debug(
        `Iniciando geração de thumbnail para documento ${job.documentoId}`,
        ThumbnailQueueService.name,
      );

      // Buscar documento no banco
      const documento = await this.documentoRepository.findOne({
        where: { id: job.documentoId }
      });

      if (!documento) {
        this.logger.warn(
          `Documento ${job.documentoId} não encontrado, removendo da fila`,
          ThumbnailQueueService.name,
        );
        this.removeFromQueue(job.documentoId);
        return;
      }

      // Obter arquivo do storage
      const storageProvider = this.thumbnailService['storageProviderFactory'].getProvider();
      const fileBuffer = await storageProvider.obterArquivo(documento.caminho);

      // Gerar thumbnail
      const result = await this.thumbnailService.generateThumbnail(
        fileBuffer,
        documento.mimetype,
        documento.id,
      );

      if (result) {
        this.logger.info(
          `Thumbnail gerado com sucesso para documento ${job.documentoId}`,
          ThumbnailQueueService.name,
        );
      } else {
        this.logger.warn(
          `Não foi possível gerar thumbnail para documento ${job.documentoId} (tipo não suportado: ${documento.mimetype})`,
          ThumbnailQueueService.name,
        );
      }

      // Remover da fila após sucesso
      this.removeFromQueue(job.documentoId);

    } catch (error) {
      this.logger.error(
        `Erro ao gerar thumbnail para documento ${job.documentoId}: ${error.message}`,
        error.stack,
        ThumbnailQueueService.name,
      );

      // Incrementar contador de retry
      job.retryCount++;

      if (job.retryCount >= job.maxRetries) {
        this.logger.error(
          `Máximo de tentativas atingido para documento ${job.documentoId}, removendo da fila`,
          ThumbnailQueueService.name,
        );
        this.removeFromQueue(job.documentoId);
      } else {
        // Reagendar para retry com delay exponencial
        const delay = Math.pow(2, job.retryCount) * 60000; // 1min, 2min, 4min...
        job.scheduledFor = new Date(Date.now() + delay);
        
        this.logger.info(
          `Reagendando thumbnail para documento ${job.documentoId} em ${delay/1000}s (tentativa ${job.retryCount}/${job.maxRetries})`,
          ThumbnailQueueService.name,
        );
      }
    } finally {
      this.processing.delete(job.documentoId);
    }
  }

  /**
   * Processa thumbnails para documentos existentes em lote
   * @param batchSize Tamanho do lote
   * @param priority Prioridade dos jobs
   */
  async processExistingDocuments(
    batchSize: number = 100,
    priority: 'high' | 'normal' | 'low' = 'low',
  ): Promise<void> {
    this.logger.info(
      `Iniciando processamento de thumbnails para documentos existentes (lote: ${batchSize})`,
      ThumbnailQueueService.name,
    );

    let offset = 0;
    let processedCount = 0;

    while (true) {
      const documentos = await this.documentoRepository.find({
        select: ['id', 'mimetype'],
        skip: offset,
        take: batchSize,
        order: { created_at: 'ASC' },
      });

      if (documentos.length === 0) {
        break;
      }

      for (const documento of documentos) {
        // Verificar se é um tipo suportado
        const supportedTypes = [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/msword',
          'application/vnd.ms-excel',
        ];

        if (supportedTypes.includes(documento.mimetype)) {
          await this.addToQueue(documento.id, priority);
          processedCount++;
        }
      }

      offset += batchSize;
      
      // Pequeno delay para não sobrecarregar o sistema
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.logger.info(
      `${processedCount} documentos adicionados à fila de thumbnails`,
      ThumbnailQueueService.name,
    );
  }

  /**
   * Limpa fila de jobs antigos ou órfãos
   */
  async cleanupQueue(): Promise<void> {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas
    let removedCount = 0;

    for (const [documentoId, job] of this.queue.entries()) {
      const age = now.getTime() - job.createdAt.getTime();
      
      if (age > maxAge) {
        this.removeFromQueue(documentoId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.logger.info(
        `${removedCount} jobs antigos removidos da fila de thumbnails`,
        ThumbnailQueueService.name,
      );
    }
  }

  /**
   * Obtém status de processamento de um documento específico
   * @param documentoId ID do documento
   */
  async getProcessingStatus(documentoId: string): Promise<{
    status: 'not_queued' | 'queued' | 'processing' | 'completed' | 'failed';
    position?: number;
    estimatedTime?: number;
    retryCount?: number;
    lastError?: string;
  }> {
    // Verificar se está sendo processado
    if (this.processing.has(documentoId)) {
      return {
        status: 'processing',
        retryCount: this.queue.get(documentoId)?.retryCount || 0,
      };
    }

    // Verificar se está na fila
    const job = this.queue.get(documentoId);
    if (job) {
      const queueArray = Array.from(this.queue.values())
        .filter(j => !this.processing.has(j.documentoId))
        .sort((a, b) => {
          const priorityOrder = { high: 3, normal: 2, low: 1 };
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return a.createdAt.getTime() - b.createdAt.getTime();
        });

      const position = queueArray.findIndex(j => j.documentoId === documentoId) + 1;
      const estimatedTime = position * 30; // Estimativa de 30s por job

      return {
        status: 'queued',
        position,
        estimatedTime,
        retryCount: job.retryCount,
      };
    }

    // Verificar se já existe thumbnail
    const thumbnailExists = await this.thumbnailService.thumbnailExists(documentoId);
    if (thumbnailExists) {
      return { status: 'completed' };
    }

    return { status: 'not_queued' };
  }

  /**
   * Obtém estatísticas do sistema de thumbnails
   */
  async getStats(): Promise<{
    queue: {
      total: number;
      byPriority: { high: number; normal: number; low: number };
      processing: number;
      oldestJob?: Date;
    };
    performance: {
      averageProcessingTime: number;
      successRate: number;
      totalProcessed: number;
    };
  }> {
    const queueStatus = this.getQueueStatus();
    
    // Encontrar job mais antigo
    let oldestJob: Date | undefined;
    for (const job of this.queue.values()) {
      if (!oldestJob || job.createdAt < oldestJob) {
        oldestJob = job.createdAt;
      }
    }

    // Estatísticas básicas (em produção, essas métricas viriam de um sistema de monitoramento)
    return {
      queue: {
        total: queueStatus.queueSize,
        byPriority: queueStatus.byPriority,
        processing: queueStatus.processing,
        oldestJob,
      },
      performance: {
        averageProcessingTime: 25, // Média estimada em segundos
        successRate: 0.95, // 95% de taxa de sucesso
        totalProcessed: 0, // TODO: Implementar contador persistente
      },
    };
  }
}