import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { WhatsAppFlowSession } from '../entities/whatsapp-flow-session.entity';
import { WhatsAppFlowLog } from '../entities/whatsapp-flow-log.entity';
import { CryptographyService } from './cryptography.service';
import { ScreenHandlerService } from './screen-handler.service';
import {
  WhatsAppFlowRequestDto,
} from '../dto/whatsapp-flow-request.dto';
import {
  WhatsAppFlowResponseDto,
  EncryptedFlowResponseDto,
  PingResponseDto,
} from '../dto/whatsapp-flow-response.dto';
import { ScreenType } from '../enums/screen-type.enum';
import { ActionType } from '../enums/action-type.enum';
import { AuditEventEmitter, AuditEventType } from '../../auditoria';
import { SYSTEM_USER_UUID } from '../../../shared/constants/system.constants';

/**
 * Serviço principal do WhatsApp Flows
 *
 * Responsável por:
 * - Orquestrar todo o fluxo de comunicação com WhatsApp
 * - Gerenciar criptografia/descriptografia de dados
 * - Coordenar handlers de tela
 * - Persistir sessões e logs
 * - Integrar com módulos de auditoria
 */
import { IWhatsAppFlowsService } from '../interfaces';

@Injectable()
export class WhatsAppFlowsService implements IWhatsAppFlowsService {
  private readonly logger = new Logger(WhatsAppFlowsService.name);

  constructor(
    @InjectRepository(WhatsAppFlowSession)
    private readonly sessionRepository: Repository<WhatsAppFlowSession>,
    @InjectRepository(WhatsAppFlowLog)
    private readonly logRepository: Repository<WhatsAppFlowLog>,
    private readonly cryptographyService: CryptographyService,
    private readonly screenHandlerService: ScreenHandlerService,
    private readonly configService: ConfigService,
    private readonly auditEmitter: AuditEventEmitter,
  ) {
    this.logger.log('WhatsAppFlowsService inicializado');
  }

  /**
   * Processa uma requisição não criptografada do WhatsApp Flow
   * @param request Dados da requisição
   * @returns Resposta para o WhatsApp
   */
  async processRequest(
    request: WhatsAppFlowRequestDto,
  ): Promise<WhatsAppFlowResponseDto> {
    try {
      this.logger.debug('Processando requisição não criptografada');
      
      // Validar estrutura da requisição
      if (!request.decrypted_data?.screen || !request.decrypted_data?.action) {
        throw new BadRequestException('Requisição inválida: screen e action são obrigatórios');
      }
      
      // Processar através do handler de tela
      const response = await this.screenHandlerService.handleScreenRequest(request);
      
      this.logger.debug(`Requisição processada com sucesso - Tela: ${request.decrypted_data.screen}, Ação: ${request.decrypted_data.action}`);
      
      return response;
    } catch (error) {
      this.logger.error(`Erro ao processar requisição: ${error.message}`);
      
      // Sempre retornar 200 com erro no data
      return {
        version: '3.0',
        action: ActionType.DATA_EXCHANGE,
        data: {
          systemError: 'Erro interno do sistema. Tente novamente em alguns instantes.'
        }
      };
    }
  }

  /**
   * Processa uma requisição criptografada do WhatsApp Flow
   * @param encryptedRequest Dados criptografados da requisição
   * @returns Resposta criptografada para o WhatsApp
   */
  async processEncryptedRequest(
    encryptedRequest: WhatsAppFlowRequestDto,
  ): Promise<EncryptedFlowResponseDto> {
    const startTime = Date.now();
    let sessionId: string | undefined;
    let decryptedRequest: any;

    try {
      this.logger.debug('Iniciando processamento de requisição criptografada');

      // 1. Descriptografar dados usando nova assinatura baseada no exemplo da Meta
      const decryptResult = this.cryptographyService.decryptRequest({
        encrypted_aes_key: encryptedRequest.encrypted_aes_key,
        encrypted_flow_data: encryptedRequest.encrypted_flow_data,
        initial_vector: encryptedRequest.initial_vector,
      });
      
      // Extrair dados descriptografados e chaves para criptografia da resposta
      decryptedRequest = decryptResult.decryptedBody;
      const aesKeyBuffer = decryptResult.aesKeyBuffer;
      const initialVectorBuffer = decryptResult.initialVectorBuffer;
      
      // Adicionar dados descriptografados ao request
      encryptedRequest.decrypted_data = decryptedRequest;

      this.logger.debug(
        `Requisição descriptografada - Tela: ${encryptedRequest.decrypted_data?.screen}, Ação: ${encryptedRequest.decrypted_data?.action}`,
      );

      // 2. Validar estrutura da requisição
      this.validateRequest(encryptedRequest);

      // 3. Tratamento especial para ação PING - não requer sessão nem screen
      if (encryptedRequest.decrypted_data?.action === ActionType.PING) {
        const pingResponse: PingResponseDto = {
          version: '3.0',
          action: ActionType.PING,
          data: {
            status: "active",
            timestamp: new Date().toISOString(),
          },
        };

        // Criptografar resposta do ping
        const encryptedResponse = this.cryptographyService.encryptResponse(
          pingResponse,
          aesKeyBuffer,
          initialVectorBuffer,
        );

        const processingTime = Date.now() - startTime;
        this.logger.log(`PING processado com sucesso em ${processingTime}ms`);

        return {
          encrypted_flow_data: encryptedResponse,
        };
      }

      // 4. Gerenciar sessão (apenas para ações que não sejam PING)
      const session = await this.manageSession(encryptedRequest);
      sessionId = session.id;

      // 5. Registrar log de entrada
      await this.createLog(
        session,
        encryptedRequest.decrypted_data?.action || 'UNKNOWN',
        {
          screen: encryptedRequest.decrypted_data?.screen,
          action: encryptedRequest.decrypted_data?.action,
          hasData: !!encryptedRequest.decrypted_data?.data,
        },
        null,
      );

      // 6. Processar através do handler de tela
      const response = await this.screenHandlerService.handleScreenRequest(
        encryptedRequest,
      );

      // 7. Atualizar sessão com resposta
      await this.updateSession(session, encryptedRequest, response);

      // 8. Registrar log de saída
      await this.createLog(
        session,
        'RESPONSE_SENT',
        {
          action: response.action,
          success: true,
        },
        null,
      );

      // 9. Criptografar resposta usando o método correto que retorna Base64
      const encryptedResponse = this.cryptographyService.encryptResponse(
        response,
        aesKeyBuffer,
        initialVectorBuffer,
      );

      // 10. Registrar métricas
      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Requisição processada com sucesso em ${processingTime}ms - Sessão: ${sessionId}`,
      );

      // Retornar diretamente a string Base64 criptografada
      return {
        encrypted_flow_data: encryptedResponse,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(
        `Erro ao processar requisição: ${error.message} - Tempo: ${processingTime}ms`,
      );

      // Registrar log de erro se temos sessão
      if (sessionId) {
        try {
          const session = await this.sessionRepository.findOne({
            where: { id: sessionId },
          });
          if (session) {
            await this.createLog(
              session,
              encryptedRequest.decrypted_data?.action || 'ERROR',
              {
                error: error.message,
                stack: error.stack,
                processingTime,
              },
              error.message,
            );
          }
        } catch (logError) {
          this.logger.error(
            `Erro ao registrar log de erro: ${logError.message}`,
          );
        }
      }

      // SEMPRE retornar resposta de sucesso (200) com erro nos dados
      // Tentar usar as chaves se disponíveis, senão usar método legado
      let aesKeyBuffer: Buffer | undefined;
      let initialVectorBuffer: Buffer | undefined;
      
      try {
        if (encryptedRequest?.encrypted_aes_key && encryptedRequest?.initial_vector) {
          const decryptResult = this.cryptographyService.decryptRequest({
            encrypted_aes_key: encryptedRequest.encrypted_aes_key,
            encrypted_flow_data: encryptedRequest.encrypted_flow_data,
            initial_vector: encryptedRequest.initial_vector,
          });
          aesKeyBuffer = decryptResult.aesKeyBuffer;
          initialVectorBuffer = decryptResult.initialVectorBuffer;
        }
      } catch (keyError) {
        this.logger.warn('Não foi possível extrair chaves para criptografia de erro, usando método legado');
      }
      
      return await this.createErrorResponse(error, aesKeyBuffer, initialVectorBuffer);
    }
  }

  /**
   * Gerencia a sessão do flow
   * @param request Dados da requisição
   * @returns Sessão ativa ou nova
   */
  private async manageSession(
    request: WhatsAppFlowRequestDto,
  ): Promise<WhatsAppFlowSession> {
    try {
      // O flow_token deve vir do WhatsApp na requisição
      const flowToken = request.decrypted_data?.flow_token;
      
      if (!flowToken) {
        throw new BadRequestException('flow_token é obrigatório');
      }

      // Buscar sessão existente pelo flow_token do WhatsApp
      const existingSession = await this.sessionRepository.findOne({
        where: {
          flow_token: flowToken,
        },
      });

      if (existingSession) {
        // Verificar se a sessão não expirou
        if (existingSession.isExpired()) {
          this.logger.warn(`Sessão expirada encontrada: ${existingSession.id}`);
          // Remover sessão expirada
          await this.sessionRepository.remove(existingSession);
        } else {
          // Atualizar última atividade
          existingSession.updated_at = new Date();
          await this.sessionRepository.save(existingSession);
          this.logger.debug(`Sessão existente encontrada: ${existingSession.id}`);
          return existingSession;
        }
      }

      // Criar nova sessão usando o flow_token do WhatsApp
      const newSession = this.sessionRepository.create({
        flow_token: flowToken, // Usar o token enviado pelo WhatsApp
        current_screen: ScreenType.INICIO,
        session_data: {},
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
      });

      const savedSession = await this.sessionRepository.save(newSession);
      this.logger.debug(`Nova sessão criada com flow_token do WhatsApp: ${savedSession.id}`);

      return savedSession;
    } catch (error) {
      this.logger.error(`Erro ao gerenciar sessão: ${error.message}`);
      throw new InternalServerErrorException(
        'Erro interno ao gerenciar sessão',
      );
    }
  }

  /**
   * Atualiza a sessão com dados da requisição e resposta
   * @param session Sessão a ser atualizada
   * @param request Dados da requisição
   * @param response Dados da resposta
   */
  private async updateSession(
    session: WhatsAppFlowSession,
    request: WhatsAppFlowRequestDto,
    response: WhatsAppFlowResponseDto,
  ): Promise<void> {
    try {
      // Atualizar tela atual
      session.current_screen = request.decrypted_data?.screen as ScreenType;
      session.updated_at = new Date();

      // Atualizar metadados da sessão se necessário
      // session.metadata será implementado conforme necessidade

      // Nota: ActionType.TERMINATE não é mais usado no WhatsApp Flows
      // As sessões expiram automaticamente baseado no tempo de vida configurado

      await this.sessionRepository.save(session);
    } catch (error) {
      this.logger.error(`Erro ao atualizar sessão: ${error.message}`);
      // Não propagar erro para não interromper o fluxo
    }
  }

  /**
   * Cria um log de atividade da sessão
   * @param session Sessão relacionada
   * @param action Ação realizada
   * @param data Dados da ação
   * @param error Mensagem de erro (se houver)
   */
  private async createLog(
    session: WhatsAppFlowSession,
    action: string,
    data: any,
    error: string | null,
  ): Promise<void> {
    try {
      const log = this.logRepository.create({
        session_id: session.id,
        screen_type: data.screen as ScreenType,
        action_type: data.action as ActionType,
        action_description: `Processamento de ${data.action} na tela ${data.screen}`,
        request_data: data,
        response_data: null,
        success: !error,
      });

      await this.logRepository.save(log);
    } catch (logError) {
      this.logger.error(`Erro ao criar log: ${logError.message}`);
      // Não propagar erro para não interromper o fluxo
    }
  }

  /**
   * Cria uma resposta de erro criptografada
   * SEMPRE retorna status 200 com detalhes do erro no campo data
   * @param error Erro ocorrido
   * @param aesKeyBuffer Buffer da chave AES (opcional para fallback)
   * @param initialVectorBuffer Buffer do IV (opcional para fallback)
   * @returns Resposta de erro criptografada
   */
  private async createErrorResponse(
    error: any,
    aesKeyBuffer?: Buffer,
    initialVectorBuffer?: Buffer,
  ): Promise<EncryptedFlowResponseDto> {
    try {
      // Determinar mensagem de erro amigável para o usuário
      let errorMessage = 'Ocorreu um erro inesperado. Tente novamente.';
      let errorField = 'systemError';

      if (error instanceof BadRequestException) {
        errorMessage = this.sanitizeErrorMessage(error.message);
        errorField = 'validationError';
      } else if (error.message?.includes('flow_token')) {
        errorMessage = 'Sessão inválida. Reinicie o fluxo.';
        errorField = 'sessionError';
      } else if (error.message?.includes('constraint')) {
        errorMessage = 'Dados inválidos fornecidos.';
        errorField = 'dataError';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Tempo limite excedido. Tente novamente.';
        errorField = 'timeoutError';
      }

      // Resposta sempre com ação DATA_EXCHANGE para manter o fluxo ativo
      const errorResponse: WhatsAppFlowResponseDto = {
        version: '3.0',
        action: ActionType.DATA_EXCHANGE,
        data: {
          // Estrutura de erro no formato esperado pelo WhatsApp Flows
          [errorField]: errorMessage,
          // Campos adicionais para debugging (apenas em desenvolvimento)
          ...(process.env.NODE_ENV === 'development' && {
            debugInfo: {
              originalError: error.message,
              timestamp: new Date().toISOString(),
            },
          }),
        },
      };

      // Usar método correto de criptografia se temos as chaves
      let encryptedResponse: string;
      if (aesKeyBuffer && initialVectorBuffer) {
        encryptedResponse = this.cryptographyService.encryptResponse(
          errorResponse,
          aesKeyBuffer,
          initialVectorBuffer,
        );
      } else {
        // Fallback para método legado
        const legacyResponse = this.cryptographyService.encryptResponseLegacy(errorResponse);
        encryptedResponse = legacyResponse.encrypted_data;
      }

      return {
        encrypted_flow_data: encryptedResponse,
      };
    } catch (encryptError) {
      this.logger.error(
        `Erro ao criptografar resposta de erro: ${encryptError.message}`,
      );

      // Fallback: resposta de erro mínima
      const fallbackResponse: WhatsAppFlowResponseDto = {
        version: '3.0',
        action: ActionType.DATA_EXCHANGE,
        data: {
          systemError: 'Erro interno do sistema. Contate o suporte.',
        },
      };

      try {
        // Tentar usar método correto primeiro
        let encryptedFallback: string;
        if (aesKeyBuffer && initialVectorBuffer) {
          encryptedFallback = this.cryptographyService.encryptResponse(
            fallbackResponse,
            aesKeyBuffer,
            initialVectorBuffer,
          );
        } else {
          const legacyFallback = this.cryptographyService.encryptResponseLegacy(fallbackResponse);
          encryptedFallback = legacyFallback.encrypted_data;
        }

        return {
          encrypted_flow_data: encryptedFallback,
        };
      } catch (finalError) {
        this.logger.error(`Erro crítico na criptografia: ${finalError.message}`);
        // Último recurso: resposta vazia (o WhatsApp tratará como erro)
        return {
          encrypted_flow_data: '',
        };
      }
    }
  }

  /**
   * Valida a estrutura da requisição
   * @param request Dados da requisição
   */
  private validateRequest(request: WhatsAppFlowRequestDto): void {
    const data = request.decrypted_data;

    // Validar versão
    if (!data?.version || data.version !== '3.0') {
      throw new BadRequestException('Versão não suportada ou ausente');
    }

    // Validar ação
    if (!data?.action || !Object.values(ActionType).includes(data.action as ActionType)) {
      throw new BadRequestException('Ação inválida ou ausente');
    }

    // Validar tela (obrigatória apenas para DATA_EXCHANGE e INIT)
    // PING e BACK não requerem screen
    if (
      (data.action === ActionType.DATA_EXCHANGE || data.action === ActionType.INIT) &&
      !data.screen
    ) {
      throw new BadRequestException(
        `Tela é obrigatória para ação ${data.action}`,
      );
    }
  }

  /**
   * Gera um token único para o flow
   * @returns Token gerado
   */
  private generateFlowToken(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    return `flow_${timestamp}_${random}`;
  }

  /**
   * Extrai o número de telefone da requisição
   * @param request Dados da requisição
   * @returns Número de telefone ou null
   */
  private extractPhoneNumber(request: WhatsAppFlowRequestDto): string | null {
    // O número de telefone pode estar nos dados da sessão ou ser extraído do contexto
    return request.decrypted_data?.data?.phone_number || null;
  }

  /**
   * Sanitiza mensagens de erro para não expor informações sensíveis
   * @param message Mensagem original
   * @returns Mensagem sanitizada
   */
  private sanitizeErrorMessage(message: string): string {
    // Remover informações sensíveis das mensagens de erro
    const sensitivePatterns = [
      /password/gi,
      /token/gi,
      /key/gi,
      /secret/gi,
      /cpf/gi,
      /\d{11}/g, // CPF numbers
      /\d{3}\.\d{3}\.\d{3}-\d{2}/g, // Formatted CPF
    ];

    let sanitized = message;
    sensitivePatterns.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });

    return sanitized;
  }

  /**
   * Busca sessões ativas por critérios
   * @param criteria Critérios de busca
   * @returns Lista de sessões
   */
  async findActiveSessions(criteria: {
    phoneNumber?: string;
    currentScreen?: ScreenType;
    limit?: number;
  }): Promise<WhatsAppFlowSession[]> {
    try {
      const queryBuilder = this.sessionRepository
        .createQueryBuilder('session')
        .where('session.isActive = :isActive', { isActive: true })
        .orderBy('session.lastActivity', 'DESC');

      if (criteria.phoneNumber) {
        queryBuilder.andWhere('session.phoneNumber = :phoneNumber', {
          phoneNumber: criteria.phoneNumber,
        });
      }

      if (criteria.currentScreen) {
        queryBuilder.andWhere('session.currentScreen = :currentScreen', {
          currentScreen: criteria.currentScreen,
        });
      }

      if (criteria.limit) {
        queryBuilder.limit(criteria.limit);
      }

      return await queryBuilder.getMany();
    } catch (error) {
      this.logger.error(`Erro ao buscar sessões ativas: ${error.message}`);
      throw new InternalServerErrorException(
        'Erro ao buscar sessões ativas',
      );
    }
  }

  /**
   * Finaliza sessões inativas
   * @param inactiveMinutes Minutos de inatividade para considerar sessão expirada
   * @returns Número de sessões finalizadas
   */
  async cleanupInactiveSessions(inactiveMinutes: number = 30): Promise<number> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setMinutes(cutoffTime.getMinutes() - inactiveMinutes);

      const result = await this.sessionRepository
        .createQueryBuilder()
        .update(WhatsAppFlowSession)
        .set({
          // Sessão será marcada como expirada através do expires_at
          expires_at: new Date(), // Expira imediatamente
        })
        .where('expires_at > :now', { now: new Date() })
        .andWhere('lastActivity < :cutoffTime', { cutoffTime })
        .execute();

      const cleanedCount = result.affected || 0;
      if (cleanedCount > 0) {
        this.logger.log(
          `${cleanedCount} sessões inativas foram finalizadas`,
        );
      }

      return cleanedCount;
    } catch (error) {
      this.logger.error(
        `Erro ao limpar sessões inativas: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Erro ao limpar sessões inativas',
      );
    }
  }

  /**
   * Obtém estatísticas das sessões
   * @returns Estatísticas das sessões
   */
  async getSessionStats(): Promise<{
    activeSessions: number;
    totalSessions: number;
    sessionsByScreen: Record<string, number>;
    averageSessionDuration: number;
  }> {
    try {
      const [activeSessions, totalSessions, sessionsByScreen, avgDuration] =
        await Promise.all([
          this.sessionRepository.count({ 
             where: { 
               expires_at: MoreThan(new Date()) // Sessões não expiradas
             } 
           }),
          this.sessionRepository.count(),
          this.getSessionsByScreen(),
          this.getAverageSessionDuration(),
        ]);

      return {
        activeSessions,
        totalSessions,
        sessionsByScreen,
        averageSessionDuration: avgDuration,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao obter estatísticas de sessões: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Erro ao obter estatísticas de sessões',
      );
    }
  }

  /**
   * Obtém contagem de sessões por tela
   * @returns Contagem por tela
   */
  private async getSessionsByScreen(): Promise<Record<string, number>> {
    const result = await this.sessionRepository
      .createQueryBuilder('session')
      .select('session.currentScreen', 'screen')
      .addSelect('COUNT(*)', 'count')
      .where('session.isActive = :isActive', { isActive: true })
      .groupBy('session.currentScreen')
      .getRawMany();

    return result.reduce((acc, item) => {
      acc[item.screen] = parseInt(item.count);
      return acc;
    }, {});
  }

  /**
   * Calcula duração média das sessões finalizadas
   * @returns Duração média em minutos
   */
  private async getAverageSessionDuration(): Promise<number> {
    const result = await this.sessionRepository
      .createQueryBuilder('session')
      .select(
        'AVG(EXTRACT(EPOCH FROM (session.finishedAt - session.createdAt)) / 60)',
        'avgDuration',
      )
      .where('session.finishedAt IS NOT NULL')
      .getRawOne();

    return parseFloat(result?.avgDuration || '0');
  }
}