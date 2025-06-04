import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { InfoBancariaService } from '../services/info-bancaria.service';
import { CreateInfoBancariaDto } from '../dto/create-info-bancaria.dto';
import { UpdateInfoBancariaDto } from '../dto/update-info-bancaria.dto';
import { InfoBancariaResponseDto } from '../dto/info-bancaria-response.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { TipoEscopo } from '@/entities/user-permission.entity';

/**
 * Controller para gerenciamento de informações bancárias
 *
 * Responsável pelos endpoints relacionados às informações bancárias dos cidadãos,
 * incluindo contas poupança social do Banco do Brasil e dados PIX.
 */
@ApiTags('Cidadão')
@Controller('cidadao/info-bancaria')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class InfoBancariaController {
  constructor(private readonly infoBancariaService: InfoBancariaService) {}

  /**
   * Cria uma nova informação bancária
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequiresPermission({
    permissionName: 'info_bancaria.criar',
    scopeType: TipoEscopo.GLOBAL,
  })
  @ApiOperation({
    summary: 'Criar informação bancária',
    description:
      'Cria uma nova informação bancária para um cidadão, incluindo dados de conta poupança social e PIX',
  })
  @ApiResponse({
    status: 201,
    description: 'Informação bancária criada com sucesso',
    type: InfoBancariaResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos fornecidos',
  })
  @ApiResponse({
    status: 404,
    description: 'Cidadão não encontrado',
  })
  @ApiResponse({
    status: 409,
    description:
      'Cidadão já possui informação bancária ativa ou chave PIX já está em uso',
  })
  async create(
    @Body(ValidationPipe) createInfoBancariaDto: CreateInfoBancariaDto,
  ): Promise<InfoBancariaResponseDto> {
    return await this.infoBancariaService.create(createInfoBancariaDto);
  }

  /**
   * Lista todas as informações bancárias com filtros
   */
  @Get()
  @RequiresPermission({
    permissionName: 'info_bancaria.visualizar',
    scopeType: TipoEscopo.GLOBAL,
  })
  @ApiOperation({
    summary: 'Listar informações bancárias',
    description:
      'Lista todas as informações bancárias com filtros opcionais e paginação',
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    type: Number,
    description: 'Número de registros para pular (paginação)',
    example: 0,
  })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    description: 'Número de registros para retornar',
    example: 10,
  })
  @ApiQuery({
    name: 'cidadao_id',
    required: false,
    type: String,
    description: 'Filtrar por ID do cidadão',
  })
  @ApiQuery({
    name: 'banco',
    required: false,
    type: String,
    description: 'Filtrar por código do banco',
    example: '001',
  })
  @ApiQuery({
    name: 'ativo',
    required: false,
    type: Boolean,
    description: 'Filtrar por status ativo',
    example: true,
  })
  @ApiQuery({
    name: 'includeRelations',
    required: false,
    type: Boolean,
    description: 'Incluir dados do cidadão',
    example: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de informações bancárias retornada com sucesso',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/InfoBancariaResponseDto' },
        },
        total: {
          type: 'number',
          description: 'Total de registros encontrados',
        },
      },
    },
  })
  async findAll(
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('cidadao_id') cidadao_id?: string,
    @Query('banco') banco?: string,
    @Query('ativo') ativo?: boolean,
    @Query('includeRelations') includeRelations?: boolean,
  ): Promise<{ data: InfoBancariaResponseDto[]; total: number }> {
    return await this.infoBancariaService.findAll({
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
      cidadao_id,
      banco,
      ativo,
      includeRelations,
    });
  }

  /**
   * Busca informação bancária por ID
   */
  @Get(':id')
  @RequiresPermission({
    permissionName: 'info_bancaria.visualizar',
    scopeType: TipoEscopo.GLOBAL,
  })
  @ApiOperation({
    summary: 'Buscar informação bancária por ID',
    description: 'Retorna uma informação bancária específica pelo seu ID',
  })
  @ApiParam({
    name: 'id',
    description: 'ID da informação bancária',
    type: String,
    format: 'uuid',
  })
  @ApiQuery({
    name: 'includeRelations',
    required: false,
    type: Boolean,
    description: 'Incluir dados do cidadão',
    example: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Informação bancária encontrada',
    type: InfoBancariaResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Informação bancária não encontrada',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeRelations') includeRelations?: boolean,
  ): Promise<InfoBancariaResponseDto> {
    return await this.infoBancariaService.findById(id, includeRelations);
  }

  /**
   * Busca informação bancária por ID do cidadão
   */
  @Get('cidadao/:cidadaoId')
  @RequiresPermission({
    permissionName: 'info_bancaria.visualizar',
    scopeType: TipoEscopo.GLOBAL,
  })
  @ApiOperation({
    summary: 'Buscar informação bancária por ID do cidadão',
    description: 'Retorna a informação bancária ativa de um cidadão específico',
  })
  @ApiParam({
    name: 'cidadaoId',
    description: 'ID do cidadão',
    type: String,
    format: 'uuid',
  })
  @ApiQuery({
    name: 'includeRelations',
    required: false,
    type: Boolean,
    description: 'Incluir dados do cidadão',
    example: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Informação bancária encontrada',
    type: InfoBancariaResponseDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Cidadão não possui informação bancária',
    schema: { type: 'null' },
  })
  async findByCidadaoId(
    @Param('cidadaoId', ParseUUIDPipe) cidadaoId: string,
    @Query('includeRelations') includeRelations?: boolean,
  ): Promise<InfoBancariaResponseDto | null> {
    return await this.infoBancariaService.findByCidadaoId(
      cidadaoId,
      includeRelations,
    );
  }

  /**
   * Atualiza informação bancária
   */
  @Patch(':id')
  @RequiresPermission({
    permissionName: 'info_bancaria.atualizar',
    scopeType: TipoEscopo.GLOBAL,
  })
  @ApiOperation({
    summary: 'Atualizar informação bancária',
    description: 'Atualiza uma informação bancária existente',
  })
  @ApiParam({
    name: 'id',
    description: 'ID da informação bancária',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Informação bancária atualizada com sucesso',
    type: InfoBancariaResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos fornecidos',
  })
  @ApiResponse({
    status: 404,
    description: 'Informação bancária não encontrada',
  })
  @ApiResponse({
    status: 409,
    description: 'Chave PIX já está em uso',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateInfoBancariaDto: UpdateInfoBancariaDto,
  ): Promise<InfoBancariaResponseDto> {
    return await this.infoBancariaService.update(id, updateInfoBancariaDto);
  }

  /**
   * Desativa informação bancária
   */
  @Patch(':id/deactivate')
  @RequiresPermission({
    permissionName: 'info_bancaria.atualizar',
    scopeType: TipoEscopo.GLOBAL,
  })
  @ApiOperation({
    summary: 'Desativar informação bancária',
    description: 'Desativa uma informação bancária sem removê-la do sistema',
  })
  @ApiParam({
    name: 'id',
    description: 'ID da informação bancária',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Informação bancária desativada com sucesso',
    type: InfoBancariaResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Informação bancária não encontrada',
  })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InfoBancariaResponseDto> {
    return await this.infoBancariaService.deactivate(id);
  }

  /**
   * Remove informação bancária
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequiresPermission({
    permissionName: 'info_bancaria.excluir',
    scopeType: TipoEscopo.GLOBAL,
  })
  @ApiOperation({
    summary: 'Remover informação bancária',
    description: 'Remove uma informação bancária do sistema (soft delete)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID da informação bancária',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'Informação bancária removida com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Informação bancária não encontrada',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return await this.infoBancariaService.remove(id);
  }
}
