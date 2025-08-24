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
import { RegistrarVisitaDto } from '../dto';
import { TipoVisita, ResultadoVisita } from '../enums';

/**
 * Controller para gerenciamento de visitas domiciliares realizadas
 * Responsável por registro, consulta e atualização de visitas executadas
 */
@ApiTags('Monitoramento - Visitas')
@Controller('monitoramento/visitas')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class VisitaController {
  constructor(private readonly visitaService: VisitaService) {}

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
    @Query('page', PagePipe) page: number = 1,
    @Query('limit', LimitPipe) limit: number = 10,
    @Query('beneficiario_id') beneficiarioId?: string,
    @Query('tecnico_id') tecnicoId?: string,
    @Query('unidade_id') unidadeId?: string,
    @Query('tipo_visita') tipoVisita?: TipoVisita,
    @Query('resultado') resultado?: ResultadoVisita,
    @Query('data_inicio') dataInicio?: string,
    @Query('data_fim') dataFim?: string,
    @Query('recomenda_renovacao', new ParseBoolPipe({ optional: true })) recomendaRenovacao?: boolean,
    @Query('necessita_nova_visita', new ParseBoolPipe({ optional: true })) necessitaNovaVisita?: boolean
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
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

    const { visitas, total } = await this.visitaService.buscarTodas(
      filtros,
      page,
      limit
    );

    return {
      data: visitas,
      total,
      page,
      limit
    };
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
  @ApiQuery({ name: 'data_inicio', required: false, type: String, description: 'Data de início (YYYY-MM-DD)' })
  @ApiQuery({ name: 'data_fim', required: false, type: String, description: 'Data de fim (YYYY-MM-DD)' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Lista de visitas do beneficiário retornada com sucesso'
  })
  async listarVisitasPorBeneficiario(
    @Param('beneficiarioId', ParseUUIDPipe) beneficiarioId: string,
    @Query('page', PagePipe) page: number = 1,
    @Query('limit', LimitPipe) limit: number = 10,
    @Query('data_inicio') dataInicio?: string,
    @Query('data_fim') dataFim?: string
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const filtros = { data_inicio: dataInicio, data_fim: dataFim };
    
    // Remove filtros undefined
    Object.keys(filtros).forEach(key => 
      filtros[key] === undefined && delete filtros[key]
    );

    const { visitas, total } = await this.visitaService.buscarPorBeneficiario(
      beneficiarioId,
      filtros,
      page,
      limit
    );

    return {
      data: visitas,
      total,
      page,
      limit
    };
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
  @ApiQuery({ name: 'data_inicio', required: false, type: String, description: 'Data de início (YYYY-MM-DD)' })
  @ApiQuery({ name: 'data_fim', required: false, type: String, description: 'Data de fim (YYYY-MM-DD)' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Lista de visitas do técnico retornada com sucesso'
  })
  async listarVisitasPorTecnico(
    @Param('tecnicoId', ParseUUIDPipe) tecnicoId: string,
    @Query('page', PagePipe) page: number = 1,
    @Query('limit', LimitPipe) limit: number = 10,
    @Query('data_inicio') dataInicio?: string,
    @Query('data_fim') dataFim?: string
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const filtros = { data_inicio: dataInicio, data_fim: dataFim };
    
    // Remove filtros undefined
    Object.keys(filtros).forEach(key => 
      filtros[key] === undefined && delete filtros[key]
    );

    const { visitas, total } = await this.visitaService.buscarPorTecnico(
      tecnicoId,
      filtros,
      page,
      limit
    );

    return {
      data: visitas,
      total,
      page,
      limit
    };
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
  @ApiQuery({ name: 'unidade_id', required: false, type: String, description: 'ID da unidade' })
  @ApiQuery({ name: 'data_inicio', required: false, type: String, description: 'Data de início (YYYY-MM-DD)' })
  @ApiQuery({ name: 'data_fim', required: false, type: String, description: 'Data de fim (YYYY-MM-DD)' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Lista de visitas que recomendam renovação retornada com sucesso'
  })
  async listarVisitasQueRecomendamRenovacao(
    @Query('page', PagePipe) page: number = 1,
    @Query('limit', LimitPipe) limit: number = 10,
    @Query('unidade_id') unidadeId?: string,
    @Query('data_inicio') dataInicio?: string,
    @Query('data_fim') dataFim?: string
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const filtros = {
      unidade_id: unidadeId,
      data_inicio: dataInicio,
      data_fim: dataFim
    };
    
    // Remove filtros undefined
    Object.keys(filtros).forEach(key => 
      filtros[key] === undefined && delete filtros[key]
    );

    const { visitas, total } = await this.visitaService.buscarQueRecomendamRenovacao(
      filtros,
      page,
      limit
    );

    return {
      data: visitas,
      total,
      page,
      limit
    };
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
  @ApiQuery({ name: 'unidade_id', required: false, type: String, description: 'ID da unidade' })
  @ApiQuery({ name: 'prazo_vencido', required: false, type: Boolean, description: 'Apenas com prazo vencido' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Lista de visitas que necessitam nova visita retornada com sucesso'
  })
  async listarVisitasQueNecessitamNovaVisita(
    @Query('page', PagePipe) page: number = 1,
    @Query('limit', LimitPipe) limit: number = 10,
    @Query('unidade_id') unidadeId?: string,
    @Query('prazo_vencido', new ParseBoolPipe({ optional: true })) prazoVencido?: boolean
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const filtros = {
      unidade_id: unidadeId,
      prazo_vencido: prazoVencido
    };
    
    // Remove filtros undefined
    Object.keys(filtros).forEach(key => 
      filtros[key] === undefined && delete filtros[key]
    );

    const { visitas, total } = await this.visitaService.buscarQueNecessitamNovaVisita(
      filtros,
      page,
      limit
    );

    return {
      data: visitas,
      total,
      page,
      limit
    };
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
  @ApiQuery({ name: 'unidade_id', required: false, type: String, description: 'ID da unidade' })
  @ApiQuery({ name: 'data_inicio', required: false, type: String, description: 'Data de início (YYYY-MM-DD)' })
  @ApiQuery({ name: 'data_fim', required: false, type: String, description: 'Data de fim (YYYY-MM-DD)' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Lista de visitas com problemas de elegibilidade retornada com sucesso'
  })
  async listarVisitasComProblemasElegibilidade(
    @Query('page', PagePipe) page: number = 1,
    @Query('limit', LimitPipe) limit: number = 10,
    @Query('unidade_id') unidadeId?: string,
    @Query('data_inicio') dataInicio?: string,
    @Query('data_fim') dataFim?: string
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const filtros = {
      unidade_id: unidadeId,
      data_inicio: dataInicio,
      data_fim: dataFim
    };
    
    // Remove filtros undefined
    Object.keys(filtros).forEach(key => 
      filtros[key] === undefined && delete filtros[key]
    );

    const { visitas, total } = await this.visitaService.buscarComProblemasElegibilidade(
      filtros,
      page,
      limit
    );

    return {
      data: visitas,
      total,
      page,
      limit
    };
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
}