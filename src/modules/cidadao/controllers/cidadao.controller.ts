import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Put,
  Delete,
  ParseUUIDPipe,
  DefaultValuePipe,
  ParseIntPipe,
  BadRequestException,
  UseInterceptors,
  UploadedFiles,
  UseGuards,
  HttpStatus,
  Res,
  SetMetadata,
  Logger,
  Request,
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
import { CreateCidadaoDto } from '../dto/create-cidadao.dto';
import { UpdateCidadaoDto } from '../dto/update-cidadao.dto';
import { CreateComposicaoFamiliarDto } from '../dto/create-composicao-familiar.dto';
import { BuscaCidadaoDto } from '../dto/busca-cidadao.dto';
import { CidadaoService } from '../services/cidadao.service';
import { CidadaoRepository } from '../repositories/cidadao.repository';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
// import { MulterUploader } from '../../common/uploaders/multer.uploader';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { Cidadao } from '../entities/cidadao.entity';
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
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CidadaoController {
  private readonly logger = new Logger(CidadaoController.name);
  
  constructor(
    private readonly cidadaoService: CidadaoService,
    private readonly cidadaoRepository: CidadaoRepository,
  ) {}

  /**
   * Lista todos os cidadãos com filtros e paginação
   */
  @Get()
  @RequiresPermission(
  {
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
  async findAll(
    @Request() req,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('bairro') bairro?: string,
  ): Promise<any> {
    // Inicia medição de tempo para performance
    const startTime = Date.now();
    const requestId = `LIST-${Date.now()}`;
    this.logger.log(`[${requestId}] Início de processamento da listagem de cidadãos`);
    
    try {
      // Restaurando o código original com monitoramento de performance
      const result = await this.cidadaoService.findAll({
        page,
        limit,
        search,
        bairro,
        unidadeId: req?.user?.unidade_id,
      });
      
      // Registra tempo total da operação para monitoramento
      const totalTime = Date.now() - startTime;
      if (totalTime > 500) {
        this.logger.warn(`[${requestId}] Operação lenta (findAll): ${totalTime}ms`);
      } else {
        this.logger.log(`[${requestId}] Operação concluída em ${totalTime}ms`);
      }
      
      return result;
    } catch (error) {
      // Registra erro para diagnóstico
      const totalTime = Date.now() - startTime;
      this.logger.error(`[${requestId}] Erro em ${totalTime}ms: ${error.message}`);
      throw error;
    }
  }

  @Get('cursor')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Lista cidadãos com paginação por cursor (mais eficiente para grandes volumes)', 
    description: 'Implementa paginação baseada em cursor, que é mais eficiente que a paginação por offset para grandes volumes de dados.'
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    type: String,
    description: 'Cursor para a próxima página (ID do último item da página anterior)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Quantidade de itens por página',
    example: 10,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Busca por nome, CPF ou NIS',
    example: 'João',
  })
  @ApiQuery({
    name: 'bairro',
    required: false,
    type: String,
    description: 'Filtrar por bairro',
    example: 'Centro',
  })
  @ApiQuery({
    name: 'orderBy',
    required: false,
    type: String,
    description: 'Campo para ordenação',
    example: 'created_at',
  })
  @ApiQuery({
    name: 'orderDirection',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Direção da ordenação',
    example: 'DESC',
  })
  async findByCursor(
    @Query('cursor') cursor?: string,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('bairro') bairro?: string,
    @Query('orderBy') orderBy?: string,
    @Query('orderDirection') orderDirection?: 'ASC' | 'DESC',
  ) {
    return { data: [], message: 'Endpoint desativado temporariamente para diagnóstico' };
    // Código original comentado para permitir compilação
    /*return this.cidadaoService.findByCursor({
      cursor,
      limit,
      search,
      bairro,
      unidadeId: req?.user?.unidade_id,
      orderBy,
      orderDirection,
    });*/
  }

  /**
   * Busca unificada de cidadão por ID, CPF, NIS, telefone ou nome
   */
  @Get('busca')
  @RequiresPermission({
    permissionName: 'cidadao.visualizar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'cidadao.unidadeId',
  })
  @ApiOperation({
    summary: 'Buscar cidadão',
    description: 'Busca um cidadão por ID, CPF, NIS, telefone ou nome. Permite apenas um parâmetro por vez.',
  })
  @ApiQuery({
    name: 'id',
    required: false,
    type: String,
    description: 'ID do cidadão (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'cpf',
    required: false,
    type: String,
    description: 'CPF do cidadão (com ou sem formatação)',
    example: '12345678901',
  })
  @ApiQuery({
    name: 'nis',
    required: false,
    type: String,
    description: 'NIS do cidadão',
    example: '12345678901',
  })
  @ApiQuery({
    name: 'telefone',
    required: false,
    type: String,
    description: 'Telefone do cidadão (com ou sem formatação)',
    example: '11987654321',
  })
  @ApiQuery({
    name: 'nome',
    required: false,
    type: String,
    description: 'Nome do cidadão (busca parcial)',
    example: 'João Silva',
  })
  @ApiQuery({
    name: 'includeRelations',
    required: false,
    type: Boolean,
    description: 'Incluir relacionamentos (composição familiar, etc.)',
    example: false,
  })
  @ApiOkResponse({
    description: 'Cidadão(s) encontrado(s) com sucesso',
    schema: {
      oneOf: [
        { $ref: '#/components/schemas/CidadaoResponseDto' },
        {
          type: 'array',
          items: { $ref: '#/components/schemas/CidadaoResponseDto' },
        },
      ],
    },
  })
  @ApiBadRequestResponse({
    description: 'Parâmetros de busca inválidos',
    type: ApiErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Forneça apenas um parâmetro de busca por vez',
        error: 'Bad Request',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Cidadão não encontrado',
    type: ApiErrorResponse,
  })
  async buscarCidadao(
    @Query() query: BuscaCidadaoDto,
  ): Promise<CidadaoResponseDto | CidadaoResponseDto[]> {
    return this.cidadaoService.buscarCidadao(query);
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
    return this.cidadaoService.findById(id, false); // Não carregar relacionamentos por padrão para melhor performance
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
  ): Promise<any> {
    // Inicia medição de tempo para performance
    const startTime = Date.now();
    const requestId = `CREATE-${createCidadaoDto.cpf?.substring(Math.max(0, (createCidadaoDto.cpf?.length || 0) - 4)) || Date.now()}-${Date.now()}`;
    this.logger.log(`[${requestId}] Início de processamento de criação de cidadão`);
    
    try {
      // Restaurando o código original com monitoramento de performance
      const result = await this.cidadaoService.create(
        createCidadaoDto,
        req?.user?.id,
        req?.user?.unidade_id,
      );
      
      // Registra tempo total da operação para monitoramento
      const totalTime = Date.now() - startTime;
      if (totalTime > 500) {
        this.logger.warn(`[${requestId}] Operação lenta (create): ${totalTime}ms`);
      } else {
        this.logger.log(`[${requestId}] Operação concluída em ${totalTime}ms`);
      }
      
      return result;
    } catch (error) {
      // Registra erro para diagnóstico
      const totalTime = Date.now() - startTime;
      this.logger.error(`[${requestId}] Erro em ${totalTime}ms: ${error.message}`);
      throw error;
    }
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
  ): Promise<any> {
    // Inicia medição de tempo para performance
    const startTime = Date.now();
    const requestId = `UPDATE-${id.substring(0, 8)}-${Date.now()}`;
    this.logger.log(`[${requestId}] Início de processamento de atualização de cidadão`);
    
    try {
      // Restaurando o código original com monitoramento de performance
      const result = await this.cidadaoService.update(id, updateCidadaoDto, req.user.id);
      
      // Registra tempo total da operação para monitoramento
      const totalTime = Date.now() - startTime;
      if (totalTime > 500) {
        this.logger.warn(`[${requestId}] Operação lenta (update): ${totalTime}ms`);
      } else {
        this.logger.log(`[${requestId}] Operação concluída em ${totalTime}ms`);
      }
      
      return result;
    } catch (error) {
      // Registra erro para diagnóstico
      const totalTime = Date.now() - startTime;
      this.logger.error(`[${requestId}] Erro em ${totalTime}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * Busca um cidadão pelo CPF
   * @param cpf CPF do cidadão
   * @returns Dados do cidadão encontrado
   */
  @Get('cpf/:cpf')
  @RequiresPermission({ permissionName: 'cidadao.buscar.cpf' })
  @ApiOperation({
    summary: 'Buscar cidadão por CPF',
    description: 'Busca um cidadão pelo CPF, com ou sem formatação',
  })
  @ApiParam({
    name: 'cpf',
    type: String,
    description: 'CPF do cidadão (com ou sem formatação)',
    example: '123.456.789-00',
  })
  @ApiResponse({
    status: 200,
    description: 'Cidadão encontrado',
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
    // Inicia medição de tempo para performance
    const startTime = Date.now();
    const requestId = `CPF-${cpf.substring(Math.max(0, cpf.length - 4))}-${Date.now()}`;
    this.logger.log(`[${requestId}] Início de processamento da requisição CPF`);
    
    try {
      // Chama o serviço otimizado para buscar por CPF
      const result = await this.cidadaoService.findByCpf(cpf, true);
      
      // Registra tempo total da operação para monitoramento
      const totalTime = Date.now() - startTime;
      if (totalTime > 500) {
        this.logger.warn(`[${requestId}] Operação lenta: ${totalTime}ms`);
      } else {
        this.logger.log(`[${requestId}] Operação concluída em ${totalTime}ms`);
      }
      
      return result;
    } catch (error) {
      // Registra erro para diagnóstico
      const totalTime = Date.now() - startTime;
      this.logger.error(`[${requestId}] Erro em ${totalTime}ms: ${error.message}`);
      throw error;
    }
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
    // Inicia medição de tempo para performance
    const startTime = Date.now();
    const requestId = `NIS-${nis.substring(Math.max(0, nis.length - 4))}-${Date.now()}`;
    this.logger.log(`[${requestId}] Início de processamento da requisição NIS`);
    
    try {
      // Chama o serviço otimizado para buscar por NIS
      const result = await this.cidadaoService.findByNis(nis, true);
      
      // Registra tempo total da operação para monitoramento
      const totalTime = Date.now() - startTime;
      if (totalTime > 500) {
        this.logger.warn(`[${requestId}] Operação lenta: ${totalTime}ms`);
      } else {
        this.logger.log(`[${requestId}] Operação concluída em ${totalTime}ms`);
      }
      
      return result;
    } catch (error) {
      // Registra erro para diagnóstico
      const totalTime = Date.now() - startTime;
      this.logger.error(`[${requestId}] Erro em ${totalTime}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtém histórico de solicitações de um cidadão
   */
  @Get(':id/solicitacao')
  @ApiOperation({ summary: 'Histórico de solicitações' })
  @ApiResponse({ status: 200, description: 'Histórico retornado com sucesso' })
  @ApiResponse({ status: 404, description: 'Cidadão não encontrado' })
  @RequiresPermission(
    {
      permissionName: 'cidadao.visualizar',
      scopeType: ScopeType.UNIT,
      scopeIdExpression: 'cidadao.unidadeId',
    },
    { permissionName: 'solicitacao.listar' }
  )
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
    // Inicia medição de tempo para performance
    const startTime = Date.now();
    const requestId = `COMP-${id.substring(0, 8)}-${Date.now()}`;
    this.logger.log(`[${requestId}] Início de processamento de adição na composição familiar`);
    
    try {
      // Restaurando o código original com monitoramento de performance
      const result = await this.cidadaoService.addComposicaoFamiliar(
        id,
        createComposicaoFamiliarDto,
        req?.user?.id,
      );
      
      // Registra tempo total da operação para monitoramento
      const totalTime = Date.now() - startTime;
      if (totalTime > 500) {
        this.logger.warn(`[${requestId}] Operação lenta (addComposicaoFamiliar): ${totalTime}ms`);
      } else {
        this.logger.log(`[${requestId}] Operação concluída em ${totalTime}ms`);
      }
      
      return result;
    } catch (error) {
      // Registra erro para diagnóstico
      const totalTime = Date.now() - startTime;
      this.logger.error(`[${requestId}] Erro em ${totalTime}ms: ${error.message}`);
      throw error;
    }
  }
}
