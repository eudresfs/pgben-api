import { Controller, Get, Post, Body, Put, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CidadaoService } from '../services/cidadao.service';
import { CreateCidadaoDto } from '../dto/create-cidadao.dto';
import { UpdateCidadaoDto } from '../dto/update-cidadao.dto';
import { CreateComposicaoFamiliarDto } from '../dto/create-composicao-familiar.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';

/**
 * Controlador de cidadãos
 * 
 * Responsável por gerenciar as rotas relacionadas a cidadãos/beneficiários
 */
@ApiTags('cidadaos')
@Controller('cidadao')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CidadaoController {
  constructor(private readonly cidadaoService: CidadaoService) {}

  /**
   * Lista todos os cidadãos com filtros e paginação
   */
  @Get()
  @ApiOperation({ summary: 'Listar cidadãos' })
  @ApiResponse({ status: 200, description: 'Lista de cidadãos retornada com sucesso' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página atual' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Termo de busca (nome)' })
  @ApiQuery({ name: 'bairro', required: false, type: String, description: 'Filtro por bairro' })
  async findAll(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('bairro') bairro?: string,
  ) {
    return this.cidadaoService.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
      bairro,
      unidadeId: req.user.unidadeId,
    });
  }

  /**
   * Obtém detalhes de um cidadão específico
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de um cidadão' })
  @ApiResponse({ status: 200, description: 'Cidadão encontrado com sucesso' })
  @ApiResponse({ status: 404, description: 'Cidadão não encontrado' })
  async findOne(@Param('id') id: string) {
    return this.cidadaoService.findById(id);
  }

  /**
   * Cria um novo cidadão
   */
  @Post()
  @ApiOperation({ summary: 'Criar novo cidadão' })
  @ApiResponse({ status: 201, description: 'Cidadão criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 409, description: 'CPF ou NIS já em uso' })
  async create(@Body() createCidadaoDto: CreateCidadaoDto, @Request() req) {
    return this.cidadaoService.create(createCidadaoDto, req.user.unidadeId);
  }

  /**
   * Atualiza um cidadão existente
   */
  @Put(':id')
  @ApiOperation({ summary: 'Atualizar cidadão existente' })
  @ApiResponse({ status: 200, description: 'Cidadão atualizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Cidadão não encontrado' })
  @ApiResponse({ status: 409, description: 'CPF ou NIS já em uso' })
  async update(@Param('id') id: string, @Body() updateCidadaoDto: UpdateCidadaoDto) {
    return this.cidadaoService.update(id, updateCidadaoDto);
  }

  /**
   * Busca cidadão por CPF
   */
  @Get('cpf/:cpf')
  @ApiOperation({ summary: 'Buscar cidadão por CPF' })
  @ApiResponse({ status: 200, description: 'Cidadão encontrado com sucesso' })
  @ApiResponse({ status: 404, description: 'Cidadão não encontrado' })
  async findByCpf(@Param('cpf') cpf: string) {
    return this.cidadaoService.findByCpf(cpf);
  }

  /**
   * Busca cidadão por NIS
   */
  @Get('nis/:nis')
  @ApiOperation({ summary: 'Buscar cidadão por NIS' })
  @ApiResponse({ status: 200, description: 'Cidadão encontrado com sucesso' })
  @ApiResponse({ status: 404, description: 'Cidadão não encontrado' })
  async findByNis(@Param('nis') nis: string) {
    return this.cidadaoService.findByNis(nis);
  }

  /**
   * Obtém histórico de solicitações de um cidadão
   */
  @Get(':id/solicitacao')
  @ApiOperation({ summary: 'Histórico de solicitações' })
  @ApiResponse({ status: 200, description: 'Histórico retornado com sucesso' })
  @ApiResponse({ status: 404, description: 'Cidadão não encontrado' })
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
  async addComposicaoFamiliar(
    @Param('id') id: string,
    @Body() createComposicaoFamiliarDto: CreateComposicaoFamiliarDto,
  ) {
    return this.cidadaoService.addComposicaoFamiliar(id, createComposicaoFamiliarDto);
  }
}
