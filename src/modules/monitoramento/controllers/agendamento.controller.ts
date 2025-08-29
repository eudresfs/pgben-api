import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
  ParseIntPipe,
  ParseBoolPipe,
  Req
} from '@nestjs/common';
import { PagePipe, LimitPipe } from '../../../shared/pipes/optional-parse-int.pipe';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { AgendamentoService } from '../services';
import { AgendamentoBatchService } from '../services/agendamento-batch.service';
import { CriarAgendamentoDto } from '../dto/criar-agendamento.dto';
import { AgendamentoResponseDto } from '../dto/agendamento-response.dto';
import { SuccessResponseDto } from '../../../shared/dtos/success-response.dto';
import { TipoVisita, PrioridadeVisita } from '../enums';
import { Usuario } from '@/entities';
import { GetUser } from '@/auth/decorators/get-user.decorator';
import { PaginationParamsDto } from '../../../shared/dtos/pagination-params.dto';
import { PaginatedResponseDto } from '../../../shared/dtos/pagination.dto';
import { PaginationHelper } from '../helpers/pagination.helper';
import { AgendamentoFiltrosAvancadosDto, AgendamentoFiltrosResponseDto } from '../dto/agendamento-filtros-avancados.dto';

/**
 * Controller para gerenciamento de agendamentos de visitas domiciliares
 * Responsável por operações CRUD e funcionalidades específicas de agendamento
 */
@ApiTags('Agendamentos')
@Controller('monitoramento/agendamentos')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class AgendamentoController {
  constructor(
    private readonly agendamentoService: AgendamentoService,
    private readonly agendamentoBatchService: AgendamentoBatchService,
  ) {}

  /**
   * Cria um novo agendamento de visita domiciliar
   */
  @Post()
  @RequiresPermission({ permissionName: 'monitoramento.agendamento.criar' })
  @ApiOperation({ 
    summary: 'Criar agendamento de visita',
    description: 'Cria um novo agendamento de visita domiciliar para um beneficiário'
  })
  @ApiBody({
    type: CriarAgendamentoDto,
    description: 'Dados para criação do agendamento',
    examples: {
      'agendamento-inicial': {
        summary: 'Agendamento de visita inicial',
        description: 'Exemplo de criação de agendamento para primeira visita',
        value: {
          beneficiario_id: '550e8400-e29b-41d4-a716-446655440000',
          tecnico_id: '550e8400-e29b-41d4-a716-446655440001',
          unidade_id: '550e8400-e29b-41d4-a716-446655440002',
          tipo_visita: 'inicial',
          data_hora: '2024-02-15T14:30:00.000Z',
          prioridade: 'alta',
          observacoes: 'Primeira visita domiciliar para avaliação inicial do beneficiário'
        }
      },
      'agendamento-acompanhamento': {
        summary: 'Agendamento de acompanhamento',
        description: 'Exemplo de agendamento para visita de acompanhamento',
        value: {
          beneficiario_id: '550e8400-e29b-41d4-a716-446655440003',
          tecnico_id: '550e8400-e29b-41d4-a716-446655440004',
          unidade_id: '550e8400-e29b-41d4-a716-446655440005',
          tipo_visita: 'acompanhamento',
          data_hora: '2024-02-20T09:00:00.000Z',
          prioridade: 'media',
          observacoes: 'Visita de acompanhamento mensal'
        }
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Agendamento criado com sucesso',
    type: AgendamentoResponseDto,
    example: {
      message: 'Agendamento criado com sucesso',
      data: {
        id: '550e8400-e29b-41d4-a716-446655440006',
        beneficiario_id: '550e8400-e29b-41d4-a716-446655440000',
        tecnico_id: '550e8400-e29b-41d4-a716-446655440001',
        unidade_id: '550e8400-e29b-41d4-a716-446655440002',
        tipo_visita: 'inicial',
        data_hora: '2024-02-15T14:30:00.000Z',
        status: 'agendado',
        prioridade: 'alta',
        observacoes: 'Primeira visita domiciliar para avaliação inicial do beneficiário',
        created_at: '2024-02-10T10:00:00.000Z',
        updated_at: '2024-02-10T10:00:00.000Z'
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Dados inválidos ou regras de negócio violadas',
    example: {
      statusCode: 400,
      message: ['data_hora deve ser uma data futura', 'beneficiario_id deve ser um UUID válido'],
      error: 'Bad Request'
    }
  })
  @ApiResponse({ 
    status: HttpStatus.CONFLICT, 
    description: 'Conflito de horário ou agendamento muito próximo',
    example: {
      statusCode: 409,
      message: 'Já existe um agendamento para este técnico no horário solicitado',
      error: 'Conflict'
    }
  })
  async criarAgendamento(
    @GetUser() usuario: Usuario,
    @Body(ValidationPipe) dto: CriarAgendamentoDto
  ): Promise<{ message: string; data: AgendamentoResponseDto }> {
    try {
      const agendamento = await this.agendamentoService.criarAgendamento(dto, usuario);

      return {
        message: 'Agendamento criado com sucesso',
        data: agendamento
      };
    } catch (error) {
      // Os filtros de exceção globais irão capturar e tratar adequadamente
      // BadRequestException, ConflictException, NotFoundException, etc.
      throw error;
    }
  }

  /**
   * Lista todos os agendamentos com filtros opcionais
   */
  @Get()
  @RequiresPermission({ permissionName: 'monitoramento.agendamento.listar' })
  @ApiOperation({ 
    summary: 'Listar agendamentos',
    description: 'Lista todos os agendamentos com filtros opcionais'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (padrão: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página (padrão: 10)' })
  @ApiQuery({ name: 'orderBy', required: false, type: String, description: 'Campo para ordenação (padrão: created_at)' })
  @ApiQuery({ name: 'orderDirection', required: false, enum: ['ASC', 'DESC'], description: 'Direção da ordenação (padrão: DESC)' })
  @ApiQuery({ name: 'beneficiario_id', required: false, type: String, description: 'ID do beneficiário' })
  @ApiQuery({ name: 'tecnico_id', required: false, type: String, description: 'ID do técnico responsável' })
  @ApiQuery({ name: 'unidade_id', required: false, type: String, description: 'ID da unidade' })
  @ApiQuery({ name: 'tipo_visita', required: false, enum: TipoVisita, description: 'Tipo da visita' })
  @ApiQuery({ name: 'prioridade', required: false, enum: PrioridadeVisita, description: 'Prioridade da visita' })
  @ApiQuery({ name: 'data_inicio', required: false, type: String, description: 'Data de início (YYYY-MM-DD)' })
  @ApiQuery({ name: 'data_fim', required: false, type: String, description: 'Data de fim (YYYY-MM-DD)' })
  @ApiQuery({ name: 'apenas_em_atraso', required: false, type: Boolean, description: 'Apenas agendamentos em atraso' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Lista de agendamentos retornada com sucesso',
    type: PaginatedResponseDto,
    example: {
      data: [
        {
          id: '550e8400-e29b-41d4-a716-446655440006',
          beneficiario_id: '550e8400-e29b-41d4-a716-446655440000',
          tecnico_id: '550e8400-e29b-41d4-a716-446655440001',
          unidade_id: '550e8400-e29b-41d4-a716-446655440002',
          tipo_visita: 'inicial',
          data_hora: '2024-02-15T14:30:00.000Z',
          status: 'agendado',
          prioridade: 'alta',
          observacoes: 'Primeira visita domiciliar',
          created_at: '2024-02-10T10:00:00.000Z',
          updated_at: '2024-02-10T10:00:00.000Z'
        }
      ],
      meta: {
        total: 1,
        page: 1,
        limit: 10,
        pages: 1,
        hasNext: false,
        hasPrev: false
      }
    }
  })
  async listarAgendamentos(
    @Query() paginationParams: PaginationParamsDto,
    @Query('beneficiario_id') beneficiarioId?: string,
    @Query('tecnico_id') tecnicoId?: string,
    @Query('unidade_id') unidadeId?: string,
    @Query('tipo_visita') tipoVisita?: TipoVisita,
    @Query('prioridade') prioridade?: PrioridadeVisita,
    @Query('data_inicio') dataInicio?: string,
    @Query('data_fim') dataFim?: string,
    @Query('apenas_em_atraso', new ParseBoolPipe({ optional: true })) apenasEmAtraso?: boolean
  ): Promise<PaginatedResponseDto<AgendamentoResponseDto>> {
    try {
      // Validar e aplicar valores padrão para paginação
      const validatedParams = PaginationHelper.applyDefaults(paginationParams);

      const filtros = {
        beneficiario_id: beneficiarioId,
        tecnico_id: tecnicoId,
        unidade_id: unidadeId,
        tipo_visita: tipoVisita,
        prioridade,
        data_inicio: dataInicio,
        data_fim: dataFim,
        apenas_em_atraso: apenasEmAtraso
      };

      // Remove filtros undefined
      Object.keys(filtros).forEach(key => 
        filtros[key] === undefined && delete filtros[key]
      );

      const resultado = await this.agendamentoService.buscarTodos(
        filtros,
        validatedParams
      );

      return resultado;
    } catch (error) {
      // Filtros globais tratarão BadRequestException para parâmetros inválidos
      throw error;
    }
  }

  /**
   * Obtém detalhes de um agendamento específico
   */
  @Get(':id')
  @RequiresPermission({ permissionName: 'monitoramento.agendamento.visualizar' })
  @ApiOperation({ 
    summary: 'Obter agendamento',
    description: 'Obtém detalhes de um agendamento específico'
  })
  @ApiParam({ name: 'id', description: 'ID do agendamento' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Agendamento encontrado',
    type: AgendamentoResponseDto,
    example: {
      data: {
        id: '550e8400-e29b-41d4-a716-446655440006',
        beneficiario_id: '550e8400-e29b-41d4-a716-446655440000',
        tecnico_id: '550e8400-e29b-41d4-a716-446655440001',
        unidade_id: '550e8400-e29b-41d4-a716-446655440002',
        tipo_visita: 'inicial',
        data_hora: '2024-02-15T14:30:00.000Z',
        status: 'agendado',
        prioridade: 'alta',
        observacoes: 'Primeira visita domiciliar para avaliação inicial',
        created_at: '2024-02-10T10:00:00.000Z',
        updated_at: '2024-02-10T10:00:00.000Z'
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Agendamento não encontrado',
    example: {
      statusCode: 404,
      message: 'Agendamento não encontrado',
      error: 'Not Found'
    }
  })
  async obterAgendamento(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<{ data: AgendamentoResponseDto }> {
    try {
      const agendamento = await this.agendamentoService.buscarPorId(id);

      return {
        data: agendamento
      };
    } catch (error) {
      // NotFoundException será tratada pelos filtros globais
      throw error;
    }
  }

  /**
   * Lista agendamentos em atraso
   */
  @Get('em-atraso/listar')
  @RequiresPermission({ permissionName: 'monitoramento.agendamento.listar' })
  @ApiOperation({ 
    summary: 'Listar agendamentos em atraso',
    description: 'Lista todos os agendamentos que estão em atraso'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (padrão: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página (padrão: 10)' })
  @ApiQuery({ name: 'unidade_id', required: false, type: String, description: 'ID da unidade' })
  @ApiQuery({ name: 'tecnico_id', required: false, type: String, description: 'ID do técnico responsável' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Lista de agendamentos em atraso retornada com sucesso',
    type: [AgendamentoResponseDto]
  })
  async listarAgendamentosEmAtraso(
    @Query() paginationParams: PaginationParamsDto,
    @Query('unidade_id') unidadeId?: string,
    @Query('tecnico_id') tecnicoId?: string
  ): Promise<PaginatedResponseDto<AgendamentoResponseDto>> {
    try {
      // Validar e aplicar valores padrão para paginação
      const validatedParams = PaginationHelper.applyDefaults(paginationParams);

      const filtros = { unidade_id: unidadeId, tecnico_id: tecnicoId };
      
      // Remove filtros undefined
      Object.keys(filtros).forEach(key => 
        filtros[key] === undefined && delete filtros[key]
      );

      const resultado = await this.agendamentoService.buscarEmAtraso(
        filtros,
        validatedParams
      );

      return resultado;
    } catch (error) {
      // Filtros globais tratarão erros de validação e consulta
      throw error;
    }
  }

  /**
   * Lista agendamentos por técnico responsável
   */
  @Get('tecnico/:tecnicoId')
  @RequiresPermission({ permissionName: 'monitoramento.agendamento.listar' })
  @ApiOperation({ 
    summary: 'Listar agendamentos por técnico',
    description: 'Lista todos os agendamentos de um técnico específico'
  })
  @ApiParam({ name: 'tecnicoId', description: 'ID do técnico responsável' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (padrão: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página (padrão: 10)' })
  @ApiQuery({ name: 'orderBy', required: false, type: String, description: 'Campo para ordenação (padrão: created_at)' })
  @ApiQuery({ name: 'orderDirection', required: false, enum: ['ASC', 'DESC'], description: 'Direção da ordenação (padrão: DESC)' })
  @ApiQuery({ name: 'data_inicio', required: false, type: String, description: 'Data de início (YYYY-MM-DD)' })
  @ApiQuery({ name: 'data_fim', required: false, type: String, description: 'Data de fim (YYYY-MM-DD)' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Lista de agendamentos do técnico retornada com sucesso',
    type: PaginatedResponseDto
  })
  async listarAgendamentosPorTecnico(
    @Param('tecnicoId', ParseUUIDPipe) tecnicoId: string,
    @Query() paginationParams: PaginationParamsDto,
    @Query('data_inicio') dataInicio?: string,
    @Query('data_fim') dataFim?: string
  ): Promise<PaginatedResponseDto<AgendamentoResponseDto>> {
    try {
      // Valida e aplica valores padrão para paginação
      const validatedParams = PaginationHelper.applyDefaults(paginationParams);
      
      const filtros = { 
        data_inicio: dataInicio, 
        data_fim: dataFim,
        tecnico_id: tecnicoId
      };
      
      // Remove filtros undefined
      Object.keys(filtros).forEach(key => 
        filtros[key] === undefined && delete filtros[key]
      );

      return await this.agendamentoService.buscarTodos(filtros, validatedParams);
    } catch (error) {
      // Filtros globais tratarão NotFoundException se técnico não existir
      throw error;
    }
  }

  /**
   * Lista agendamentos por pagamento
   */
  @Get('pagamento/:pagamentoId')
  @RequiresPermission({ permissionName: 'monitoramento.agendamento.listar' })
  @ApiOperation({ 
    summary: 'Listar agendamentos por pagamento',
    description: 'Lista todos os agendamentos de um pagamento específico'
  })
  @ApiParam({ name: 'pagamentoId', description: 'ID do pagamento' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (padrão: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página (padrão: 10)' })
  @ApiQuery({ name: 'orderBy', required: false, type: String, description: 'Campo para ordenação (padrão: created_at)' })
  @ApiQuery({ name: 'orderDirection', required: false, enum: ['ASC', 'DESC'], description: 'Direção da ordenação (padrão: DESC)' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Lista de agendamentos do pagamento retornada com sucesso',
    type: PaginatedResponseDto
  })
  async listarAgendamentosPorPagamento(
    @Param('pagamentoId', ParseUUIDPipe) pagamentoId: string,
    @Query() paginationParams: PaginationParamsDto
  ): Promise<PaginatedResponseDto<AgendamentoResponseDto>> {
    try {
      // Valida e aplica valores padrão para paginação
      const validatedParams = PaginationHelper.applyDefaults(paginationParams);
      
      const filtros = { 
        pagamento_id: pagamentoId
      };

      return await this.agendamentoService.buscarPorPagamento(pagamentoId, filtros, validatedParams);
    } catch (error) {
      // Filtros globais tratarão NotFoundException se pagamento não existir
      throw error;
    }
  }

  /**
   * Confirma um agendamento
   */
  @Put(':id/confirmar')
  @RequiresPermission({ permissionName: 'monitoramento.agendamento.confirmar' })
  @ApiOperation({ 
    summary: 'Confirmar agendamento',
    description: 'Confirma um agendamento de visita domiciliar'
  })
  @ApiParam({ name: 'id', description: 'ID do agendamento' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Agendamento confirmado com sucesso',
    type: AgendamentoResponseDto
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Agendamento não encontrado' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Agendamento não pode ser confirmado no status atual' 
  })
  async confirmarAgendamento(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() usuario: Usuario
  ): Promise<{ message: string; data: AgendamentoResponseDto }> {
    try {
      const agendamento = await this.agendamentoService.confirmarAgendamento(id, usuario.id);

      return {
        message: 'Agendamento confirmado com sucesso',
        data: agendamento
      };
    } catch (error) {
      // Filtros globais tratarão NotFoundException e BadRequestException
      throw error;
    }
  }

  /**
   * Reagenda uma visita
   */
  @Put(':id/reagendar')
  @RequiresPermission({ permissionName: 'monitoramento.agendamento.reagendar' })
  @ApiOperation({ 
    summary: 'Reagendar visita',
    description: 'Reagenda uma visita domiciliar para nova data/hora'
  })
  @ApiParam({ name: 'id', description: 'ID do agendamento' })
  @ApiBody({
    description: 'Dados para reagendamento',
    examples: {
      'reagendamento-simples': {
        summary: 'Reagendamento simples',
        description: 'Reagendamento apenas com nova data/hora',
        value: {
          nova_data_hora: '2024-02-20T15:00:00.000Z'
        }
      },
      'reagendamento-com-motivo': {
        summary: 'Reagendamento com motivo',
        description: 'Reagendamento com justificativa',
        value: {
          nova_data_hora: '2024-02-22T10:30:00.000Z',
          motivo_reagendamento: 'Beneficiário solicitou alteração de horário devido a compromisso médico'
        }
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Agendamento reagendado com sucesso',
    type: AgendamentoResponseDto,
    example: {
      message: 'Agendamento reagendado com sucesso',
      data: {
        id: '550e8400-e29b-41d4-a716-446655440006',
        beneficiario_id: '550e8400-e29b-41d4-a716-446655440000',
        tecnico_id: '550e8400-e29b-41d4-a716-446655440001',
        unidade_id: '550e8400-e29b-41d4-a716-446655440002',
        tipo_visita: 'inicial',
        data_hora: '2024-02-20T15:00:00.000Z',
        status: 'reagendado',
        prioridade: 'alta',
        observacoes: 'Reagendado por solicitação do beneficiário',
        created_at: '2024-02-10T10:00:00.000Z',
        updated_at: '2024-02-15T14:20:00.000Z'
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Agendamento não encontrado',
    example: {
      statusCode: 404,
      message: 'Agendamento não encontrado',
      error: 'Not Found'
    }
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Nova data/hora inválida ou agendamento não pode ser reagendado',
    example: {
      statusCode: 400,
      message: 'Nova data/hora deve ser futura e o agendamento deve estar em status válido para reagendamento',
      error: 'Bad Request'
    }
  })
  async reagendarVisita(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: Usuario,
    @Body('nova_data', ValidationPipe) novaData: Date,
    @Body('motivo_reagendamento') motivoReagendamento?: string
  ): Promise<{ message: string; data: AgendamentoResponseDto }> {
    try {
      const agendamento = await this.agendamentoService.reagendarVisita(
        id,
        novaData,
        motivoReagendamento,
        user.id
      );

      return {
        message: 'Agendamento reagendado com sucesso',
        data: agendamento
      };
    } catch (error) {
      // Filtros globais tratarão NotFoundException, BadRequestException e ConflictException
      throw error;
    }
  }

  /**
   * Cancela um agendamento
   */
  @Put(':id/cancelar')
  @RequiresPermission({ permissionName: 'monitoramento.agendamento.cancelar' })
  @ApiOperation({ 
    summary: 'Cancelar agendamento',
    description: 'Cancela um agendamento de visita domiciliar'
  })
  @ApiParam({ name: 'id', description: 'ID do agendamento' })
  @ApiBody({
    description: 'Motivo do cancelamento',
    examples: {
      'cancelamento-beneficiario': {
        summary: 'Cancelamento por solicitação do beneficiário',
        description: 'Beneficiário solicitou cancelamento',
        value: {
          motivo_cancelamento: 'Beneficiário não poderá receber a visita devido a viagem'
        }
      },
      'cancelamento-tecnico': {
        summary: 'Cancelamento por indisponibilidade técnica',
        description: 'Técnico não poderá realizar a visita',
        value: {
          motivo_cancelamento: 'Técnico em licença médica, necessário reagendar com outro profissional'
        }
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Agendamento cancelado com sucesso',
    type: AgendamentoResponseDto,
    example: {
      message: 'Agendamento cancelado com sucesso',
      data: {
        id: '550e8400-e29b-41d4-a716-446655440006',
        beneficiario_id: '550e8400-e29b-41d4-a716-446655440000',
        tecnico_id: '550e8400-e29b-41d4-a716-446655440001',
        unidade_id: '550e8400-e29b-41d4-a716-446655440002',
        tipo_visita: 'inicial',
        data_hora: '2024-02-15T14:30:00.000Z',
        status: 'cancelado',
        prioridade: 'alta',
        observacoes: 'Cancelado: Beneficiário não poderá receber a visita devido a viagem',
        created_at: '2024-02-10T10:00:00.000Z',
        updated_at: '2024-02-14T09:15:00.000Z'
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Agendamento não encontrado',
    example: {
      statusCode: 404,
      message: 'Agendamento não encontrado',
      error: 'Not Found'
    }
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Agendamento não pode ser cancelado no status atual',
    example: {
      statusCode: 400,
      message: 'Agendamento já foi realizado e não pode ser cancelado',
      error: 'Bad Request'
    }
  })
  async cancelarAgendamento(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('motivo_cancelamento', ValidationPipe) motivoCancelamento: string,
    @GetUser() usuario: Usuario
  ): Promise<{ message: string; data: AgendamentoResponseDto }> {
    try {
      const agendamento = await this.agendamentoService.cancelarAgendamento(
        id,
        motivoCancelamento,
        usuario.id
      );

      return {
        message: 'Agendamento cancelado com sucesso',
        data: agendamento
      };
    } catch (error) {
      // Filtros globais tratarão NotFoundException e BadRequestException
      throw error;
    }
  }

  /**
   * Endpoint para criação de agendamentos em lote
   * Processa múltiplos agendamentos de forma otimizada com controle de concorrência
   */
  @Post('batch')
  @RequiresPermission({ permissionName: 'monitoramento.agendamento.criar' })
  @ApiOperation({
    summary: 'Criar agendamentos em lote',
    description: 'Cria múltiplos agendamentos de visita domiciliar de forma otimizada com controle de concorrência e transações'
  })
  @ApiBody({
    type: [CriarAgendamentoDto],
    description: 'Array de dados para criação dos agendamentos em lote',
    examples: {
      'lote-agendamentos': {
        summary: 'Lote de agendamentos diversos',
        description: 'Exemplo de criação em lote com diferentes tipos de visita',
        value: [
          {
            beneficiario_id: '550e8400-e29b-41d4-a716-446655440000',
            tecnico_id: '550e8400-e29b-41d4-a716-446655440001',
            unidade_id: '550e8400-e29b-41d4-a716-446655440002',
            tipo_visita: 'inicial',
            data_hora: '2024-02-15T14:30:00.000Z',
            prioridade: 'alta',
            observacoes: 'Primeira visita domiciliar para avaliação inicial'
          },
          {
            beneficiario_id: '550e8400-e29b-41d4-a716-446655440003',
            tecnico_id: '550e8400-e29b-41d4-a716-446655440004',
            unidade_id: '550e8400-e29b-41d4-a716-446655440005',
            tipo_visita: 'acompanhamento',
            data_hora: '2024-02-20T09:00:00.000Z',
            prioridade: 'media',
            observacoes: 'Visita de acompanhamento mensal'
          }
        ]
      }
    }
  })
  @ApiQuery({
    name: 'batchSize',
    required: false,
    type: Number,
    description: 'Tamanho do lote para processamento (padrão: 10, máximo: 100)',
    example: 10
  })
  @ApiQuery({
    name: 'maxConcurrency',
    required: false,
    type: Number,
    description: 'Máximo de operações concorrentes (padrão: 3, máximo: 10)',
    example: 3
  })
  @ApiQuery({
    name: 'useTransaction',
    required: false,
    type: Boolean,
    description: 'Usar transação para garantir atomicidade (padrão: true)',
    example: true
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Agendamentos criados em lote com sucesso',
    example: {
      message: 'Processamento em lote concluído',
      data: {
        sucessos: 2,
        erros: 0,
        detalhes: {
          agendamentos_criados: [
            {
              id: '550e8400-e29b-41d4-a716-446655440006',
              beneficiario_id: '550e8400-e29b-41d4-a716-446655440000',
              tecnico_id: '550e8400-e29b-41d4-a716-446655440001',
              status: 'agendado'
            }
          ],
          erros_processamento: []
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados inválidos ou parâmetros de lote incorretos',
    example: {
      statusCode: 400,
      message: ['batchSize deve ser entre 1 e 100', 'Array de agendamentos não pode estar vazio'],
      error: 'Bad Request'
    }
  })
  @ApiResponse({
    status: HttpStatus.PARTIAL_CONTENT,
    description: 'Processamento parcial - alguns agendamentos falharam',
    example: {
      message: 'Processamento em lote concluído com erros',
      data: {
        sucessos: 1,
        erros: 1,
        detalhes: {
          agendamentos_criados: [
            {
              id: '550e8400-e29b-41d4-a716-446655440006',
              beneficiario_id: '550e8400-e29b-41d4-a716-446655440000'
            }
          ],
          erros_processamento: [
            {
              index: 1,
              erro: 'Técnico não encontrado ou indisponível no horário solicitado',
              dados: {
                beneficiario_id: '550e8400-e29b-41d4-a716-446655440003',
                tecnico_id: '550e8400-e29b-41d4-a716-446655440004'
              }
            }
          ]
        }
      }
    }
  })
  async criarAgendamentosEmLote(
    @Body(ValidationPipe) agendamentos: CriarAgendamentoDto[],
    @GetUser() user: Usuario,
    @Query('batchSize', new ParseIntPipe({ optional: true })) batchSize: number = 10,
    @Query('maxConcurrency', new ParseIntPipe({ optional: true })) maxConcurrency: number = 3,
    @Query('useTransaction', new ParseBoolPipe({ optional: true })) useTransaction: boolean = true
  ): Promise<SuccessResponseDto> {
    try {
      // Validação dos parâmetros de entrada
      if (!agendamentos || agendamentos.length === 0) {
        throw new Error('Array de agendamentos não pode estar vazio');
      }

      if (batchSize < 1 || batchSize > 100) {
        throw new Error('batchSize deve ser entre 1 e 100');
      }

      if (maxConcurrency < 1 || maxConcurrency > 10) {
        throw new Error('maxConcurrency deve ser entre 1 e 10');
      }

      // Processamento em lote usando o serviço especializado
      const resultado = await this.agendamentoBatchService.createAgendamentosInBatch(
        agendamentos,
        user.id,
        {
          batchSize,
          maxConcurrency,
          useTransaction,
          continueOnError: true
        }
      );

      // Determinar status da resposta baseado nos resultados
      const statusCode = resultado.errors.length > 0 ? HttpStatus.PARTIAL_CONTENT : HttpStatus.CREATED;
      const message = resultado.errors.length > 0 
        ? 'Processamento em lote concluído com erros'
        : 'Processamento em lote concluído';

      return {
        statusCode,
        message,
        data: resultado,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      // Filtros globais tratarão as exceções apropriadamente
      throw error;
    }
  }

  /**
   * Aplica filtros avançados para busca de agendamentos
   * Endpoint especializado para filtros complexos com múltiplos critérios
   */
  @Post('filtros-avancados')
  @RequiresPermission({ permissionName: 'monitoramento.agendamento.listar' })
  @ApiOperation({
    summary: 'Aplicar filtros avançados em agendamentos',
    description: 'Endpoint para aplicação de filtros avançados em agendamentos, permitindo busca por múltiplos critérios, períodos predefinidos e ordenação customizada. Ideal para relatórios gerenciais e análises detalhadas.'
  })
  @ApiBody({
    type: AgendamentoFiltrosAvancadosDto,
    description: 'Filtros avançados para busca de agendamentos',
    examples: {
      'filtro-basico': {
        summary: 'Filtro básico por unidade e status',
        description: 'Exemplo de filtro simples por unidade e status',
        value: {
          unidades: ['550e8400-e29b-41d4-a716-446655440000'],
          status: ['agendado', 'em_andamento'],
          page: 1,
          limit: 20
        }
      },
      'filtro-periodo': {
        summary: 'Filtro por período predefinido',
        description: 'Exemplo usando período predefinido',
        value: {
          periodo: 'ultimos_30_dias',
          tipos_visita: ['inicial', 'acompanhamento'],
          prioridades: ['alta', 'media'],
          include_relations: true
        }
      },
      'filtro-avancado': {
        summary: 'Filtro avançado completo',
        description: 'Exemplo com múltiplos filtros e busca textual',
        value: {
          unidades: ['550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440001'],
          tecnicos: ['550e8400-e29b-41d4-a716-446655440002'],
          status: ['agendado'],
          tipos_visita: ['inicial'],
          prioridades: ['alta'],
          search: 'João Silva',
          data_inicio: '2024-01-01T00:00:00.000Z',
          data_fim: '2024-12-31T23:59:59.999Z',
          em_atraso: false,
          incluir_cancelados: false,
          include_relations: true,
          sort_by: 'data_agendamento',
          sort_order: 'ASC',
          page: 1,
          limit: 50
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Filtros aplicados com sucesso',
    type: AgendamentoFiltrosResponseDto,
    example: {
      message: 'Filtros aplicados com sucesso',
      data: {
        unidades: [
          { id: '550e8400-e29b-41d4-a716-446655440000', nome: 'CRAS Centro', total_agendamentos: 45 }
        ],
        status: [
          { status: 'agendado', total: 120 },
          { status: 'em_andamento', total: 45 }
        ],
        tipos_visita: [
          { tipo: 'inicial', total: 85 },
          { tipo: 'acompanhamento', total: 150 }
        ],
        prioridades: [
          { prioridade: 'alta', total: 25 },
          { prioridade: 'media', total: 180 }
        ],
        tecnicos: [
          { id: '550e8400-e29b-41d4-a716-446655440002', nome: 'Maria Santos', total_agendamentos: 28 }
        ],
        estatisticas: {
          total_agendamentos: 395,
          agendamentos_em_atraso: 12,
          agendamentos_hoje: 8,
          agendamentos_proximos_7_dias: 45
        },
        periodos_disponiveis: ['hoje', 'ultimos_7_dias', 'ultimos_30_dias', 'ultimo_mes', 'ultimos_3_meses']
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Parâmetros de filtro inválidos',
    example: {
      statusCode: 400,
      message: ['unidades deve ser um array de UUIDs válidos', 'data_inicio deve ser uma data válida'],
      error: 'Bad Request'
    }
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Usuário não possui permissão para listar agendamentos',
    example: {
      statusCode: 403,
      message: 'Acesso negado: permissão monitoramento.agendamento.listar requerida',
      error: 'Forbidden'
    }
  })
  async aplicarFiltrosAvancados(
    @Body(ValidationPipe) filtros: AgendamentoFiltrosAvancadosDto
  ): Promise<{ message: string; data: AgendamentoFiltrosResponseDto }> {
    try {
      const resultado = await this.agendamentoService.aplicarFiltrosAvancados(filtros);

      return {
        message: 'Filtros aplicados com sucesso',
        data: resultado
      };
    } catch (error) {
      // Os filtros de exceção globais irão capturar e tratar adequadamente
      throw error;
    }
  }
}