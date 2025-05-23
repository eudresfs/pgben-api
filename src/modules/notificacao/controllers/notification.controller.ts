import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Put,
  UseGuards,
  Logger,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/role.decorator';
import { ROLES } from '../../../shared/constants/roles.constants';
import { StatusNotificacaoProcessamento } from '../entities/notification.entity';
import { NotificacaoService } from '../services/notificacao.service';
import { NotificationManagerService } from '../services/notification-manager.service';
import { CreateNotificationDto } from '../dtos/create-notification.dto';

/**
 * Controlador para gerenciamento de notificações
 */
@ApiTags('Notificações')
@Controller('v1/notificacao')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(
    private readonly notificacaoService: NotificacaoService,
    private readonly notificationManagerService: NotificationManagerService,
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
   * Lista as notificações do usuário logado
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
   * Obtém uma notificação pelo ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obter notificação por ID' })
  @ApiResponse({
    status: 200,
    description: 'Notificação encontrada',
  })
  @ApiResponse({
    status: 404,
    description: 'Notificação não encontrada',
  })
  async buscarNotificacaoPorId(@Param('id') id: string, @Request() req) {
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
  async marcarComoLida(@Param('id') id: string, @Request() req) {
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
  async arquivarNotificacao(@Param('id') id: string, @Request() req) {
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
   * Obtém contador de notificações não lidas
   */
  @Get('contador/nao-lidas')
  @ApiOperation({ summary: 'Obter contador de notificações não lidas' })
  @ApiResponse({
    status: 200,
    description: 'Contador retornado com sucesso',
  })
  async contadorNaoLidas(@Request() req) {
    const userId = req.user.id;
    return this.notificacaoService.contadorNaoLidas(userId);
  }
}
