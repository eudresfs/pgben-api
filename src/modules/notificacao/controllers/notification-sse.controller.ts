import {
  Controller,
  Sse,
  Get,
  Request,
  Param,
  UseGuards,
  Logger,
  ParseUUIDPipe,
} from '@nestjs/common';
import { SseService } from '../services/sse.service';
import { SseGuard } from '../guards/sse.guard';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Observable } from 'rxjs';

@ApiTags('Notificações SSE')
@Controller('notificacao/sse')
@ApiBearerAuth()
export class NotificationSseController {
  private readonly logger = new Logger(NotificationSseController.name);

  constructor(private readonly sseService: SseService) {}

  /**
   * SSE stream de notificações em tempo real
   */
  @Sse('')
  @UseGuards(SseGuard)
  @ApiOperation({ summary: 'Conexão SSE para notificações em tempo real' })
  @ApiResponse({ status: 200, description: 'Conexão SSE estabelecida com sucesso' })
  sseNotifications(@Request() req): Observable<any> {
    const userId = req.user.id;
    this.logger.log(`SSE conectado: ${userId}`);
    return this.sseService.createConnection(userId, req);
  }

  /**
   * Estatísticas globais de conexões SSE
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Obter estatísticas das conexões SSE' })
  @ApiResponse({ status: 200, description: 'Estatísticas retornadas com sucesso' })
  async getSseStats() {
    return this.sseService.getConnectionStats();
  }

  /**
   * Status de conexão SSE de um usuário
   */
  @Get('status/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Verificar status de conexão SSE de um usuário' })
  @ApiResponse({ status: 200, description: 'Status de conexão retornado com sucesso' })
  async getUserSseStatus(@Param('userId', ParseUUIDPipe) userId: string) {
    const isConnected = this.sseService.isUserConnected(userId);
    const connectionCount = this.sseService.getUserConnectionCount(userId);
    return {
      userId,
      isConnected,
      connectionCount,
    };
  }
}
