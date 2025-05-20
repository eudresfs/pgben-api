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
import { NotificationManagerService } from '../services/notification-manager.service';
import { CreateNotificationTemplateDto } from '../dtos/create-notification-template.dto';
import { Role } from '../../../shared/enums/role.enum';

/**
 * Controlador para gerenciamento de templates de notificação
 */
@ApiTags('Notificações')
@Controller('v1/notificacao/templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NotificationTemplateController {
  private readonly logger = new Logger(NotificationTemplateController.name);

  constructor(
    private readonly notificationManagerService: NotificationManagerService,
  ) {}

  /**
   * Cria um novo template de notificação
   */
  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Criar um novo template de notificação' })
  @ApiResponse({
    status: 201,
    description: 'Template criado com sucesso',
  })
  async criarTemplate(
    @Body() createTemplateDto: CreateNotificationTemplateDto,
  ) {
    this.logger.log(`Criando novo template: ${createTemplateDto.nome}`);
    return this.notificationManagerService.criarTemplate(createTemplateDto);
  }

  /**
   * Lista todos os templates de notificação com paginação e filtros
   */
  @Get()
  @Roles(Role.ADMIN, Role.GESTOR)
  @ApiOperation({ summary: 'Listar templates de notificação' })
  @ApiResponse({
    status: 200,
    description: 'Lista de templates retornada com sucesso',
  })
  async listarTemplates(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('ativo') ativo?: boolean,
  ) {
    return this.notificationManagerService.listarTemplates({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      ativo: ativo !== undefined ? ativo === true : undefined,
    });
  }

  /**
   * Obtém um template de notificação pelo ID
   */
  @Get(':id')
  @Roles(Role.ADMIN, Role.GESTOR)
  @ApiOperation({ summary: 'Obter template por ID' })
  @ApiResponse({
    status: 200,
    description: 'Template encontrado',
  })
  @ApiResponse({
    status: 404,
    description: 'Template não encontrado',
  })
  async buscarTemplatePorId(@Param('id') id: string) {
    return this.notificationManagerService.buscarTemplatePorId(id);
  }

  /**
   * Ativa um template de notificação
   */
  @Put(':id/ativar')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Ativar template de notificação' })
  @ApiResponse({
    status: 200,
    description: 'Template ativado com sucesso',
  })
  async ativarTemplate(@Param('id') id: string) {
    this.logger.log(`Ativando template ID: ${id}`);
    return this.notificationManagerService.ativarTemplate(id);
  }

  /**
   * Desativa um template de notificação
   */
  @Put(':id/desativar')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Desativar template de notificação' })
  @ApiResponse({
    status: 200,
    description: 'Template desativado com sucesso',
  })
  async desativarTemplate(@Param('id') id: string) {
    this.logger.log(`Desativando template ID: ${id}`);
    return this.notificationManagerService.desativarTemplate(id);
  }
}
