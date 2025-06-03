import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { BeneficioService } from '../services/beneficio.service';
import { CreateTipoBeneficioDto } from '../dto/create-tipo-beneficio.dto';
import { UpdateTipoBeneficioDto } from '../dto/update-tipo-beneficio.dto';
import { CreateRequisitoDocumentoDto } from '../dto/create-requisito-documento.dto';
import { ConfigurarFluxoDto } from '../dto/configurar-fluxo.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { ScopeType } from '../../../entities';

/**
 * Controlador de benefícios
 *
 * Responsável por gerenciar as rotas relacionadas a tipos de benefícios
 */
@ApiTags('Benefícios')
@Controller('beneficio')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class BeneficioController {
  constructor(private readonly beneficioService: BeneficioService) {}

  /**
   * Lista todos os tipos de benefícios
   */
  @Get()
  @RequiresPermission({ 
    permissionName: 'beneficio.listar',  
    scopeType: ScopeType.GLOBAL 
  })
  @ApiOperation({ 
    summary: 'Listar tipos de benefícios',
    description: 'Retorna uma lista paginada de todos os tipos de benefícios cadastrados no sistema.'
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de benefícios retornada com sucesso',
    content: {
      'application/json': {
        example: ""
      }
    }
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
    description: 'Termo de busca (nome)',
  })
  @ApiQuery({
    name: 'ativo',
    required: false,
    type: Boolean,
    description: 'Filtro por status',
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('ativo') ativo?: boolean,
  ) {
    return this.beneficioService.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
      ativo: ativo !== undefined ? ativo : undefined,
    });
  }

  /**
   * Obtém detalhes de um tipo de benefício específico
   */
  @Get(':id')
  @RequiresPermission(
  
  { permissionName: 'beneficio.visualizar', scopeType: ScopeType.GLOBAL
  })
  @ApiOperation({ 
    summary: 'Obter detalhes de um benefício',
    description: 'Retorna os detalhes completos de um tipo de benefício específico.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Benefício encontrado com sucesso',
    content: {
      'application/json': {
        example: ""
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Benefício não encontrado',
    content: {
      'application/json': {
        example: ""
      }
    }
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.beneficioService.findById(id);
  }

  /**
   * Cria um novo tipo de benefício
   */
  @Post()
  @RequiresPermission(
    
    {
      permissionName: 'beneficio.criar',
      scopeType: ScopeType.GLOBAL
    }
  )
  @ApiOperation({ 
    summary: 'Criar novo tipo de benefício',
    description: 'Cria um novo tipo de benefício no sistema.'
  })
  @ApiBody({
    type: CreateTipoBeneficioDto,
    examples: {
      'Auxílio Emergencial': {
        value: ""
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Benefício criado com sucesso',
    content: {
      'application/json': {
        example: ""
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Dados inválidos',
    content: {
      'application/json': {
        example: ""
      }
    }
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Nome já em uso',
    content: {
      'application/json': {
        example: ""
      }
    }
  })
  async create(@Body() createTipoBeneficioDto: CreateTipoBeneficioDto) {
    return this.beneficioService.create(createTipoBeneficioDto);
  }

  /**
   * Atualiza um tipo de benefício existente
   */
  @Put(':id')
  @RequiresPermission(
    
    {
      permissionName: 'beneficio.editar',
      scopeType: ScopeType.GLOBAL
    }
  )
  @ApiOperation({ 
    summary: 'Atualizar tipo de benefício existente',
    description: 'Atualiza os dados de um tipo de benefício existente.'
  })
  @ApiBody({
    type: UpdateTipoBeneficioDto,
    examples: {
      'Atualização de Benefício': {
        value: ""
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Benefício atualizado com sucesso',
    content: {
      'application/json': {
        example: ""
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Dados inválidos',
    content: {
      'application/json': {
        example: ""
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Benefício não encontrado',
    content: {
      'application/json': {
        example: ""
      }
    }
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Nome já em uso',
    content: {
      'application/json': {
        example: ""
      }
    }
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTipoBeneficioDto: UpdateTipoBeneficioDto,
  ) {
    return this.beneficioService.update(id, updateTipoBeneficioDto);
  }

  /**
   * Lista requisitos documentais de um benefício
   */
  @Get(':id/requisitos')
  @RequiresPermission(
    
    {
      permissionName: 'beneficio.requisito.listar',
      scopeType: ScopeType.GLOBAL
    }
  )
  @ApiOperation({ summary: 'Listar requisitos documentais' })
  @ApiResponse({
    status: 200,
    description: 'Lista de requisitos retornada com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Benefício não encontrado' })
  async findRequisitos(@Param('id', ParseUUIDPipe) id: string) {
    return this.beneficioService.findRequisitosByBeneficioId(id);
  }

  /**
   * Adiciona requisito documental a um benefício
   */
  @Post(':id/requisitos')
  @RequiresPermission(
    
    {
      permissionName: 'beneficio.requisito.adicionar',
      scopeType: ScopeType.GLOBAL
    }
  )
  @ApiOperation({ summary: 'Adicionar requisito documental' })
  @ApiResponse({ status: 201, description: 'Requisito adicionado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Benefício não encontrado' })
  async addRequisito(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createRequisitoDocumentoDto: CreateRequisitoDocumentoDto,
  ) {
    return this.beneficioService.addRequisito(id, createRequisitoDocumentoDto);
  }

  /**
   * Configura fluxo de aprovação de um benefício
   */
  @Put(':id/fluxo')
  @RequiresPermission(
    
    {
      permissionName: 'beneficio.fluxo.configurar',
      scopeType: ScopeType.GLOBAL
    }
  )
  @ApiOperation({ summary: 'Configurar fluxo de aprovação' })
  @ApiResponse({ status: 200, description: 'Fluxo configurado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Benefício não encontrado' })
  async configurarFluxo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() configurarFluxoDto: ConfigurarFluxoDto,
  ) {
    return this.beneficioService.configurarFluxo(id, configurarFluxoDto);
  }
}
