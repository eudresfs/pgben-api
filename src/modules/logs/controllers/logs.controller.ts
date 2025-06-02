import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Res,
  NotFoundException,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { TipoEscopo } from '../../../entities/user-permission.entity';
import { LogsService } from '../services/logs.service';
import { LogsFilterDto, CriticidadeLog } from '../dto/logs-filter.dto';
import { LogResponseDto } from '../dto/log-response.dto';

/**
 * Controlador para gerenciamento de logs de auditoria
 */
@ApiTags('Logs')
@Controller('v1/logs')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  /**
   * Lista logs com filtros e paginação
   */
  @Get()
  @RequiresPermission(
    { permissionName: '*.*' },
    {
      permissionName: 'log.ler',
      scopeType: TipoEscopo.GLOBAL,
    }
  )
  @ApiOperation({ summary: 'Listar logs de auditoria' })
  @ApiResponse({
    status: 200,
    description: 'Logs listados com sucesso',
    type: LogResponseDto,
    isArray: true,
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
    name: 'entidade',
    required: false,
    type: String,
    description: 'Filtro por entidade',
  })
  @ApiQuery({
    name: 'entidade_id',
    required: false,
    type: String,
    description: 'Filtro por ID da entidade',
  })
  @ApiQuery({
    name: 'usuario_id',
    required: false,
    type: String,
    description: 'Filtro por usuário',
  })
  @ApiQuery({
    name: 'acao',
    required: false,
    type: String,
    description: 'Filtro por ação',
  })
  @ApiQuery({
    name: 'modulo',
    required: false,
    type: String,
    description: 'Filtro por módulo',
  })
  @ApiQuery({
    name: 'criticidade',
    required: false,
    enum: CriticidadeLog,
    description: 'Filtro por criticidade',
  })
  @ApiQuery({
    name: 'data_inicio',
    required: false,
    type: String,
    description: 'Data inicial (formato: YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'data_fim',
    required: false,
    type: String,
    description: 'Data final (formato: YYYY-MM-DD)',
  })
  async findAll(@Query() filter: LogsFilterDto) {
    return this.logsService.findAll(filter);
  }

  /**
   * Obtém detalhes de um log específico
   */
  @Get(':id')
  @RequiresPermission(
    { permissionName: '*.*' },
    {
      permissionName: 'log.ler',
      scopeType: TipoEscopo.GLOBAL,
    }
  )
  @ApiOperation({ summary: 'Obter detalhes de um log' })
  @ApiResponse({
    status: 200,
    description: 'Log encontrado com sucesso',
    type: LogResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Log não encontrado' })
  async findOne(@Param('id') id: string) {
    return this.logsService.findById(id);
  }

  /**
   * Lista entidades disponíveis para filtro
   */
  @Get('entidades/listar')
  @RequiresPermission({
    permissionName: 'log.ler',
    scopeType: TipoEscopo.GLOBAL,
  })
  @ApiOperation({ summary: 'Listar entidades disponíveis para filtro' })
  @ApiResponse({
    status: 200,
    description: 'Entidades listadas com sucesso',
    type: String,
    isArray: true,
  })
  async listarEntidades() {
    return this.logsService.listarEntidades();
  }

  /**
   * Lista módulos disponíveis para filtro
   */
  @Get('modulos/listar')
  @RequiresPermission(
    { permissionName: '*.*' },
    {
      permissionName: 'log.ler',
      scopeType: TipoEscopo.GLOBAL,
    }
  )
  @ApiOperation({ summary: 'Listar módulos disponíveis para filtro' })
  @ApiResponse({
    status: 200,
    description: 'Módulos listados com sucesso',
    type: String,
    isArray: true,
  })
  async listarModulos() {
    return this.logsService.listarModulos();
  }

  /**
   * Lista ações disponíveis para filtro
   */
  @Get('acoes/listar')
  @RequiresPermission(
    { permissionName: '*.*' },
    {
      permissionName: 'log.ler',
      scopeType: TipoEscopo.GLOBAL,
    }
  )
  @ApiOperation({ summary: 'Listar ações disponíveis para filtro' })
  @ApiResponse({
    status: 200,
    description: 'Ações listadas com sucesso',
    type: String,
    isArray: true,
  })
  async listarAcoes() {
    return this.logsService.listarAcoes();
  }

  /**
   * Lista criticidades disponíveis para filtro
   */
  @Get('criticidades/listar')
  @RequiresPermission(
    { permissionName: '*.*' },
    {
      permissionName: 'log.ler',
      scopeType: TipoEscopo.GLOBAL,
    }
  )
  @ApiOperation({ summary: 'Listar criticidades disponíveis para filtro' })
  @ApiResponse({
    status: 200,
    description: 'Criticidades listadas com sucesso',
    type: String,
    isArray: true,
  })
  async listarCriticidades() {
    return this.logsService.listarCriticidades();
  }

  /**
   * Exporta logs para CSV
   */
  @Get('exportar/csv')
  @RequiresPermission(
    { permissionName: '*.*' },
    {
      permissionName: 'log.exportar',
      scopeType: TipoEscopo.GLOBAL,
    }
  )
  @ApiOperation({ summary: 'Exportar logs para CSV' })
  @ApiResponse({
    status: 200,
    description: 'Logs exportados com sucesso',
  })
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=logs.csv')
  async exportarCsv(@Query() filter: LogsFilterDto, @Res() res: Response) {
    const buffer = await this.logsService.exportarCsv(filter);
    res.send(buffer);
  }
}
