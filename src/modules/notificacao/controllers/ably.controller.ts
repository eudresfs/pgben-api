import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { NotificationOrchestratorService } from '../services/notification-orchestrator.service';
import { AblyService } from '../services/ably.service';
import { AblyChannelService } from '../services/ably-channel.service';
import { AblyAuthService } from '../services/ably-auth.service';
import {
  IAblyNotificationData,
  NotificationType,
  NotificationPriority,
} from '../interfaces/ably.interface';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { BroadcastNotificationDto } from '../dto/broadcast-notification.dto';

/**
 * Controller para gerenciar operações do Ably
 *
 * Endpoints disponíveis:
 * - Autenticação de clientes
 * - Envio de notificações
 * - Broadcast de mensagens
 * - Monitoramento e estatísticas
 * - Administração de canais
 */
@ApiTags('Ably Notifications')
@Controller('notifications/ably')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AblyController {
  private readonly logger = new Logger(AblyController.name);

  constructor(
    private readonly orchestratorService: NotificationOrchestratorService,
    private readonly ablyService: AblyService,
    private readonly ablyChannelService: AblyChannelService,
    private readonly ablyAuthService: AblyAuthService,
  ) {}

  /**
   * Gera token de autenticação para cliente Ably
   */
  @Post('auth/token')
  @ApiOperation({
    summary: 'Gera token de autenticação para cliente Ably',
    description:
      'Gera um token JWT para autenticação do cliente no Ably com permissões baseadas no perfil do usuário',
  })
  @ApiResponse({
    status: 200,
    description: 'Token gerado com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            expires: { type: 'string' },
            clientId: { type: 'string' },
            capabilities: { type: 'object' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 500, description: 'Erro interno do servidor' })
  async generateAuthToken(@Request() req: any) {
    try {
      const userId = req.user.id;
      const isAdmin =
        req.user.roles?.includes('admin') ||
        req.user.roles?.includes('super_admin');

      this.logger.debug(
        `Gerando token Ably para usuário ${userId}, admin: ${isAdmin}`,
      );

      const result = await this.orchestratorService.generateClientToken(
        userId,
        isAdmin,
      );

      if (!result.success) {
        throw new HttpException(
          {
            message: 'Erro ao gerar token de autenticação',
            error: result.error,
            errorCode: result.errorCode,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      this.logger.error('Erro ao gerar token de autenticação:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          message: 'Erro interno ao gerar token',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Envia notificação para usuário específico
   */
  @Post('send')
  @ApiOperation({
    summary: 'Envia notificação para usuário específico',
    description:
      'Envia uma notificação para um usuário específico usando a melhor estratégia disponível (Ably ou SSE)',
  })
  @ApiResponse({
    status: 200,
    description: 'Notificação enviada com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            notificationId: { type: 'string' },
            deliveryMethod: { type: 'string' },
            timestamp: { type: 'string' },
            executionTime: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 500, description: 'Erro interno do servidor' })
  async sendNotification(
    @Body() createNotificationDto: CreateNotificationDto,
    @Request() req: any,
  ) {
    try {
      const senderId = req.user.id;

      // Monta dados da notificação
      const notification: IAblyNotificationData = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: createNotificationDto.type as NotificationType,
        title: createNotificationDto.title,
        message: createNotificationDto.message,
        priority:
          (createNotificationDto.priority as NotificationPriority) ||
          NotificationPriority.NORMAL,
        data: createNotificationDto.data || {},
        timestamp: new Date(),
        senderId,
        metadata: {
          source: 'api',
          userAgent: req.headers['user-agent'],
          ip: req.ip,
        },
      };

      this.logger.debug(
        `Enviando notificação ${notification.id} para usuário ${createNotificationDto.userId}`,
      );

      const result = await this.orchestratorService.publishNotification(
        createNotificationDto.userId,
        notification,
        {
          forceMethod: createNotificationDto.forceMethod,
          retryOnFailure: createNotificationDto.retryOnFailure,
          priority:
            createNotificationDto.priority === NotificationPriority.URGENT
              ? 'high'
              : createNotificationDto.priority === NotificationPriority.HIGH
                ? 'high'
                : createNotificationDto.priority === NotificationPriority.LOW
                  ? 'low'
                  : 'normal',
        },
      );

      if (!result.success) {
        throw new HttpException(
          {
            message: 'Erro ao enviar notificação',
            error: result.error,
            errorCode: result.errorCode,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return {
        success: true,
        data: {
          notificationId: notification.id,
          deliveryMethod: result.data?.deliveryMethod || 'unknown',
          timestamp: result.timestamp,
          executionTime: result.executionTime,
        },
      };
    } catch (error) {
      this.logger.error('Erro ao enviar notificação:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          message: 'Erro interno ao enviar notificação',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Envia broadcast para múltiplos usuários
   */
  @Post('broadcast')
  @ApiOperation({
    summary: 'Envia broadcast para múltiplos usuários',
    description:
      'Envia uma notificação em broadcast para grupos de usuários (requer permissões administrativas)',
  })
  @ApiResponse({
    status: 200,
    description: 'Broadcast enviado com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            notificationId: { type: 'string' },
            target: { type: 'object' },
            timestamp: { type: 'string' },
            executionTime: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Permissões insuficientes' })
  @ApiResponse({ status: 500, description: 'Erro interno do servidor' })
  async sendBroadcast(
    @Body() broadcastDto: BroadcastNotificationDto,
    @Request() req: any,
  ) {
    try {
      const senderId = req.user.id;

      // Monta dados da notificação
      const notification: IAblyNotificationData = {
        id: `broadcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: broadcastDto.type as NotificationType,
        title: broadcastDto.title,
        message: broadcastDto.message,
        priority:
          (broadcastDto.priority as NotificationPriority) ||
          NotificationPriority.NORMAL,
        data: broadcastDto.data || {},
        timestamp: new Date(),
        senderId,
        metadata: {
          source: 'api_broadcast',
          userAgent: req.headers['user-agent'],
          ip: req.ip,
          target: broadcastDto.target,
        },
      };

      this.logger.debug(
        `Enviando broadcast ${notification.id} para target:`,
        broadcastDto.target,
      );

      const result = await this.orchestratorService.publishBroadcast(
        notification,
        broadcastDto.target,
        {
          forceMethod: broadcastDto.forceMethod,
          excludeUsers: broadcastDto.excludeUsers,
        },
      );

      if (!result.success) {
        throw new HttpException(
          {
            message: 'Erro ao enviar broadcast',
            error: result.error,
            errorCode: result.errorCode,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return {
        success: true,
        data: {
          notificationId: notification.id,
          target: broadcastDto.target,
          timestamp: result.timestamp,
          executionTime: result.executionTime,
        },
      };
    } catch (error) {
      this.logger.error('Erro ao enviar broadcast:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          message: 'Erro interno ao enviar broadcast',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtém estatísticas do sistema de notificações
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Obtém estatísticas do sistema de notificações',
    description:
      'Retorna estatísticas detalhadas do Ably e do orquestrador de notificações (requer permissões administrativas)',
  })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas obtidas com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            orchestrator: { type: 'object' },
            ably: { type: 'object' },
            channels: { type: 'object' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Permissões insuficientes' })
  async getStats() {
    try {
      const orchestratorStats = this.orchestratorService.getOrchestratorStats();

      return {
        success: true,
        data: {
          orchestrator: orchestratorStats,
          ably: this.ablyService.getMetrics(),
          channels: this.ablyChannelService.getAllChannelStats(),
          timestamp: new Date(),
        },
      };
    } catch (error) {
      this.logger.error('Erro ao obter estatísticas:', error);

      throw new HttpException(
        {
          message: 'Erro interno ao obter estatísticas',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Verifica saúde do sistema Ably
   */
  @Get('health')
  @ApiOperation({
    summary: 'Verifica saúde do sistema Ably',
    description:
      'Endpoint de health check para verificar o status do Ably e dos sistemas de notificação',
  })
  @ApiResponse({
    status: 200,
    description: 'Status de saúde obtido com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            ably: { type: 'object' },
            orchestrator: { type: 'object' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  })
  async getHealth() {
    try {
      const ablyHealth = {
        isHealthy: this.ablyService.isHealthy(),
        connectionState: this.ablyService.getConnectionStatus(),
      };

      const orchestratorStats = this.orchestratorService.getOrchestratorStats();

      return {
        success: true,
        data: {
          ably: ablyHealth,
          orchestrator: {
            ablyHealthy: orchestratorStats.ablyHealthy,
            sseHealthy: orchestratorStats.sseHealthy,
            circuitBreakerState: orchestratorStats.circuitBreakerState,
            failureCount: orchestratorStats.failureCount,
          },
          timestamp: new Date(),
        },
      };
    } catch (error) {
      this.logger.error('Erro ao verificar saúde:', error);

      throw new HttpException(
        {
          message: 'Erro interno ao verificar saúde',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Lista canais ativos
   */
  @Get('channels')
  @ApiOperation({
    summary: 'Lista canais ativos do Ably',
    description:
      'Retorna lista de canais ativos com suas estatísticas (requer permissões administrativas)',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filtrar por tipo de canal',
  })
  @ApiResponse({
    status: 200,
    description: 'Canais listados com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            channels: { type: 'array' },
            total: { type: 'number' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Permissões insuficientes' })
  async getChannels(@Query('type') type?: string) {
    try {
      const allChannelStats = this.ablyChannelService.getAllChannelStats();

      let channels = Object.entries(allChannelStats).map(([name, stats]) => ({
        name,
        ...stats,
      }));

      // Filtrar por tipo se especificado
      if (type) {
        channels = channels.filter(
          (channel) =>
            channel.name.startsWith(type) || channel.name.includes(type),
        );
      }

      return {
        success: true,
        data: {
          channels,
          total: channels.length,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      this.logger.error('Erro ao listar canais:', error);

      throw new HttpException(
        {
          message: 'Erro interno ao listar canais',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Força mudança de método de entrega
   */
  @Post('switch-method')
  @ApiOperation({
    summary: 'Força mudança de método de entrega',
    description:
      'Força a mudança do método de entrega de notificações (requer permissões administrativas)',
  })
  @ApiResponse({
    status: 200,
    description: 'Método alterado com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        timestamp: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Permissões insuficientes' })
  async switchDeliveryMethod(
    @Body() body: { method: 'ably' | 'sse'; reason?: string },
    @Request() req: any,
  ) {
    try {
      const { method, reason } = body;

      if (!method || !['ably', 'sse'].includes(method)) {
        throw new HttpException(
          {
            message: 'Método inválido. Use "ably" ou "sse"',
            error: 'INVALID_METHOD',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const adminReason = `Alterado por ${req.user.email} via API. ${reason || ''}`;

      await this.orchestratorService.switchDeliveryMethod(method, adminReason);

      this.logger.log(
        `Método de entrega alterado para ${method} por ${req.user.email}`,
      );

      return {
        success: true,
        message: `Método de entrega alterado para ${method}`,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Erro ao alterar método de entrega:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          message: 'Erro interno ao alterar método',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
