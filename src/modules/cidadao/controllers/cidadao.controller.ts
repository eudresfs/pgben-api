import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Put,
  ParseUUIDPipe,
  DefaultValuePipe,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { CreateCidadaoDto } from '../dto/create-cidadao.dto';
import { CidadaoService } from '../services/cidadao.service';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { ScopeType } from '../../../entities/user-permission.entity';
import {
  CidadaoResponseDto,
  CidadaoPaginatedResponseDto,
} from '../dto/cidadao-response.dto';

@ApiTags('Cidadão')
@Controller('cidadao')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CidadaoController {
  constructor(private readonly cidadaoService: CidadaoService) {}

  @Get()
  @RequiresPermission({
    permissionName: 'cidadao.listar',
    scopeType: ScopeType.UNIT
  })
  @ApiOperation({ summary: 'Listar cidadãos' })
  @ApiResponse({ status: 200, type: CidadaoPaginatedResponseDto })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'bairro', required: false, type: String })
  @ApiQuery({ name: 'includeRelations', required: false, type: Boolean })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('unidade_id') unidade_id?: string,
    @Query('search') search?: string,
    @Query('bairro') bairro?: string,
    @Query('includeRelations', new DefaultValuePipe(false)) includeRelations?: boolean,
  ): Promise<CidadaoPaginatedResponseDto> {
    
    // Log para debug
    console.log('🎯 Controller params:', {
      page,
      limit,
      search,
      bairro,
      unidade_id,
      includeRelations
    });

    return this.cidadaoService.findAll({
      page,
      limit,
      search,
      bairro,
      unidade_id,
      includeRelations,
    });
  }

  @Get(':id')
  @RequiresPermission({
    permissionName: 'cidadao.visualizar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'cidadao.unidadeId',
  })
  @ApiOperation({ summary: 'Obter cidadão por ID' })
  @ApiParam({ name: 'id', description: 'ID do cidadão' })
  @ApiQuery({ name: 'includeRelations', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: CidadaoResponseDto })
  @ApiResponse({ status: 404, description: 'Cidadão não encontrado' })
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query('includeRelations', new DefaultValuePipe(false)) includeRelations: boolean,
  ): Promise<CidadaoResponseDto> {
    return this.cidadaoService.findById(id, includeRelations);
  }

  @Post()
  @RequiresPermission({
    permissionName: 'cidadao.criar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'user.unidadeId',
  })
  @ApiOperation({ summary: 'Criar cidadão' })
  @ApiResponse({ status: 201, type: CidadaoResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 409, description: 'CPF ou NIS já cadastrado' })
  async create(
    @Body() createCidadaoDto: CreateCidadaoDto,
    @Request() req,
  ): Promise<CidadaoResponseDto> {
    return this.cidadaoService.create(
      createCidadaoDto,
      req.user.unidade_id,
      req.user.id,
    );
  }

  @Put(':id')
  @RequiresPermission({
    permissionName: 'cidadao.editar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'cidadao.unidadeId',
  })
  @ApiOperation({ summary: 'Atualizar cidadão' })
  @ApiParam({ name: 'id', description: 'ID do cidadão' })
  @ApiResponse({ status: 200, type: CidadaoResponseDto })
  @ApiResponse({ status: 404, description: 'Cidadão não encontrado' })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateCidadaoDto: CreateCidadaoDto,
    @Request() req,
  ): Promise<CidadaoResponseDto> {
    return this.cidadaoService.update(id, updateCidadaoDto, req.user.id);
  }

  @Get('cpf/:cpf')
  @RequiresPermission({ permissionName: 'cidadao.buscar.cpf' })
  @ApiOperation({ summary: 'Buscar cidadão por CPF' })
  @ApiParam({ name: 'cpf', description: 'CPF do cidadão' })
  @ApiResponse({ status: 200, type: CidadaoResponseDto })
  @ApiResponse({ status: 404, description: 'Cidadão não encontrado' })
  async findByCpf(@Param('cpf') cpf: string): Promise<CidadaoResponseDto> {
    return this.cidadaoService.findByCpf(cpf, true);
  }

  @Get('nis/:nis')
  @RequiresPermission({ permissionName: 'cidadao.buscar.nis' })
  @ApiOperation({ summary: 'Buscar cidadão por NIS' })
  @ApiParam({ name: 'nis', description: 'NIS do cidadão' })
  @ApiResponse({ status: 200, type: CidadaoResponseDto })
  @ApiResponse({ status: 404, description: 'Cidadão não encontrado' })
  async findByNis(@Param('nis') nis: string): Promise<CidadaoResponseDto> {
    return this.cidadaoService.findByNis(nis, true);
  }
}