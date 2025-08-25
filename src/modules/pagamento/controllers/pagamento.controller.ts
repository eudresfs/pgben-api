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
   * Cria um novo pagamento
   */
  @Post()
  @AuditoriaPagamento.Criacao('Criação de novo pagamento')
  @RequiresPermission({
    permissionName: 'pagamento.criar',
    scopeType: TipoEscopo.UNIDADE,
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

  /**
   * Busca pagamentos por solicitação
   */
  @Get('solicitacao/:solicitacao_id')
  @AuditoriaPagamento.Consulta('Consulta de pagamentos por solicitação')
  @RequiresPermission({
    permissionName: 'pagamento.listar',
    scopeType: TipoEscopo.UNIDADE,
  })
  @ApiOperation({ summary: 'Busca pagamentos de uma solicitação' })
  @ApiParam({
    name: 'solicitacao_id',
    type: 'string',
    description: 'ID da solicitação',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de pagamentos da solicitação',
  })
  async findBySolicitacao(
    @Param('solicitacao_id', ParseUUIDPipe) solicitacao_id: string,
  ) {
    const pagamentos =
      await this.pagamentoService.findBySolicitacao(solicitacao_id);

    return {
      success: true,
      data: pagamentos,
      total: pagamentos.length,
    };
  }

  /**
   * Busca pagamentos por concessão
   */
  @Get('concessao/:concessao_id')
  @AuditoriaPagamento.Consulta('Consulta de pagamentos por concessão')
  @RequiresPermission({
    permissionName: 'pagamento.listar',
    scopeType: TipoEscopo.UNIDADE,
  })
  @ApiOperation({ summary: 'Busca pagamentos de uma concessão' })
  @ApiParam({
    name: 'concessao_id',
    type: 'string',
    description: 'ID da concessão',
  })
  @ApiResponse({ status: 200, description: 'Lista de pagamentos da concessão' })
  async findByConcessao(
    @Param('concessao_id', ParseUUIDPipe) concessao_id: string,
  ) {
    const pagamentos =
      await this.pagamentoService.findByConcessao(concessao_id);

    return {
      success: true,
      data: pagamentos,
      total: pagamentos.length,
    };
  }

  /**
   * Processa vencimentos automáticos
   */
  @Post('processar-vencimentos')
  @AuditoriaPagamento.ProcessamentoAutomatico('Processamento automático de vencimentos')
  @RequiresPermission({
    permissionName: 'pagamento.processar_vencimentos',
    scopeType: TipoEscopo.SISTEMA,
  })
  @ApiOperation({ summary: 'Processa vencimentos automáticos' })
  @ApiResponse({ status: 200, description: 'Vencimentos processados' })
  async processarVencimentos(@GetUser() usuario: Usuario) {
    // const pagamentosVencidos = await this.pagamentoService.processarVencimentos();

    return {
      success: true,
      data: [],
      message: `0 pagamentos marcados como vencidos`,
    };
  }

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
    description: 'Retorna todos os pagamentos que ainda não têm visita/agendamento criado'
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de pagamentos pendentes de monitoramento',
    type: [PagamentoPendenteMonitoramentoDto]
  })
  async findPendentesMonitoramento() {
    const pagamentos = await this.pagamentoService.findPendentesMonitoramento();

    return pagamentos.map(p => ({
      pagamento_id: p.pagamento_id,
      dados_pagamento: {
        id: p.pagamento_id,
        solicitacao_id: p.solicitacao_id,
        info_bancaria_id: p.info_bancaria_id,
        valor: p.valor,
        data_liberacao: p.data_liberacao,
        status: p.status,
        metodo_pagamento: p.metodo_pagamento,
        liberado_por: p.liberado_por,
        observacoes: p.observacoes,
        created_at: p.created_at,
        updated_at: p.updated_at,
        removed_at: p.removed_at,
        data_agendamento: p.data_agendamento,
        data_prevista_liberacao: p.data_prevista_liberacao,
        data_pagamento: p.data_pagamento,
        data_conclusao: p.data_conclusao,
        criado_por: p.criado_por,
        comprovante_id: p.comprovante_id,
        concessao_id: p.concessao_id,
        numero_parcela: p.numero_parcela,
        total_parcelas: p.total_parcelas,
        data_vencimento: p.data_vencimento,
        data_regularizacao: p.data_regularizacao,
        monitorado: p.monitorado,
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
      tipo_visita: this.calcularTipoVisita(p.numero_parcela, p.total_parcelas)
    }));
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
      return TipoVisita.ACOMPANHAMENTO;
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
