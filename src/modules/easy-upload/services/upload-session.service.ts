import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UploadSession, UploadSessionStatus } from '../entities/upload-session.entity';
import { AuditEventEmitter } from '../../auditoria/events/emitters/audit-event.emitter';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';
import { CreateLogAuditoriaDto } from '../../auditoria/dto/create-log-auditoria.dto';
import { BaseDto } from '../../../shared/dtos/base.dto';

/**
 * Serviço responsável pelo gerenciamento de sessões de upload
 */
@Injectable()
export class UploadSessionService {
  private readonly logger = new Logger(UploadSessionService.name);
  private readonly sessionTimeoutMinutes: number;

  constructor(
    @InjectRepository(UploadSession)
    private readonly uploadSessionRepository: Repository<UploadSession>,
    private readonly configService: ConfigService,
    private readonly auditEventEmitter: AuditEventEmitter,
  ) {
    this.sessionTimeoutMinutes = this.configService.get<number>('EASY_UPLOAD_SESSION_TIMEOUT_MINUTES', 30);
    this.logger.log('UploadSessionService inicializado');
  }

  /**
   * Cria uma nova sessão de upload para um token
   * @param tokenId ID do token de upload
   * @param sessionData Dados da sessão (IP, User-Agent, etc.)
   * @returns A sessão criada
   */
  async createSession(tokenId: string, sessionData: Partial<UploadSession>): Promise<UploadSession> {
    try {
      const now = new Date();

      const session = this.uploadSessionRepository.create({
        token_id: tokenId,
        ip_address: sessionData.ip_address,
        user_agent: sessionData.user_agent,
        device_fingerprint: sessionData.device_fingerprint,
        started_at: now,
        last_activity_at: now,
        status: UploadSessionStatus.INICIADA,
        files_uploaded: 0,
        total_size_bytes: 0,
        upload_progress: {
          current_file: 0,
          total_files: 0,
          bytes_uploaded: 0,
          percentage: 0,
          files_completed: [],
          files_failed: [],
        },
        session_metadata: sessionData.session_metadata || {},
      });

      const savedSession = await this.uploadSessionRepository.save(session);
      
      this.logger.debug(`Sessão de upload criada: ${savedSession.id} para token ${tokenId}`);

      // Registrar na auditoria
      await this.auditEventEmitter.emitEntityCreated(
        'UploadSession',
        savedSession.id,
        {
          token_id: tokenId,
          ip: sessionData.ip_address,
        },
        null // Sistema interno
      );

      return savedSession;
    } catch (error) {
      this.logger.error(`Erro ao criar sessão de upload: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Falha ao criar sessão de upload');
    }
  }

  /**
   * Busca uma sessão pelo ID
   * @param id ID da sessão
   * @returns A sessão encontrada
   * @throws NotFoundException se a sessão não for encontrada
   */
  async findById(id: string): Promise<UploadSession> {
    try {
      const session = await this.uploadSessionRepository.findOne({
        where: { id },
        relations: ['uploadToken', 'documentos'],
      });

      if (!session) {
        throw new NotFoundException('Sessão de upload não encontrada');
      }

      return session;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erro ao buscar sessão de upload: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Falha ao buscar sessão de upload');
    }
  }

  /**
   * Busca sessões pelo ID do token
   * @param tokenId ID do token
   * @returns Lista de sessões encontradas
   */
  async findByTokenId(tokenId: string): Promise<UploadSession[]> {
    try {
      return await this.uploadSessionRepository.find({
        where: { token_id: tokenId },
        order: { started_at: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Erro ao buscar sessões por token: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Falha ao buscar sessões de upload');
    }
  }

  /**
   * Atualiza o status de uma sessão
   * @param id ID da sessão
   * @param status Novo status
   * @param errorMessage Mensagem de erro (opcional, para status de erro)
   */
  async updateSessionStatus(
    id: string, 
    status: UploadSessionStatus,
    errorMessage?: string
  ): Promise<void> {
    try {
      const session = await this.findById(id);
      
      switch (status) {
        case UploadSessionStatus.COMPLETADA:
          session.complete();
          break;
        case UploadSessionStatus.ERRO:
          session.setError(errorMessage || 'Erro não especificado');
          break;
        case UploadSessionStatus.EXPIRADA:
          session.expire();
          break;
        case UploadSessionStatus.CANCELADA:
          session.cancel();
          break;
        case UploadSessionStatus.ATIVA:
          session.updateActivity();
          break;
        default:
          session.status = status;
      }

      await this.uploadSessionRepository.save(session);
      
      this.logger.debug(`Sessão ${id} atualizada para status: ${status}`);
      
      // Registrar na auditoria
      await this.auditEventEmitter.emitEntityUpdated(
        'UploadSession',
        id,
        { status: session.status },
        {
          status,
          error_message: errorMessage,
        },
        null // Sistema interno
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erro ao atualizar status da sessão: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Falha ao atualizar status da sessão');
    }
  }

  /**
   * Incrementa o contador de arquivos enviados em uma sessão
   * @param id ID da sessão
   * @param fileSize Tamanho do arquivo em bytes
   */
  async incrementFilesUploaded(id: string, fileSize: number = 0): Promise<void> {
    try {
      const session = await this.findById(id);
      session.incrementFilesUploaded(fileSize);
      await this.uploadSessionRepository.save(session);
      
      this.logger.debug(`Incrementado contador de arquivos para sessão ${id}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erro ao incrementar contador de arquivos: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Falha ao atualizar contador de arquivos');
    }
  }

  /**
   * Atualiza o progresso de upload de uma sessão
   * @param id ID da sessão
   * @param progress Dados de progresso
   */
  async updateProgress(
    id: string,
    progress: Partial<UploadSession['upload_progress']>,
  ): Promise<void> {
    try {
      const session = await this.findById(id);
      session.updateProgress(progress);
      await this.uploadSessionRepository.save(session);
      
      this.logger.debug(`Progresso atualizado para sessão ${id}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erro ao atualizar progresso: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Falha ao atualizar progresso de upload');
    }
  }

  /**
   * Completa uma sessão de upload
   * @param id ID da sessão
   * @param success Indica se o upload foi bem-sucedido
   * @param errorMessage Mensagem de erro (opcional, para uploads com falha)
   */
  async completeSession(id: string, success: boolean, errorMessage?: string): Promise<void> {
    try {
      if (success) {
        await this.updateSessionStatus(id, UploadSessionStatus.COMPLETADA);
        
        // Registrar na auditoria
        await this.auditEventEmitter.emitEntityUpdated(
          'UploadSession',
          id,
          {},
          { success: true },
          null // Sistema interno
        );
      } else {
        await this.updateSessionStatus(id, UploadSessionStatus.ERRO, errorMessage);
        
        // Registrar na auditoria
        await this.auditEventEmitter.emitEntityUpdated(
          'UploadSession',
          id,
          {},
          { error: errorMessage },
          null // Sistema interno
        );
      }
      
      this.logger.debug(`Sessão ${id} marcada como ${success ? 'completada' : 'falha'}`);
    } catch (error) {
      this.logger.error(`Erro ao completar sessão: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Falha ao completar sessão de upload');
    }
  }

  /**
   * Lista sessões de upload com filtros
   * @param filters Filtros para a listagem
   * @returns Lista paginada de sessões
   */
  async listSessions(filters: any): Promise<{ items: UploadSession[]; total: number }> {
    try {
      const where: FindOptionsWhere<UploadSession> = {};

      // Aplicar filtros
      if (filters.token_id) {
        where.token_id = filters.token_id;
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.ip_address) {
        where.ip_address = filters.ip_address;
      }

      // Configurar paginação
      const take = filters.limit || 10;
      const skip = filters.offset || 0;

      // Executar consulta
      const [items, total] = await this.uploadSessionRepository.findAndCount({
        where,
        order: { started_at: 'DESC' },
        take,
        skip,
        relations: ['uploadToken', 'documentos'],
      });

      return {
        items,
        total,
      };
    } catch (error) {
      this.logger.error(`Erro ao listar sessões: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Falha ao listar sessões de upload');
    }
  }

  /**
   * Busca sessões inativas/abandonadas que podem ser encerradas
   * @returns Lista de sessões inativas
   */
  async findInactiveSessions(): Promise<UploadSession[]> {
    try {
      const sessions = await this.uploadSessionRepository.find({
        where: [
          { status: UploadSessionStatus.INICIADA },
          { status: UploadSessionStatus.ATIVA }
        ],
      });

      // Filtrar sessões que estão inativas há muito tempo
      return sessions.filter(session => session.isInactive(this.sessionTimeoutMinutes));
    } catch (error) {
      this.logger.error(`Erro ao buscar sessões inativas: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Tarefa agendada para marcar sessões inativas como expiradas
   */
  async processInactiveSessions(): Promise<void> {
    try {
      const inactiveSessions = await this.findInactiveSessions();
      
      for (const session of inactiveSessions) {
        await this.updateSessionStatus(
          session.id,
          UploadSessionStatus.TIMEOUT,
          `Sessão expirou por inatividade após ${this.sessionTimeoutMinutes} minutos`,
        );
        this.logger.debug(`Sessão inativa processada: ${session.id}`);
      }
      
      if (inactiveSessions.length > 0) {
        this.logger.log(`${inactiveSessions.length} sessões inativas foram encerradas`);
      }
    } catch (error) {
      this.logger.error(`Erro ao processar sessões inativas: ${error.message}`, error.stack);
    }
  }

  /**
   * Deletar sessões antigas (limpeza periódica)
   * @param days Número de dias para manter sessões (sessões mais antigas serão removidas)
   * @returns Número de sessões removidas
   */
  async cleanupOldSessions(days: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Excluir sessões antigas (completadas, expiradas, canceladas ou com erro)
      const result = await this.uploadSessionRepository
        .createQueryBuilder()
        .delete()
        .from(UploadSession)
        .where('created_at < :cutoffDate', { cutoffDate })
        .andWhere('status IN (:...statuses)', {
          statuses: [
            UploadSessionStatus.COMPLETADA,
            UploadSessionStatus.EXPIRADA,
            UploadSessionStatus.CANCELADA,
            UploadSessionStatus.ERRO,
            UploadSessionStatus.TIMEOUT,
          ],
        })
        .execute();

      const count = result.affected || 0;
      this.logger.debug(`${count} sessões antigas foram removidas (${days} dias)`);
      return count;
    } catch (error) {
      this.logger.error(`Erro ao limpar sessões antigas: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Falha ao limpar sessões antigas');
    }
  }

  /**
   * Busca estatísticas de sessões
   * @returns Estatísticas de uso
   */
  async getSessionStats(): Promise<Record<string, any>> {
    try {
      const totalSessions = await this.uploadSessionRepository.count();
      
      // Obter contagem por status
      const statusCounts = await this.uploadSessionRepository
        .createQueryBuilder('session')
        .select('session.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('session.status')
        .getRawMany();

      // Formatar contagens por status
      const byStatus = statusCounts.reduce((acc, curr) => {
        acc[curr.status] = parseInt(curr.count, 10);
        return acc;
      }, {});
      
      // Obter totais de arquivos e bytes
      const totalQuery = await this.uploadSessionRepository
        .createQueryBuilder('session')
        .select('SUM(session.files_uploaded)', 'files')
        .addSelect('SUM(session.total_size_bytes)', 'bytes')
        .getRawOne();

      // Formatar resultado
      return {
        total_sessions: totalSessions,
        by_status: byStatus,
        total_files: parseInt(totalQuery.files || '0', 10),
        total_bytes: parseInt(totalQuery.bytes || '0', 10),
      };
    } catch (error) {
      this.logger.error(`Erro ao obter estatísticas: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Falha ao obter estatísticas de sessões');
    }
  }
}
