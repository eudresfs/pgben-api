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
  ParseBoolPipe
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
import { CriarAgendamentoDto, AgendamentoResponseDto } from '../dto';
import { TipoVisita, PrioridadeVisita } from '../enums';
import { Usuario } from '@/entities';
import { GetUser } from '@/auth/decorators/get-user.decorator';

/**
 * Controller para gerenciamento de agendamentos de visitas domiciliares
 * Responsável por operações CRUD e funcionalidades específicas de agendamento
 */
@ApiTags('Monitoramento - Agendamentos')
@Controller('monitoramento/agendamentos')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class AgendamentoController {
  constructor(private readonly agendamentoService: AgendamentoService) {}

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
    @Body(ValidationPipe) dto: CriarAgendamentoDto
  ): Promise<{ message: string; data: AgendamentoResponseDto }> {
    try {
      const agendamento = await this.agendamentoService.criarAgendamento(dto);

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
    type: [AgendamentoResponseDto],
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
      total: 1,
      page: 1,
      limit: 10
    }
  })
  async listarAgendamentos(
    @Query('page', PagePipe) page: number = 1,
    @Query('limit', LimitPipe) limit: number = 10,
    @Query('beneficiario_id') beneficiarioId?: string,
    @Query('tecnico_id') tecnicoId?: string,
    @Query('unidade_id') unidadeId?: string,
    @Query('tipo_visita') tipoVisita?: TipoVisita,
    @Query('prioridade') prioridade?: PrioridadeVisita,
    @Query('data_inicio') dataInicio?: string,
    @Query('data_fim') dataFim?: string,
    @Query('apenas_em_atraso', new ParseBoolPipe({ optional: true })) apenasEmAtraso?: boolean
  ): Promise<{ data: AgendamentoResponseDto[]; total: number; page: number; limit: number }> {
    try {
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

      const { agendamentos, total } = await this.agendamentoService.buscarTodos(
        filtros,
        page,
        limit
      );

      return {
        data: agendamentos,
        total,
        page,
        limit
      };
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
    @Query('page', PagePipe) page: number = 1,
    @Query('limit', LimitPipe) limit: number = 10,
    @Query('unidade_id') unidadeId?: string,
    @Query('tecnico_id') tecnicoId?: string
  ): Promise<{ data: AgendamentoResponseDto[]; total: number; page: number; limit: number }> {
    try {
      const filtros = { unidade_id: unidadeId, tecnico_id: tecnicoId };
      
      // Remove filtros undefined
      Object.keys(filtros).forEach(key => 
        filtros[key] === undefined && delete filtros[key]
      );

      const { agendamentos, total } = await this.agendamentoService.buscarEmAtraso(
        filtros
      );

      return {
        data: agendamentos,
        total,
        page,
        limit
      };
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
  @ApiQuery({ name: 'data_inicio', required: false, type: String, description: 'Data de início (YYYY-MM-DD)' })
  @ApiQuery({ name: 'data_fim', required: false, type: String, description: 'Data de fim (YYYY-MM-DD)' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Lista de agendamentos do técnico retornada com sucesso',
    type: [AgendamentoResponseDto]
  })
  async listarAgendamentosPorTecnico(
    @Param('tecnicoId', ParseUUIDPipe) tecnicoId: string,
    @Query('page', PagePipe) page: number = 1,
    @Query('limit', LimitPipe) limit: number = 10,
    @Query('data_inicio') dataInicio?: string,
    @Query('data_fim') dataFim?: string
  ): Promise<{ data: AgendamentoResponseDto[]; total: number; page: number; limit: number }> {
    try {
      const filtros = { data_inicio: dataInicio, data_fim: dataFim };
      
      // Remove filtros undefined
      Object.keys(filtros).forEach(key => 
        filtros[key] === undefined && delete filtros[key]
      );

      const { agendamentos, total } = await this.agendamentoService.buscarPorTecnico(
        tecnicoId,
        filtros
      );

      return {
        data: agendamentos,
        total,
        page,
        limit
      };
    } catch (error) {
      // Filtros globais tratarão NotFoundException se técnico não existir
      throw error;
    }
  }

  /**
   * Lista agendamentos por beneficiário
   */
  @Get('beneficiario/:beneficiarioId')
  @RequiresPermission({ permissionName: 'monitoramento.agendamento.listar' })
  @ApiOperation({ 
    summary: 'Listar agendamentos por beneficiário',
    description: 'Lista todos os agendamentos de um beneficiário específico'
  })
  @ApiParam({ name: 'beneficiarioId', description: 'ID do beneficiário' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (padrão: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página (padrão: 10)' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Lista de agendamentos do beneficiário retornada com sucesso',
    type: [AgendamentoResponseDto]
  })
  async listarAgendamentosPorBeneficiario(
    @Param('beneficiarioId', ParseUUIDPipe) beneficiarioId: string,
    @Query('page', PagePipe) page: number = 1,
    @Query('limit', LimitPipe) limit: number = 10
  ): Promise<{ data: AgendamentoResponseDto[]; total: number; page: number; limit: number }> {
    try {
      const { agendamentos, total } = await this.agendamentoService.buscarPorBeneficiario(
        beneficiarioId,
        {
          page,
          limit
        },
      );

      return {
        data: agendamentos,
        total,
        page,
        limit
      };
    } catch (error) {
      // Filtros globais tratarão NotFoundException se beneficiário não existir
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
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<{ message: string; data: AgendamentoResponseDto }> {
    try {
      const agendamento = await this.agendamentoService.confirmarAgendamento(id);

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
    @Body('nova_data', ValidationPipe) novaData: Date,
    @Body('motivo_reagendamento') motivoReagendamento?: string
  ): Promise<{ message: string; data: AgendamentoResponseDto }> {
    try {
      const agendamento = await this.agendamentoService.reagendarVisita(
        id,
        novaData,
        motivoReagendamento
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
}