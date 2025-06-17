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
// import { NotificationManagerService } from '../services/notification-manager.service'; // TODO: Reativar após resolver dependência circular
import { CreateNotificationTemplateDto } from '../dto/create-notification-template.dto';
import { ROLES } from '../../../shared/constants/roles.constants';

/**
 * Controlador para gerenciamento de templates de notificação
 */
@ApiTags('Notificações')
@Controller('notificacao/templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NotificationTemplateController {
  private readonly logger = new Logger(NotificationTemplateController.name);

  constructor(
    // private readonly notificationManagerService: NotificationManagerService, // TODO: Reativar após resolver dependência circular
  ) {}

  /**
   * Cria um novo template de notificação
   */
  @Post()
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Criar um novo template de notificação' })
  @ApiResponse({
    status: 201,
    description: 'Template criado com sucesso',
  })
  async criarTemplate(
    @Body() createTemplateDto: CreateNotificationTemplateDto,
  ) {
    this.logger.log(`Criando novo template: ${createTemplateDto.nome}`);
    // TODO: Reativar após resolver dependência circular
    // return this.notificationManagerService.criarTemplate(createTemplateDto);
    throw new Error('Funcionalidade temporariamente desabilitada - dependência circular');
  }

  /**
   * Lista todos os templates de notificação com paginação e filtros
   */
  @Get()
  @Roles(ROLES.ADMIN, ROLES.GESTOR)
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
    // TODO: Reativar após resolver dependência circular
    // return this.notificationManagerService.listarTemplates({
    //   page: page ? Number(page) : undefined,
    //   limit: limit ? Number(limit) : undefined,
    //   ativo: ativo !== undefined ? ativo === true : undefined,
    // });
    throw new Error('Funcionalidade temporariamente desabilitada - dependência circular');
  }

  /**
   * Obtém um template de notificação pelo ID
   */
  @Get(':id')
  @Roles(ROLES.ADMIN, ROLES.GESTOR)
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
    // TODO: Reativar após resolver dependência circular
    // return this.notificationManagerService.buscarTemplatePorId(id);
    throw new Error('Funcionalidade temporariamente desabilitada - dependência circular');
  }

  /**
   * Ativa um template de notificação
   */
  @Put(':id/ativar')
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Ativar template de notificação' })
  @ApiResponse({
    status: 200,
    description: 'Template ativado com sucesso',
  })
  async ativarTemplate(@Param('id') id: string) {
    this.logger.log(`Ativando template ID: ${id}`);
    // TODO: Reativar após resolver dependência circular
    // return this.notificationManagerService.ativarTemplate(id);
    throw new Error('Funcionalidade temporariamente desabilitada - dependência circular');
  }

  /**
   * Desativa um template de notificação
   */
  @Put(':id/desativar')
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Desativar template de notificação' })
  @ApiResponse({
    status: 200,
    description: 'Template desativado com sucesso',
  })
  async desativarTemplate(@Param('id') id: string) {
    this.logger.log(`Desativando template ID: ${id}`);
    // TODO: Reativar após resolver dependência circular
    // return this.notificationManagerService.desativarTemplate(id);
    throw new Error('Funcionalidade temporariamente desabilitada - dependência circular');
  }
}
