import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentoBatchJob } from '../../../../entities/documento-batch-job.entity';
import { StatusDownloadLoteEnum } from '../../../../entities/documento-batch-job.entity';

/**
 * Serviço para gerenciar jobs simultâneos por usuário
 * Implementa rate limiting específico para downloads em lote
 */
@Injectable()
export class BatchJobManagerService {
  private readonly logger = new Logger(BatchJobManagerService.name);
  
  // Configurações de rate limiting
  private readonly MAX_JOBS_PER_USER = 2; // Máximo 2 jobs simultâneos por usuário
  private readonly JOB_TIMEOUT_MINUTES = 30; // Timeout de 30 minutos para jobs
  
  constructor(
    @InjectRepository(DocumentoBatchJob)
    private readonly batchJobRepository: Repository<DocumentoBatchJob>,
  ) {}

  /**
   * Verifica se o usuário pode iniciar um novo job
   * Implementa limite de 2 jobs simultâneos por usuário
   */
  async podeIniciarJob(usuarioId: string): Promise<{
    pode: boolean;
    motivo?: string;
    jobsAtivos: number;
  }> {
    const jobsAtivos = await this.contarJobsAtivos(usuarioId);
    
    if (jobsAtivos >= this.MAX_JOBS_PER_USER) {
      return {
        pode: false,
        motivo: `Limite de ${this.MAX_JOBS_PER_USER} jobs simultâneos atingido. Aguarde a conclusão de um job existente.`,
        jobsAtivos,
      };
    }
    
    return {
      pode: true,
      jobsAtivos,
    };
  }

  /**
   * Conta jobs ativos (pendentes ou processando) de um usuário
   */
  private async contarJobsAtivos(usuarioId: string): Promise<number> {
    return await this.batchJobRepository.count({
      where: {
        usuario_id: usuarioId,
        status: [
          StatusDownloadLoteEnum.PENDING,
          StatusDownloadLoteEnum.PROCESSING,
        ] as any,
      },
    });
  }

  /**
   * Adiciona um job à fila de espera se necessário
   * Por enquanto, apenas rejeita jobs excedentes
   */
  async adicionarJobFila(usuarioId: string, filtros: any): Promise<void> {
    const verificacao = await this.podeIniciarJob(usuarioId);
    
    if (!verificacao.pode) {
      throw new BadRequestException(verificacao.motivo);
    }
  }

  /**
   * Cancela jobs que excederam o timeout
   */
  async cancelarJobsExpirados(): Promise<number> {
    const timeoutDate = new Date();
    timeoutDate.setMinutes(timeoutDate.getMinutes() - this.JOB_TIMEOUT_MINUTES);
    
    const jobsExpirados = await this.batchJobRepository.find({
      where: {
        status: [
          StatusDownloadLoteEnum.PENDING,
          StatusDownloadLoteEnum.PROCESSING,
        ] as any,
        created_at: {
          $lt: timeoutDate,
        } as any,
      },
    });
    
    let cancelados = 0;
    
    for (const job of jobsExpirados) {
      try {
        await this.batchJobRepository.update(job.id, {
          status: StatusDownloadLoteEnum.FAILED,
          erro_detalhes: `Job cancelado por timeout (${this.JOB_TIMEOUT_MINUTES} minutos)`,
          updated_at: new Date(),
        });
        
        cancelados++;
        this.logger.warn(`Job ${job.id} cancelado por timeout`);
      } catch (error) {
        this.logger.error(`Erro ao cancelar job ${job.id}:`, error);
      }
    }
    
    if (cancelados > 0) {
      this.logger.log(`${cancelados} jobs cancelados por timeout`);
    }
    
    return cancelados;
  }

  /**
   * Obtém estatísticas de jobs por usuário
   */
  async obterEstatisticasUsuario(usuarioId: string): Promise<{
    jobsAtivos: number;
    jobsConcluidos: number;
    jobsFalharam: number;
    totalJobs: number;
  }> {
    const [jobsAtivos, jobsConcluidos, jobsFalharam, totalJobs] = await Promise.all([
      this.batchJobRepository.count({
        where: {
          usuario_id: usuarioId,
          status: [
            StatusDownloadLoteEnum.PENDING,
            StatusDownloadLoteEnum.PROCESSING,
          ] as any,
        },
      }),
      this.batchJobRepository.count({
        where: {
          usuario_id: usuarioId,
          status: StatusDownloadLoteEnum.COMPLETED,
        },
      }),
      this.batchJobRepository.count({
        where: {
          usuario_id: usuarioId,
          status: [
            StatusDownloadLoteEnum.FAILED,
            StatusDownloadLoteEnum.CANCELLED,
          ] as any,
        },
      }),
      this.batchJobRepository.count({
        where: {
          usuario_id: usuarioId,
        },
      }),
    ]);
    
    return {
      jobsAtivos,
      jobsConcluidos,
      jobsFalharam,
      totalJobs,
    };
  }
}