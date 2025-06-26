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
  Logger,
  Request,
  UseInterceptors,
  ParseIntPipe,
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
  ApiBadRequestResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { CacheableShort, CacheableLong } from '../../../shared/interceptors/cache.interceptor';
import { QueryOptimization } from '../../../common/interceptors/query-optimization.interceptor';
import { CreateCidadaoDto } from '../dto/create-cidadao.dto';
import { CidadaoService } from '../services/cidadao.service';
import { CidadaoRepository } from '../repositories/cidadao.repository';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { ScopeType } from '../../../entities/user-permission.entity';
import {
  CidadaoResponseDto,
  CidadaoPaginatedResponseDto,
  CidadaoComposicaoFamiliarDto,
} from '../dto/cidadao-response.dto';
import { ApiErrorResponse } from '../../../shared/dtos/api-error-response.dto';
import { GetUser } from '@/auth/decorators/get-user.decorator';
import { Usuario } from '@/entities';

/**
 * Controlador de cidadãos
 *
 * Responsável por gerenciar as rotas relacionadas a cidadãos/beneficiários
 */
@ApiTags('Cidadão')
@ApiExtraModels(CidadaoResponseDto, CidadaoComposicaoFamiliarDto)
@Controller('cidadao')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CidadaoController {
  private readonly logger = new Logger(CidadaoController.name);

  constructor(
    private readonly cidadaoService: CidadaoService,
  ) {}

  /**
   * Lista todos os cidadãos com filtros e paginação
   */
  @Get()
  @QueryOptimization({
    enablePagination: true,
    maxLimit: 100,
    enableCaching: true,
    cacheTTL: 180
  })
  @RequiresPermission({
    permissionName: 'cidadao.listar',
    scopeType: ScopeType.UNIT
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
    name: 'includeRelations',
    required: false,
    type: Boolean,
    description: 'Se deve incluir relacionamentos completos (solicitações, documentos, pagamentos, info bancária, composição familiar e dados sociais)',
    example: false,
  })
  async findAll(
    @GetUser() usuario: Usuario,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('unidade_id') unidade_id?: string,
    @Query('search') search?: string,
    @Query('bairro') bairro?: string,
    @Query('includeRelations', new DefaultValuePipe(false)) includeRelations?: boolean,
  ): Promise<any> {
    // Inicia medição de tempo para performance
    const startTime = Date.now();
    const requestId = `LIST-${Date.now()}`;
    this.logger.log(
      `[${requestId}] Início de processamento da listagem de cidadãos`,
    );

    try {
      // Definir campos baseado no includeRelations
      const shouldIncludeRelations = includeRelations === true;
      const fields = shouldIncludeRelations ? [] : ['id', 'nome', 'cpf', 'nis', 'telefone', 'endereco', 'created_at', 'unidade_id'];
      
      const result = await this.cidadaoService.findAll({
          page,
          limit,
          search,
          bairro,
          unidade_id,
          includeRelations: shouldIncludeRelations,
          useCache: true,
          fields,
        });

      // Registra tempo total da operação para monitoramento
      const totalTime = Date.now() - startTime;
      if (totalTime > 500) {
        this.logger.warn(
          `[${requestId}] Operação lenta (findAll): ${totalTime}ms`,
        );
      } else {
        this.logger.log(`[${requestId}] Operação concluída em ${totalTime}ms`);
      }

      return result;
    } catch (error) {
      // Registra erro para diagnóstico
      const totalTime = Date.now() - startTime;
      this.logger.error(
        `[${requestId}] Erro em ${totalTime}ms: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Obtém detalhes de um cidadão específico
   */
  @Get(':id')
  @QueryOptimization({
    enableCaching: true,
    cacheTTL: 600
  })
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
  @ApiQuery({
    name: 'includeRelations',
    required: false,
    description: 'Se deve incluir relacionamentos (papéis, composição familiar, solicitações e documentos)',
    type: Boolean,
    example: true,
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
    @Query('includeRelations', new DefaultValuePipe(false)) includeRelations: boolean,
  ): Promise<CidadaoResponseDto> {
    return this.cidadaoService.findById(id, includeRelations);
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
    requestBody: {
      description: 'Dados do cidadão a ser criado',
      required: true,
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/CreateCidadaoDto',
          },
          examples: {
            'cidadao-completo': {
              summary: 'Cidadão com dados completos',
              description:
                'Exemplo de criação de cidadão com todos os dados preenchidos',
              value: {
                nome: 'Maria da Silva Santos',
                cpf: '123.456.789-00',
                rg: '1234567',
                prontuario_suas: 'SUAS1234567',
                naturalidade: 'Natal',
                data_nascimento: '1985-03-15',
                sexo: 'FEMININO',
                estado_civil: 'SOLTEIRA',
                nis: '12345678901',
                telefone: '(84) 99999-9999',
                email: 'maria.silva@email.com',
                endereco: {
                  logradouro: 'Rua das Flores',
                  numero: '123',
                  complemento: 'Apto 101',
                  bairro: 'Centro',
                  cidade: 'Natal',
                  estado: 'RN',
                  cep: '59000-000',
                  ponto_referencia: 'Próximo ao Corpo de Bombeiros',
                  tempo_de_residencia: 2,
                },
                papeis: [
                  {
                    tipo_papel: 'requerente',
                    metadados: {
                      grau_parentesco: 'Responsável',
                    },
                  },
                ],
              },
            },
          },
        },
      },
    },
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
    const startTime = Date.now();

    try {
      const result = await this.cidadaoService.create(
        createCidadaoDto,
        req?.user?.unidade_id,
        req?.user?.id,
      );

      const duration = Date.now() - startTime;
      this.logger.log(`✅ Cidadão criado com sucesso em ${duration}ms`, {
        cidadaoId: result.id,
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`❌ Erro ao criar cidadão após ${duration}ms:`, {
        error: error.message,
        duration,
      });
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
    @Body() updateCidadaoDto: CreateCidadaoDto,
    @Request() req,
  ): Promise<any> {
    // Inicia medição de tempo para performance
    const startTime = Date.now();
    const requestId = `UPDATE-${id.substring(0, 8)}-${Date.now()}`;
    this.logger.log(
      `[${requestId}] Início de processamento de atualização de cidadão`,
    );

    try {
      // Restaurando o código original com monitoramento de performance
      const result = await this.cidadaoService.update(
        id,
        updateCidadaoDto,
        req.user.id,
      );

      // Registra tempo total da operação para monitoramento
      const totalTime = Date.now() - startTime;
      if (totalTime > 500) {
        this.logger.warn(
          `[${requestId}] Operação lenta (update): ${totalTime}ms`,
        );
      } else {
        this.logger.log(`[${requestId}] Operação concluída em ${totalTime}ms`);
      }

      return result;
    } catch (error) {
      // Registra erro para diagnóstico
      const totalTime = Date.now() - startTime;
      this.logger.error(
        `[${requestId}] Erro em ${totalTime}ms: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Busca um cidadão pelo CPF
   * @param cpf CPF do cidadão
   * @returns Dados do cidadão encontrado
   */
  @Get('cpf/:cpf')
  @CacheableLong({ includeQuery: false })
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
      this.logger.error(
        `[${requestId}] Erro em ${totalTime}ms: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Busca cidadão por NIS
   */
  @Get('nis/:nis')
  @CacheableLong({ includeQuery: false })
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
      this.logger.error(
        `[${requestId}] Erro em ${totalTime}ms: ${error.message}`,
      );
      throw error;
    }
  }
}