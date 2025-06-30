import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { QrCodeService } from './qr-code.service';
import { UploadTokenService } from './upload-token.service';
import { UploadSessionService } from './upload-session.service';
import { UploadToken } from '../entities/upload-token.entity';
import { UploadSession, UploadSessionStatus } from '../entities/upload-session.entity';
import { AuditEventEmitter } from '../../auditoria/events/emitters/audit-event.emitter';
import { NotificacaoService } from '../../notificacao/services/notificacao.service';
import { DocumentoService } from '../../documento/services/documento.service';
import { Documento } from '../../../entities/documento.entity';
import { CreateLogAuditoriaDto } from '../../auditoria/dto/create-log-auditoria.dto';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';
import { BaseDto } from '../../../shared/dtos/base.dto';

/**
 * Serviço principal que orquestra as operações do módulo EasyUpload,
 * unificando as funcionalidades dos demais serviços especializados.
 */
@Injectable()
export class EasyUploadService {
  private readonly logger = new Logger(EasyUploadService.name);

  constructor(
    private readonly qrCodeService: QrCodeService,
    private readonly uploadTokenService: UploadTokenService,
    private readonly uploadSessionService: UploadSessionService,
    private readonly documentoService: DocumentoService,
    private readonly auditEventEmitter: AuditEventEmitter,
    private readonly notificacaoService: NotificacaoService,
  ) {
    this.logger.log('EasyUploadService inicializado');
  }

  /**
   * Cria um token de upload com QR Code
   * @param tokenData Dados para criação do token
   * @param userId ID do usuário que está criando o token
   * @returns Token criado com QR Code
   */
  async createUploadToken(tokenData: Partial<UploadToken>, userId: string): Promise<UploadToken> {
    try {
      this.logger.debug('Criando token de upload');

      // Criar o token através do serviço especializado
      const token = await this.uploadTokenService.createUploadToken(tokenData, userId);

      // Se aplicável, enviar notificação para o cidadão
      if (token.cidadao_id && tokenData.metadata && tokenData.metadata.enviar_notificacao) {
        await this.enviarNotificacaoCidadao(token);
      }

      return token;
    } catch (error) {
      this.logger.error(`Erro ao criar token de upload: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Envia notificação para o cidadão sobre um token de upload
   * @param token Token de upload
   */
  private async enviarNotificacaoCidadao(token: UploadToken): Promise<void> {
    try {
      const uploadUrl = this.qrCodeService.getUploadUrl(token.token);
      
      await this.notificacaoService.enviarNotificacao({
        tipo: 'UPLOAD_DISPONIVEL',
        destinatario_id: token.cidadao_id || '',
        titulo: 'Solicitação de documentos',
        conteudo: 'Foi solicitado o envio de documentos para seu processo',
        link: uploadUrl,
        dados: {
          token_id: token.id,
          solicitacao_id: token.solicitacao_id || '',
          qr_code: token.metadata?.qr_code || '',
        },
      });
      
      this.logger.debug(`Notificação enviada para cidadão ${token.cidadao_id}`);
    } catch (error) {
      this.logger.warn(`Erro ao enviar notificação: ${error.message}`);
      // Não propagar o erro, pois a criação do token já foi bem-sucedida
    }
  }

  /**
   * Lista tokens de upload com filtros
   * @param filters Filtros para a listagem
   * @param userId ID do usuário que está consultando
   * @returns Lista paginada de tokens
   */
  async listUploadTokens(filters: any, userId: string): Promise<{ items: UploadToken[]; total: number }> {
    return await this.uploadTokenService.listTokens(filters, userId);
  }

  /**
   * Obtém detalhes de um token específico
   * @param tokenId ID do token
   * @param userId ID do usuário que está consultando
   * @returns Detalhes do token
   */
  async getTokenDetails(tokenId: string, userId: string): Promise<UploadToken> {
    return await this.uploadTokenService.getTokenDetails(tokenId, userId);
  }

  /**
   * Cancela um token de upload
   * @param tokenId ID do token
   * @param userId ID do usuário que está cancelando o token
   * @param motivo Motivo do cancelamento
   */
  async cancelUploadToken(tokenId: string, userId: string, motivo?: string): Promise<void> {
    await this.uploadTokenService.cancelToken(tokenId, userId, motivo);
    
    // Enviar notificação ao cidadão caso necessário
    const token = await this.uploadTokenService.getTokenDetails(tokenId, userId);
    if (token.cidadao_id) {
      try {
        await this.notificacaoService.enviarNotificacao({
          tipo: 'UPLOAD_CANCELADO',
          destinatario_id: token.cidadao_id || '',
          titulo: 'Solicitação de documentos cancelada',
          conteudo: `A solicitação de envio de documentos foi cancelada. ${motivo ? `Motivo: ${motivo}` : ''}`,
          dados: {
            token_id: token.id,
            solicitacao_id: token.solicitacao_id || '',
            motivo: motivo || 'Não informado',
          },
        });
      } catch (error) {
        this.logger.warn(`Erro ao enviar notificação de cancelamento: ${error.message}`);
      }
    }
  }

  /**
   * Valida um token de upload
   * @param token Código do token
   * @param ipAddress Endereço IP do cliente
   * @param userAgent User-Agent do cliente
   * @returns Informações do token validado
   */
  async validateUploadToken(token: string, ipAddress?: string, userAgent?: string): Promise<any> {
    try {
      // Validar o token
      const uploadToken = await this.uploadTokenService.validateToken(token);
      
      // Registrar na auditoria
      await this.auditEventEmitter.emitEntityUpdated(
        'UploadToken',
        uploadToken.id,
        {},
        { 
          status: 'VALIDADO', 
          ip_address: ipAddress, 
          user_agent: userAgent?.substring(0, 255) 
        },
        uploadToken.usuario_id || null
      );
      
      // Retornar informações relevantes (sem expor dados sensíveis)
      return {
        valid: true,
        token_id: uploadToken.id,
        max_files: uploadToken.max_files,
        expires_at: uploadToken.expires_at,
        required_documents: uploadToken.required_documents,
        public_metadata: uploadToken.metadata?.public_info || null,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        // Registrar falha de validação sem revelar detalhes ao cliente
        await this.auditEventEmitter.emitEntityUpdated(
          'UploadToken',
          token || 'unknown',
          {},
          { 
            status: 'INVALIDO', 
            ip_address: ipAddress || '', 
            user_agent: userAgent?.substring(0, 255) || '', 
            erro: error.message || 'Erro desconhecido' 
          },
          null
        );
        
        return {
          valid: false,
          message: 'Token de upload inválido ou expirado',
        };
      }
      throw error;
    }
  }

  /**
   * Inicia uma sessão de upload
   * @param token Código do token
   * @param sessionData Dados da sessão (IP, User-Agent, etc.)
   * @returns Informações da sessão iniciada
   */
  async startUploadSession(token: string, sessionData: Partial<UploadSession>): Promise<any> {
    try {
      // Validar o token
      const uploadToken = await this.uploadTokenService.validateToken(token);
      
      // Criar nova sessão
      const session = await this.uploadSessionService.createSession(
        uploadToken.id,
        sessionData,
      );

      // Enviar notificação ao cidadão
      if (uploadToken.cidadao_id && uploadToken.metadata && uploadToken.metadata.enviar_notificacao) {
        try {
          await this.notificacaoService.enviarNotificacao({
            tipo: 'UPLOAD_SESSION_STARTED',
            destinatario_id: uploadToken.cidadao_id,
            titulo: 'Sessão de upload iniciada',
            conteudo: 'Uma nova sessão de upload foi iniciada com seu token',
            dados: {
              token_id: uploadToken.id,
              session_id: session.id,
              ip_address: sessionData.ip_address || '',
            },
          });
        } catch (error) {
          this.logger.warn(`Erro ao enviar notificação de sessão iniciada: ${error.message}`);
        }
      }

      return {
        session_id: session.id,
        token_id: uploadToken.id,
        max_files: uploadToken.max_files,
        expires_at: uploadToken.expires_at,
        required_documents: uploadToken.required_documents,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Erro ao iniciar sessão de upload: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Falha ao iniciar sessão de upload');
    }
  }

  /**
   * Obtém o status atual de uma sessão de upload
   * @param sessionId ID da sessão
   * @returns Status da sessão
   */
  async getSessionStatus(sessionId: string): Promise<any> {
    try {
      const session = await this.uploadSessionService.findById(sessionId);
      
      // Buscar documentos associados à sessão
      const documentos = await this.documentoService.findByMetadata('upload_session_id', sessionId);

      return {
        id: session.id,
        token_id: session.token_id,
        status: session.status,
        started_at: session.started_at,
        last_activity_at: session.last_activity_at,
        completed_at: session.completed_at,
        files_uploaded: session.files_uploaded,
        total_size_bytes: session.total_size_bytes,
        upload_progress: session.upload_progress,
        error_message: session.error_message,
        duration_minutes: session.getDurationInMinutes(),
        progress_percentage: session.getProgressPercentage(),
        documentos: documentos.map(doc => ({
          id: doc.id,
          nome: doc.nome_arquivo,
          tamanho: doc.tamanho,
          formato: doc.mimetype,
          upload_date: doc.data_upload,
        })),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erro ao buscar status da sessão: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Falha ao obter status da sessão');
    }
  }

  /**
   * Atualiza o progresso de upload
   * @param sessionId ID da sessão
   * @param progress Dados de progresso
   */
  async updateUploadProgress(
    sessionId: string,
    progress: Partial<UploadSession['upload_progress']>,
  ): Promise<void> {
    await this.uploadSessionService.updateProgress(sessionId, progress);
  }

  /**
   * Completa uma sessão de upload
   * @param sessionId ID da sessão
   * @param success Indica se o upload foi bem-sucedido
   * @param errorMessage Mensagem de erro (opcional)
   */
  async completeUploadSession(
    sessionId: string,
    success: boolean,
    errorMessage?: string,
  ): Promise<void> {
    try {
      // Completar a sessão
      await this.uploadSessionService.completeSession(sessionId, success, errorMessage);
      
      const session = await this.uploadSessionService.findById(sessionId);
      const token = await this.uploadTokenService.findByToken(session.token_id);
      
      // Se o upload foi bem-sucedido, notificar o usuário dono do token
      if (success && token && token.usuario_id) {
        try {
          const documentos = await this.documentoService.findByMetadata('upload_session_id', sessionId);
          
          await this.notificacaoService.enviarNotificacao({
            tipo: 'UPLOAD_CONCLUIDO',
            destinatario_id: token.usuario_id,
            titulo: 'Upload de documentos concluído',
            conteudo: `${documentos.length} documento(s) foram enviados via EasyUpload`,
            dados: {
              token_id: token.id,
              session_id: sessionId,
              documentos_count: documentos.length,
            },
          });
        } catch (error) {
          this.logger.warn(`Erro ao enviar notificação de conclusão: ${error.message}`);
        }
      }
      
      // Se foi o primeiro uso do token, marcar como utilizado
      if (token) {
        const sessions = await this.uploadSessionService.findByTokenId(token.id);
        const completedSessions = sessions.filter(s => 
          s.status === UploadSessionStatus.COMPLETADA || 
          s.status === UploadSessionStatus.CONCLUIDA
        );
        
        if (completedSessions.length === 1 && completedSessions[0].id === sessionId) {
          await this.uploadTokenService.markTokenAsUsed(token.id);
        }
      }
    } catch (error) {
      this.logger.error(`Erro ao completar sessão: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Falha ao finalizar sessão de upload');
    }
  }

  /**
   * Gera relatório de uploads
   * @param filters Filtros para o relatório
   * @param userId ID do usuário solicitando o relatório
   * @returns Dados do relatório
   */
  async generateUploadReport(filters: any, userId: string): Promise<any> {
    try {
      // Buscar tokens do usuário
      const { items: tokens } = await this.uploadTokenService.listTokens(
        { ...filters, limit: 1000 },
        userId,
      );
      
      // Se não houver tokens, retornar relatório vazio
      if (!tokens.length) {
        return {
          total_tokens: 0,
          total_sessions: 0,
          total_files: 0,
          tokens: [],
        };
      }
      
      const tokenIds = tokens.map(token => token.id);
      
      // Buscar todas as sessões associadas a esses tokens
      const allSessions: UploadSession[] = [];
      for (const tokenId of tokenIds) {
        const sessions = await this.uploadSessionService.findByTokenId(tokenId);
        allSessions.push(...sessions);
      }
      
      // Extrair IDs das sessões
      const sessionIds = allSessions.map(session => session.id);
      
      // Buscar todos os documentos associados às sessões usando o novo método otimizado
      const allDocumentos = await this.documentoService.findByUploadSessionIds(sessionIds);
      
      // Criar um mapa para contagem rápida de arquivos por sessão
      const fileCountBySession = new Map<string, number>();
      allDocumentos.forEach(doc => {
        const sessionId = doc.upload_session_id;
        if (sessionId) {
          fileCountBySession.set(sessionId, (fileCountBySession.get(sessionId) || 0) + 1);
        }
      });
      
      // Compilar dados do relatório
      return {
        total_tokens: tokens.length,
        total_sessions: allSessions.length,
        total_files: allDocumentos.length,
        tokens: tokens.map(token => ({
          id: token.id,
          created_at: token.created_at,
          expires_at: token.expires_at,
          status: token.status,
          sessions: allSessions
            .filter(session => session.token_id === token.id)
            .map(session => ({
              id: session.id,
              status: session.status,
              started_at: session.started_at,
              completed_at: session.completed_at,
              files_count: fileCountBySession.get(session.id) || 0,
              ip_address: session.ip_address,
            })),
        })),
      };
    } catch (error) {
      this.logger.error(`Erro ao gerar relatório: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Falha ao gerar relatório de uploads');
    }
  }

  /**
   * Limpa dados antigos (tokens, sessões)
   * @param days Número de dias para manter dados (mais antigos serão removidos)
   * @returns Informações sobre a limpeza
   */
  async cleanOldData(days: number = 90): Promise<any> {
    try {
      if (days < 30) {
        throw new BadRequestException('O período mínimo para retenção de dados é de 30 dias');
      }

      // Limpar sessões antigas
      const sessionsRemoved = await this.uploadSessionService.cleanupOldSessions(days);
      
      // O TypeORM automaticamente limpará os tokens que não têm mais sessões
      // devido à configuração de CASCADE no relacionamento
      
      return {
        success: true,
        days_retained: days,
        sessions_removed: sessionsRemoved,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Erro ao limpar dados antigos: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Falha ao limpar dados antigos');
    }
  }

  /**
   * Processar tarefas agendadas do módulo
   */
  async processScheduledTasks(): Promise<void> {
    try {
      // Processar tokens expirados
      await this.uploadTokenService.processExpiredTokens();
      
      // Processar sessões inativas
      await this.uploadSessionService.processInactiveSessions();
    } catch (error) {
      this.logger.error(`Erro ao processar tarefas agendadas: ${error.message}`, error.stack);
    }
  }
}
