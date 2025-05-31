import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  UseGuards,
  Logger,
  Request,
  Sse,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificacaoService } from '../services/notificacao.service';
import { NotificationManagerService } from '../services/notification-manager.service';
import { SseService } from '../services/sse.service';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { SseGuard } from '../guards/sse.guard';
import { Roles } from '../../../auth/decorators/role.decorator';
import { ROLES } from '../../../shared/constants/roles.constants';
import { StatusNotificacaoProcessamento } from '../entities/notification.entity';
import { CreateNotificationDto } from '../dtos/create-notification.dto';

/**
 * Controlador de Notificações
 *
 * Responsável por gerenciar as rotas relacionadas às notificações
 * enviadas aos usuários do sistema
 */
@ApiTags('Notificações')
@Controller('v1/notificacao')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NotificacaoController {
  private readonly logger = new Logger(NotificacaoController.name);

  constructor(
    private readonly notificacaoService: NotificacaoService,
    private readonly notificationManagerService: NotificationManagerService,
    private readonly sseService: SseService,
  ) {}

  /**
   * Cria e envia uma nova notificação
   */
  @Post()
  @Roles(
    ROLES.ADMIN,
    ROLES.GESTOR,
    ROLES.COORDENADOR,
    ROLES.TECNICO,
  )
  @ApiOperation({ summary: 'Criar e enviar uma nova notificação' })
  @ApiResponse({
    status: 201,
    description: 'Notificação criada e enviada com sucesso',
  })
  async criarNotificacao(@Body() createNotificationDto: CreateNotificationDto) {
    this.logger.log(
      `Criando nova notificação para destinatário: ${createNotificationDto.destinatario_id}`,
    );
    return this.notificationManagerService.criarNotificacao(
      createNotificationDto,
    );
  }

  /**
   * Lista todas as notificações do usuário autenticado
   */
  @Get()
  @ApiOperation({ summary: 'Listar notificações do usuário' })
  @ApiResponse({
    status: 200,
    description: 'Lista de notificações retornada com sucesso',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Página atual',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Itens por página',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: StatusNotificacaoProcessamento,
    description: 'Filtro por status',
  })
  async findAll(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: StatusNotificacaoProcessamento,
  ) {
    const userId = req.user.id;

    return this.notificacaoService.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      status,
      userId,
    });
  }

  /**
   * Lista as notificações do usuário logado (rota alternativa)
   */
  @Get('minhas')
  @ApiOperation({ summary: 'Listar minhas notificações' })
  @ApiResponse({
    status: 200,
    description: 'Lista de notificações retornada com sucesso',
  })
  async listarMinhasNotificacoes(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    const userId = req.user.id;

    return this.notificacaoService.findAll({
      userId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status: status as any,
    });
  }

  /**
   * Obtém detalhes de uma notificação específica
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de uma notificação' })
  @ApiResponse({
    status: 200,
    description: 'Notificação encontrada com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Notificação não encontrada' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const userId = req.user.id;
    return this.notificacaoService.findById(id, userId);
  }

  /**
   * Marca uma notificação como lida
   */
  @Put(':id/ler')
  @ApiOperation({ summary: 'Marcar notificação como lida' })
  @ApiResponse({
    status: 200,
    description: 'Notificação marcada como lida com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Notificação não encontrada' })
  async marcarComoLida(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const userId = req.user.id;
    this.logger.log(
      `Marcando notificação ${id} como lida para usuário ${userId}`,
    );
    return this.notificacaoService.marcarComoLida(id, userId);
  }

  /**
   * Marca uma notificação como arquivada
   */
  @Put(':id/arquivar')
  @ApiOperation({ summary: 'Arquivar notificação' })
  @ApiResponse({
    status: 200,
    description: 'Notificação arquivada com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Notificação não encontrada' })
  async arquivar(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const userId = req.user.id;
    this.logger.log(`Arquivando notificação ${id} para usuário ${userId}`);
    return this.notificacaoService.arquivar(id, userId);
  }

  /**
   * Marca todas as notificações do usuário como lidas
   */
  @Put('todas/ler')
  @ApiOperation({ summary: 'Marcar todas as notificações como lidas' })
  @ApiResponse({
    status: 200,
    description: 'Todas as notificações marcadas como lidas',
  })
  async marcarTodasComoLidas(@Request() req) {
    const userId = req.user.id;
    this.logger.log(
      `Marcando todas as notificações como lidas para usuário ${userId}`,
    );
    return this.notificacaoService.marcarTodasComoLidas(userId);
  }

  /**
   * Obtém o contador de notificações não lidas do usuário
   */
  @Get('contador/nao-lidas')
  @ApiOperation({ summary: 'Obter contador de notificações não lidas' })
  @ApiResponse({ status: 200, description: 'Contador retornado com sucesso' })
  async contadorNaoLidas(@Request() req) {
    const userId = req.user.id;
    return this.notificacaoService.contadorNaoLidas(userId);
  }

  /**
   * Endpoint SSE para notificações em tempo real
   */
  @Sse('sse')
  @UseGuards(SseGuard)
  @ApiOperation({ summary: 'Conexão SSE para notificações em tempo real' })
  @ApiResponse({
    status: 200,
    description: 'Conexão SSE estabelecida com sucesso',
  })
  sseNotifications(@Request() req): Observable<any> {
    const userId = req.user.id;
    return this.sseService.createConnection(userId, req);
  }

  /**
   * Endpoint para obter estatísticas das conexões SSE
   */
  @Get('sse/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.GESTOR)
  @ApiOperation({ summary: 'Obter estatísticas das conexões SSE' })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas retornadas com sucesso',
  })
  async getSseStats() {
    return this.sseService.getConnectionStats();
  }

  /**
   * Endpoint para verificar se um usuário está conectado via SSE
   */
  @Get('sse/status/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.GESTOR)
  @ApiOperation({ summary: 'Verificar status de conexão SSE de um usuário' })
  @ApiResponse({
    status: 200,
    description: 'Status de conexão retornado com sucesso',
  })
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
