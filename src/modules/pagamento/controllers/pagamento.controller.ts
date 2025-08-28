import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { TipoEscopo } from '../../../entities/user-permission.entity';
import { Usuario } from '../../../entities';
import { PagamentoService } from '../services/pagamento.service';
import { PagamentoCreateDto } from '../dtos/pagamento-create.dto';
import { PagamentoUpdateStatusDto } from '../dtos/pagamento-update-status.dto';
import { PagamentoPendenteMonitoramentoDto } from '../dtos/pagamento-pendente-monitoramento.dto';
import { FiltrosMonitoramentoPendenteDto } from '../dtos/filtros-monitoramento-pendente.dto';
import { PagamentoFiltrosAvancadosDto, PagamentoFiltrosResponseDto } from '../dto/pagamento-filtros-avancados.dto';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { TipoVisita } from '../../../enums/tipo-visita.enum';
import { DataMaskingResponseInterceptor } from '../interceptors/data-masking-response.interceptor';
import { AuditoriaInterceptor } from '../interceptors/auditoria.interceptor';
import { AuditoriaPagamento } from '../decorators/auditoria.decorator';

/**
 * Controller simplificado para gerenciamento de pagamentos
 * Foca apenas nos endpoints essenciais com lógica mínima
 */
@ApiTags('Pagamentos')
@Controller('pagamentos')
@UseGuards(JwtAuthGuard, PermissionGuard)
@UseInterceptors(DataMaskingResponseInterceptor, AuditoriaInterceptor)
export class PagamentoController {
  constructor(private readonly pagamentoService: PagamentoService) { }

  /**
   * Lista pagamentos com filtros e paginação
   */
  @Get()
  @AuditoriaPagamento.Consulta('Listagem de pagamentos com filtros')
  @RequiresPermission({
    permissionName: 'pagamento.listar',
    scopeType: TipoEscopo.UNIDADE,
  })
  @ApiOperation({ summary: 'Lista pagamentos com filtros' })
  @ApiQuery({ name: 'status', required: false, enum: StatusPagamentoEnum })
  @ApiQuery({ name: 'solicitacao_id', required: false, type: String })
  @ApiQuery({ name: 'concessao_id', required: false, type: String })
  @ApiQuery({ name: 'data_inicio', required: false, type: String })
  @ApiQuery({ name: 'data_fim', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'pagamento_ids',
    required: false,
    type: String,
    description: 'Lista de IDs de pagamento separados por vírgula (ex: id1,id2,id3). Máximo de 50 IDs por consulta.'
  })
  @ApiQuery({
    name: 'com_comprovante',
    required: false,
    type: Boolean,
    description: 'Filtrar pagamentos que possuem comprovante anexado (true) ou não possuem (false)'
  })
  @ApiResponse({ status: 200, description: 'Lista paginada de pagamentos' })
  async findAll(
    @Query('search') search?: string,
    @Query('status') status?: StatusPagamentoEnum,
    @Query('usuario_id') usuario_id?: string,
    @Query('unidade_id') unidade_id?: string,
    @Query('solicitacao_id') solicitacao_id?: string,
    @Query('concessao_id') concessao_id?: string,
    @Query('data_inicio') data_inicio?: string,
    @Query('data_fim') data_fim?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sort_by') sort_by?: string,
    @Query('sort_order') sort_order?: 'ASC' | 'DESC',
    @Query('pagamento_ids') ids?: string,
    @Query('com_comprovante') com_comprovante?: boolean,
  ) {
    // Validar e processar lista de IDs se fornecida
    let pagamento_ids: string[] | undefined;
    if (ids) {
      // Dividir a string por vírgulas e remover espaços em branco
      const idsArray = ids.split(',').map(id => id.trim()).filter(id => id.length > 0);

      // Validar formato UUID de cada ID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const invalidIds = idsArray.filter(id => !uuidRegex.test(id));

      if (invalidIds.length > 0) {
        throw new BadRequestException(`IDs inválidos encontrados: ${invalidIds.join(', ')}`);
      }

      pagamento_ids = idsArray;
    }

    const filtros = {
      search,
      usuario_id: usuario_id,
      unidade_id: unidade_id,
      status,
      solicitacao_id: solicitacao_id,
      concessao_id: concessao_id,
      data_inicio: data_inicio,
      data_fim: data_fim,
      sort_by: sort_by || 'data_liberacao',
      sort_order: sort_order || 'ASC',
      page: page || 1,
      limit: Math.min(limit || 10, 100), // Limita a 100 itens
      pagamento_ids,
      com_comprovante,
    };

    return await this.pagamentoService.findAll(filtros);
  }



  /**
   * Lista pagamentos com filtros avançados
   */
  @Post('filtros-avancados')
  @AuditoriaPagamento.Consulta('Listagem de pagamentos com filtros avançados')
  @RequiresPermission({
    permissionName: 'pagamento.listar',
    scopeType: TipoEscopo.UNIDADE,
  })
  @ApiOperation({ 
    summary: 'Listar pagamentos com filtros avançados',
    description: `Endpoint otimizado para consultas complexas de pagamentos com múltiplos critérios de filtro.
    
    **Funcionalidades principais:**
    - Filtros por múltiplas unidades, benefícios e status
    - Filtros por período de pagamento e valores
    - Busca textual em beneficiário e número do benefício
    - Paginação otimizada com cache
    - Ordenação por múltiplos campos
    - Filtros por método de pagamento e banco
    
    **Casos de uso comuns:**
    - Relatórios financeiros por período
    - Auditoria de pagamentos por unidade
    - Consulta de pagamentos por beneficiário
    - Análise de pagamentos por método
    - Controle de pagamentos pendentes/processados`
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de pagamentos com filtros aplicados',
    type: PagamentoFiltrosResponseDto,
    schema: {
      example: {
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            valor: 600.00,
            data_pagamento: '2024-01-15',
            status: 'PROCESSADO',
            metodo_pagamento: 'PIX',
            numero_transacao: 'TXN123456789',
            beneficiario: {
              nome: 'Maria Silva',
              cpf: '123.456.789-00'
            },
            beneficio: {
              numero: 'BEN2024001',
              tipo: 'Auxílio Emergencial'
            },
            unidade: {
              nome: 'CRAS Centro'
            },
            banco: {
              codigo: '001',
              nome: 'Banco do Brasil'
            }
          }
        ],
        total: 1250,
        filtros_aplicados: {
          unidades: ['550e8400-e29b-41d4-a716-446655440000'],
          status: ['PROCESSADO'],
          periodo: 'ultimo_mes',
          metodos_pagamento: ['PIX']
        },
        meta: {
          page: 1,
          limit: 10,
          totalPages: 125,
          hasNextPage: true,
          hasPreviousPage: false,
          valor_total_filtrado: 750000.00
        },
        tempo_execucao: 120
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Parâmetros de filtro inválidos',
    schema: {
      example: {
        statusCode: 400,
        message: ['valor_minimo deve ser um número positivo'],
        error: 'Bad Request'
      }
    }
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - Permissões insuficientes para visualizar pagamentos'
  })
  async aplicarFiltrosAvancados(
    @Body() filtros: PagamentoFiltrosAvancadosDto,
  ): Promise<PagamentoFiltrosResponseDto> {
    return await this.pagamentoService.aplicarFiltrosAvancados(filtros);
  }

  /**
   * Cria um novo pagamento
   */
  @Post()
  @AuditoriaPagamento.Criacao('Criação de novo pagamento')
  @RequiresPermission({
    permissionName: 'pagamento.criar',
  })
  @ApiOperation({ summary: 'Cria um novo pagamento' })
  @ApiResponse({ status: 201, description: 'Pagamento criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async create(
    @Body() createDto: PagamentoCreateDto,
    @GetUser() usuario: Usuario,
  ) {
    const pagamento = await this.pagamentoService.create(createDto, usuario.id);

    return {
      success: true,
      data: pagamento,
      message: 'Pagamento criado com sucesso',
    };
  }

  /**
   * Atualiza status do pagamento
   */
  @Patch(':id/status')
  @AuditoriaPagamento.AtualizacaoStatus('Atualização de status do pagamento')
  @RequiresPermission({
    permissionName: 'pagamento.atualizar',
    scopeType: TipoEscopo.UNIDADE,
  })
  @ApiOperation({ summary: 'Atualiza status do pagamento' })
  @ApiParam({ name: 'id', type: 'string', description: 'ID do pagamento' })
  @ApiResponse({ status: 200, description: 'Status atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Pagamento não encontrado' })
  @ApiResponse({ status: 400, description: 'Transição de status inválida' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: PagamentoUpdateStatusDto,
    @GetUser() usuario: Usuario,
  ) {
    const pagamento = await this.pagamentoService.updateStatus(
      id,
      updateDto,
      usuario.id,
    );

    return {
      success: true,
      data: pagamento,
      message: 'Status atualizado com sucesso',
    };
  }

  /**
   * Cancela um pagamento
   */
  @Patch(':id/cancelar')
  @AuditoriaPagamento.Cancelamento('Cancelamento de pagamento')
  @RequiresPermission({
    permissionName: 'pagamento.cancelar',
    scopeType: TipoEscopo.UNIDADE,
  })
  @ApiOperation({ summary: 'Cancela um pagamento' })
  @ApiParam({ name: 'id', type: 'string', description: 'ID do pagamento' })
  @ApiResponse({ status: 200, description: 'Pagamento cancelado com sucesso' })
  @ApiResponse({ status: 404, description: 'Pagamento não encontrado' })
  async cancelar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { motivo: string },
    @GetUser() usuario: Usuario,
  ) {
    if (!body.motivo?.trim()) {
      throw new BadRequestException('Motivo do cancelamento é obrigatório');
    }

    const pagamento = await this.pagamentoService.cancelar(
      id,
      body.motivo,
      usuario.id,
    );

    return {
      success: true,
      data: pagamento,
      message: 'Pagamento cancelado com sucesso',
    };
  }

  // /**
  //  * Busca pagamentos por solicitação
  //  */
  // @Get('solicitacao/:solicitacao_id')
  // @AuditoriaPagamento.Consulta('Consulta de pagamentos por solicitação')
  // @RequiresPermission({
  //   permissionName: 'pagamento.listar',
  //   scopeType: TipoEscopo.UNIDADE,
  // })
  // @ApiOperation({ summary: 'Busca pagamentos de uma solicitação' })
  // @ApiParam({
  //   name: 'solicitacao_id',
  //   type: 'string',
  //   description: 'ID da solicitação',
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Lista de pagamentos da solicitação',
  // })
  // async findBySolicitacao(
  //   @Param('solicitacao_id', ParseUUIDPipe) solicitacao_id: string,
  // ) {
  //   const pagamentos =
  //     await this.pagamentoService.findBySolicitacao(solicitacao_id);

  //   return {
  //     success: true,
  //     data: pagamentos,
  //     total: pagamentos.length,
  //   };
  // }

  // /**
  //  * Busca pagamentos por concessão
  //  */
  // @Get('concessao/:concessao_id')
  // @AuditoriaPagamento.Consulta('Consulta de pagamentos por concessão')
  // @RequiresPermission({
  //   permissionName: 'pagamento.listar',
  //   scopeType: TipoEscopo.UNIDADE,
  // })
  // @ApiOperation({ summary: 'Busca pagamentos de uma concessão' })
  // @ApiParam({
  //   name: 'concessao_id',
  //   type: 'string',
  //   description: 'ID da concessão',
  // })
  // @ApiResponse({ status: 200, description: 'Lista de pagamentos da concessão' })
  // async findByConcessao(
  //   @Param('concessao_id', ParseUUIDPipe) concessao_id: string,
  // ) {
  //   const pagamentos =
  //     await this.pagamentoService.findByConcessao(concessao_id);

  //   return {
  //     success: true,
  //     data: pagamentos,
  //     total: pagamentos.length,
  //   };
  // }

  /**
   * Busca pagamentos pendentes de monitoramento
   */
  @Get('monitoramento-pendente')
  @AuditoriaPagamento.Consulta('Consulta de pagamentos pendentes de monitoramento')
  @RequiresPermission({
    permissionName: 'monitoramento.pendentes'
  })
  @ApiOperation({
    summary: 'Busca pagamentos pendentes de monitoramento',
    description: 'Retorna todos os pagamentos que ainda não têm visita/agendamento criado. Suporta filtros por bairro, CPF do beneficiário e paginação.'
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de pagamentos pendentes de monitoramento',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { $ref: '#/components/schemas/PagamentoPendenteMonitoramentoDto' }
        },
        meta: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' }
          }
        }
      }
    }
  })
  async findPendentesMonitoramento(
    @Query() filtros: FiltrosMonitoramentoPendenteDto
  ) {
    // Preparar filtros para o serviço incluindo paginação
    const filtrosServico = {
      ...(filtros.bairro && { bairro: filtros.bairro }),
      ...(filtros.cpf && { cpf: filtros.cpf }),
      page: filtros.page || 1,
      limit: filtros.limit || 10,
      offset: filtros.offset
    };

    const resultado = await this.pagamentoService.findPendentesMonitoramento(filtrosServico);

    // Mapear os itens para o formato de resposta
    const items = resultado.items.map(p => ({
      pagamento_id: p.pagamento_id,
      dados_pagamento: {
        id: p.pagamento_id,
        solicitacao_id: p.pagamento_solicitacao_id,
        info_bancaria_id: p.pagamento_info_bancaria_id,
        valor: p.pagamento_valor,
        data_liberacao: p.pagamento_data_liberacao,
        status: p.pagamento_status,
        metodo_pagamento: p.pagamento_metodo_pagamento,
        liberado_por: p.pagamento_liberado_por,
        observacoes: p.pagamento_observacoes,
        created_at: p.pagamento_created_at,
        updated_at: p.pagamento_updated_at,
        removed_at: p.pagamento_removed_at,
        data_agendamento: p.pagamento_data_agendamento,
        data_prevista_liberacao: p.pagamento_data_prevista_liberacao,
        data_pagamento: p.pagamento_data_pagamento,
        data_conclusao: p.pagamento_data_conclusao,
        criado_por: p.pagamento_criado_por,
        comprovante_id: p.pagamento_comprovante_id,
        concessao_id: p.pagamento_concessao_id,
        numero_parcela: p.pagamento_numero_parcela,
        total_parcelas: p.pagamento_total_parcelas,
        data_vencimento: p.pagamento_data_vencimento,
        data_regularizacao: p.pagamento_data_regularizacao,
        monitorado: p.pagamento_monitorado,
      },
      beneficiario: {
        nome: p.cidadao_nome,
        cpf: p.cidadao_cpf,
        bairro: p.endereco_bairro
      },
      unidade: {
        id: p.unidade_id,
        nome: p.unidade_nome
      },
      tecnico: {
        id: p.tecnico_id,
        nome: p.tecnico_nome
      },
      tipo_visita: this.calcularTipoVisita(p.pagamento_numero_parcela, p.pagamento_total_parcelas),
      tipo_concessao: p.tipo_concessao
    }));

    // Retornar resposta paginada
    return {
      items,
      meta: {
        page: filtros.page || 1,
        limit: filtros.limit || 10,
        total: resultado.total,
        totalPages: Math.ceil(resultado.total / (filtros.limit || 10))
      }
    };
  }

  /**
   * Busca pagamento por ID
   */
  @Get(':id')
  @AuditoriaPagamento.Consulta('Consulta de pagamento por ID')
  @RequiresPermission({
    permissionName: 'pagamento.visualizar',
    scopeType: TipoEscopo.UNIDADE,
  })
  @ApiOperation({ summary: 'Busca pagamento por ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'ID do pagamento' })
  @ApiResponse({ status: 200, description: 'Detalhes do pagamento' })
  @ApiResponse({ status: 404, description: 'Pagamento não encontrado' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.pagamentoService.findById(id);
  }

  /**
   * Calcula o tipo de visita baseado na parcela
   */
  private calcularTipoVisita(parcela: number, totalParcelas: number): TipoVisita {
    if (parcela === 1) {
      return TipoVisita.INICIAL;
    } else if (parcela === totalParcelas) {
      return TipoVisita.RENOVACAO;
    } else {
      return TipoVisita.CONTINUIDADE;
    }
  }

  /**
   * Obtém estatísticas de pagamentos
   */
  @Get('estatisticas')
  @AuditoriaPagamento.Consulta('Consulta de estatísticas de pagamentos')
  @RequiresPermission({
    permissionName: 'pagamento.estatisticas',
    scopeType: TipoEscopo.UNIDADE,
  })
  @ApiOperation({ summary: 'Obtém estatísticas de pagamentos' })
  @ApiResponse({ status: 200, description: 'Estatísticas de pagamentos' })
  async getEstatisticas() {
    const estatisticas = await this.pagamentoService.getEstatisticas();

    return {
      success: true,
      data: estatisticas,
    };
  }
}
