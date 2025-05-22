import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
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
import { ScopeType } from '../../../auth/entities/user-permission.entity';
import { PapelCidadaoService } from '../services/papel-cidadao.service';
import { CreatePapelCidadaoDto } from '../dto/create-papel-cidadao.dto';
import { TipoPapel } from '../entities/papel-cidadao.entity';

/**
 * Controlador de Papéis de Cidadão
 *
 * Gerencia os diferentes papéis que um cidadão pode assumir no sistema
 * (beneficiário, requerente, representante legal).
 */
@ApiTags('Cidadão')
@Controller('v1/cidadao/papel')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class PapelCidadaoController {
  constructor(private readonly papelCidadaoService: PapelCidadaoService) {}

  /**
   * Cria um novo papel para um cidadão
   */
  @Post()
  @RequiresPermission({
    permissionName: 'cidadao.papel.criar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'cidadao.unidadeId',
  })
  @ApiOperation({ summary: 'Criar novo papel para um cidadão' })
  @ApiResponse({ status: 201, description: 'Papel criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Cidadão não encontrado' })
  @ApiResponse({ status: 409, description: 'Cidadão já possui este papel' })
  async create(@Body() createPapelCidadaoDto: CreatePapelCidadaoDto) {
    try {
      return await this.papelCidadaoService.create(createPapelCidadaoDto);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Erro ao criar papel para cidadão');
    }
  }

  /**
   * Lista todos os papéis de um cidadão
   */
  @Get('cidadao/:cidadaoId')
  @RequiresPermission({
    permissionName: 'cidadao.papel.listar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'cidadao.unidadeId',
  })
  @ApiOperation({ summary: 'Listar papéis de um cidadão' })
  @ApiResponse({
    status: 200,
    description: 'Lista de papéis retornada com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Cidadão não encontrado' })
  async findByCidadaoId(@Param('cidadaoId') cidadaoId: string) {
    return this.papelCidadaoService.findByCidadaoId(cidadaoId);
  }

  /**
   * Busca cidadãos por tipo de papel
   */
  @Get('tipo/:tipoPapel')
  @RequiresPermission({ permissionName: 'cidadao.papel.listar' })
  @ApiOperation({ summary: 'Buscar cidadãos por tipo de papel' })
  @ApiResponse({
    status: 200,
    description: 'Lista de cidadãos retornada com sucesso',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findCidadaosByTipoPapel(
    @Param('tipoPapel') tipoPapel: TipoPapel,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.papelCidadaoService.findCidadaosByTipoPapel(tipoPapel, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
    });
  }

  /**
   * Verifica se um cidadão possui um determinado papel
   */
  @Get('verificar/:cidadaoId/:tipoPapel')
  @RequiresPermission({
    permissionName: 'cidadao.papel.visualizar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'cidadao.unidadeId',
  })
  @ApiOperation({
    summary: 'Verificar se um cidadão possui um determinado papel',
  })
  @ApiResponse({
    status: 200,
    description: 'Verificação realizada com sucesso',
  })
  async verificarPapel(
    @Param('cidadaoId') cidadaoId: string,
    @Param('tipoPapel') tipoPapel: TipoPapel,
  ) {
    const temPapel = await this.papelCidadaoService.verificarPapel(
      cidadaoId,
      tipoPapel,
    );
    return { temPapel };
  }

  /**
   * Desativa um papel de um cidadão
   */
  @Delete(':id')
  @RequiresPermission({
    permissionName: 'cidadao.papel.excluir',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'papel.cidadao.unidadeId',
  })
  @ApiOperation({ summary: 'Desativar papel de um cidadão' })
  @ApiResponse({ status: 200, description: 'Papel desativado com sucesso' })
  @ApiResponse({ status: 404, description: 'Papel não encontrado' })
  async desativar(@Param('id') id: string) {
    return this.papelCidadaoService.desativar(id);
  }
}
