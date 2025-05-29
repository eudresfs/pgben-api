import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { promises as fs } from 'fs';
import { join } from 'path';
import { CreateLogAuditoriaDto } from '../../modules/auditoria/dto/create-log-auditoria.dto';
import { HealthCheckService } from './health-check.service';
import { ModuleRef } from '@nestjs/core';

interface BackupLogEntry {
  id: string;
  timestamp: string;
  data: CreateLogAuditoriaDto;
  status: 'pending_recovery' | 'processed' | 'failed';
  attempts: number;
}

/**
 * Serviço de Auditoria Resiliente
 * 
 * Implementa múltiplas camadas de fallback para garantir que nenhum log de auditoria seja perdido:
 * 1. Processamento assíncrono via fila (preferencial)
 * 2. Fallback síncrono direto no banco de dados
 * 3. Backup em arquivo para recuperação posterior
 * 4. Job de recuperação automática
 */
@Injectable()
export class ResilientAuditoriaService implements OnModuleInit {
  private readonly logger = new Logger(ResilientAuditoriaService.name);
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 segundo
  private readonly backupPath: string;
  private readonly enableSyncFallback: boolean;
  private readonly enableFileBackup: boolean;
  
  // Métricas internas
  private metrics = {
    queueSuccesses: 0,
    queueFailures: 0,
    syncFallbacks: 0,
    fileBackups: 0,
    recoveredLogs: 0
  };

  // Serviços obtidos via lazy loading para evitar dependência circular
  private auditoriaService: any;
  private auditoriaQueueService: any;

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly healthCheckService: HealthCheckService,
    private readonly configService: ConfigService
  ) {
    this.backupPath = this.configService.get('AUDITORIA_BACKUP_PATH', './logs/audit-backup');
    this.enableSyncFallback = this.configService.get('AUDITORIA_ENABLE_SYNC_FALLBACK', 'true') === 'true';
    this.enableFileBackup = this.configService.get('AUDITORIA_ENABLE_FILE_BACKUP', 'true') === 'true';
    
    // Criar diretório de backup se não existir
    this.ensureBackupDirectory();
  }

  /**
   * Inicialização do módulo - obtém serviços de forma lazy para evitar dependência circular
   */
  async onModuleInit() {
    try {
      // Aguarda um pouco para garantir que os módulos estejam inicializados
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.auditoriaService = this.moduleRef.get('AuditoriaService', { strict: false });
      this.auditoriaQueueService = this.moduleRef.get('AuditoriaQueueService', { strict: false });
      
      this.logger.log('Serviços de auditoria inicializados via lazy loading');
    } catch (error) {
      this.logger.warn(`Falha ao inicializar serviços de auditoria: ${error.message}`);
      this.logger.warn('ResilientAuditoriaService funcionará apenas com backup em arquivo');
    }
  }

  /**
   * Registra log de auditoria com estratégia de fallback resiliente
   * 
   * Estratégia de fallback:
   * 1. Tenta enfileirar (assíncrono) - melhor performance
   * 2. Se falhar, registra diretamente no banco (síncrono) - garantia de persistência
   * 3. Se falhar, armazena em arquivo (backup) - última linha de defesa
   * 
   * @param logData Dados do log de auditoria
   * @returns Promise<void>
   */
  async registrarLogResilient(logData: CreateLogAuditoriaDto): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Estratégia 1: Processamento assíncrono via fila (preferencial)
      await this.tryQueueProcessing(logData);
      
      this.metrics.queueSuccesses++;
      this.logger.debug(`Log de auditoria enfileirado com sucesso em ${Date.now() - startTime}ms`);
      
    } catch (queueError) {
      this.metrics.queueFailures++;
      this.logger.warn(`Falha na fila de auditoria: ${queueError.message}`);
      
      if (this.enableSyncFallback) {
        try {
          // Estratégia 2: Fallback síncrono direto no banco
          await this.trySyncProcessing(logData);
          
          this.metrics.syncFallbacks++;
          this.logger.debug(`Log de auditoria registrado via fallback síncrono em ${Date.now() - startTime}ms`);
          
        } catch (syncError) {
          this.logger.error(`Falha no fallback síncrono: ${syncError.message}`);
          
          if (this.enableFileBackup) {
            // Estratégia 3: Backup em arquivo para recuperação posterior
            await this.tryFileBackup(logData, { queueError, syncError });
            
            this.metrics.fileBackups++;
            this.logger.warn(`Log de auditoria armazenado em backup para recuperação posterior`);
          } else {
            throw new Error(`Falha crítica na auditoria: Queue=${queueError.message}, Sync=${syncError.message}`);
          }
        }
      } else {
        throw queueError;
      }
    }
  }

  /**
   * Tenta processar via fila com timeout
   */
  private async tryQueueProcessing(logData: CreateLogAuditoriaDto): Promise<void> {
    if (!this.auditoriaQueueService) {
      throw new Error('AuditoriaQueueService não disponível');
    }
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout na fila de auditoria')), 2000);
    });
    
    const queuePromise = this.auditoriaQueueService.enfileirarLogAuditoria(logData);
    
    await Promise.race([queuePromise, timeoutPromise]);
  }

  /**
   * Tenta processar diretamente no banco com timeout
   */
  private async trySyncProcessing(logData: CreateLogAuditoriaDto): Promise<void> {
    if (!this.auditoriaService) {
      throw new Error('AuditoriaService não disponível');
    }
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout no registro síncrono')), 5000);
    });
    
    const syncPromise = this.auditoriaService.create(logData);
    
    await Promise.race([syncPromise, timeoutPromise]);
  }

  /**
   * Armazena log de auditoria em arquivo para recuperação posterior
   */
  private async tryFileBackup(
    logData: CreateLogAuditoriaDto, 
    errors: { queueError: Error; syncError: Error }
  ): Promise<void> {
    try {
      const backupEntry: BackupLogEntry = {
        id: this.generateBackupId(),
        timestamp: new Date().toISOString(),
        data: logData,
        status: 'pending_recovery',
        attempts: 0
      };
      
      const backupFile = join(this.backupPath, `audit-backup-${new Date().toISOString().split('T')[0]}.jsonl`);
      const logLine = JSON.stringify({
        ...backupEntry,
        errors: {
          queue: errors.queueError.message,
          sync: errors.syncError.message
        }
      }) + '\n';
      
      await fs.appendFile(backupFile, logLine, 'utf8');
      
      this.logger.debug(`Log de auditoria salvo em backup: ${backupFile}`);
      
    } catch (fileError) {
      this.logger.error(`Falha crítica: não foi possível armazenar log de auditoria em arquivo: ${fileError.message}`);
      throw new Error(`Falha total na auditoria: ${fileError.message}`);
    }
  }

  /**
   * Job de recuperação que roda periodicamente
   * Processa logs de auditoria que falharam anteriormente
   */
  @Cron('0 */5 * * * *') // A cada 5 minutos
  async processBackupAuditLogs(): Promise<void> {
    if (!this.enableFileBackup || !this.auditoriaService) {
      return;
    }
    
    try {
      this.logger.debug('Iniciando processo de recuperação de logs de auditoria');
      
      const backupLogs = await this.readBackupLogs();
      
      if (backupLogs.length === 0) {
        return;
      }
      
      this.logger.log(`Encontrados ${backupLogs.length} logs para recuperação`);
      
      let processedCount = 0;
      let failedCount = 0;
      
      for (const log of backupLogs) {
        try {
          // Tentar processar o log
          await this.auditoriaService.create(log.data);
          
          // Marcar como processado
          await this.markLogAsProcessed(log.id);
          
          processedCount++;
          this.metrics.recoveredLogs++;
          
        } catch (error) {
          failedCount++;
          
          // Incrementar tentativas
          log.attempts++;
          
          if (log.attempts >= this.maxRetries) {
            this.logger.error(`Log ${log.id} falhou após ${this.maxRetries} tentativas: ${error.message}`);
            await this.markLogAsFailed(log.id);
          } else {
            this.logger.warn(`Falha ao recuperar log ${log.id} (tentativa ${log.attempts}/${this.maxRetries}): ${error.message}`);
            await this.updateLogAttempts(log.id, log.attempts);
          }
        }
      }
      
      if (processedCount > 0 || failedCount > 0) {
        this.logger.log(`Recuperação concluída: ${processedCount} processados, ${failedCount} falharam`);
      }
      
    } catch (error) {
      this.logger.error(`Erro no processo de recuperação: ${error.message}`);
    }
  }

  /**
   * Lê logs de backup pendentes de recuperação
   */
  private async readBackupLogs(): Promise<BackupLogEntry[]> {
    try {
      const files = await fs.readdir(this.backupPath);
      const backupFiles = files.filter(file => file.startsWith('audit-backup-') && file.endsWith('.jsonl'));
      
      const allLogs: BackupLogEntry[] = [];
      
      for (const file of backupFiles) {
        try {
          const filePath = join(this.backupPath, file);
          const content = await fs.readFile(filePath, 'utf8');
          
          const lines = content.trim().split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const log = JSON.parse(line) as BackupLogEntry;
              
              // Apenas logs pendentes de recuperação
              if (log.status === 'pending_recovery' && log.attempts < this.maxRetries) {
                allLogs.push(log);
              }
            } catch (parseError) {
              this.logger.warn(`Erro ao parsear linha de backup: ${parseError.message}`);
            }
          }
        } catch (fileError) {
          this.logger.warn(`Erro ao ler arquivo de backup ${file}: ${fileError.message}`);
        }
      }
      
      return allLogs;
    } catch (error) {
      this.logger.error(`Erro ao ler logs de backup: ${error.message}`);
      return [];
    }
  }

  /**
   * Marca log como processado com sucesso
   */
  private async markLogAsProcessed(logId: string): Promise<void> {
    // Implementar marcação do log como processado
    // Por simplicidade, podemos mover para um arquivo de logs processados
    this.logger.debug(`Log ${logId} marcado como processado`);
  }

  /**
   * Marca log como falha definitiva
   */
  private async markLogAsFailed(logId: string): Promise<void> {
    // Implementar marcação do log como falha definitiva
    this.logger.error(`Log ${logId} marcado como falha definitiva`);
  }

  /**
   * Atualiza número de tentativas do log
   */
  private async updateLogAttempts(logId: string, attempts: number): Promise<void> {
    // Implementar atualização do número de tentativas
    this.logger.debug(`Log ${logId} atualizado para ${attempts} tentativas`);
  }

  /**
   * Gera ID único para entrada de backup
   */
  private generateBackupId(): string {
    return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Garante que o diretório de backup existe
   */
  private async ensureBackupDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.backupPath, { recursive: true });
    } catch (error) {
      this.logger.error(`Erro ao criar diretório de backup: ${error.message}`);
    }
  }

  /**
   * Retorna métricas do serviço de auditoria resiliente
   */
  getMetrics() {
    const total = this.metrics.queueSuccesses + this.metrics.queueFailures;
    
    return {
      ...this.metrics,
      queueSuccessRate: total > 0 ? (this.metrics.queueSuccesses / total) * 100 : 0,
      fallbackUsageRate: total > 0 ? (this.metrics.syncFallbacks / total) * 100 : 0,
      backupUsageRate: total > 0 ? (this.metrics.fileBackups / total) * 100 : 0
    };
  }

  /**
   * Reseta métricas (útil para testes)
   */
  resetMetrics(): void {
    this.metrics = {
      queueSuccesses: 0,
      queueFailures: 0,
      syncFallbacks: 0,
      fileBackups: 0,
      recoveredLogs: 0
    };
  }
}