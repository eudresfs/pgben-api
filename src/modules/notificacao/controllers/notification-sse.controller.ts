import {
  Controller,
  Res,
  Sse,
  Get,
  Post,
  Body,
  Request,
  Param,
  Query,
  UseGuards,
  Logger,
  ParseUUIDPipe,
} from '@nestjs/common';
import { SseService } from '../services/sse.service';
import { SseEventStoreService } from '../services/sse-event-store.service';
import { SseGuard } from '../guards/sse.guard';
import {
  SseRateLimitGuard,
  SseRateLimit,
  SseRateLimitAdmin,
} from '../guards/sse-rate-limit.guard';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { Observable } from 'rxjs';
import {
  EventReplayRequest,
  EventReplayResponse,
  HeartbeatResponse,
} from '../interfaces/sse-notification.interface';

@ApiTags('Notificações SSE')
@Controller('notificacao/sse')
@ApiBearerAuth()
export class NotificationSseController {
  private readonly logger = new Logger(NotificationSseController.name);

  constructor(
    private readonly sseService: SseService,
    private readonly sseEventStoreService: SseEventStoreService,
  ) {}

  /**
   * SSE stream de notificações em tempo real
   */
  @Sse('')
  @UseGuards(SseRateLimitGuard, SseGuard)
  @SseRateLimit({ profile: 'default' })
  @ApiOperation({ summary: 'Conexão SSE para notificações em tempo real' })
  @ApiResponse({
    status: 200,
    description: 'Conexão SSE estabelecida com sucesso',
  })
  @ApiResponse({ status: 429, description: 'Rate limit excedido' })
  async sseNotifications(
    @Request() req,
    @Res({ passthrough: true }) res,
  ): Promise<Observable<any>> {
    // Headers de robustez SSE
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Nginx

    const userId = req.user.id;
    this.logger.log(`SSE conectado: ${userId}`);
    return this.sseService.createConnection(userId, req);
  }

  /**
   * Estatísticas globais de conexões SSE
   */
  @Get('stats')
  @UseGuards(SseRateLimitGuard, JwtAuthGuard, RolesGuard)
  @SseRateLimitAdmin()
  @ApiOperation({ summary: 'Obter estatísticas das conexões SSE' })
  @ApiResponse({ status: 200, description: 'Estatísticas obtidas com sucesso' })
  @ApiResponse({ status: 429, description: 'Rate limit excedido' })
  async getSseStats() {
    return this.sseService.getLocalConnectionStats();
  }

  /**
   * Recuperar eventos perdidos usando Last-Event-ID
   */
  @Post('replay')
  @UseGuards(SseRateLimitGuard, JwtAuthGuard)
  @SseRateLimit({ profile: 'default' })
  @ApiOperation({ summary: 'Recuperar eventos perdidos usando Last-Event-ID' })
  @ApiResponse({
    status: 200,
    description: 'Eventos recuperados com sucesso',
    type: 'object',
  })
  @ApiResponse({ status: 429, description: 'Rate limit excedido' })
  @ApiBody({
    description: 'Dados para recuperação de eventos',
    schema: {
      type: 'object',
      properties: {
        lastEventId: {
          type: 'string',
          description: 'ID do último evento recebido',
        },
        maxEvents: {
          type: 'number',
          description: 'Número máximo de eventos para recuperar (padrão: 50)',
        },
      },
    },
  })
  async replayEvents(
    @Request() req: any,
    @Body() replayRequest: EventReplayRequest,
  ): Promise<EventReplayResponse> {
    const userId = req.user.id;

    this.logger.log(
      `Replay de eventos solicitado para usuário ${userId}, lastEventId: ${replayRequest.lastEventId}`,
    );

    try {
      const events = await this.sseService.getStoredEvents(
        replayRequest.lastEventId,
        userId,
      );

      return {
        events: events.events,
        totalEvents: events.totalEvents,
        hasMore: events.hasMore,
        lastEventId: events.lastEventId,
        timestamp: events.timestamp,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao recuperar eventos para usuário ${userId}:`,
        error,
      );
      return {
        events: [],
        totalEvents: 0,
        hasMore: false,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Obter o ID do último evento para o usuário
   */
  @Get('last-event-id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obter o ID do último evento para o usuário' })
  @ApiResponse({
    status: 200,
    description: 'ID do último evento obtido com sucesso',
  })
  async getLastEventId(@Request() req: any) {
    const userId = req.user.id;

    try {
      const lastEventId =
        await this.sseEventStoreService.getLastEventId(userId);
      return {
        userId,
        lastEventId,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao obter último event ID para usuário ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Estatísticas locais de conexões SSE (apenas desta instância)
   */
  @Get('stats/local')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Obter estatísticas locais das conexões SSE' })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas locais retornadas com sucesso',
  })
  async getLocalSseStats() {
    return this.sseService.getLocalConnectionStats();
  }

  /**
   * Verificar status de conexão SSE de um usuário
   */
  @Get('status/:userId')
  @UseGuards(SseRateLimitGuard, JwtAuthGuard, RolesGuard)
  @SseRateLimitAdmin()
  @ApiOperation({ summary: 'Verificar status de conexão SSE de um usuário' })
  @ApiResponse({
    status: 200,
    description: 'Status de conexão retornado com sucesso',
  })
  @ApiResponse({ status: 429, description: 'Rate limit excedido' })
  async getUserSseStatus(@Param('userId', ParseUUIDPipe) userId: string) {
    const isConnected = await this.sseService.hasActiveConnections(userId);
    const connectionCount =
      await this.sseService.getUserTotalConnectionCount(userId);
    const localConnectionCount =
      this.sseService.getUserLocalConnectionCount(userId);
    return {
      userId,
      isConnected,
      connectionCount,
      localConnectionCount,
    };
  }

  /**
   * Processar resposta de heartbeat do cliente
   */
  @Post('heartbeat/:connectionId')
  @UseGuards(SseRateLimitGuard, JwtAuthGuard)
  @SseRateLimit({ profile: 'default' })
  @ApiOperation({ summary: 'Processar resposta de heartbeat do cliente' })
  @ApiResponse({
    status: 200,
    description: 'Resposta de heartbeat processada com sucesso',
  })
  @ApiResponse({ status: 429, description: 'Rate limit excedido' })
  @ApiBody({ type: Object, description: 'Dados da resposta de heartbeat' })
  async processHeartbeatResponse(
    @Param('connectionId') connectionId: string,
    @Body() response: HeartbeatResponse,
  ) {
    await this.sseService.processHeartbeatResponse(connectionId, response);
    return { success: true };
  }

  /**
   * Obter estatísticas de heartbeat para uma conexão
   */
  @Get('heartbeat/:connectionId/stats')
  @UseGuards(SseRateLimitGuard, JwtAuthGuard)
  @SseRateLimit({ profile: 'default' })
  @ApiOperation({ summary: 'Obter estatísticas de heartbeat para uma conexão' })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas de heartbeat retornadas com sucesso',
  })
  @ApiResponse({ status: 429, description: 'Rate limit excedido' })
  async getHeartbeatStats(@Param('connectionId') connectionId: string) {
    return this.sseService.getHeartbeatStats(connectionId);
  }

  /**
   * Health check do serviço SSE
   */
  @Get('health')
  @ApiOperation({ summary: 'Health check do serviço SSE' })
  @ApiResponse({ status: 200, description: 'Status de saúde do serviço SSE' })
  async getHealthCheck() {
    return this.sseService.healthCheck();
  }
}
