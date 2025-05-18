import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Query,
  UseGuards,
  Req,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificacaoService } from '../services/notificacao.service';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/role.decorator';
import { Role } from '../../../shared/enums/role.enum';
import { StatusNotificacaoProcessamento } from '../entities/notification.entity';
import { Request } from 'express';

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
  constructor(private readonly notificacaoService: NotificacaoService) {}

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
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: StatusNotificacaoProcessamento,
  ) {
    const user = req.user;

    return this.notificacaoService.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      status,
      userId: user.id,
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
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const user = req.user;
    return this.notificacaoService.findById(id, user.id);
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
  async marcarComoLida(@Param('id') id: string, @Req() req: Request) {
    const user = req.user;
    return this.notificacaoService.marcarComoLida(id, user.id);
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
  async arquivar(@Param('id') id: string, @Req() req: Request) {
    const user = req.user;
    return this.notificacaoService.arquivar(id, user.id);
  }

  /**
   * Marca todas as notificações do usuário como lidas
   */
  @Put('todas/ler')
  @ApiOperation({ summary: 'Marcar todas as notificações como lidas' })
  @ApiResponse({
    status: 200,
    description: 'Notificações marcadas como lidas com sucesso',
  })
  async marcarTodasComoLidas(@Req() req: Request) {
    const user = req.user;
    return this.notificacaoService.marcarTodasComoLidas(user.id);
  }

  /**
   * Obtém o contador de notificações não lidas do usuário
   */
  @Get('contador/nao-lidas')
  @ApiOperation({ summary: 'Obter contador de notificações não lidas' })
  @ApiResponse({ status: 200, description: 'Contador retornado com sucesso' })
  async contadorNaoLidas(@Req() req: Request) {
    const user = req.user;
    return this.notificacaoService.contadorNaoLidas(user.id);
  }
}
