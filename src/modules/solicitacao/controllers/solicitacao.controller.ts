import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  UseGuards,
  Req,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { LoggingService } from '../../../shared/logging/logging.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  SolicitacaoService,
  PaginatedResponse,
  FindAllOptions,
} from '../services/solicitacao.service';
import { SolicitacaoFiltrosAvancadosDto, SolicitacaoFiltrosResponseDto } from '../dto/solicitacao-filtros-avancados.dto';
import { IResultadoFiltros } from '../../../common/interfaces/filtros-avancados.interface';
import { CreateSolicitacaoDto } from '../dto/create-solicitacao.dto';
import { UpdateSolicitacaoDto } from '../dto/update-solicitacao.dto';
import { AvaliarSolicitacaoDto } from '../dto/avaliar-solicitacao.dto';
import { VincularProcessoJudicialDto } from '../dto/vincular-processo-judicial.dto';
import { VincularDeterminacaoJudicialDto } from '../dto/vincular-determinacao-judicial.dto';

import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { ScopeType } from '../../../entities/user-permission.entity';
import {
  Solicitacao,
  StatusSolicitacao,
} from '../../../entities/solicitacao.entity';
import { Request } from 'express';
import { QueryOptimization } from '../../../common/interceptors/query-optimization.interceptor';
import { GetUser } from '@/auth/decorators/get-user.decorator';
import { Usuario } from '@/entities';

/**
 * Controlador de Solicitações
 *
 * Responsável por gerenciar as rotas relacionadas às solicitações de benefícios
 */
@ApiTags('Solicitação')
@Controller('solicitacao')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class SolicitacaoController {
  constructor(
    private readonly solicitacaoService: SolicitacaoService,
    private readonly logger: LoggingService,
  ) {}

  /**
   * Lista todas as solicitações com filtros avançados
   */
  @Post('filtros-avancados')
  @QueryOptimization({
    enablePagination: true,
    maxLimit: 100,
    enableCaching: true,
    cacheTTL: 120,
  })
  @RequiresPermission({
    permissionName: 'solicitacao.listar',
    scopeType: ScopeType.UNIT,
  })
  @ApiOperation({ 
    summary: 'Listar solicitações com filtros avançados',
    description: `Endpoint otimizado para consultas complexas de solicitações com múltiplos critérios de filtro.
    
    **Funcionalidades principais:**
    - Filtros por múltiplos valores (unidades, status, benefícios, etc.)
    - Períodos predefinidos (hoje, semana atual, mês atual, etc.)
    - Busca textual em protocolo, nome do beneficiário e CPF
    - Paginação otimizada com cache
    - Ordenação por múltiplos campos
    
    **Casos de uso comuns:**
    - Listar solicitações de uma unidade específica
    - Buscar solicitações por status múltiplos
    - Filtrar por período de abertura
    - Buscar por protocolo ou beneficiário
    - Relatórios gerenciais com filtros complexos`
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de solicitações com filtros aplicados',
    type: SolicitacaoFiltrosResponseDto,
    schema: {
      example: {
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            protocolo: 'SOL-2024-001',
            status: 'EM_ANALISE',
            data_abertura: '2024-01-15T10:30:00Z',
            beneficiario: {
              nome: 'João Silva',
              cpf: '123.456.789-00'
            },
            beneficio: {
              nome: 'Auxílio Natalidade'
            },
            unidade: {
              nome: 'CRAS Centro'
            }
          }
        ],
        total: 150,
        filtros_aplicados: {
          unidades: ['550e8400-e29b-41d4-a716-446655440000'],
          status: ['EM_ANALISE', 'APROVADA'],
          periodo: 'MES_ATUAL'
        },
        meta: {
          page: 1,
          limit: 10,
          pages: 15,
          hasNext: true,
          hasPrev: false
        },
        tempo_execucao: 150
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Parâmetros de filtro inválidos',
    schema: {
      example: {
        statusCode: 400,
        message: ['unidades deve ser um array de UUIDs válidos'],
        error: 'Bad Request'
      }
    }
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - Permissões insuficientes para visualizar solicitações'
  })
  async findAllComFiltrosAvancados(
    @GetUser() usuario: Usuario,
    @Body() filtros: SolicitacaoFiltrosAvancadosDto,
  ): Promise<IResultadoFiltros<Solicitacao>> {
    try {
      this.logger.info(
        `Listando solicitações com filtros avançados - Usuário: ${usuario.id}`,
        'SolicitacaoController',
      );

      const resultado = await this.solicitacaoService.findAllComFiltrosAvancados(filtros);

      return resultado;
    } catch (error) {
      this.logger.error(
        `Erro ao listar solicitações com filtros avançados: ${error.message}`,
        error.stack,
        'SolicitacaoController',
      );
      throw error;
    }
  }

  /**
   * Lista todas as solicitações com filtros e paginação (endpoint legado)
   */
  @Get()
  @QueryOptimization({
    enablePagination: true,
    maxLimit: 100,
    enableCaching: true,
    cacheTTL: 120,
  })
  @RequiresPermission({
    permissionName: 'solicitacao.listar',
    scopeType: ScopeType.UNIT,
  })
  @ApiOperation({ summary: 'Listar solicitações (endpoint legado)' })
  @ApiResponse({
    status: 200,
    description: 'Lista de solicitações retornada com sucesso',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Página atual (mínimo: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Itens por página (mínimo: 1, máximo: 100)',
    example: 10,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: StatusSolicitacao,
    description: 'Filtro por status',
  })
  @ApiQuery({
    name: 'unidade_id',
    required: false,
    type: String,
    description: 'Filtro por unidade',
  })
  @ApiQuery({
    name: 'beneficio_id',
    required: false,
    type: String,
    description: 'Filtro por tipo de benefício',
  })
  @ApiQuery({
    name: 'beneficiario_id',
    required: false,
    type: String,
    description: 'Filtro por beneficiário',
  })
  @ApiQuery({
    name: 'protocolo',
    required: false,
    type: String,
    description: 'Busca por protocolo (busca parcial)',
  })
  @ApiQuery({
    name: 'data_inicio',
    required: false,
    type: String,
    description: 'Data inicial (formato: YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'data_fim',
    required: false,
    type: String,
    description: 'Data final (formato: YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['data_abertura', 'protocolo', 'status'],
    description: 'Campo para ordenação',
    example: 'data_abertura',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Direção da ordenação',
    example: 'DESC',
  })
  async findAll(
    @Req() req: Request,
    @Query() findAllOptions: FindAllOptions,
  ) {
    const parsedPage = findAllOptions.page ? Math.max(1, +findAllOptions.page) : undefined;
    const parsedLimit = findAllOptions.limit ? Math.min(100, Math.max(1, +findAllOptions.limit)) : undefined;

    if (findAllOptions.data_inicio && !this.isValidDateFormat(findAllOptions.data_inicio)) {
      throw new BadRequestException(
        'Formato de data_inicio inválido. Use YYYY-MM-DD',
      );
    }

    if (findAllOptions.data_fim && !this.isValidDateFormat(findAllOptions.data_fim)) {
      throw new BadRequestException(
        'Formato de data_fim inválido. Use YYYY-MM-DD',
      );
    }

    if (findAllOptions.data_inicio 
      && findAllOptions.data_fim 
      && new Date(findAllOptions.data_inicio) > new Date(findAllOptions.data_fim)) {
      throw new BadRequestException(
        'Data de início deve ser anterior ou igual à data de fim',
      );
    }

    return this.solicitacaoService.findAll({
      search: findAllOptions.search,
      page: parsedPage,
      limit: parsedLimit,
      status: findAllOptions.status,
      unidade_id: findAllOptions.unidade_id,
      beneficio_id: findAllOptions.beneficio_id,
      beneficiario_id: findAllOptions.beneficiario_id,
      usuario_id: findAllOptions.usuario_id,
      protocolo: findAllOptions.protocolo,
      data_inicio: findAllOptions.data_inicio,
      data_fim: findAllOptions.data_fim,
      sortBy: findAllOptions.sortBy,
      sortOrder: findAllOptions.sortOrder,
    });
  }

  /**
   * Valida se a string está no formato de data YYYY-MM-DD
   * @param dateString String da data a ser validada
   * @returns true se o formato é válido
   */
  private isValidDateFormat(dateString: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return false;
    }

    const date = new Date(dateString);
    return (
      date instanceof Date &&
      !isNaN(date.getTime()) &&
      dateString === date.toISOString().split('T')[0]
    );
  }

  /**
   * Obtém detalhes de uma solicitação específica
   */
  @Get(':id')
  @RequiresPermission({ permissionName: 'solicitacao.visualizar' })
  @ApiOperation({ summary: 'Obter detalhes de uma solicitação' })
  @ApiResponse({
    status: 200,
    description: 'Solicitação encontrada com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Solicitação não encontrada' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.solicitacaoService.findById(id);
  }

  /**
   * Cria uma nova solicitação de benefício
   */
  @Post()
  @RequiresPermission({
    permissionName: 'solicitacao.criar'
  })
  @ApiOperation({
    summary: 'Criar nova solicitação de benefício',
    description: `Cria uma nova solicitação de benefício com validações de exclusividade.
    
    **Validações aplicadas:**
    - Cidadão não pode ser beneficiário principal se já faz parte da composição familiar de outra solicitação ativa
    - Cidadão não pode ter múltiplas solicitações ativas simultaneamente
    - Dados da composição familiar devem ser válidos
    - Enums devem usar valores corretos (case-sensitive)
    
    **Status considerados ativos:** rascunho, aberta, pendente, em_analise, aprovada
    **Status considerados inativos:** cancelada, indeferida`,
    requestBody: {
      description: 'Dados da solicitação de benefício',
      required: true,
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/CreateSolicitacaoDto',
          },
          examples: {
            'auxilio-natalidade': {
              summary: 'Solicitação de Auxílio Natalidade',
              description: 'Exemplo de solicitação para auxílio natalidade',
              value: {
                beneficiario_id: '550e8400-e29b-41d4-a716-446655440000',
                beneficio_id: '660e8400-e29b-41d4-a716-446655440001',
                unidade_id: '770e8400-e29b-41d4-a716-446655440002',
                observacoes:
                  'Solicitação para auxílio natalidade - primeiro filho',
                dados_complementares: {
                  data_nascimento_bebe: '2024-01-15',
                  peso_nascimento: '3.2kg',
                  hospital: 'Maternidade Januário Cicco',
                },
                documentos: [
                  {
                    nome: 'Certidão de Nascimento',
                    tipo: 'certidao_nascimento',
                    arquivo_url: '/uploads/documentos/certidao_123.pdf',
                    observacoes: 'Certidão original do bebê',
                  },
                  {
                    nome: 'Comprovante de Residência',
                    tipo: 'comprovante_residencia',
                    arquivo_url: '/uploads/documentos/comprovante_456.pdf',
                  },
                ],
              },
            },
            'aluguel-social': {
              summary: 'Solicitação de Aluguel Social',
              description: 'Exemplo de solicitação para aluguel social',
              value: {
                beneficiario_id: '550e8400-e29b-41d4-a716-446655440003',
                beneficio_id: '660e8400-e29b-41d4-a716-446655440004',
                unidade_id: '770e8400-e29b-41d4-a716-446655440002',
                observacoes:
                  'Família em situação de vulnerabilidade habitacional',
                dados_complementares: {
                  valor_aluguel_atual: 800.0,
                  endereco_imovel: 'Rua das Palmeiras, 456 - Cidade Nova',
                  motivo_solicitacao: 'Despejo por falta de pagamento',
                },
                documentos: [
                  {
                    nome: 'Contrato de Locação',
                    tipo: 'contrato_locacao',
                    arquivo_url: '/uploads/documentos/contrato_789.pdf',
                  },
                  {
                    nome: 'Comprovante de Renda',
                    tipo: 'comprovante_renda',
                    arquivo_url: '/uploads/documentos/renda_101.pdf',
                    observacoes: 'Declaração de renda familiar',
                  },
                ],
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Solicitação criada com sucesso',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        status: { type: 'string', enum: Object.values(StatusSolicitacao) },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou violação de regras de negócio',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          examples: [
            'Cidadão não pode ser beneficiário principal pois já faz parte da composição familiar de outra solicitação ativa',
            'Cidadão já possui uma solicitação ativa',
            'Escolaridade deve ser um valor válido',
            'Parentesco deve ser um valor válido',
          ],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado - Token inválido ou expirado',
  })
  @ApiResponse({
    status: 403,
    description:
      'Acesso negado - Permissões insuficientes para criar solicitação nesta unidade',
  })
  @ApiResponse({
    status: 500,
    description: 'Erro interno do servidor',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Erro interno do servidor' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  async create(
    @Body() createSolicitacaoDto: CreateSolicitacaoDto,
    @Req() req: Request,
  ) {
    const user = req.user;
    return this.solicitacaoService.create(createSolicitacaoDto, user);
  }

  /**
   * Atualiza uma solicitação existente
   */
  @Put(':id')
  @RequiresPermission({
    permissionName: 'solicitacao.editar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @ApiOperation({ summary: 'Atualizar solicitação existente' })
  @ApiBody({
    description: 'Dados da solicitação atualizada',
    schema: {
      example: {
        nome: 'João Silva',
        cpf: '12345678901',
        data_nascimento: '1990-01-01',
        endereco: {
          logradouro: 'Rua Exemplo',
          numero: '123',
          bairro: 'Bairro Exemplo',
          cidade: 'Cidade Exemplo',
          estado: 'Estado Exemplo',
          cep: '12345678',
        },
        contato: {
          telefone: '123456789',
          email: 'joao.silva@example.com',
        },
        beneficio: {
          id: 1,
          nome: 'Benefício Exemplo',
        },
        status: 'EM_ANALISE',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitação atualizada com sucesso',
    schema: {
      example: {
        id: 1,
        nome: 'João Silva',
        cpf: '12345678901',
        data_nascimento: '1990-01-01',
        endereco: {
          logradouro: 'Rua Exemplo',
          numero: '123',
          bairro: 'Bairro Exemplo',
          cidade: 'Cidade Exemplo',
          estado: 'Estado Exemplo',
          cep: '12345678',
        },
        contato: {
          telefone: '123456789',
          email: 'joao.silva@example.com',
        },
        beneficio: {
          id: 1,
          nome: 'Benefício Exemplo',
        },
        status: 'EM_ANALISE',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Solicitação não encontrada' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSolicitacaoDto: UpdateSolicitacaoDto,
    @Req() req: Request,
  ) {
    const user = req.user;
    return this.solicitacaoService.update(id, updateSolicitacaoDto, user);
  }

  /**
   * Submete uma solicitação para análise
   */
  @Put(':id/submeter')
  @RequiresPermission({
    permissionName: 'solicitacao.status.transicao.ABERTA.EM_ANALISE',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @ApiOperation({ summary: 'Submeter solicitação para análise' })
  @ApiResponse({
    status: 200,
    description: 'Solicitação submetida com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Solicitação não pode ser submetida',
  })
  @ApiResponse({ status: 404, description: 'Solicitação não encontrada' })
  async submeterSolicitacao(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const user = req.user;
    return this.solicitacaoService.submeterSolicitacao(id, user);
  }

  /**
   * Avalia uma solicitação (aprovar/indeferir)
   */
  @Put(':id/avaliar')
  @RequiresPermission({
    permissionName: 'solicitacao.status.transicao.ENVIADA.EM_ANALISE',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @RequiresPermission({
    permissionName: 'solicitacao.status.transicao.EM_ANALISE.APROVADA',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @RequiresPermission({
    permissionName: 'solicitacao.status.transicao.EM_ANALISE.INDEFERIDA',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @ApiOperation({ summary: 'Avaliar solicitação (aprovar/indeferir)' })
  @ApiBody({
    description: 'Dados da avaliação da solicitação',
    schema: {
      example: '',
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitação avaliada com sucesso',
    schema: {
      example: '',
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Solicitação não pode ser avaliada',
  })
  @ApiResponse({ status: 404, description: 'Solicitação não encontrada' })
  async avaliarSolicitacao(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() avaliarSolicitacaoDto: AvaliarSolicitacaoDto,
    @Req() req: Request,
  ) {
    const user = req.user;
    return this.solicitacaoService.avaliarSolicitacao(
      id,
      avaliarSolicitacaoDto,
      user,
    );
  }

  /**
   * Cancela uma solicitação
   */
  @Put(':id/cancelar')
  @RequiresPermission({
    permissionName: 'solicitacao.status.transicao.*.CANCELADA',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @ApiOperation({ summary: 'Cancelar solicitação' })
  @ApiResponse({
    status: 200,
    description: 'Solicitação cancelada com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Solicitação não pode ser cancelada',
  })
  @ApiResponse({ status: 404, description: 'Solicitação não encontrada' })
  async cancelarSolicitacao(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const user = req.user;
    return this.solicitacaoService.cancelarSolicitacao(id, user);
  }

  /**
   * Lista o histórico de uma solicitação
   */
  @Get(':id/historico')
  @RequiresPermission({
    permissionName: 'solicitacao.visualizar',
  })
  @ApiOperation({ summary: 'Listar histórico de uma solicitação' })
  @ApiResponse({ status: 200, description: 'Histórico retornado com sucesso' })
  @ApiResponse({ status: 404, description: 'Solicitação não encontrada' })
  async getHistorico(@Param('id', ParseUUIDPipe) id: string) {
    return this.solicitacaoService.getHistorico(id);
  }

  /**
   * Vincula um processo judicial a uma solicitação
   */
  @Post(':id/processo-judicial')
  @RequiresPermission({
    permissionName: 'solicitacao.processo_judicial.vincular',
  })
  @ApiOperation({ summary: 'Vincular processo judicial a uma solicitação' })
  @ApiResponse({
    status: 200,
    description: 'Processo judicial vinculado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Solicitação ou processo não encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'Processo já vinculado a esta solicitação',
  })
  @ApiBody({ type: VincularProcessoJudicialDto })
  async vincularProcessoJudicial(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() vincularDto: VincularProcessoJudicialDto,
    @Req() req: Request,
  ) {
    const user = req.user;
    return this.solicitacaoService.vincularProcessoJudicial(
      id,
      vincularDto,
      user,
    );
  }

  /**
   * Desvincula um processo judicial de uma solicitação
   */
  @Delete(':id/processo-judicial')
  @RequiresPermission({
    permissionName: 'solicitacao.processo_judicial.desvincular',
  })
  @ApiOperation({ summary: 'Desvincular processo judicial de uma solicitação' })
  @ApiResponse({
    status: 200,
    description: 'Processo judicial desvinculado com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Solicitação não encontrada' })
  @ApiResponse({
    status: 400,
    description: 'Solicitação não possui processo judicial vinculado',
  })
  async desvincularProcessoJudicial(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const user = req.user;
    return this.solicitacaoService.desvincularProcessoJudicial(id, user);
  }

  /**
   * Vincula uma determinação judicial a uma solicitação
   */
  @Post(':id/determinacao-judicial')
  @RequiresPermission({
    permissionName: 'solicitacao.determinacao_judicial.vincular',
  })
  @ApiOperation({ summary: 'Vincular determinação judicial a uma solicitação' })
  @ApiResponse({
    status: 200,
    description: 'Determinação judicial vinculada com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Solicitação ou determinação não encontrada',
  })
  @ApiResponse({
    status: 409,
    description: 'Determinação já vinculada a esta solicitação',
  })
  @ApiBody({ type: VincularDeterminacaoJudicialDto })
  async vincularDeterminacaoJudicial(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() vincularDto: VincularDeterminacaoJudicialDto,
    @Req() req: Request,
  ) {
    const user = req.user;
    return this.solicitacaoService.vincularDeterminacaoJudicial(
      id,
      vincularDto,
      user,
    );
  }

  /**
   * Desvincula uma determinação judicial de uma solicitação
   */
  @Delete(':id/determinacao-judicial')
  @RequiresPermission({
    permissionName: 'solicitacao.determinacao_judicial.desvincular',
  })
  @ApiOperation({
    summary: 'Desvincular determinação judicial de uma solicitação',
  })
  @ApiResponse({
    status: 200,
    description: 'Determinação judicial desvinculada com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Solicitação não encontrada' })
  @ApiResponse({
    status: 400,
    description: 'Solicitação não possui determinação judicial vinculada',
  })
  async desvincularDeterminacaoJudicial(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const user = req.user;
    return this.solicitacaoService.desvincularDeterminacaoJudicial(id, user);
  }

  /**
   * Remove uma solicitação (soft delete)
   */
  @Delete(':id')
  @RequiresPermission({
    permissionName: 'solicitacao.remover',
  })
  @ApiOperation({
    summary: 'Remove uma solicitação (soft delete)',
    description:
      'Realiza a exclusão lógica de uma solicitação. Apenas solicitações com status "RASCUNHO" ou "ABERTA" podem ser removidas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitação removida com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Solicitação não encontrada',
  })
  @ApiResponse({
    status: 400,
    description:
      'Solicitação não pode ser removida devido ao status atual. Apenas solicitações com status "RASCUNHO" ou "ABERTA" podem ser excluídas.',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuário não tem permissão para remover esta solicitação',
  })
  async removerSolicitacao(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ): Promise<void> {
    const user = req.user;
    return this.solicitacaoService.removerSolicitacao(id, user);
  }
}
