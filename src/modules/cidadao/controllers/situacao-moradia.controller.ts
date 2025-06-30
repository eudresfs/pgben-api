import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  ParseUUIDPipe,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { SituacaoMoradiaService } from '../services/situacao-moradia.service';
import { CreateSituacaoMoradiaDto } from '../dto/create-situacao-moradia.dto';
import { CreateSituacaoMoradiaBodyDto } from '../dto/create-situacao-moradia-body.dto';
import { UpdateSituacaoMoradiaDto } from '../dto/update-situacao-moradia.dto';
import { SituacaoMoradiaResponseDto } from '../dto/situacao-moradia-response.dto';
import { PermissionGuard } from '@/auth/guards/permission.guard';
import { RequiresPermission } from '@/auth/decorators/requires-permission.decorator';
import { TipoEscopo } from '@/entities/user-permission.entity';

/**
 * Controlador responsável pelo gerenciamento de situações de moradia dos cidadãos.
 * 
 * Este controlador oferece operações CRUD completas para o cadastro e manutenção
 * das informações habitacionais dos cidadãos atendidos pela SEMTAS.
 * 
 * Funcionalidades principais:
 * - Cadastro de nova situação de moradia
 * - Consulta de situações existentes
 * - Atualização de dados habitacionais
 * - Remoção lógica de registros
 * - Operação de upsert (criar ou atualizar)
 * 
 * Segurança:
 * - Autenticação JWT obrigatória
 * - Autorização baseada em permissões granulares
 * - Controle de acesso por unidade organizacional
 */
@ApiTags('Cidadão')
@Controller('cidadao')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('JWT')
export class SituacaoMoradiaController {
  private readonly logger = new Logger(SituacaoMoradiaController.name);

  constructor(private readonly situacaoMoradiaService: SituacaoMoradiaService) {}

  /**
   * Cria uma nova situação de moradia para um cidadão específico.
   * 
   * Este endpoint permite o cadastro inicial das informações habitacionais
   * de um cidadão, incluindo tipo de moradia, condições de habitabilidade,
   * despesas mensais e situações especiais como desastres naturais.
   * 
   * Regras de negócio:
   * - Cada cidadão pode ter apenas uma situação de moradia ativa
   * - O cidadão deve existir no sistema antes do cadastro
   * - Campos obrigatórios: cidadao_id, tipo_moradia
   * - Validações específicas por tipo de moradia (ex: valor_aluguel para moradia alugada)
   * 
   * @param createDto - Dados da situação de moradia a ser criada
   * @returns Situação de moradia criada com dados completos
   */
  @Post(':cidadao_id/situacao-moradia')
  @HttpCode(HttpStatus.CREATED)
  @RequiresPermission(
    {
      permissionName: 'situacao_moradia.criar',
      scopeType: TipoEscopo.UNIDADE
    }
  )
  @ApiOperation({
    summary: 'Criar situação de moradia',
    description: `Cria uma nova situação de moradia para um cidadão específico.
    
    **Funcionalidades:**
    - Cadastro de informações habitacionais completas
    - Validação de dados específicos por tipo de moradia
    - Registro de despesas mensais em formato flexível
    - Controle de situações especiais (desastres, programas habitacionais)
    
    **Validações:**
    - Cidadão deve existir no sistema
    - Não pode haver duplicação de situação de moradia para o mesmo cidadão
    - Campos obrigatórios conforme tipo de moradia selecionado`,
  })
  @ApiParam({ 
    name: 'cidadao_id', 
    description: 'ID único do cidadão no formato UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid'
  })
  @ApiBody({ 
    type: CreateSituacaoMoradiaBodyDto,
    description: 'Dados da situação de moradia a ser criada (cidadao_id vem do path)',
    examples: {
      moradiaAlugada: {
        summary: 'Moradia Alugada',
        description: 'Exemplo de cadastro para moradia alugada',
        value: {
          tipo_moradia: 'alugada',
          numero_comodos: 3,
          valor_aluguel: 800.00,
          reside_2_anos_natal: true,
          despesas_mensais: [
            { tipo: 'agua', valor: 50.00 },
            { tipo: 'energia', valor: 120.00 }
          ]
        }
      },
      moradiaPropria: {
        summary: 'Moradia Própria',
        description: 'Exemplo de cadastro para moradia própria',
        value: {
          tipo_moradia: 'propria',
          numero_comodos: 4,
          programa_habitacional: 'minha_casa_minha_vida',
          reside_2_anos_natal: true
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Situação de moradia criada com sucesso',
    type: SituacaoMoradiaResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados inválidos fornecidos. Verifique os campos obrigatórios e formatos.',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { 
          type: 'array', 
          items: { type: 'string' },
          example: ['tipo_moradia deve ser um valor válido', 'numero_comodos deve ser um número positivo']
        },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Cidadão não encontrado no sistema',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Cidadão não encontrado' },
        error: { type: 'string', example: 'Not Found' }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Situação de moradia já existe para este cidadão',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: { type: 'string', example: 'Situação de moradia já cadastrada para este cidadão' },
        error: { type: 'string', example: 'Conflict' }
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: 'Token de autenticação inválido ou expirado'
  })
  @ApiForbiddenResponse({
    description: 'Usuário não possui permissão para criar situação de moradia'
  })
  @ApiInternalServerErrorResponse({
    description: 'Erro interno do servidor'
  })
  async create(
    @Param('cidadao_id', ParseUUIDPipe) cidadaoId: string,
    @Body() createDto: CreateSituacaoMoradiaBodyDto
  ): Promise<SituacaoMoradiaResponseDto> {
    this.logger.log(`Criando situação de moradia para cidadão: ${cidadaoId}`);
    // Adiciona o cidadao_id do path ao DTO
    const dtoWithCidadaoId: CreateSituacaoMoradiaDto = { ...createDto, cidadao_id: cidadaoId };
    return this.situacaoMoradiaService.create(dtoWithCidadaoId);
  }

  /**
   * Cria uma nova situação de moradia ou atualiza uma existente (operação upsert).
   * 
   * Este endpoint implementa a lógica de upsert, verificando se já existe
   * uma situação de moradia para o cidadão. Se existir, atualiza os dados;
   * caso contrário, cria um novo registro.
   * 
   * Comportamento:
   * - Se não existe situação de moradia: cria um novo registro
   * - Se já existe: atualiza o registro existente com os novos dados
   * - Preserva o ID e timestamps do registro original em caso de atualização
   * 
   * Vantagens do upsert:
   * - Evita erros de conflito em integrações
   * - Simplifica a lógica do cliente
   * - Garante idempotência da operação
   * 
   * @param createDto - Dados da situação de moradia
   * @returns Situação de moradia criada ou atualizada
   */
  @Put(':cidadao_id/situacao-moradia')
  @HttpCode(HttpStatus.OK)
  @RequiresPermission(
    {
      permissionName: 'situacao_moradia.atualizar',
      scopeType: TipoEscopo.UNIDADE
    }
  )
  @ApiOperation({
    summary: 'Criar ou atualizar situação de moradia (Upsert)',
    description: `Operação de upsert que cria uma nova situação de moradia ou atualiza uma existente.
    
    **Comportamento:**
    - Verifica se já existe situação de moradia para o cidadão
    - Se não existe: cria um novo registro (equivalente ao POST)
    - Se existe: atualiza o registro existente com os novos dados
    
    **Vantagens:**
    - Operação idempotente - pode ser executada múltiplas vezes com segurança
    - Evita erros de conflito em integrações automatizadas
    - Simplifica a lógica do cliente (não precisa verificar existência)
    
    **Casos de uso:**
    - Integrações com sistemas externos
    - Formulários que podem ser submetidos múltiplas vezes
    - Sincronização de dados entre sistemas`,
  })
  @ApiParam({ 
    name: 'cidadao_id', 
    description: 'ID único do cidadão no formato UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid'
  })
  @ApiBody({ 
    type: CreateSituacaoMoradiaBodyDto,
    description: 'Dados da situação de moradia para criar ou atualizar (cidadao_id vem do path)',
    examples: {
      upsertCompleto: {
        summary: 'Upsert Completo',
        description: 'Exemplo de upsert com dados completos',
        value: {
          tipo_moradia: 'alugada',
          numero_comodos: 3,
          valor_aluguel: 850.00,
          moradia_cedida: false,
          moradia_invadida: false,
          programa_habitacional: 'nao',
          reside_2_anos_natal: true,
          despesas_mensais: [
            { tipo: 'agua', valor: 55.00 },
            { tipo: 'energia', valor: 130.00 },
            { tipo: 'gas', valor: 80.00 }
          ]
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Situação de moradia criada ou atualizada com sucesso',
    type: SituacaoMoradiaResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados inválidos fornecidos',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { 
          type: 'array', 
          items: { type: 'string' },
          example: ['valor_aluguel deve ser um número positivo']
        },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Cidadão não encontrado no sistema',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Cidadão não encontrado' },
        error: { type: 'string', example: 'Not Found' }
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: 'Token de autenticação inválido ou expirado'
  })
  @ApiForbiddenResponse({
    description: 'Usuário não possui permissão para atualizar situação de moradia'
  })
  @ApiInternalServerErrorResponse({
    description: 'Erro interno do servidor'
  })
  async createOrUpdate(
    @Param('cidadao_id', ParseUUIDPipe) cidadaoId: string,
    @Body() createDto: CreateSituacaoMoradiaBodyDto
  ): Promise<SituacaoMoradiaResponseDto> {
    this.logger.log(`Criando ou atualizando situação de moradia para cidadão: ${cidadaoId}`);
    // Adiciona o cidadao_id do path ao DTO
    const dtoWithCidadaoId: CreateSituacaoMoradiaDto = { ...createDto, cidadao_id: cidadaoId };
    return this.situacaoMoradiaService.createOrUpdate(dtoWithCidadaoId);
  }

  /**
   * Lista todas as situações de moradia com suporte a paginação e filtros.
   * 
   * Este endpoint permite recuperar uma lista paginada de situações de moradia
   * com opções de busca e filtros. A busca é realizada nos campos de texto
   * relevantes como nome do cidadão e tipo de moradia.
   * 
   * Funcionalidades:
   * - Paginação configurável (padrão: 10 itens por página)
   * - Busca textual em múltiplos campos
   * - Filtros por tipo de moradia e outros critérios
   * - Ordenação por data de criação (mais recentes primeiro)
   * 
   * Campos de busca incluem:
   * - Nome do cidadão
   * - CPF do cidadão
   * - Tipo de moradia
   * - Programa habitacional
   * 
   * @param page - Número da página (padrão: 1)
   * @param limit - Itens por página (padrão: 10, máximo: 100)
   * @param search - Termo de busca para filtrar resultados
   * @returns Lista paginada de situações de moradia
   */
  @Get('situacao-moradia/todas')
  @RequiresPermission(
    {
      permissionName: 'situacao_moradia.listar',
      scopeType: TipoEscopo.UNIDADE
    }
  )
  @ApiOperation({
    summary: 'Listar situações de moradia com paginação e filtros',
    description: `Retorna uma lista paginada de situações de moradia com opções de busca e filtros.
    
    **Funcionalidades:**
    - Paginação configurável para melhor performance
    - Busca textual em múltiplos campos (nome, CPF, tipo de moradia)
    - Filtros específicos por critérios de moradia
    - Ordenação por data de criação (mais recentes primeiro)
    
    **Campos pesquisáveis:**
    - Nome completo do cidadão
    - CPF do cidadão (parcial ou completo)
    - Tipo de moradia (própria, alugada, cedida, etc.)
    - Programa habitacional
    
    **Limites de paginação:**
    - Mínimo: 1 item por página
    - Máximo: 100 itens por página
    - Padrão: 10 itens por página
    
    **Ordenação:**
    - Por padrão, ordena por data de criação (mais recentes primeiro)
    - Situações mais recentes aparecem no topo da lista`,
  })
  @ApiQuery({ 
    name: 'page', 
    required: false, 
    type: Number, 
    description: 'Número da página para paginação (mínimo: 1, padrão: 1)',
    example: 1
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: Number, 
    description: 'Número de itens por página (mínimo: 1, máximo: 100, padrão: 10)',
    example: 10
  })
  @ApiQuery({ 
    name: 'search', 
    required: false, 
    type: String, 
    description: 'Termo de busca para filtrar por nome do cidadão, CPF, tipo de moradia ou programa habitacional',
    example: 'João Silva'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista paginada de situações de moradia retornada com sucesso',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/SituacaoMoradiaResponseDto' }
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 150, description: 'Total de registros' },
            page: { type: 'number', example: 1, description: 'Página atual' },
            limit: { type: 'number', example: 10, description: 'Itens por página' },
            totalPages: { type: 'number', example: 15, description: 'Total de páginas' },
            hasNext: { type: 'boolean', example: true, description: 'Indica se há próxima página' },
            hasPrev: { type: 'boolean', example: false, description: 'Indica se há página anterior' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Parâmetros de consulta inválidos',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { 
          type: 'array', 
          items: { type: 'string' },
          example: ['page deve ser um número positivo', 'limit não pode exceder 100']
        },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: 'Token de autenticação inválido ou expirado'
  })
  @ApiForbiddenResponse({
    description: 'Usuário não possui permissão para listar situações de moradia'
  })
  @ApiInternalServerErrorResponse({
    description: 'Erro interno do servidor'
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ): Promise<SituacaoMoradiaResponseDto[]> {
    this.logger.log(`Listando situações de moradia - Página: ${page}, Limite: ${limit}, Busca: ${search}`);
    return this.situacaoMoradiaService.findAll({ page, limit, search });
  }

  /**
   * Busca a situação de moradia de um cidadão específico pelo seu ID.
   * 
   * Este endpoint é útil para recuperar a situação de moradia atual
   * de um cidadão específico, sendo frequentemente usado em fluxos
   * de análise de benefícios e avaliação socioeconômica.
   * 
   * Funcionalidades:
   * - Busca por ID do cidadão (UUID)
   * - Retorna a situação de moradia mais recente
   * - Inclui dados completos da moradia e despesas
   * - Validação de existência do cidadão
   * - Controle de acesso por unidade organizacional
   * 
   * Casos de uso comuns:
   * - Análise para concessão de benefícios
   * - Avaliação socioeconômica
   * - Relatórios de assistência social
   * - Acompanhamento de casos
   * 
   * Dados retornados:
   * - Situação de moradia completa
   * - Informações do cidadão
   * - Lista de despesas mensais
   * - Histórico de atualizações
   * 
   * @param cidadaoId - ID único do cidadão (formato UUID)
   * @returns Situação de moradia do cidadão ou null se não encontrada
   */
  @Get(':cidadao_id/situacao-moradia')
  @RequiresPermission(
    {
      permissionName: 'situacao_moradia.visualizar',
      scopeType: TipoEscopo.UNIDADE
    }
  )
  @ApiOperation({
    summary: 'Buscar situação de moradia por ID do cidadão',
    description: `Retorna a situação de moradia atual de um cidadão específico pelo seu ID.
    
    **Funcionalidades:**
    - Busca precisa por ID do cidadão (UUID)
    - Retorna a situação de moradia mais recente
    - Inclui dados completos da moradia e despesas mensais
    - Validação de existência e permissões de acesso
    
    **Casos de uso principais:**
    - Análise para concessão de benefícios assistenciais
    - Avaliação socioeconômica detalhada
    - Geração de relatórios de assistência social
    - Acompanhamento de casos específicos
    - Consulta durante atendimento presencial
    
    **Dados incluídos:**
    - Informações completas da moradia atual
    - Dados básicos do cidadão
    - Despesas mensais detalhadas
    - Histórico de criação e modificações
    
    **Validações de segurança:**
    - Verificação de permissões por unidade
    - Auditoria de acesso aos dados do cidadão
    - Controle de escopo organizacional`,
  })
  @ApiParam({ 
    name: 'cidadaoId', 
    description: 'ID único do cidadão no formato UUID',
    example: '456e7890-e89b-12d3-a456-426614174001',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Situação de moradia do cidadão encontrada e retornada com sucesso',
    type: SituacaoMoradiaResponseDto,
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        cidadao_id: { type: 'string', format: 'uuid', example: '456e7890-e89b-12d3-a456-426614174001' },
        tipo_moradia: { type: 'string', example: 'propria', enum: ['propria', 'alugada', 'cedida', 'financiada', 'invadida'] },
        numero_comodos: { type: 'number', example: 4, minimum: 1 },
        valor_aluguel: { type: 'number', example: 0, description: 'Valor do aluguel (0 se moradia própria)' },
        moradia_cedida: { type: 'boolean', example: false },
        moradia_invadida: { type: 'boolean', example: false },
        programa_habitacional: { type: 'string', example: 'minha_casa_minha_vida' },
        reside_2_anos_natal: { type: 'boolean', example: true },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        cidadao: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nome: { type: 'string', example: 'Maria Santos' },
            cpf: { type: 'string', example: '987.654.321-00' },
            data_nascimento: { type: 'string', format: 'date' }
          }
        },
        despesas_mensais: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              tipo: { type: 'string', example: 'energia', enum: ['agua', 'energia', 'gas', 'internet', 'telefone'] },
              valor: { type: 'number', example: 120.50, minimum: 0 },
              observacoes: { type: 'string', example: 'Conta média dos últimos 3 meses' }
            }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'ID do cidadão fornecido é inválido (não é um UUID válido)',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'ID do cidadão deve ser um UUID válido' },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Cidadão não encontrado ou não possui situação de moradia cadastrada',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Situação de moradia não encontrada para este cidadão' },
        error: { type: 'string', example: 'Not Found' }
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: 'Token de autenticação inválido ou expirado'
  })
  @ApiForbiddenResponse({
    description: 'Usuário não possui permissão para visualizar dados deste cidadão'
  })
  @ApiInternalServerErrorResponse({
    description: 'Erro interno do servidor'
  })
  async findByCidadaoId(
    @Param('cidadaoId', ParseUUIDPipe) cidadaoId: string
  ): Promise<SituacaoMoradiaResponseDto | null> {
    this.logger.log(`Buscando situação de moradia do cidadão: ${cidadaoId}`);
    return this.situacaoMoradiaService.findByCidadaoId(cidadaoId);
  }

  /**
   * Atualiza uma situação de moradia existente pelo seu ID.
   * 
   * Este endpoint permite a atualização parcial ou completa de uma situação
   * de moradia existente, mantendo o histórico de alterações para fins de
   * auditoria e rastreabilidade.
   * 
   * Funcionalidades:
   * - Atualização parcial (apenas campos fornecidos)
   * - Validação de dados de entrada
   * - Verificação de existência do registro
   * - Registro de alterações para auditoria
   * - Controle de acesso por unidade organizacional
   * 
   * Comportamento:
   * - Apenas os campos fornecidos no DTO serão atualizados
   * - Campos não fornecidos mantêm seus valores originais
   * - Validações específicas são aplicadas a cada campo
   * - O timestamp de atualização é automaticamente atualizado
   * 
   * Casos de uso comuns:
   * - Correção de informações incorretas
   * - Atualização após mudança na situação habitacional
   * - Complementação de dados incompletos
   * - Ajuste de valores de despesas mensais
   * 
   * @param id - ID único da situação de moradia (formato UUID)
   * @param updateDto - Dados para atualização (parcial ou completa)
   * @returns Situação de moradia atualizada
   */
  @Patch(':cidadao_id/situacao-moradia')
  @RequiresPermission(
    {
      permissionName: 'situacao_moradia.atualizar',
      scopeType: TipoEscopo.UNIDADE
    }
  )
  @ApiOperation({
    summary: 'Atualizar situação de moradia',
    description: `Atualiza parcial ou completamente uma situação de moradia existente pelo seu ID.
    
    **Funcionalidades:**
    - Atualização parcial (apenas campos fornecidos são modificados)
    - Validação completa dos dados de entrada
    - Verificação de existência do registro
    - Registro de alterações para auditoria
    - Controle de acesso por unidade organizacional
    
    **Comportamento:**
    - Campos não fornecidos mantêm seus valores originais
    - Validações específicas são aplicadas a cada campo
    - O timestamp de atualização é automaticamente atualizado
    - Histórico de alterações é mantido para rastreabilidade
    
    **Casos de uso comuns:**
    - Correção de informações incorretas
    - Atualização após mudança na situação habitacional
    - Complementação de dados incompletos
    - Ajuste de valores de despesas mensais`,
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID único da situação de moradia no formato UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid'
  })
  @ApiBody({ 
    type: UpdateSituacaoMoradiaDto,
    description: 'Dados para atualização da situação de moradia (parcial ou completa)',
    examples: {
      atualizacaoParcial: {
        summary: 'Atualização Parcial',
        description: 'Exemplo de atualização apenas do valor do aluguel e número de cômodos',
        value: {
          valor_aluguel: 950.00,
          numero_comodos: 4
        }
      },
      atualizacaoCompleta: {
        summary: 'Atualização Completa',
        description: 'Exemplo de atualização completa da situação de moradia',
        value: {
          tipo_moradia: 'alugada',
          numero_comodos: 4,
          valor_aluguel: 950.00,
          moradia_cedida: false,
          moradia_invadida: false,
          programa_habitacional: 'nao',
          reside_2_anos_natal: true,
          despesas_mensais: [
            { tipo: 'agua', valor: 65.00 },
            { tipo: 'energia', valor: 145.00 },
            { tipo: 'gas', valor: 85.00 },
            { tipo: 'internet', valor: 99.90 }
          ]
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Situação de moradia atualizada com sucesso',
    type: SituacaoMoradiaResponseDto,
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
        cidadao_id: { type: 'string', format: 'uuid' },
        tipo_moradia: { type: 'string', example: 'alugada' },
        numero_comodos: { type: 'number', example: 4 },
        valor_aluguel: { type: 'number', example: 950.00 },
        moradia_cedida: { type: 'boolean', example: false },
        moradia_invadida: { type: 'boolean', example: false },
        programa_habitacional: { type: 'string', example: 'nao' },
        reside_2_anos_natal: { type: 'boolean', example: true },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        despesas_mensais: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              tipo: { type: 'string', example: 'agua' },
              valor: { type: 'number', example: 65.00 }
            }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados inválidos fornecidos',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { 
          type: 'array', 
          items: { type: 'string' },
          example: ['valor_aluguel deve ser um número positivo', 'tipo_moradia deve ser um valor válido']
        },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Situação de moradia não encontrada com o ID fornecido',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Situação de moradia não encontrada' },
        error: { type: 'string', example: 'Not Found' }
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: 'Token de autenticação inválido ou expirado'
  })
  @ApiForbiddenResponse({
    description: 'Usuário não possui permissão para atualizar situação de moradia'
  })
  @ApiInternalServerErrorResponse({
    description: 'Erro interno do servidor'
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateSituacaoMoradiaDto
  ): Promise<SituacaoMoradiaResponseDto> {
    this.logger.log(`Atualizando situação de moradia: ${id}`);
    return this.situacaoMoradiaService.update(id, updateDto);
  }

  /**
   * Remove uma situação de moradia pelo seu ID.
   * 
   * Este endpoint realiza a exclusão permanente de uma situação de moradia
   * do sistema. A operação é irreversível e deve ser usada com cautela,
   * preferencialmente apenas em casos de dados incorretos ou duplicados.
   * 
   * ⚠️ **ATENÇÃO: Operação Irreversível**
   * - A exclusão é permanente e não pode ser desfeita
   * - Todos os dados relacionados serão removidos
   * - Considere usar soft delete em cenários de produção
   * 
   * Funcionalidades:
   * - Exclusão permanente do registro
   * - Verificação de existência antes da exclusão
   * - Validação de permissões de acesso
   * - Log de auditoria da operação
   * - Remoção de dados relacionados (despesas mensais)
   * 
   * Casos de uso recomendados:
   * - Correção de dados duplicados
   * - Remoção de registros de teste
   * - Limpeza de dados incorretos
   * - Atendimento a solicitações de LGPD
   * 
   * Considerações de segurança:
   * - Operação auditada e logada
   * - Requer permissões específicas de exclusão
   * - Validação de escopo organizacional
   * 
   * @param id - ID único da situação de moradia (formato UUID)
   * @returns Void (status 204 No Content)
   */
  @Delete(':cidadao_id/situacao-moradia')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequiresPermission(
    {
      permissionName: 'situacao_moradia.excluir',
      scopeType: TipoEscopo.UNIDADE
    }
  )
  @ApiOperation({
    summary: 'Excluir situação de moradia',
    description: `Remove permanentemente uma situação de moradia pelo seu ID.
    
    ⚠️ **ATENÇÃO: Esta é uma operação irreversível!**
    
    **Funcionalidades:**
    - Exclusão permanente do registro e dados relacionados
    - Verificação de existência antes da exclusão
    - Validação rigorosa de permissões de acesso
    - Log completo de auditoria da operação
    - Remoção automática de despesas mensais associadas
    
    **Casos de uso recomendados:**
    - Correção de dados duplicados no sistema
    - Remoção de registros de teste ou desenvolvimento
    - Limpeza de dados inseridos incorretamente
    - Atendimento a solicitações de exclusão por LGPD
    
    **Considerações importantes:**
    - A exclusão é permanente e não pode ser desfeita
    - Todos os dados relacionados serão removidos
    - Em ambientes de produção, considere implementar soft delete
    - Operação é completamente auditada para rastreabilidade
    
    **Validações de segurança:**
    - Verificação de permissões específicas de exclusão
    - Validação de escopo por unidade organizacional
    - Log detalhado para auditoria e compliance`,
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID único da situação de moradia a ser excluída (formato UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Situação de moradia excluída com sucesso (sem conteúdo de retorno)',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'ID fornecido é inválido (não é um UUID válido)',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'ID deve ser um UUID válido' },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Situação de moradia não encontrada com o ID fornecido',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Situação de moradia não encontrada' },
        error: { type: 'string', example: 'Not Found' }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Não é possível excluir devido a dependências ou restrições',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: { type: 'string', example: 'Não é possível excluir: existem benefícios associados' },
        error: { type: 'string', example: 'Conflict' }
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: 'Token de autenticação inválido ou expirado'
  })
  @ApiForbiddenResponse({
    description: 'Usuário não possui permissão para excluir situação de moradia'
  })
  @ApiInternalServerErrorResponse({
    description: 'Erro interno do servidor durante a exclusão'
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    this.logger.log(`Removendo situação de moradia: ${id}`);
    return this.situacaoMoradiaService.remove(id);
  }
}