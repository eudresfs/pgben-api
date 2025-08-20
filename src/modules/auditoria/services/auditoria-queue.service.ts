import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CreateLogAuditoriaDto } from '../dto/create-log-auditoria.dto';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';
import { BatchAuditJobData, AuditJobData } from '../queues/jobs/audit-processing.job';
import { RiskLevel, AuditEventType } from '../events/types/audit-event.types';

/**
 * Serviço de Fila de Auditoria - Versão MVP
 *
 * Responsável por processar logs de auditoria.
 * Implementação simplificada para o MVP com foco nas operações essenciais.
 */
@Injectable()
export class AuditoriaQueueService {
  private readonly logger = new Logger(AuditoriaQueueService.name);

  constructor(
    @InjectQueue('auditoria') private readonly auditoriaQueue: Queue,
  ) {}

  /**
   * Processa um log de auditoria (implementação simplificada para o MVP)
   *
   * @param logAuditoriaDto Dados do log de auditoria a ser registrado
   * @returns Promise com o resultado da operação
   */
  async processarLog(logAuditoriaDto: CreateLogAuditoriaDto): Promise<void> {
    try {
      // No MVP, simplificamos o processamento enfileirando diretamente
      // com configuração básica
      await this.auditoriaQueue.add('registrar-log', logAuditoriaDto, {
        attempts: 2,
        removeOnComplete: true,
      });

      this.logger.debug(
        `Log de auditoria processado: ${logAuditoriaDto.entidade_afetada} - ${logAuditoriaDto.tipo_operacao}`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';

      this.logger.error(`Erro ao processar log de auditoria: ${errorMessage}`);
    }
  }

  /**
   * Enfileira um log de auditoria para processamento assíncrono
   *
   * @param logAuditoriaDto Dados do log de auditoria a ser registrado
   * @returns Promise com o resultado da operação
   */
  async enfileirarLogAuditoria(
    logAuditoriaDto: CreateLogAuditoriaDto,
  ): Promise<void> {
    return this.processarLog(logAuditoriaDto);
  }

  /**
   * Enfileira um registro de acesso a dados sensíveis para processamento assíncrono
   *
   * @param usuarioId ID do usuário que acessou os dados
   * @param entidade Nome da entidade acessada
   * @param entidadeId ID da entidade acessada
   * @param camposSensiveis Lista de campos sensíveis acessados
   * @param ip Endereço IP de origem do acesso
   * @param userAgent User agent do navegador
   * @param url URL acessada
   * @param metodo Método HTTP utilizado
   * @returns Promise com o resultado da operação
   */
  async enfileirarAcessoDadosSensiveis(
    usuarioId: string,
    entidade: string,
    entidadeId: string,
    camposSensiveis: string[],
    ip: string,
    userAgent: string,
    url: string,
    metodo: string,
  ): Promise<void> {
    try {
      // Cria um DTO de log específico para acesso a dados sensíveis
      const logAuditoriaDto = new CreateLogAuditoriaDto();
      logAuditoriaDto.tipo_operacao = TipoOperacao.ACCESS;
      logAuditoriaDto.entidade_afetada = entidade;
      logAuditoriaDto.entidade_id = entidadeId;
      logAuditoriaDto.usuario_id = usuarioId;
      logAuditoriaDto.ip_origem = ip;
      logAuditoriaDto.user_agent = userAgent;
      logAuditoriaDto.endpoint = url;
      logAuditoriaDto.metodo_http = metodo;
      logAuditoriaDto.dados_sensiveis_acessados = camposSensiveis;
      logAuditoriaDto.descricao = `Acesso a dados sensíveis: ${camposSensiveis.join(', ')}`;

      return this.processarLog(logAuditoriaDto);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';

      this.logger.error(
        `Erro ao enfileirar acesso a dados sensíveis: ${errorMessage}`,
      );
    }
  }

  /**
   * Enfileira um lote de eventos de auditoria para processamento otimizado
   * Utiliza a fila 'audit-batch-processing' para melhor throughput
   *
   * @param events Array de eventos de auditoria para processamento em lote
   * @param batchConfig Configurações específicas do lote (opcional)
   * @returns Promise com o resultado da operação
   */
  async enfileirarLoteAuditoria(
    events: AuditJobData[],
    batchConfig?: {
      priority?: number;
      maxRetries?: number;
      compress?: boolean;
      sign?: boolean;
    },
  ): Promise<void> {
    try {
      if (!events || events.length === 0) {
        throw new Error('Events array cannot be empty');
      }

      if (events.length > 1000) {
        throw new Error('Maximum 1000 events per batch allowed');
      }

      // Prepara dados do lote
      const batchData: BatchAuditJobData = {
        events,
        config: {
          priority: batchConfig?.priority || 5,
          attempts: batchConfig?.maxRetries || 3,
          compress: batchConfig?.compress || false,
          sign: batchConfig?.sign || false,
        },
      };

      // Enfileira na fila de processamento em lote
      await this.auditoriaQueue.add('process-optimized-batch', batchData, {
        priority: batchConfig?.priority || 5,
        attempts: batchConfig?.maxRetries || 3,
        removeOnComplete: 50,
        removeOnFail: 25,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      });

      this.logger.debug(
        `Lote de auditoria enfileirado: ${events.length} eventos`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';

      this.logger.error(
        `Erro ao enfileirar lote de auditoria: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * Converte CreateLogAuditoriaDto para AuditJobData
   * Utilitário para facilitar a migração para processamento em lote
   *
   * @param dto DTO de log de auditoria
   * @returns Dados formatados para job de auditoria
   */
  convertDtoToAuditJobData(dto: CreateLogAuditoriaDto): AuditJobData {
    return {
      event: {
        eventType: this.mapTipoOperacaoToEventType(dto.tipo_operacao),
        entityName: dto.entidade_afetada,
        entityId: dto.entidade_id,
        userId: dto.usuario_id,
        timestamp: new Date(),
        metadata: {
          endpoint: dto.endpoint,
          metodoHttp: dto.metodo_http,
          dadosSensiveis: dto.dados_sensiveis_acessados,
          descricao: dto.descricao,
        },
        ipAddress: dto.ip_origem,
        userAgent: dto.user_agent,
        riskLevel: this.calculateRiskLevel(dto),
      },
      config: {
        compress: false,
        sign: false,
      },
    } as AuditJobData;
  }

  /**
   * Mapeia TipoOperacao para EventType
   */
  private mapTipoOperacaoToEventType(tipoOperacao: TipoOperacao): AuditEventType {
    const operationMap = {
      [TipoOperacao.CREATE]: AuditEventType.ENTITY_CREATED,
      [TipoOperacao.READ]: AuditEventType.ENTITY_ACCESSED,
      [TipoOperacao.UPDATE]: AuditEventType.ENTITY_UPDATED,
      [TipoOperacao.DELETE]: AuditEventType.ENTITY_DELETED,
      [TipoOperacao.ACCESS]: AuditEventType.SENSITIVE_DATA_ACCESSED,
      [TipoOperacao.EXPORT]: AuditEventType.SENSITIVE_DATA_EXPORTED,
      [TipoOperacao.ANONYMIZE]: AuditEventType.SENSITIVE_DATA_DELETED,
      [TipoOperacao.LOGIN]: AuditEventType.SUCCESSFUL_LOGIN,
      [TipoOperacao.LOGOUT]: AuditEventType.LOGOUT,
      [TipoOperacao.FAILED_LOGIN]: AuditEventType.FAILED_LOGIN,
      [TipoOperacao.APPROVE]: AuditEventType.ENTITY_UPDATED,
      [TipoOperacao.REJECT]: AuditEventType.ENTITY_UPDATED,
      [TipoOperacao.EXECUTION]: AuditEventType.ENTITY_UPDATED,
      [TipoOperacao.CANCEL]: AuditEventType.ENTITY_UPDATED,
    } as const;

    return operationMap[tipoOperacao] || AuditEventType.ENTITY_ACCESSED;
  }

  /**
   * Calcula nível de risco baseado no DTO
   */
  private calculateRiskLevel(dto: CreateLogAuditoriaDto): RiskLevel {
    // Operações de exclusão são sempre de alto risco
    if (dto.tipo_operacao === TipoOperacao.DELETE) {
      return RiskLevel.HIGH;
    }

    // Acesso a dados sensíveis é crítico
    if (dto.dados_sensiveis_acessados && dto.dados_sensiveis_acessados.length > 0) {
      return RiskLevel.CRITICAL;
    }

    // Operações de criação e atualização são médio risco
    if (dto.tipo_operacao === TipoOperacao.CREATE || dto.tipo_operacao === TipoOperacao.UPDATE) {
      return RiskLevel.MEDIUM;
    }

    // Operações de leitura são baixo risco
    return RiskLevel.LOW;
  }
}
