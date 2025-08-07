/**
 * AuditCoreService
 *
 * Serviço core isolado para operações de auditoria.
 * Implementa a lógica de negócio sem dependências externas.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AuditCoreRepository,
  AuditSearchFilters,
  PaginatedAuditResult,
  AuditStatistics,
} from '../repositories/audit-core.repository';
import { LogAuditoria } from '../../../../entities/log-auditoria.entity';
import {
  AuditEvent,
  AuditEventType,
  RiskLevel,
  AuditEventConfig,
} from '../../events/types/audit-event.types';
import { TipoOperacao } from '../../../../enums/tipo-operacao.enum';
import { AuditJobData } from '../../queues/jobs/audit-processing.job';
import { AuditContextHolder } from '../../../../common/interceptors/audit-context.interceptor';
import { AuditoriaSignatureService } from '../../services/auditoria-signature.service';

/**
 * Interface para criação de log de auditoria
 */
export interface CreateAuditLogDto {
  tipo_operacao: TipoOperacao;
  entidade_afetada: string;
  entidade_id?: string;
  usuario_id?: string;
  dados_anteriores?: any;
  dados_novos?: any;
  descricao?: string;
  nivel_risco?: RiskLevel;
  lgpd_relevante?: boolean;
  metadata?: Record<string, any>;
  contexto_requisicao?: Record<string, any>;
  data_hora?: Date;
  ip_origem?: string;
  user_agent?: string;
  endpoint?: string;
  metodo_http?: string;
  dados_sensiveis_acessados?: string[];
}

/**
 * Interface para resultado de processamento
 */
export interface ProcessingResult {
  success: boolean;
  logId?: string;
  processingTime: number;
  error?: string;
}

@Injectable()
export class AuditCoreService implements OnModuleInit {
  private readonly logger = new Logger(AuditCoreService.name);
  private isInitialized = false;
  private pendingEvents: AuditEvent[] = [];

  constructor(
    private readonly auditRepository: AuditCoreRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditoriaSignatureService: AuditoriaSignatureService,
  ) {
    // Listeners serão registrados após a inicialização completa do módulo
  }

  /**
   * Inicialização do módulo - registra listeners após bootstrap completo
   */
  async onModuleInit(): Promise<void> {
    try {
      this.logger.debug('Initializing AuditCoreService...');

      // Aguarda um tick para garantir que todos os módulos estejam inicializados
      await new Promise((resolve) => setImmediate(resolve));

      // Registra listeners para eventos síncronos
      this.registerSyncEventListeners();

      // Marca como inicializado
      this.isInitialized = true;

      // Processa eventos pendentes
      await this.processPendingEvents();

      this.logger.debug('AuditCoreService initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize AuditCoreService', error.stack);
      throw error;
    }
  }

  /**
   * Processa evento de auditoria de forma síncrona
   */
  async processSyncEvent(jobData: AuditJobData): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      this.logger.debug(`Processing sync event: ${jobData.event.eventType}`);

      // Converte evento para DTO de criação
      const createDto = this.eventToCreateDto(jobData.event);

      // Aplica configurações específicas
      const processedDto = await this.applyEventConfig(
        createDto,
        jobData.config,
      );

      // Persiste o log
      const auditLog = await this.auditRepository.create(processedDto);

      // Executa pós-processamento
      await this.executePostProcessing(jobData.event, auditLog);

      const processingTime = Date.now() - startTime;

      this.logger.debug(
        `Sync event processed successfully in ${processingTime}ms: ${auditLog.id}`,
      );

      return {
        success: true,
        logId: auditLog.id,
        processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error(
        `Failed to process sync event: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        processingTime,
        error: error.message,
      };
    }
  }

  /**
   * Cria log de auditoria diretamente
   */
  async createAuditLog(createDto: CreateAuditLogDto): Promise<LogAuditoria> {
    try {
      // Valida dados de entrada
      this.validateCreateDto(createDto);

      // Enriquece com dados padrão
      const enrichedDto = this.enrichCreateDto(createDto);

      // Persiste no repositório
      const auditLog = await this.auditRepository.create(enrichedDto);

      this.logger.debug(`Audit log created: ${auditLog.id}`);

      return auditLog;
    } catch (error) {
      this.logger.error(
        `Failed to create audit log: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Cria múltiplos logs em lote
   */
  async createAuditLogsBatch(
    createDtos: CreateAuditLogDto[],
  ): Promise<LogAuditoria[]> {
    try {
      // Valida todos os DTOs
      createDtos.forEach((dto, index) => {
        try {
          this.validateCreateDto(dto);
        } catch (error) {
          throw new Error(`Invalid DTO at index ${index}: ${error.message}`);
        }
      });

      // Enriquece todos os DTOs
      const enrichedDtos = createDtos.map((dto) => this.enrichCreateDto(dto));

      // Persiste em lote
      const auditLogs = await this.auditRepository.createBatch(enrichedDtos);

      this.logger.debug(`${auditLogs.length} audit logs created in batch`);

      return auditLogs;
    } catch (error) {
      this.logger.error(
        `Failed to create audit logs batch: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Busca logs com filtros
   */
  async findAuditLogs(
    filters: AuditSearchFilters,
  ): Promise<PaginatedAuditResult> {
    try {
      return await this.auditRepository.findWithFilters(filters);
    } catch (error) {
      this.logger.error(
        `Failed to find audit logs: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Busca log por ID
   */
  async findAuditLogById(id: string): Promise<LogAuditoria | null> {
    try {
      return await this.auditRepository.findById(id);
    } catch (error) {
      this.logger.error(
        `Failed to find audit log by ID: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Busca logs por entidade
   */
  async findAuditLogsByEntity(
    entityName: string,
    entityId?: string,
  ): Promise<LogAuditoria[]> {
    try {
      return await this.auditRepository.findByEntity(entityName, entityId);
    } catch (error) {
      this.logger.error(
        `Failed to find audit logs by entity: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Busca logs por usuário
   */
  async findAuditLogsByUser(
    userId: string,
    limit = 100,
  ): Promise<LogAuditoria[]> {
    try {
      return await this.auditRepository.findByUser(userId, limit);
    } catch (error) {
      this.logger.error(
        `Failed to find audit logs by user: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Busca logs relevantes para LGPD
   */
  async findLgpdRelevantLogs(
    filters: Omit<AuditSearchFilters, 'lgpdRelevant'>,
  ): Promise<PaginatedAuditResult> {
    try {
      return await this.auditRepository.findLgpdRelevant(filters);
    } catch (error) {
      this.logger.error(
        `Failed to find LGPD relevant logs: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Obtém estatísticas de auditoria
   */
  async getAuditStatistics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<AuditStatistics> {
    try {
      return await this.auditRepository.getStatistics(startDate, endDate);
    } catch (error) {
      this.logger.error(
        `Failed to get audit statistics: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Limpa logs antigos
   */
  async cleanupOldLogs(olderThanDays: number): Promise<number> {
    try {
      const deletedCount =
        await this.auditRepository.cleanupOldLogs(olderThanDays);

      this.logger.log(`Cleaned up ${Number(deletedCount)} old audit logs`);

      return deletedCount;
    } catch (error) {
      this.logger.error(
        `Failed to cleanup old logs: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Processa eventos pendentes acumulados durante a inicialização
   */
  private async processPendingEvents(): Promise<void> {
    if (this.pendingEvents.length === 0) {
      return;
    }

    this.logger.debug(
      `Processing ${this.pendingEvents.length} pending audit events`,
    );

    const events = [...this.pendingEvents];
    this.pendingEvents = [];

    for (const event of events) {
      try {
        await this.processSyncEvent({ event });
      } catch (error) {
        this.logger.error(
          `Failed to process pending event: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  /**
   * Registra listeners para eventos síncronos
   */
  private registerSyncEventListeners(): void {
    this.eventEmitter.on('audit.process.sync', async (event: AuditEvent) => {
      try {
        // Se não estiver inicializado, adiciona à fila de pendentes
        if (!this.isInitialized) {
          this.pendingEvents.push(event);
          this.logger.debug('Event queued for processing after initialization');
          return;
        }

        await this.processSyncEvent({ event });
      } catch (error) {
        this.logger.error(
          `Failed to process sync event listener: ${error.message}`,
          error.stack,
        );
      }
    });
  }

  /**
   * Converte evento para DTO de criação
   */
  private eventToCreateDto(event: AuditEvent): CreateAuditLogDto {
    const dto: CreateAuditLogDto = {
      tipo_operacao: this.mapEventTypeToTipoOperacao(event.eventType),
      entidade_afetada: event.entityName,
      entidade_id: event.entityId,
      usuario_id: event.userId,
      descricao: this.generateEventDescription(event),
      nivel_risco: event.riskLevel || RiskLevel.LOW,
      lgpd_relevante: event.lgpdRelevant || false,
      metadata: event.metadata || {},
      contexto_requisicao: event.requestContext || {},
    };

    // Adiciona dados específicos do tipo de evento
    if ('previousData' in event && event.previousData) {
      dto.dados_anteriores = event.previousData;
    }

    if ('newData' in event && event.newData) {
      dto.dados_novos = event.newData;
    }

    // Enriquece metadados para eventos de entidade
    if ('changedFields' in event && event.changedFields) {
      dto.metadata.changedFields = event.changedFields;
      dto.metadata.sensitiveFieldsChanged =
        event.sensitiveFieldsChanged || false;
    }

    // Enriquece metadados para eventos de dados sensíveis
    if ('sensitiveFields' in event && event.sensitiveFields) {
      dto.metadata.sensitiveFields = event.sensitiveFields;
      dto.metadata.legalBasis = event.legalBasis;
      dto.metadata.purpose = event.purpose;
    }

    return dto;
  }

  /**
   * Aplica configurações específicas do evento
   */
  private async applyEventConfig(
    dto: CreateAuditLogDto,
    config?: AuditEventConfig,
  ): Promise<CreateAuditLogDto> {
    let processedDto = { ...dto };

    // Aplica compressão se configurado
    if (config?.compress) {
      processedDto = await this.compressAuditData(processedDto);
    }

    // Aplica assinatura digital se configurado
    if (config?.sign) {
      processedDto = await this.signAuditData(processedDto);
    }

    return processedDto;
  }

  /**
   * Executa pós-processamento do evento
   */
  private async executePostProcessing(
    event: AuditEvent,
    auditLog: LogAuditoria,
  ): Promise<void> {
    // Emite evento de log criado
    this.eventEmitter.emit('audit.log.created', {
      logId: auditLog.id,
      event,
      auditLog,
    });

    // Processamento específico para eventos críticos
    if (event.riskLevel === RiskLevel.CRITICAL) {
      this.eventEmitter.emit('audit.critical.event', {
        logId: auditLog.id,
        event,
      });
    }

    // Processamento específico para eventos LGPD
    if (event.lgpdRelevant) {
      this.eventEmitter.emit('audit.lgpd.event', {
        logId: auditLog.id,
        event,
      });
    }
  }

  /**
   * Valida DTO de criação
   */
  private validateCreateDto(dto: CreateAuditLogDto): void {
    if (!dto.tipo_operacao) {
      throw new Error('tipo_operacao is required');
    }

    if (!dto.entidade_afetada) {
      throw new Error('entidade_afetada is required');
    }

    // Valida nível de risco
    if (
      dto.nivel_risco &&
      !Object.values(RiskLevel).includes(dto.nivel_risco)
    ) {
      throw new Error(`Invalid nivel_risco: ${dto.nivel_risco}`);
    }
  }

  /**
   * Enriquece DTO com dados padrão e contexto de auditoria
   */
  private enrichCreateDto(dto: CreateAuditLogDto): CreateAuditLogDto {
    // Captura contexto de auditoria do interceptor
    const auditContext = AuditContextHolder.get();
    
    // Enriquece contexto de requisição com dados capturados
    const enrichedContexto = {
      ...dto.contexto_requisicao,
      // Dados do contexto de auditoria
      userId: auditContext?.userId,
      userRoles: auditContext?.userRoles,
      ip: auditContext?.ip,
      userAgent: auditContext?.userAgent,
      requestId: auditContext?.requestId,
      sessionId: auditContext?.sessionId,
      timestamp: auditContext?.timestamp,
      method: auditContext?.method,
      url: auditContext?.url,
      controllerName: auditContext?.controllerName,
      handlerName: auditContext?.handlerName,
    };

    return {
      ...dto,
      nivel_risco: dto.nivel_risco || RiskLevel.LOW,
      lgpd_relevante: dto.lgpd_relevante ?? false,
      metadata: dto.metadata || {},
      contexto_requisicao: enrichedContexto,
      ip_origem: dto.ip_origem || auditContext?.ip,
      user_agent: dto.user_agent || auditContext?.userAgent,
      endpoint: dto.endpoint || auditContext?.url,
      metodo_http: dto.metodo_http || auditContext?.method,
      descricao: dto.descricao || this.generateDefaultDescription(dto),
    };
  }

  /**
   * Gera descrição do evento
   */
  private generateEventDescription(event: AuditEvent): string {
    let description = `${event.eventType} em ${event.entityName}`;

    if (event.entityId) {
      description += ` (ID: ${event.entityId})`;
    }

    if (event.userId) {
      description += ` por usuário ${event.userId}`;
    }

    return description;
  }

  /**
   * Gera descrição padrão
   */
  private generateDefaultDescription(dto: CreateAuditLogDto): string {
    let description = `${dto.tipo_operacao} em ${dto.entidade_afetada}`;

    if (dto.entidade_id) {
      description += ` (ID: ${dto.entidade_id})`;
    }

    if (dto.usuario_id) {
      description += ` por usuário ${dto.usuario_id}`;
    }

    return description;
  }

  /**
   * Comprime dados de auditoria
   */
  private async compressAuditData(
    dto: CreateAuditLogDto,
  ): Promise<CreateAuditLogDto> {
    try {
      // Serializa os dados para compressão
      const originalData = JSON.stringify(dto);
      const originalSize = originalData.length;
      
      // Só comprime se os dados forem grandes o suficiente (> 1KB)
      if (originalSize < 1024) {
        return {
          ...dto,
          metadata: {
            ...dto.metadata,
            _compressed: false,
            _originalSize: originalSize,
            _reason: 'Data too small for compression',
          },
        };
      }

      // Implementa compressão usando gzip
      const { gzip } = await import('zlib');
      const { promisify } = await import('util');
      const gzipAsync = promisify(gzip);
      
      // Comprime os dados sensíveis (contexto_requisicao e metadata)
      const dataToCompress = {
        contexto_requisicao: dto.contexto_requisicao,
        metadata: dto.metadata,
        dados_anteriores: dto.dados_anteriores,
        dados_novos: dto.dados_novos,
      };
      
      const compressedBuffer = await gzipAsync(JSON.stringify(dataToCompress));
      const compressedSize = compressedBuffer.length;
      const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);
      
      // Converte para base64 para armazenamento
      const compressedData = compressedBuffer.toString('base64');
      
      this.logger.debug(
        `Dados de auditoria comprimidos: ${originalSize}B -> ${compressedSize}B (${compressionRatio}% redução)`,
      );
      
      return {
        ...dto,
        // Remove dados originais que foram comprimidos
        contexto_requisicao: undefined,
        dados_anteriores: undefined,
        dados_novos: undefined,
        metadata: {
          _compressed: true,
          _originalSize: originalSize,
          _compressedSize: compressedSize,
          _compressionRatio: compressionRatio,
          _compressedData: compressedData,
          _compressionAlgorithm: 'gzip',
          _compressedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Erro ao comprimir dados de auditoria: ${error.message}`,
        error.stack,
      );
      
      // Fallback: retorna dados originais sem compressão
      return {
        ...dto,
        metadata: {
          ...dto.metadata,
          _compressed: false,
          _originalSize: JSON.stringify(dto).length,
          _compressionError: error.message,
        },
      };
    }
  }

  /**
   * Assina digitalmente os dados
   */
  private async signAuditData(
    dto: CreateAuditLogDto,
  ): Promise<CreateAuditLogDto> {
    try {
      // Criar um objeto temporário com os dados para assinatura
      const tempLogData = {
        id: dto.metadata?.tempId || this.generateTempId(),
        tipo_operacao: dto.tipo_operacao,
        entidade_afetada: dto.entidade_afetada,
        entidade_id: dto.entidade_id,
        usuario_id: dto.usuario_id,
        endpoint: dto.endpoint,
        metodo_http: dto.metodo_http,
        ip_origem: dto.ip_origem,
        data_hora: new Date(),
      };

      // Usar o serviço de assinatura real
      const signature = await this.auditoriaSignatureService.assinarLog(tempLogData);

      return {
        ...dto,
        metadata: {
          ...dto.metadata,
          _signature: signature,
          _signedAt: new Date().toISOString(),
          _tempId: tempLogData.id,
        },
      };
    } catch (error) {
      this.logger.error(
        `Erro ao assinar dados de auditoria: ${error.message}`,
        error.stack,
      );
      // Fallback para hash simples em caso de erro
      const dataString = JSON.stringify(dto);
      const hash = this.generateSimpleHash(dataString);

      return {
        ...dto,
        metadata: {
          ...dto.metadata,
          _signature: hash,
          _signedAt: new Date().toISOString(),
          _fallback: true,
        },
      };
    }
  }

  /**
   * Gera um ID temporário para assinatura
   */
  private generateTempId(): string {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gera hash simples para assinatura
   */
  private generateSimpleHash(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Mapeia o tipo de evento para o tipo de operação
   */
  private mapEventTypeToTipoOperacao(eventType: AuditEventType): TipoOperacao {
    switch (eventType) {
      case AuditEventType.ENTITY_CREATED:
        return TipoOperacao.CREATE;
      case AuditEventType.ENTITY_UPDATED:
        return TipoOperacao.UPDATE;
      case AuditEventType.ENTITY_DELETED:
        return TipoOperacao.DELETE;
      case AuditEventType.ENTITY_ACCESSED:
        return TipoOperacao.READ;
      case AuditEventType.SENSITIVE_DATA_ACCESSED:
        return TipoOperacao.ACCESS;
      case AuditEventType.SENSITIVE_DATA_EXPORTED:
        return TipoOperacao.EXPORT;
      case AuditEventType.SYSTEM_ERROR:
      case AuditEventType.SYSTEM_WARNING:
      case AuditEventType.SYSTEM_INFO:
        return TipoOperacao.ACCESS;
      default:
        return TipoOperacao.ACCESS;
    }
  }
}
