import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiOkResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { CidadaoService } from '../services/cidadao.service';
import { CreateCidadaoDto } from '../dto/create-cidadao.dto';
import { UpdateCidadaoDto } from '../dto/update-cidadao.dto';
import { CreateComposicaoFamiliarDto } from '../dto/create-composicao-familiar.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { ScopeType } from '../../../auth/entities/user-permission.entity';
import {
  CidadaoResponseDto,
  CidadaoPaginatedResponseDto,
} from '../dto/cidadao-response.dto';
import { ApiErrorResponse } from '../../../shared/dtos/api-error-response.dto';

/**
 * Controlador de cidadãos
 *
 * Responsável por gerenciar as rotas relacionadas a cidadãos/beneficiários
 */
@ApiTags('Cidadão')
@Controller('v1/cidadao')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class CidadaoController {
  constructor(private readonly cidadaoService: CidadaoService) {}

  /**
   * Lista todos os cidadãos com filtros e paginação
   */
  @Get()
  @RequiresPermission({
    permissionName: 'cidadao.listar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'user.unidadeId',
  })
  @ApiOperation({
    summary: 'Listar cidadãos',
    description: 'Retorna uma lista paginada de cidadãos com opções de filtro.',
  })
  @ApiOkResponse({
    description: 'Lista de cidadãos retornada com sucesso',
    type: CidadaoPaginatedResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado',
    type: ApiErrorResponse,
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
    description: 'Número de itens por página (padrão: 10, máximo: 100)',
    example: 10,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Termo de busca (busca por nome, CPF ou NIS)',
    example: 'Maria',
  })
  @ApiQuery({
    name: 'bairro',
    required: false,
    type: String,
    description: 'Filtrar por bairro',
    example: 'Centro',
  })
  @ApiQuery({
    name: 'ativo',
    required: false,
    type: Boolean,
    description: 'Filtrar por status (true para ativos, false para inativos)',
    example: true,
  })
  async findAll(
    @Request() req,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('bairro') bairro?: string,
    @Query('ativo') ativo?: boolean,
  ): Promise<CidadaoPaginatedResponseDto> {
    return this.cidadaoService.findAll({
      page: +page,
      limit: Math.min(+limit, 100), // Limita a 100 itens por página
      search,
      bairro,
      ativo: ativo !== undefined ? String(ativo) === 'true' : undefined,
      unidadeId: req.user.unidadeId,
    });
  }

  /**
   * Obtém detalhes de um cidadão específico
   */
  @Get(':id')
  @RequiresPermission({
    permissionName: 'cidadao.visualizar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'cidadao.unidadeId',
  })
  @ApiOperation({
    summary: 'Obter detalhes de um cidadão',
    description: 'Retorna os detalhes completos de um cidadão pelo seu ID.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'ID do cidadão',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    description: 'Cidadão encontrado com sucesso',
    type: CidadaoResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Cidadão não encontrado',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'ID inválido',
    type: ApiErrorResponse,
  })
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<CidadaoResponseDto> {
    return this.cidadaoService.findById(id);
  }

  /**
   * Cria um novo cidadão
   */
  @Post()
  @RequiresPermission({
    permissionName: 'cidadao.criar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'user.unidadeId',
  })
  @ApiOperation({
    summary: 'Criar cidadão',
    description: 'Cadastra um novo cidadão no sistema.',
  })
  @ApiOkResponse({
    description: 'Cidadão criado com sucesso',
    type: CidadaoResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Dados inválidos fornecidos',
    type: ApiErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'CPF inválido',
        error: 'Bad Request',
      },
    },
  })
  @ApiConflictResponse({
    description: 'Conflito - CPF ou NIS já cadastrado',
    type: ApiErrorResponse,
    schema: {
      example: {
        statusCode: 409,
        message: 'Já existe um cidadão cadastrado com este CPF',
        error: 'Conflict',
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Cidadão criado com sucesso',
    type: CidadaoResponseDto,
  })
  async create(
    @Body() createCidadaoDto: CreateCidadaoDto,
    @Request() req,
  ): Promise<CidadaoResponseDto> {
    return this.cidadaoService.create(
      createCidadaoDto,
      req.user.unidadeId,
      req.user.id,
    );
  }

  /**
   * Atualiza um cidadão existente
   */
  @Put(':id')
  @RequiresPermission({
    permissionName: 'cidadao.editar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'cidadao.unidadeId',
  })
  @ApiOperation({
    summary: 'Atualizar cidadão existente',
    description: 'Atualiza os dados de um cidadão existente.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'ID do cidadão a ser atualizado',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Cidadão atualizado com sucesso',
    type: CidadaoResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Cidadão não encontrado',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 409,
    description: 'CPF ou NIS já em uso',
    type: ApiErrorResponse,
  })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateCidadaoDto: UpdateCidadaoDto,
    @Request() req,
  ): Promise<CidadaoResponseDto> {
    return this.cidadaoService.update(id, updateCidadaoDto, req.user.id);
  }

  /**
   * Busca cidadão por CPF
   */
  @Get('cpf/:cpf')
  @RequiresPermission({ permissionName: 'cidadao.buscar.cpf' })
  @ApiOperation({
    summary: 'Buscar cidadão por CPF',
    description: 'Busca um cidadão pelo número do CPF (com ou sem formatação).',
  })
  @ApiParam({
    name: 'cpf',
    required: true,
    description: 'CPF do cidadão (com ou sem formatação)',
    example: '123.456.789-00',
  })
  @ApiOkResponse({
    description: 'Cidadão encontrado com sucesso',
    type: CidadaoResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'CPF inválido',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Cidadão não encontrado',
    type: ApiErrorResponse,
  })
  async findByCpf(@Param('cpf') cpf: string): Promise<CidadaoResponseDto> {
    return this.cidadaoService.findByCpf(cpf);
  }

  /**
   * Busca cidadão por NIS
   */
  @Get('nis/:nis')
  @RequiresPermission({ permissionName: 'cidadao.buscar.nis' })
  @ApiOperation({
    summary: 'Buscar cidadão por NIS',
    description: 'Busca um cidadão pelo número do NIS (PIS/PASEP).',
  })
  @ApiParam({
    name: 'nis',
    required: true,
    description: 'Número do NIS (PIS/PASEP)',
    example: '12345678901',
  })
  @ApiOkResponse({
    description: 'Cidadão encontrado com sucesso',
    type: CidadaoResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'NIS inválido',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Cidadão não encontrado',
    type: ApiErrorResponse,
  })
  async findByNis(@Param('nis') nis: string): Promise<CidadaoResponseDto> {
    return this.cidadaoService.findByNis(nis);
  }

  /**
   * Obtém histórico de solicitações de um cidadão
   */
  @Get(':id/solicitacao')
  @ApiOperation({ summary: 'Histórico de solicitações' })
  @ApiResponse({ status: 200, description: 'Histórico retornado com sucesso' })
  @ApiResponse({ status: 404, description: 'Cidadão não encontrado' })
  @RequiresPermission({
    permissionName: 'cidadao.visualizar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'cidadao.unidadeId',
  })
  @RequiresPermission({ permissionName: 'solicitacao.listar' })
  async findSolicitacoes(@Param('id') id: string) {
    return this.cidadaoService.findSolicitacoesByCidadaoId(id);
  }

  /**
   * Adiciona membro à composição familiar
   */
  @Post(':id/composicao')
  @ApiOperation({ summary: 'Adicionar membro à composição familiar' })
  @ApiResponse({ status: 201, description: 'Membro adicionado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Cidadão não encontrado' })
  @RequiresPermission({
    permissionName: 'cidadao.editar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'cidadao.unidadeId',
  })
  async addComposicaoFamiliar(
    @Param('id') id: string,
    @Body() createComposicaoFamiliarDto: CreateComposicaoFamiliarDto,
    @Request() req,
  ) {
    return this.cidadaoService.addComposicaoFamiliar(
      id,
      createComposicaoFamiliarDto,
      req.user.id,
    );
  }
}
