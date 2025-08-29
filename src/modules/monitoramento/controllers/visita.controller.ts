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
import { VisitaService } from '../services';
import { RegistrarVisitaDto, VisitaFiltrosAvancadosDto, VisitaFiltrosResponseDto } from '../dto';
import { TipoVisita, ResultadoVisita } from '../enums';
import { PaginationParamsDto } from '../../../shared/dtos/pagination-params.dto';
import { PaginatedResponseDto } from '../../../shared/dtos/pagination.dto';
import { PaginationHelper } from '../helpers/pagination.helper';

/**
 * Controller para gerenciamento de visitas domiciliares realizadas
 * Responsável por registro, consulta e atualização de visitas executadas
 */
@ApiTags('Visitas')
@Controller('monitoramento/visitas')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class VisitaController {
  constructor(private readonly visitaService: VisitaService) { }

  /**
   * Registra uma nova visita domiciliar realizada
   */
  @Post()
  @RequiresPermission({ permissionName: 'monitoramento.visita.registrar' })
  @ApiOperation({
    summary: 'Registrar visita domiciliar',
    description: 'Registra uma visita domiciliar realizada com todos os dados coletados'
  })
  @ApiBody({
    type: RegistrarVisitaDto,
    description: 'Dados da visita domiciliar realizada',
    examples: {
      'visita-inicial-positiva': {
        summary: 'Visita inicial com resultado positivo',
        description: 'Exemplo de registro de visita inicial bem-sucedida',
        value: {
          agendamento_id: '550e8400-e29b-41d4-a716-446655440000',
          data_realizacao: '2024-02-15T14:30:00.000Z',
          resultado: 'realizada',
          observacoes_gerais: 'Visita realizada conforme agendado. Beneficiário estava presente e colaborativo.',
          condicoes_moradia: {
            tipo_residencia: 'casa',
            condicoes_higiene: 'adequadas',
            acesso_agua: true,
            acesso_energia: true,
            observacoes: 'Residência em boas condições de habitabilidade'
          },
          situacao_familiar: {
            composicao_familiar: 4,
            renda_familiar: 1200.00,
            observacoes: 'Família composta por casal e dois filhos menores'
          },
          avaliacao_elegibilidade: {
            atende_criterios: true,
            observacoes: 'Beneficiário atende todos os critérios de elegibilidade'
          },
          recomendacoes: {
            recomenda_renovacao: true,
            necessita_nova_visita: false,
            prazo_nova_visita: null,
            observacoes: 'Recomenda-se a renovação do benefício'
          }
        }
      },
      'visita-acompanhamento-problemas': {
        summary: 'Visita de acompanhamento com problemas identificados',
        description: 'Exemplo de visita que identificou problemas na situação do beneficiário',
        value: {
          agendamento_id: '550e8400-e29b-41d4-a716-446655440001',
          data_realizacao: '2024-02-20T10:00:00.000Z',
          resultado: 'realizada',
          observacoes_gerais: 'Identificadas mudanças na situação familiar que podem afetar a elegibilidade.',
          condicoes_moradia: {
            tipo_residencia: 'apartamento',
            condicoes_higiene: 'adequadas',
            acesso_agua: true,
            acesso_energia: true,
            observacoes: 'Mudança de endereço recente'
          },
          situacao_familiar: {
            composicao_familiar: 3,
            renda_familiar: 2500.00,
            observacoes: 'Aumento significativo na renda familiar'
          },
          avaliacao_elegibilidade: {
            atende_criterios: false,
            observacoes: 'Renda familiar excede o limite estabelecido'
          },
          recomendacoes: {
            recomenda_renovacao: false,
            necessita_nova_visita: true,
            prazo_nova_visita: '2024-03-15',
            observacoes: 'Necessária nova avaliação em 30 dias para confirmar mudanças'
          }
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Visita registrada com sucesso',
    example: {
      message: 'Visita registrada com sucesso',
      data: {
        id: '550e8400-e29b-41d4-a716-446655440010',
        agendamento_id: '550e8400-e29b-41d4-a716-446655440000',
        data_realizacao: '2024-02-15T14:30:00.000Z',
        resultado: 'realizada',
        observacoes_gerais: 'Visita realizada conforme agendado',
        recomenda_renovacao: true,
        necessita_nova_visita: false,
        created_at: '2024-02-15T14:45:00.000Z',
        updated_at: '2024-02-15T14:45:00.000Z'
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados inválidos ou regras de negócio violadas',
    example: {
      statusCode: 400,
      message: ['data_realizacao deve ser uma data válida', 'resultado deve ser um valor válido'],
      error: 'Bad Request'
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
    status: HttpStatus.CONFLICT,
    description: 'Visita já foi registrada para este agendamento',
    example: {
      statusCode: 409,
      message: 'Já existe uma visita registrada para este agendamento',
      error: 'Conflict'
    }
  })
  async registrarVisita(
    @Body(ValidationPipe) dto: RegistrarVisitaDto
  ): Promise<{ message: string; data: any }> {
    const visita = await this.visitaService.registrar(dto);

    return {
      message: 'Visita registrada com sucesso',
      data: visita
    };
  }

  /**
   * Lista todas as visitas com filtros opcionais
   */
  @Get()
  @RequiresPermission({ permissionName: 'monitoramento.visita.listar' })
  @ApiOperation({
    summary: 'Listar visitas',
    description: 'Lista todas as visitas realizadas com filtros opcionais'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (padrão: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página (padrão: 10)' })
  @ApiQuery({ name: 'orderBy', required: false, type: String, description: 'Campo para ordenação (padrão: data_visita)' })
  @ApiQuery({ name: 'orderDirection', required: false, enum: ['ASC', 'DESC'], description: 'Direção da ordenação (padrão: DESC)' })
  @ApiQuery({ name: 'beneficiario_id', required: false, type: String, description: 'ID do beneficiário' })
  @ApiQuery({ name: 'tecnico_id', required: false, type: String, description: 'ID do técnico responsável' })
  @ApiQuery({ name: 'unidade_id', required: false, type: String, description: 'ID da unidade' })
  @ApiQuery({ name: 'tipo_visita', required: false, enum: TipoVisita, description: 'Tipo da visita' })
  @ApiQuery({ name: 'resultado', required: false, enum: ResultadoVisita, description: 'Resultado da visita' })
  @ApiQuery({ name: 'data_inicio', required: false, type: String, description: 'Data de início (YYYY-MM-DD)' })
  @ApiQuery({ name: 'data_fim', required: false, type: String, description: 'Data de fim (YYYY-MM-DD)' })
  @ApiQuery({ name: 'recomenda_renovacao', required: false, type: Boolean, description: 'Apenas visitas que recomendam renovação' })
  @ApiQuery({ name: 'necessita_nova_visita', required: false, type: Boolean, description: 'Apenas visitas que necessitam nova visita' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de visitas retornada com sucesso',
    example: {
      data: [
        {
          id: '550e8400-e29b-41d4-a716-446655440010',
          agendamento_id: '550e8400-e29b-41d4-a716-446655440000',
          beneficiario_id: '550e8400-e29b-41d4-a716-446655440001',
          tecnico_id: '550e8400-e29b-41d4-a716-446655440002',
          tipo_visita: 'inicial',
          data_realizacao: '2024-02-15T14:30:00.000Z',
          resultado: 'realizada',
          recomenda_renovacao: true,
          necessita_nova_visita: false,
          observacoes_gerais: 'Visita realizada conforme agendado',
          created_at: '2024-02-15T14:45:00.000Z',
          updated_at: '2024-02-15T14:45:00.000Z'
        }
      ],
      total: 1,
      page: 1,
      limit: 10
    }
  })
  async listarVisitas(
    @Query() paginationParams: PaginationParamsDto,
    @Query('beneficiario_id') beneficiarioId?: string,
    @Query('tecnico_id') tecnicoId?: string,
    @Query('unidade_id') unidadeId?: string,
    @Query('tipo_visita') tipoVisita?: TipoVisita,
    @Query('resultado') resultado?: ResultadoVisita,
    @Query('data_inicio') dataInicio?: string,
    @Query('data_fim') dataFim?: string,
    @Query('recomenda_renovacao', new ParseBoolPipe({ optional: true })) recomendaRenovacao?: boolean,
    @Query('necessita_nova_visita', new ParseBoolPipe({ optional: true })) necessitaNovaVisita?: boolean
  ): Promise<PaginatedResponseDto<any>> {
    // Aplicar valores padrão e validar parâmetros de paginação
    const { page, limit, orderBy, orderDirection } = PaginationHelper.applyDefaults(paginationParams);

    const filtros = {
      beneficiario_id: beneficiarioId,
      tecnico_id: tecnicoId,
      unidade_id: unidadeId,
      tipo_visita: tipoVisita,
      resultado,
      data_inicio: dataInicio,
      data_fim: dataFim,
      recomenda_renovacao: recomendaRenovacao,
      necessita_nova_visita: necessitaNovaVisita
    };

    // Remove filtros undefined
    Object.keys(filtros).forEach(key =>
      filtros[key] === undefined && delete filtros[key]
    );

    return await this.visitaService.buscarTodas(
      filtros,
      paginationParams
    );
  }

  /**
   * Obtém detalhes de uma visita específica
   */
  @Get(':id')
  @RequiresPermission({ permissionName: 'monitoramento.visita.visualizar' })
  @ApiOperation({
    summary: 'Obter visita',
    description: 'Obtém detalhes de uma visita específica'
  })
  @ApiParam({ name: 'id', description: 'ID da visita' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Visita encontrada com sucesso',
    example: {
      data: {
        id: '550e8400-e29b-41d4-a716-446655440010',
        agendamento_id: '550e8400-e29b-41d4-a716-446655440000',
        beneficiario_id: '550e8400-e29b-41d4-a716-446655440001',
        tecnico_id: '550e8400-e29b-41d4-a716-446655440002',
        tipo_visita: 'inicial',
        data_realizacao: '2024-02-15T14:30:00.000Z',
        resultado: 'realizada',
        observacoes_gerais: 'Visita realizada conforme agendado',
        condicoes_moradia: {
          tipo_residencia: 'casa',
          condicoes_higiene: 'adequadas',
          acesso_agua: true,
          acesso_energia: true,
          observacoes: 'Residência em boas condições'
        },
        situacao_familiar: {
          composicao_familiar: 4,
          renda_familiar: 1200.00,
          observacoes: 'Família composta por casal e dois filhos'
        },
        avaliacao_elegibilidade: {
          atende_criterios: true,
          observacoes: 'Atende todos os critérios'
        },
        recomendacoes: {
          recomenda_renovacao: true,
          necessita_nova_visita: false,
          prazo_nova_visita: null,
          observacoes: 'Recomenda renovação'
        },
        recomenda_renovacao: true,
        necessita_nova_visita: false,
        created_at: '2024-02-15T14:45:00.000Z',
        updated_at: '2024-02-15T14:45:00.000Z'
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Visita não encontrada',
    example: {
      statusCode: 404,
      message: 'Visita não encontrada',
      error: 'Not Found'
    }
  })
  async obterVisita(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<{ data: any }> {
    const visita = await this.visitaService.buscarPorId(id);

    return {
      data: visita
    };
  }

  /**
   * Lista visitas por beneficiário
   */
  @Get('beneficiario/:beneficiarioId')
  @RequiresPermission({ permissionName: 'monitoramento.visita.listar' })
  @ApiOperation({
    summary: 'Listar visitas por beneficiário',
    description: 'Lista todas as visitas realizadas para um beneficiário específico'
  })
  @ApiParam({ name: 'beneficiarioId', description: 'ID do beneficiário' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (padrão: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página (padrão: 10)' })
  @ApiQuery({ name: 'orderBy', required: false, type: String, description: 'Campo para ordenação (padrão: data_realizacao)' })
  @ApiQuery({ name: 'orderDirection', required: false, enum: ['ASC', 'DESC'], description: 'Direção da ordenação (padrão: DESC)' })
  @ApiQuery({ name: 'data_inicio', required: false, type: String, description: 'Data de início (YYYY-MM-DD)' })
  @ApiQuery({ name: 'data_fim', required: false, type: String, description: 'Data de fim (YYYY-MM-DD)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de visitas do beneficiário retornada com sucesso'
  })
  async listarVisitasPorBeneficiario(
    @Param('beneficiarioId', ParseUUIDPipe) beneficiarioId: string,
    @Query() paginationParams: PaginationParamsDto,
    @Query('data_inicio') dataInicio?: string,
    @Query('data_fim') dataFim?: string
  ): Promise<PaginatedResponseDto<any>> {
    // Aplicar valores padrão e validar parâmetros de paginação
    const { page, limit, orderBy, orderDirection } = PaginationHelper.applyDefaults(paginationParams);

    const filtros = { data_inicio: dataInicio, data_fim: dataFim };

    // Remove filtros undefined
    Object.keys(filtros).forEach(key =>
      filtros[key] === undefined && delete filtros[key]
    );

    return await this.visitaService.buscarPorBeneficiario(
      beneficiarioId,
      filtros,
      paginationParams
    );
  }

  /**
   * Lista visitas por técnico responsável
   */
  @Get('tecnico/:tecnicoId')
  @RequiresPermission({ permissionName: 'monitoramento.visita.listar' })
  @ApiOperation({
    summary: 'Listar visitas por técnico',
    description: 'Lista todas as visitas realizadas por um técnico específico'
  })
  @ApiParam({ name: 'tecnicoId', description: 'ID do técnico responsável' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (padrão: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página (padrão: 10)' })
  @ApiQuery({ name: 'orderBy', required: false, type: String, description: 'Campo para ordenação (padrão: data_realizacao)' })
  @ApiQuery({ name: 'orderDirection', required: false, enum: ['ASC', 'DESC'], description: 'Direção da ordenação (padrão: DESC)' })
  @ApiQuery({ name: 'data_inicio', required: false, type: String, description: 'Data de início (YYYY-MM-DD)' })
  @ApiQuery({ name: 'data_fim', required: false, type: String, description: 'Data de fim (YYYY-MM-DD)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de visitas do técnico retornada com sucesso'
  })
  async listarVisitasPorTecnico(
    @Param('tecnicoId', ParseUUIDPipe) tecnicoId: string,
    @Query() paginationParams: PaginationParamsDto,
    @Query('data_inicio') dataInicio?: string,
    @Query('data_fim') dataFim?: string
  ): Promise<PaginatedResponseDto<any>> {
    const { page, limit, orderBy, orderDirection } = PaginationHelper.applyDefaults(paginationParams);
    
    const filtros = { data_inicio: dataInicio, data_fim: dataFim };

    // Remove filtros undefined
    Object.keys(filtros).forEach(key =>
      filtros[key] === undefined && delete filtros[key]
    );

    return await this.visitaService.buscarPorTecnico(
      tecnicoId,
      filtros,
      paginationParams
    );
  }

  /**
   * Lista visitas que recomendam renovação do benefício
   */
  @Get('renovacao/recomendadas')
  @RequiresPermission({ permissionName: 'monitoramento.visita.listar' })
  @ApiOperation({
    summary: 'Listar visitas que recomendam renovação',
    description: 'Lista todas as visitas que recomendam a renovação do benefício'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (padrão: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página (padrão: 10)' })
  @ApiQuery({ name: 'orderBy', required: false, type: String, description: 'Campo para ordenação (padrão: data_realizacao)' })
  @ApiQuery({ name: 'orderDirection', required: false, enum: ['ASC', 'DESC'], description: 'Direção da ordenação (padrão: DESC)' })
  @ApiQuery({ name: 'unidade_id', required: false, type: String, description: 'ID da unidade' })
  @ApiQuery({ name: 'data_inicio', required: false, type: String, description: 'Data de início (YYYY-MM-DD)' })
  @ApiQuery({ name: 'data_fim', required: false, type: String, description: 'Data de fim (YYYY-MM-DD)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de visitas que recomendam renovação retornada com sucesso'
  })
  async listarVisitasQueRecomendamRenovacao(
    @Query() paginationParams: PaginationParamsDto,
    @Query('unidade_id') unidadeId?: string,
    @Query('data_inicio') dataInicio?: string,
    @Query('data_fim') dataFim?: string
  ): Promise<PaginatedResponseDto<any>> {
    // Aplicar valores padrão e validar parâmetros de paginação
    const { page, limit, orderBy, orderDirection } = PaginationHelper.applyDefaults(paginationParams);

    const filtros = {
      unidade_id: unidadeId,
      data_inicio: dataInicio,
      data_fim: dataFim
    };

    // Remove filtros undefined
    Object.keys(filtros).forEach(key =>
      filtros[key] === undefined && delete filtros[key]
    );

    return await this.visitaService.buscarQueRecomendamRenovacao(
      filtros,
      paginationParams
    );
  }

  /**
   * Lista visitas que necessitam nova visita
   */
  @Get('nova-visita/necessarias')
  @RequiresPermission({ permissionName: 'monitoramento.visita.listar' })
  @ApiOperation({
    summary: 'Listar visitas que necessitam nova visita',
    description: 'Lista todas as visitas que indicam necessidade de nova visita'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (padrão: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página (padrão: 10)' })
  @ApiQuery({ name: 'orderBy', required: false, type: String, description: 'Campo para ordenação (padrão: data_realizacao)' })
  @ApiQuery({ name: 'orderDirection', required: false, enum: ['ASC', 'DESC'], description: 'Direção da ordenação (padrão: DESC)' })
  @ApiQuery({ name: 'unidade_id', required: false, type: String, description: 'ID da unidade' })
  @ApiQuery({ name: 'prazo_vencido', required: false, type: Boolean, description: 'Apenas com prazo vencido' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de visitas que necessitam nova visita retornada com sucesso'
  })
  async listarVisitasQueNecessitamNovaVisita(
    @Query() paginationParams: PaginationParamsDto,
    @Query('unidade_id') unidadeId?: string,
    @Query('prazo_vencido', new ParseBoolPipe({ optional: true })) prazoVencido?: boolean
  ): Promise<PaginatedResponseDto<any>> {
    // Aplicar valores padrão e extrair parâmetros de paginação
    const { page, limit, orderBy, orderDirection } = PaginationHelper.applyDefaults(paginationParams);

    const filtros = {
      unidade_id: unidadeId,
      prazo_vencido: prazoVencido
    };

    // Remove filtros undefined
    Object.keys(filtros).forEach(key =>
      filtros[key] === undefined && delete filtros[key]
    );

    return await this.visitaService.buscarQueNecessitamNovaVisita(
      filtros,
      paginationParams
    );
  }

  /**
   * Lista visitas com problemas de elegibilidade
   */
  @Get('elegibilidade/problemas')
  @RequiresPermission({ permissionName: 'monitoramento.visita.listar' })
  @ApiOperation({
    summary: 'Listar visitas com problemas de elegibilidade',
    description: 'Lista todas as visitas que identificaram problemas nos critérios de elegibilidade'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (padrão: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página (padrão: 10)' })
  @ApiQuery({ name: 'orderBy', required: false, type: String, description: 'Campo para ordenação (padrão: data_realizacao)' })
  @ApiQuery({ name: 'orderDirection', required: false, enum: ['ASC', 'DESC'], description: 'Direção da ordenação (padrão: DESC)' })
  @ApiQuery({ name: 'unidade_id', required: false, type: String, description: 'ID da unidade' })
  @ApiQuery({ name: 'data_inicio', required: false, type: String, description: 'Data de início (YYYY-MM-DD)' })
  @ApiQuery({ name: 'data_fim', required: false, type: String, description: 'Data de fim (YYYY-MM-DD)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de visitas com problemas de elegibilidade retornada com sucesso'
  })
  async listarVisitasComProblemasElegibilidade(
    @Query() paginationParams: PaginationParamsDto,
    @Query('unidade_id') unidadeId?: string,
    @Query('data_inicio') dataInicio?: string,
    @Query('data_fim') dataFim?: string
  ): Promise<PaginatedResponseDto<any>> {
    // Aplicar valores padrão e extrair parâmetros de paginação
    const { page, limit, orderBy, orderDirection } = PaginationHelper.applyDefaults(paginationParams);

    const filtros = {
      unidade_id: unidadeId,
      data_inicio: dataInicio,
      data_fim: dataFim
    };

    // Remove filtros undefined
    Object.keys(filtros).forEach(key =>
      filtros[key] === undefined && delete filtros[key]
    );

    return await this.visitaService.buscarComProblemasElegibilidade(
      filtros,
      paginationParams
    );
  }

  /**
   * Atualiza dados de uma visita existente
   */
  @Put(':id')
  @RequiresPermission({ permissionName: 'monitoramento.visita.atualizar' })
  @ApiOperation({
    summary: 'Atualizar visita',
    description: 'Atualiza dados de uma visita domiciliar existente'
  })
  @ApiParam({ name: 'id', description: 'ID da visita' })
  @ApiBody({
    description: 'Dados para atualização da visita (campos opcionais)',
    examples: {
      'atualizacao-observacoes': {
        summary: 'Atualização de observações',
        description: 'Exemplo de atualização apenas das observações gerais',
        value: {
          observacoes_gerais: 'Observações atualizadas após revisão do caso'
        }
      },
      'atualizacao-recomendacoes': {
        summary: 'Atualização de recomendações',
        description: 'Exemplo de atualização das recomendações da visita',
        value: {
          recomendacoes: {
            recomenda_renovacao: false,
            necessita_nova_visita: true,
            prazo_nova_visita: '2024-03-30',
            observacoes: 'Necessária nova avaliação devido a mudanças na situação familiar'
          }
        }
      },
      'atualizacao-completa': {
        summary: 'Atualização completa',
        description: 'Exemplo de atualização de múltiplos campos',
        value: {
          observacoes_gerais: 'Visita de acompanhamento realizada com sucesso',
          situacao_familiar: {
            composicao_familiar: 3,
            renda_familiar: 1800.00,
            observacoes: 'Mudança na composição familiar'
          },
          avaliacao_elegibilidade: {
            atende_criterios: true,
            observacoes: 'Mantém elegibilidade apesar das mudanças'
          },
          recomendacoes: {
            recomenda_renovacao: true,
            necessita_nova_visita: false,
            prazo_nova_visita: null,
            observacoes: 'Situação estabilizada, recomenda renovação'
          }
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Visita atualizada com sucesso',
    example: {
      message: 'Visita atualizada com sucesso',
      data: {
        id: '550e8400-e29b-41d4-a716-446655440010',
        agendamento_id: '550e8400-e29b-41d4-a716-446655440000',
        data_realizacao: '2024-02-15T14:30:00.000Z',
        resultado: 'realizada',
        observacoes_gerais: 'Observações atualizadas após revisão do caso',
        recomenda_renovacao: true,
        necessita_nova_visita: false,
        created_at: '2024-02-15T14:45:00.000Z',
        updated_at: '2024-02-20T10:30:00.000Z'
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Visita não encontrada',
    example: {
      statusCode: 404,
      message: 'Visita não encontrada',
      error: 'Not Found'
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados inválidos ou regras de negócio violadas',
    example: {
      statusCode: 400,
      message: ['observacoes_gerais deve ser uma string', 'renda_familiar deve ser um número positivo'],
      error: 'Bad Request'
    }
  })
  async atualizarVisita(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: Partial<RegistrarVisitaDto>
  ): Promise<{ message: string; data: any }> {
    const visita = await this.visitaService.atualizarVisita(id, dto);

    return {
      message: 'Visita atualizada com sucesso',
      data: visita
    };
  }

  /**
   * Aplica filtros avançados para busca de visitas
   */
  @Post('filtros-avancados')
  @RequiresPermission({ permissionName: 'monitoramento.visita.listar' })
  @ApiOperation({
    summary: 'Aplicar filtros avançados para visitas',
    description: 'Aplica filtros avançados para busca de visitas domiciliares com múltiplos critérios e retorna estatísticas'
  })
  @ApiBody({
    type: VisitaFiltrosAvancadosDto,
    description: 'Critérios de filtros avançados para busca de visitas',
    examples: {
      'filtros-basicos': {
        summary: 'Filtros básicos por período e tipo',
        description: 'Exemplo de filtros básicos por período e tipo de visita',
        value: {
          periodo: 'ultimos_30_dias',
          tipos_visita: ['inicial', 'acompanhamento'],
          resultados: ['realizada'],
          page: 1,
          limit: 20
        }
      },
      'filtros-completos': {
        summary: 'Filtros completos com múltiplos critérios',
        description: 'Exemplo de filtros avançados com múltiplos critérios',
        value: {
          unidades: ['550e8400-e29b-41d4-a716-446655440000'],
          tipos_visita: ['inicial'],
          resultados: ['realizada'],
          tecnicos: ['550e8400-e29b-41d4-a716-446655440001'],
          data_inicio: '2024-01-01T00:00:00.000Z',
          data_fim: '2024-12-31T23:59:59.999Z',
          search: 'beneficiário presente',
          recomenda_renovacao: true,
          beneficiario_presente: true,
          sort_by: 'data_realizacao',
          sort_order: 'DESC',
          page: 1,
          limit: 20
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Filtros aplicados com sucesso',
    type: VisitaFiltrosResponseDto,
    example: {
      visitas: [
        {
          id: '550e8400-e29b-41d4-a716-446655440010',
          agendamento_id: '550e8400-e29b-41d4-a716-446655440000',
          tipo_visita: 'inicial',
          resultado: 'realizada',
          data_realizacao: '2024-02-15T14:30:00.000Z',
          beneficiario_presente: true,
          recomenda_renovacao: true,
          necessita_nova_visita: false,
          tecnico: {
            id: '550e8400-e29b-41d4-a716-446655440001',
            nome: 'João Silva'
          },
          beneficiario: {
            id: '550e8400-e29b-41d4-a716-446655440002',
            nome: 'Maria Santos',
            unidade: {
              id: '550e8400-e29b-41d4-a716-446655440000',
              nome: 'Unidade Centro'
            }
          }
        }
      ],
      total: 150,
      estatisticas: {
        total_visitas: 150,
        visitas_realizadas: 120,
        visitas_nao_localizadas: 20,
        visitas_hoje: 5,
        renovacoes_recomendadas: 80,
        novas_visitas_necessarias: 15
      },
      opcoes_filtro: {
        unidades: [
          { id: '550e8400-e29b-41d4-a716-446655440000', nome: 'Unidade Centro', total_visitas: 50 }
        ],
        tipos_visita: [
          { tipo: 'inicial', total: 80 },
          { tipo: 'acompanhamento', total: 70 }
        ],
        resultados: [
          { resultado: 'realizada', total: 120 },
          { resultado: 'nao_localizado', total: 30 }
        ],
        tecnicos: [
          { id: '550e8400-e29b-41d4-a716-446655440001', nome: 'João Silva', total_visitas: 25 }
        ],
        periodos_disponiveis: ['hoje', 'ultimos_7_dias', 'ultimos_30_dias', 'ultimo_trimestre']
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Parâmetros de filtro inválidos',
    example: {
      statusCode: 400,
      message: ['periodo deve ser um valor válido', 'page deve ser maior que 0'],
      error: 'Bad Request'
    }
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token de acesso inválido ou expirado',
    example: {
      statusCode: 401,
      message: 'Unauthorized',
      error: 'Unauthorized'
    }
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Usuário não possui permissão para listar visitas',
    example: {
      statusCode: 403,
      message: 'Acesso negado. Permissão necessária: monitoramento.visita.listar',
      error: 'Forbidden'
    }
  })
  async aplicarFiltrosAvancados(
    @Body(ValidationPipe) filtros: VisitaFiltrosAvancadosDto
  ): Promise<VisitaFiltrosResponseDto> {
    return await this.visitaService.aplicarFiltrosAvancados(filtros);
  }
}