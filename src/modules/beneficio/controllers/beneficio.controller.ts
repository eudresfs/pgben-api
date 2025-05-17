import {
  Controller,
  Get,
  Post,
  Body,
  Put,
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
import { BeneficioService } from '../services/beneficio.service';
import { CreateTipoBeneficioDto } from '../dto/create-tipo-beneficio.dto';
import { UpdateTipoBeneficioDto } from '../dto/update-tipo-beneficio.dto';
import { CreateRequisitoDocumentoDto } from '../dto/create-requisito-documento.dto';
import { ConfigurarFluxoDto } from '../dto/configurar-fluxo.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/role.decorator';
import { Role } from '../../../shared/enums/role.enum';

/**
 * Controlador de benefícios
 *
 * Responsável por gerenciar as rotas relacionadas a tipos de benefícios
 */
@ApiTags('beneficios')
@Controller('beneficio')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BeneficioController {
  constructor(private readonly beneficioService: BeneficioService) {}

  /**
   * Lista todos os tipos de benefícios
   */
  @Get()
  @ApiOperation({ summary: 'Listar tipos de benefícios' })
  @ApiResponse({
    status: 200,
    description: 'Lista de benefícios retornada com sucesso',
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
  @ApiOperation({ summary: 'Obter detalhes de um benefício' })
  @ApiResponse({ status: 200, description: 'Benefício encontrado com sucesso' })
  @ApiResponse({ status: 404, description: 'Benefício não encontrado' })
  async findOne(@Param('id') id: string) {
    return this.beneficioService.findById(id);
  }

  /**
   * Cria um novo tipo de benefício
   */
  @Post()
  @Roles(Role.ADMIN, Role.GESTOR_SEMTAS)
  @ApiOperation({ summary: 'Criar novo tipo de benefício' })
  @ApiResponse({ status: 201, description: 'Benefício criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 409, description: 'Nome já em uso' })
  async create(@Body() createTipoBeneficioDto: CreateTipoBeneficioDto) {
    return this.beneficioService.create(createTipoBeneficioDto);
  }

  /**
   * Atualiza um tipo de benefício existente
   */
  @Put(':id')
  @Roles(Role.ADMIN, Role.GESTOR_SEMTAS)
  @ApiOperation({ summary: 'Atualizar tipo de benefício existente' })
  @ApiResponse({ status: 200, description: 'Benefício atualizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Benefício não encontrado' })
  @ApiResponse({ status: 409, description: 'Nome já em uso' })
  async update(
    @Param('id') id: string,
    @Body() updateTipoBeneficioDto: UpdateTipoBeneficioDto,
  ) {
    return this.beneficioService.update(id, updateTipoBeneficioDto);
  }

  /**
   * Lista requisitos documentais de um benefício
   */
  @Get(':id/requisitos')
  @ApiOperation({ summary: 'Listar requisitos documentais' })
  @ApiResponse({
    status: 200,
    description: 'Lista de requisitos retornada com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Benefício não encontrado' })
  async findRequisitos(@Param('id') id: string) {
    return this.beneficioService.findRequisitosByBeneficioId(id);
  }

  /**
   * Adiciona requisito documental a um benefício
   */
  @Post(':id/requisitos')
  @Roles(Role.ADMIN, Role.GESTOR_SEMTAS)
  @ApiOperation({ summary: 'Adicionar requisito documental' })
  @ApiResponse({ status: 201, description: 'Requisito adicionado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Benefício não encontrado' })
  async addRequisito(
    @Param('id') id: string,
    @Body() createRequisitoDocumentoDto: CreateRequisitoDocumentoDto,
  ) {
    return this.beneficioService.addRequisito(id, createRequisitoDocumentoDto);
  }

  /**
   * Configura fluxo de aprovação de um benefício
   */
  @Put(':id/fluxo')
  @Roles(Role.ADMIN, Role.GESTOR_SEMTAS)
  @ApiOperation({ summary: 'Configurar fluxo de aprovação' })
  @ApiResponse({ status: 200, description: 'Fluxo configurado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Benefício não encontrado' })
  async configurarFluxo(
    @Param('id') id: string,
    @Body() configurarFluxoDto: ConfigurarFluxoDto,
  ) {
    return this.beneficioService.configurarFluxo(id, configurarFluxoDto);
  }
}
