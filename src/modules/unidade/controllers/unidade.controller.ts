import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UnidadeService } from '../services/unidade.service';
import { CreateUnidadeDto } from '../dto/create-unidade.dto';
import { UpdateUnidadeDto } from '../dto/update-unidade.dto';
import { UpdateStatusUnidadeDto } from '../dto/update-status-unidade.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { ScopeType } from '../../../auth/entities/user-permission.entity';

/**
 * Controlador de unidades
 *
 * Responsável por gerenciar as rotas relacionadas a unidades (CRAS, CREAS, etc.)
 */
@ApiTags('Unidades')
@Controller('v1/unidade')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class UnidadeController {
  constructor(private readonly unidadeService: UnidadeService) {}

  /**
   * Lista todas as unidades com filtros e paginação
   */
  @Get()
  @RequiresPermission(
    { permissionName: '*.*' },
    {
      permissionName: 'unidade.listar',
      scopeType: ScopeType.GLOBAL
    }
  )
  @ApiOperation({ summary: 'Listar unidades' })
  @ApiResponse({
    status: 200,
    description: 'Lista de unidades retornada com sucesso',
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
    name: 'search',
    required: false,
    type: String,
    description: 'Termo de busca',
  })
  @ApiQuery({
    name: 'tipo',
    required: false,
    type: String,
    description: 'Filtro por tipo de unidade',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filtro por status',
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('tipo') tipo?: string,
    @Query('status') status?: string,
  ) {
    return this.unidadeService.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
      tipo,
      status,
    });
  }

  /**
   * Obtém detalhes de uma unidade específica
   */
  @Get(':id')
  @RequiresPermission(
    { permissionName: '*.*' },
    {
      permissionName: 'unidade.visualizar',
      scopeType: ScopeType.GLOBAL
    }
  )
  @ApiOperation({ summary: 'Obter detalhes de uma unidade' })
  @ApiResponse({ status: 200, description: 'Unidade encontrada com sucesso' })
  @ApiResponse({ status: 404, description: 'Unidade não encontrada' })
  async findOne(@Param('id') id: string) {
    return this.unidadeService.findById(id);
  }

  /**
   * Cria uma nova unidade
   */
  @Post()
  @RequiresPermission(
    { permissionName: '*.*' },
    {
      permissionName: 'unidade.criar',
      scopeType: ScopeType.GLOBAL
    }
  )
  @ApiOperation({ summary: 'Criar nova unidade' })
  @ApiResponse({ status: 201, description: 'Unidade criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 409, description: 'Código já em uso' })
  async create(@Body() createUnidadeDto: CreateUnidadeDto) {
    return this.unidadeService.create(createUnidadeDto);
  }

  /**
   * Atualiza uma unidade existente
   */
  @Put(':id')
  @RequiresPermission(
    { permissionName: '*.*' },
    {
      permissionName: 'unidade.editar',
      scopeType: ScopeType.GLOBAL
    }
  )
  @ApiOperation({ summary: 'Atualizar unidade existente' })
  @ApiResponse({ status: 200, description: 'Unidade atualizada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Unidade não encontrada' })
  @ApiResponse({ status: 409, description: 'Código já em uso' })
  async update(
    @Param('id') id: string,
    @Body() updateUnidadeDto: UpdateUnidadeDto,
  ) {
    return this.unidadeService.update(id, updateUnidadeDto);
  }

  /**
   * Atualiza o status de uma unidade
   */
  @Patch(':id/status')
  @RequiresPermission(
    { permissionName: '*.*' },
    {
      permissionName: 'unidade.status.alterar',
      scopeType: ScopeType.GLOBAL
    }
  )
  @ApiOperation({ summary: 'Ativar/inativar unidade' })
  @ApiResponse({ status: 200, description: 'Status atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Unidade não encontrada' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusUnidadeDto: UpdateStatusUnidadeDto,
  ) {
    return this.unidadeService.updateStatus(id, updateStatusUnidadeDto);
  }

  /**
   * Lista os setores de uma unidade específica
   */
  @Get(':id/setor')
  @RequiresPermission(
    { permissionName: '*.*' },
    {
      permissionName: 'unidade.setor.listar',
      scopeType: ScopeType.GLOBAL
    }
  )
  @ApiOperation({ summary: 'Listar setores de uma unidade' })
  @ApiResponse({
    status: 200,
    description: 'Lista de setores retornada com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Unidade não encontrada' })
  async findSetores(@Param('id') id: string) {
    return this.unidadeService.findSetoresByUnidadeId(id);
  }
}
