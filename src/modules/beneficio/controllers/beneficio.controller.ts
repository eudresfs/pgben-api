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
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { BeneficioService } from '../services/beneficio.service';
import { CreateTipoBeneficioDto } from '../dto/create-tipo-beneficio.dto';
import { UpdateTipoBeneficioDto } from '../dto/update-tipo-beneficio.dto';
import { CreateRequisitoDocumentoDto } from '../dto/create-requisito-documento.dto';
import { UpdateRequisitoDocumentoDto } from '../dto/update-requisito-documento.dto';
import { BeneficioFiltrosAvancadosDto, BeneficioFiltrosResponseDto } from '../dto/beneficio-filtros-avancados.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { ScopeType } from '../../../entities';
import { QueryOptimization } from '../../../common/interceptors/query-optimization.interceptor';
import { AuditEventEmitter } from '../../auditoria/events/emitters/audit-event.emitter';
import { AuditEventType, RiskLevel } from '../../auditoria/events/types/audit-event.types';
import { ReqContext } from '../../../shared/request-context/req-context.decorator';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { Usuario } from '../../../entities/usuario.entity';
import { Status } from '@/enums';

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
  constructor(
    private readonly beneficioService: BeneficioService,
    private readonly auditEventEmitter: AuditEventEmitter,
  ) {}

  /**
   * Lista todos os tipos de benefícios
   */
  @Get()
  @QueryOptimization({
    enablePagination: true,
    maxLimit: 100,
    enableCaching: true,
    cacheTTL: 300,
  })
  @ApiOperation({
    summary: 'Listar tipos de benefícios',
    description:
      'Retorna uma lista paginada de todos os tipos de benefícios cadastrados no sistema.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de benefícios retornada com sucesso',
    content: {
      'application/json': {
        example: '',
      },
    },
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
    @Query('status') status?: Status,
  ) {
    return this.beneficioService.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
      status,
    });
  }

  /**
   * Busca avançada de benefícios com múltiplos filtros
   */
  @Post('filtros-avancados')
  @RequiresPermission({
    permissionName: 'beneficio.listar',
    scopeType: ScopeType.GLOBAL,
  })
  @QueryOptimization({
    enablePagination: true,
    maxLimit: 100,
    enableCaching: true,
    cacheTTL: 300,
  })
  @ApiOperation({
    summary: 'Busca avançada de benefícios',
    description:
      'Permite buscar benefícios com múltiplos critérios de filtro, incluindo status, periodicidade, valores, datas e busca textual. Suporta paginação e inclusão de relacionamentos.',
  })
  @ApiBody({
    type: BeneficioFiltrosAvancadosDto,
    description: 'Critérios de filtro para busca avançada',
    examples: {
      'Filtro Básico': {
        summary: 'Busca simples por status e periodicidade',
        value: {
          page: 1,
          limit: 10,
          status: ['ativo'],
          periodicidade: ['mensal'],
        },
      },
      'Filtro Completo': {
        summary: 'Busca com múltiplos critérios',
        value: {
          page: 1,
          limit: 20,
          status: ['ativo'],
          periodicidade: ['mensal', 'unico'],
          valor_min: 100,
          valor_max: 1000,
          search: 'auxílio',
          include_relations: ['requisito_documento'],
          created_at_inicio: '2024-01-01T00:00:00.000Z',
          created_at_fim: '2024-12-31T23:59:59.999Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Busca realizada com sucesso',
    type: BeneficioFiltrosResponseDto,
    content: {
      'application/json': {
        example: {
          items: [],
          total: 0,
          filtros_aplicados: {
            status: ['ativo'],
            periodicidade: ['mensal'],
            valor_min: 100,
            valor_max: 1000,
          },
          meta: {
            limit: 10,
            offset: 0,
            page: 1,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
          tempo_execucao: 150,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Parâmetros de filtro inválidos',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado',
  })
  async filtrosAvancados(
    @Body() filtros: BeneficioFiltrosAvancadosDto,
    @GetUser() usuario: Usuario,
    @ReqContext() context: any,
  ): Promise<BeneficioFiltrosResponseDto> {
    const startTime = Date.now();

    // Emitir evento de auditoria
    this.auditEventEmitter.emit({
      eventId: this.generateEventId(),
      eventType: AuditEventType.BUSINESS_OPERATION,
      entityName: 'TipoBeneficio',
      userId: usuario.id,
      timestamp: new Date(),
      riskLevel: RiskLevel.LOW,
      lgpdRelevant: false,
      metadata: {
        filtros_aplicados: filtros,
        modulo: 'beneficio',
        endpoint: '/beneficio/filtros-avancados',
        userEmail: usuario.email,
      },
      ip: context?.ip,
      userAgent: context?.userAgent,
    });

    const resultado = await this.beneficioService.filtrosAvancados(filtros);

    const endTime = Date.now();
    resultado.tempo_execucao = endTime - startTime;

    return resultado;
  }

  /**
   * Obtém detalhes de um tipo de benefício específico
   */
  @Get(':id')
  @QueryOptimization({
    enableCaching: true,
    cacheTTL: 600,
  })
  @ApiOperation({
    summary: 'Obter detalhes de um benefício',
    description:
      'Retorna os detalhes completos de um tipo de benefício específico.',
  })
  @ApiResponse({
    status: 200,
    description: 'Benefício encontrado com sucesso',
    content: {
      'application/json': {
        example: '',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Benefício não encontrado',
    content: {
      'application/json': {
        example: '',
      },
    },
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.beneficioService.findById(id);
  }

  /**
   * Cria um novo tipo de benefício
   */
  @Post()
  @RequiresPermission({
    permissionName: 'beneficio.criar',
    scopeType: ScopeType.GLOBAL,
  })
  @ApiOperation({
    summary: 'Criar novo tipo de benefício',
    description: 'Cria um novo tipo de benefício no sistema.',
  })
  @ApiBody({
    type: CreateTipoBeneficioDto,
    examples: {
      'Auxílio Emergencial': {
        value: '',
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Benefício criado com sucesso',
    content: {
      'application/json': {
        example: '',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos',
    content: {
      'application/json': {
        example: '',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Nome já em uso',
    content: {
      'application/json': {
        example: '',
      },
    },
  })
  async create(
    @Body() createTipoBeneficioDto: CreateTipoBeneficioDto,
    @GetUser() usuario: Usuario,
    @ReqContext() ctx: any,
  ) {
    const result = await this.beneficioService.create(createTipoBeneficioDto);

    // Auditoria: Criação de tipo de benefício
    await this.auditEventEmitter.emitEntityCreated(
      'TipoBeneficio',
      result.id,
      {
        nome: createTipoBeneficioDto.nome,
        descricao: createTipoBeneficioDto.descricao,
        valor: createTipoBeneficioDto.valor,
        periodicidade: createTipoBeneficioDto.periodicidade,
      },
      usuario.id,
    );

    return result;
  }

  /**
   * Atualiza um tipo de benefício existente
   */
  @Put(':id')
  @RequiresPermission({
    permissionName: 'beneficio.editar',
    scopeType: ScopeType.GLOBAL,
  })
  @ApiOperation({
    summary: 'Atualizar tipo de benefício existente',
    description: 'Atualiza os dados de um tipo de benefício existente.',
  })
  @ApiBody({
    type: UpdateTipoBeneficioDto,
    examples: {
      'Atualização de Benefício': {
        value: '',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Benefício atualizado com sucesso',
    content: {
      'application/json': {
        example: '',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos',
    content: {
      'application/json': {
        example: '',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Benefício não encontrado',
    content: {
      'application/json': {
        example: '',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Nome já em uso',
    content: {
      'application/json': {
        example: '',
      },
    },
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTipoBeneficioDto: UpdateTipoBeneficioDto,
    @GetUser() usuario: Usuario,
    @ReqContext() ctx: any,
  ) {
    // Buscar estado anterior para auditoria
    const beneficioAnterior = await this.beneficioService.findById(id);

    const result = await this.beneficioService.update(
      id,
      updateTipoBeneficioDto,
    );

    // Auditoria: Atualização de tipo de benefício
    await this.auditEventEmitter.emitEntityUpdated(
      'TipoBeneficio',
      id,
      {
        nome: beneficioAnterior?.nome,
        descricao: beneficioAnterior?.descricao,
        valor: beneficioAnterior?.valor,
        periodicidade: beneficioAnterior?.periodicidade,
      },
      updateTipoBeneficioDto,
      usuario.id,
    );

    return result;
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
  async findRequisitos(@Param('id', ParseUUIDPipe) id: string) {
    return this.beneficioService.findRequisitosByBeneficioId(id);
  }

  /**
   * Adiciona requisito documental a um benefício
   */
  @Post(':id/requisitos')
  @RequiresPermission({
    permissionName: 'beneficio.requisito.adicionar',
    scopeType: ScopeType.GLOBAL,
  })
  @ApiOperation({ summary: 'Adicionar requisito documental' })
  @ApiResponse({ status: 201, description: 'Requisito adicionado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Benefício não encontrado' })
  async addRequisito(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createRequisitoDocumentoDto: CreateRequisitoDocumentoDto,
    @GetUser() usuario: Usuario,
    @ReqContext() ctx: any,
  ) {
    const result = await this.beneficioService.addRequisito(
      id,
      createRequisitoDocumentoDto,
    );

    // Auditoria: Adição de requisito documental
    await this.auditEventEmitter.emitEntityCreated(
      'RequisitoDocumento',
      result.id,
      {
        tipoBeneficioId: id,
        tipoDocumento: createRequisitoDocumentoDto.tipo_documento,
        obrigatorio: createRequisitoDocumentoDto.obrigatorio,
        descricao: createRequisitoDocumentoDto.descricao,
      },
      usuario.id,
    );

    return result;
  }

  @Put(':id/requisitos/:requisitoId')
  @ApiOperation({
    summary: 'Atualiza requisito documental',
    description: 'Atualiza um requisito documental de um tipo de benefício',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do tipo de benefício',
    example: 'uuid-do-beneficio',
  })
  @ApiParam({
    name: 'requisitoId',
    description: 'ID do requisito documental',
    example: 'uuid-do-requisito',
  })
  @ApiResponse({
    status: 200,
    description: 'Requisito atualizado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Benefício ou requisito não encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflito - tipo de documento já existe para este benefício',
  })
  async updateRequisito(
    @Param('id') id: string,
    @Param('requisitoId') requisitoId: string,
    @Body() updateRequisitoDocumentoDto: UpdateRequisitoDocumentoDto,
  ) {
    return this.beneficioService.updateRequisito(
      id,
      requisitoId,
      updateRequisitoDocumentoDto,
    );
  }

  @Delete(':id/requisitos/:requisitoId')
  @ApiOperation({
    summary: 'Remove requisito documental',
    description: 'Remove um requisito documental de um tipo de benefício',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do tipo de benefício',
    example: 'uuid-do-beneficio',
  })
  @ApiParam({
    name: 'requisitoId',
    description: 'ID do requisito documental',
    example: 'uuid-do-requisito',
  })
  @ApiResponse({
    status: 200,
    description: 'Requisito removido com sucesso',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Requisito removido com sucesso',
        },
        requisitoId: {
          type: 'string',
          example: 'uuid-do-requisito',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Benefício ou requisito não encontrado',
  })
  async removeRequisito(
    @Param('id') id: string,
    @Param('requisitoId') requisitoId: string,
  ) {
    return this.beneficioService.removeRequisito(id, requisitoId);
  }

  @Get(':id/requisitos/:requisitoId/template')
  @ApiOperation({
    summary: 'Obtém informações do template',
    description:
      'Retorna as informações do template de um requisito documental',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do tipo de benefício',
    example: 'uuid-do-beneficio',
  })
  @ApiParam({
    name: 'requisitoId',
    description: 'ID do requisito documental',
    example: 'uuid-do-requisito',
  })
  @ApiResponse({
    status: 200,
    description: 'Informações do template retornadas com sucesso',
    schema: {
      type: 'object',
      properties: {
        temTemplate: {
          type: 'boolean',
          example: true,
        },
        template_url: {
          type: 'string',
          example: 'https://storage.exemplo.com/templates/comprovante.pdf',
        },
        template_nome: {
          type: 'string',
          example: 'modelo-comprovante.pdf',
        },
        template_descricao: {
          type: 'string',
          example: 'Template padrão para comprovante de residência',
        },
        extensao: {
          type: 'string',
          example: 'pdf',
        },
        ehPdf: {
          type: 'boolean',
          example: true,
        },
        ehImagem: {
          type: 'boolean',
          example: false,
        },
        ehDocumentoOffice: {
          type: 'boolean',
          example: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Benefício ou requisito não encontrado',
  })
  async getTemplateInfo(
    @Param('id') id: string,
    @Param('requisitoId') requisitoId: string,
  ) {
    return this.beneficioService.getTemplateInfo(id, requisitoId);
  }

  /**
   * Gera um ID único para eventos de auditoria
   */
  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
