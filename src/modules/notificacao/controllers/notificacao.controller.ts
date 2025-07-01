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
import { NotificationManagerService } from '../services/notification-manager.service';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { StatusNotificacaoProcessamento } from '../../../entities/notification.entity';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { FiltrosNotificacaoDto, RespostaListagemNotificacaoDto } from '../dto/filtros-notificacao.dto';
import { RequiresPermission } from '@/auth/decorators/requires-permission.decorator';
import { TipoEscopo } from '@/entities/user-permission.entity';

/**
 * Controlador de Notificações
 *
 * Responsável por gerenciar as rotas relacionadas às notificações
 * enviadas aos usuários do sistema
 */
@ApiTags('Notificações')
@Controller('notificacao')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NotificacaoController {
  private readonly logger = new Logger(NotificacaoController.name);

  constructor(
    private readonly notificacaoService: NotificacaoService,
    private readonly notificationManagerService: NotificationManagerService,
  ) {}

  /**
   * Cria e envia uma nova notificação
   */
  @Post()
  @RequiresPermission(
    {
      permissionName: 'notificacao.criar',
      scopeType: TipoEscopo.GLOBAL
    }
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
   * Lista todas as notificações do usuário autenticado com filtros e ordenação avançados
   */
  @Get()
  @ApiOperation({ 
    summary: 'Listar notificações do usuário',
    description: `
      Lista as notificações do usuário autenticado com suporte a filtros avançados e ordenação.
      
      **Filtros disponíveis:**
      - Status da notificação (pendente, enviada, lida, arquivada, etc.)
      - Tipo do template (sistema, solicitacao, pendencia, etc.)
      - Categoria do template
      - Prioridade (baixa, normal, alta, urgente)
      - Período de criação (dataInicio e dataFim)
      - Notificações lidas/não lidas
      - Incluir/excluir arquivadas
      - Busca textual no conteúdo
      
      **Ordenação:**
      - Por data de criação, data de leitura, prioridade ou status
      - Direção ascendente (ASC) ou descendente (DESC)
      
      **Paginação:**
      - Suporte a paginação com limite máximo de 100 itens por página
    `
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de notificações retornada com sucesso',
    type: RespostaListagemNotificacaoDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Parâmetros de filtro inválidos',
  })
  async findAll(
    @Request() req,
    @Query() filtros: FiltrosNotificacaoDto,
  ): Promise<RespostaListagemNotificacaoDto> {
    const userId = req.user.id;

    // Conversão das datas string para Date
    let dataInicioDate: Date | undefined;
    let dataFimDate: Date | undefined;

    if (filtros.dataInicio) {
      dataInicioDate = new Date(filtros.dataInicio);
      if (isNaN(dataInicioDate.getTime())) {
        throw new BadRequestException('Data de início inválida. Use o formato YYYY-MM-DD');
      }
    }

    if (filtros.dataFim) {
      dataFimDate = new Date(filtros.dataFim);
      if (isNaN(dataFimDate.getTime())) {
        throw new BadRequestException('Data de fim inválida. Use o formato YYYY-MM-DD');
      }
      // Ajustar para o final do dia
      dataFimDate.setHours(23, 59, 59, 999);
    }

    // Validação de período
    if (dataInicioDate && dataFimDate && dataInicioDate > dataFimDate) {
      throw new BadRequestException('Data de início não pode ser posterior à data de fim');
    }

    this.logger.log(
      `Listando notificações para usuário ${userId} com filtros: ${JSON.stringify(filtros)}`,
    );

    return this.notificacaoService.findAll({
      page: filtros.page || 1,
      limit: filtros.limit || 10,
      status: filtros.status,
      tipo: filtros.tipo,
      categoria: filtros.categoria,
      prioridade: filtros.prioridade,
      dataInicio: dataInicioDate,
      dataFim: dataFimDate,
      lidas: filtros.lidas,
      arquivadas: filtros.arquivadas || false,
      ordenarPor: filtros.ordenarPor || 'created_at',
      ordem: filtros.ordem || 'DESC',
      busca: filtros.busca,
      userId,
    });
  }

  /**
   * Lista as notificações do usuário logado (rota alternativa)
   */
  @Get('minhas')
  @RequiresPermission(
    {
      permissionName: 'notificacao.ler',
      scopeType: TipoEscopo.PROPRIO,
      scopeIdExpression: 'params.id',
    }
  )
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
  @Get(':id/detalhes')
  @RequiresPermission(
    {
      permissionName: 'notificacao.visualizar',
      scopeType: TipoEscopo.PROPRIO,
      scopeIdExpression: 'params.id',
    }
  )
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
  @RequiresPermission(
    {
      permissionName: 'notificacao.ler',
      scopeType: TipoEscopo.PROPRIO,
      scopeIdExpression: 'params.id',
    }
  )
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
  @RequiresPermission(
    {
      permissionName: 'notificacao.arquivar',
      scopeType: TipoEscopo.PROPRIO,
      scopeIdExpression: 'params.id',
    }
  )
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
  @RequiresPermission(
    {
      permissionName: 'notificacao.ler',
      scopeType: TipoEscopo.PROPRIO,
      scopeIdExpression: 'params.id',
    }
  )
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
  @RequiresPermission(
    {
      permissionName: 'notificacao.ler',
      scopeType: TipoEscopo.PROPRIO,
      scopeIdExpression: 'params.id',
    }
  )
  @ApiOperation({ summary: 'Obter contador de notificações não lidas' })
  @ApiResponse({ status: 200, description: 'Contador retornado com sucesso' })
  async contadorNaoLidas(@Request() req) {
    const userId = req.user.id;
    return this.notificacaoService.contadorNaoLidas(userId);
  }
}
