import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  ParseUUIDPipe,
  UseGuards,
  Request,
  Logger,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiQuery,
  ApiExtraModels,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { ScopeType } from '../../../entities/user-permission.entity';
import { ApiErrorResponse } from '../../../shared/dtos/api-error-response.dto';
import { CreateComposicaoFamiliarDto } from '../dto/create-composicao-familiar.dto';
import { UpdateComposicaoFamiliarDto } from '../dto/update-composicao-familiar.dto';
import { ComposicaoFamiliarResponseDto, ComposicaoFamiliarPaginatedResponseDto } from '../dto/composicao-familiar-response.dto';
import { ComposicaoFamiliarService } from '../services/composicao-familiar.service';
import { CidadaoAuditInterceptor } from '../interceptors/cidadao-audit.interceptor';
import { UseInterceptors } from '@nestjs/common';

/**
 * Controlador de Composição Familiar
 *
 * Responsável por gerenciar as rotas relacionadas aos membros da composição familiar dos cidadãos
 */
@ApiTags('Cidadão')
@ApiExtraModels(ComposicaoFamiliarResponseDto, ComposicaoFamiliarPaginatedResponseDto)
@Controller('v1/composicao-familiar')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@UseInterceptors(CidadaoAuditInterceptor)
export class ComposicaoFamiliarController {
  private readonly logger = new Logger(ComposicaoFamiliarController.name);

  constructor(
    private readonly composicaoFamiliarService: ComposicaoFamiliarService,
  ) {}

  /**
   * Cria um novo membro da composição familiar
   */
  @Post()
  @RequiresPermission({
    permissionName: 'cidadao.editar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'cidadao.unidadeId',
  })
  @ApiOperation({
    summary: 'Criar membro da composição familiar',
    description: 'Adiciona um novo membro à composição familiar de um cidadão.',
  })
  @ApiOkResponse({
    description: 'Membro da composição familiar criado com sucesso',
    type: ComposicaoFamiliarResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Dados inválidos fornecidos',
    type: ApiErrorResponse,
  })
  @ApiConflictResponse({
    description: 'CPF já cadastrado na composição familiar',
    type: ApiErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Cidadão não encontrado',
    type: ApiErrorResponse,
  })
  async create(
    @Body() createComposicaoFamiliarDto: CreateComposicaoFamiliarDto,
    @Request() req,
  ): Promise<ComposicaoFamiliarResponseDto> {
    const startTime = Date.now();
    const requestId = `CF-CREATE-${Date.now()}`;
    this.logger.log(`[${requestId}] Início da criação de membro da composição familiar`);

    try {
      const result = await this.composicaoFamiliarService.create(
        createComposicaoFamiliarDto,
        req?.user?.id,
      );

      const totalTime = Date.now() - startTime;
      if (totalTime > 500) {
        this.logger.warn(`[${requestId}] Operação lenta (create): ${totalTime}ms`);
      } else {
        this.logger.log(`[${requestId}] Operação concluída em ${totalTime}ms`);
      }

      return result;
    } catch (error) {
      const totalTime = Date.now() - startTime;
      this.logger.error(`[${requestId}] Erro em ${totalTime}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * Lista membros da composição familiar por cidadão
   */
  @Get('cidadao/:cidadaoId')
  @RequiresPermission({
    permissionName: 'cidadao.visualizar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'cidadao.unidadeId',
  })
  @ApiOperation({
    summary: 'Listar membros da composição familiar',
    description: 'Retorna uma lista paginada dos membros da composição familiar de um cidadão.',
  })
  @ApiParam({
    name: 'cidadaoId',
    description: 'ID do cidadão',
    type: 'string',
    format: 'uuid',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número da página (padrão: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Itens por página (padrão: 10, máximo: 100)',
    example: 10,
  })
  @ApiOkResponse({
    description: 'Lista de membros da composição familiar retornada com sucesso',
    type: ComposicaoFamiliarPaginatedResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Cidadão não encontrado',
    type: ApiErrorResponse,
  })
  async findByCidadao(
    @Param('cidadaoId', ParseUUIDPipe) cidadaoId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<ComposicaoFamiliarPaginatedResponseDto> {
    const startTime = Date.now();
    const requestId = `CF-LIST-${cidadaoId.substring(0, 8)}-${Date.now()}`;
    this.logger.log(`[${requestId}] Início da listagem de composição familiar`);

    try {
      const result = await this.composicaoFamiliarService.findByCidadao(
        cidadaoId,
        { page, limit },
      );

      const totalTime = Date.now() - startTime;
      if (totalTime > 300) {
        this.logger.warn(`[${requestId}] Operação lenta (findByCidadao): ${totalTime}ms`);
      } else {
        this.logger.log(`[${requestId}] Operação concluída em ${totalTime}ms`);
      }

      return result;
    } catch (error) {
      const totalTime = Date.now() - startTime;
      this.logger.error(`[${requestId}] Erro em ${totalTime}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * Busca um membro específico da composição familiar
   */
  @Get(':id')
  @RequiresPermission({
    permissionName: 'cidadao.visualizar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'composicaoFamiliar.cidadao.unidadeId',
  })
  @ApiOperation({
    summary: 'Buscar membro da composição familiar',
    description: 'Retorna os dados de um membro específico da composição familiar.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do membro da composição familiar',
    type: 'string',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Membro da composição familiar encontrado',
    type: ComposicaoFamiliarResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Membro da composição familiar não encontrado',
    type: ApiErrorResponse,
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ComposicaoFamiliarResponseDto> {
    const startTime = Date.now();
    const requestId = `CF-GET-${id.substring(0, 8)}-${Date.now()}`;
    this.logger.log(`[${requestId}] Início da busca de membro da composição familiar`);

    try {
      const result = await this.composicaoFamiliarService.findOne(id);

      const totalTime = Date.now() - startTime;
      if (totalTime > 200) {
        this.logger.warn(`[${requestId}] Operação lenta (findOne): ${totalTime}ms`);
      } else {
        this.logger.log(`[${requestId}] Operação concluída em ${totalTime}ms`);
      }

      return result;
    } catch (error) {
      const totalTime = Date.now() - startTime;
      this.logger.error(`[${requestId}] Erro em ${totalTime}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * Atualiza um membro da composição familiar
   */
  @Put(':id')
  @RequiresPermission({
    permissionName: 'cidadao.editar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'composicaoFamiliar.cidadao.unidadeId',
  })
  @ApiOperation({
    summary: 'Atualizar membro da composição familiar',
    description: 'Atualiza os dados de um membro da composição familiar.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do membro da composição familiar',
    type: 'string',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Membro da composição familiar atualizado com sucesso',
    type: ComposicaoFamiliarResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Dados inválidos fornecidos',
    type: ApiErrorResponse,
  })
  @ApiConflictResponse({
    description: 'CPF já cadastrado na composição familiar',
    type: ApiErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Membro da composição familiar não encontrado',
    type: ApiErrorResponse,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateComposicaoFamiliarDto: UpdateComposicaoFamiliarDto,
    @Request() req,
  ): Promise<ComposicaoFamiliarResponseDto> {
    const startTime = Date.now();
    const requestId = `CF-UPDATE-${id.substring(0, 8)}-${Date.now()}`;
    this.logger.log(`[${requestId}] Início da atualização de membro da composição familiar`);

    try {
      const result = await this.composicaoFamiliarService.update(
        id,
        updateComposicaoFamiliarDto,
        req?.user?.id,
      );

      const totalTime = Date.now() - startTime;
      if (totalTime > 500) {
        this.logger.warn(`[${requestId}] Operação lenta (update): ${totalTime}ms`);
      } else {
        this.logger.log(`[${requestId}] Operação concluída em ${totalTime}ms`);
      }

      return result;
    } catch (error) {
      const totalTime = Date.now() - startTime;
      this.logger.error(`[${requestId}] Erro em ${totalTime}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove um membro da composição familiar
   */
  @Delete(':id')
  @RequiresPermission({
    permissionName: 'cidadao.editar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'composicaoFamiliar.cidadao.unidadeId',
  })
  @ApiOperation({
    summary: 'Remover membro da composição familiar',
    description: 'Remove um membro da composição familiar (soft delete).',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do membro da composição familiar',
    type: 'string',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Membro da composição familiar removido com sucesso',
  })
  @ApiNotFoundResponse({
    description: 'Membro da composição familiar não encontrado',
    type: ApiErrorResponse,
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ): Promise<{ message: string }> {
    const startTime = Date.now();
    const requestId = `CF-DELETE-${id.substring(0, 8)}-${Date.now()}`;
    this.logger.log(`[${requestId}] Início da remoção de membro da composição familiar`);

    try {
      await this.composicaoFamiliarService.remove(id, req?.user?.id);

      const totalTime = Date.now() - startTime;
      if (totalTime > 300) {
        this.logger.warn(`[${requestId}] Operação lenta (remove): ${totalTime}ms`);
      } else {
        this.logger.log(`[${requestId}] Operação concluída em ${totalTime}ms`);
      }

      return { message: 'Membro da composição familiar removido com sucesso' };
    } catch (error) {
      const totalTime = Date.now() - startTime;
      this.logger.error(`[${requestId}] Erro em ${totalTime}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * Busca membros da composição familiar por CPF
   */
  @Get('buscar/cpf/:cpf')
  @RequiresPermission({
    permissionName: 'cidadao.visualizar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'user.unidadeId',
  })
  @ApiOperation({
    summary: 'Buscar membro por CPF',
    description: 'Busca membros da composição familiar pelo CPF.',
  })
  @ApiParam({
    name: 'cpf',
    description: 'CPF do membro (apenas números)',
    type: 'string',
    example: '12345678901',
  })
  @ApiOkResponse({
    description: 'Membros encontrados',
    type: [ComposicaoFamiliarResponseDto],
  })
  async findByCpf(
    @Param('cpf') cpf: string,
  ): Promise<ComposicaoFamiliarResponseDto[]> {
    const startTime = Date.now();
    const requestId = `CF-CPF-${cpf.substring(0, 4)}-${Date.now()}`;
    this.logger.log(`[${requestId}] Início da busca por CPF`);

    try {
      const result = await this.composicaoFamiliarService.findByCpf(cpf);

      const totalTime = Date.now() - startTime;
      if (totalTime > 200) {
        this.logger.warn(`[${requestId}] Operação lenta (findByCpf): ${totalTime}ms`);
      } else {
        this.logger.log(`[${requestId}] Operação concluída em ${totalTime}ms`);
      }

      return result;
    } catch (error) {
      const totalTime = Date.now() - startTime;
      this.logger.error(`[${requestId}] Erro em ${totalTime}ms: ${error.message}`);
      throw error;
    }
  }
}