import { Controller, Get, Post, Body, Param, Patch, UseGuards, Query, BadRequestException } from '@nestjs/common';
import { ConcessaoService } from '../services/concessao.service';
import { CreateConcessaoDto } from '../dto/create-concessao.dto';
import { UpdateStatusConcessaoDto } from '../dto/update-status-concessao.dto';
import { ProrrogarConcessaoDto } from '../dto/prorrogar-concessao.dto';
import { SuspenderConcessaoDto, BloquearConcessaoDto, DesbloquearConcessaoDto, CancelarConcessaoDto } from '../dto/suspender-concessao.dto';
import { StatusConcessao } from '../../../enums/status-concessao.enum';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { Usuario } from '../../../entities/usuario.entity';
import { FiltroConcessaoDto } from '../dto/filtro-concessao.dto';
import { AuditEventEmitter } from '../../auditoria/events/emitters/audit-event.emitter';
import { AuditEventType } from '../../auditoria/events/types/audit-event.types';
import { ReqContext } from '../../../shared/request-context/req-context.decorator';
import { RequestContext } from '@/shared/request-context/request-context.dto';
import { MotivosOperacaoResponseDto } from '../dto/motivos-operacao.dto';
import { OperacaoConcessao } from '../../../enums/operacao-concessao.enum';

@ApiTags('Benefícios')
@Controller('concessoes')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class ConcessaoController {
  constructor(
    private readonly concessaoService: ConcessaoService,
    private readonly auditEventEmitter: AuditEventEmitter,
  ) {}

    /**
   * Cria uma nova concessão para uma solicitação aprovada.
   *
   * Uma concessão representa o direito efetivo ao benefício, podendo ser criada automaticamente após aprovação da solicitação ou manualmente para cenários específicos (ex: prorrogação, decisão judicial).
   * Se já existir uma concessão para a solicitação, retorna a existente.
   *
   * @body Exemplo:
   * {
   *   "solicitacaoId": "uuid",
   *   "ordemPrioridade": 1,
   *   "determinacaoJudicialFlag": false,
   *   "dataInicio": "2025-06-18"
   * }
   * @returns Objeto da concessão criada ou existente.
   */
  @Post()
  @RequiresPermission({ permissionName: 'concessao.criar'})
  @ApiOperation({ summary: 'Cria uma nova concessão para uma solicitação aprovada', description: 'Cria uma concessão vinculada a uma solicitação aprovada. Se já existir, retorna a concessão existente.' })
  @ApiResponse({ status: 201, description: 'Concessão criada', type: Object })
  @ApiResponse({ status: 200, description: 'Concessão já existente para a solicitação', type: Object })
  async criar(
    @Body() dto: CreateConcessaoDto,
    @GetUser() usuario: Usuario,
    @ReqContext() ctx: any,
  ) {
    // A entidade Solicitacao deve ter sido previamente carregada no serviço
    const result = await this.concessaoService.criarSeNaoExistir({
      id: dto.solicitacaoId,
      prioridade: dto.ordemPrioridade,
      determinacao_judicial_flag: dto.determinacaoJudicialFlag,
    } as any); // Cast simplificado

    // Auditoria: Criação de concessão
    await this.auditEventEmitter.emitEntityCreated(
      'Concessao',
      result.id,
      {
        solicitacaoId: dto.solicitacaoId,
        ordemPrioridade: dto.ordemPrioridade,
        determinacaoJudicialFlag: dto.determinacaoJudicialFlag,
      },
      usuario.id,
    );

    return result;
  }

  /**
   * Consulta uma concessão pelo seu identificador único (UUID).
   *
   * @param id UUID da concessão
   * @returns Objeto da concessão encontrada ou null se não existir.
   */
  @Get(':id')
  @RequiresPermission({ permissionName: 'concessao.visualizar'})
  @ApiOperation({ summary: 'Consulta concessão por ID', description: 'Obtém os dados completos de uma concessão pelo seu identificador único.' })
  @ApiParam({ name: 'id', description: 'UUID da concessão', example: 'c9e1a5b2-4b7d-4a4b-8f5d-2a6b1e7a9c4e' })
  @ApiResponse({ status: 200, description: 'Concessão encontrada', type: Object })
  @ApiResponse({ status: 404, description: 'Concessão não encontrada' })
  async obter(
    @Param('id') id: string,
    @GetUser() usuario: Usuario,
  ) {
    return this.concessaoService.findById(id);
  }

    /**
   * Lista todas as concessões cadastradas no sistema.
   *
   * Útil para auditoria, administração ou integração.
   * Pode ser filtrada/futuramente paginada conforme necessidade.
   *
   * @returns Lista de objetos de concessão.
   */
  @Get()
  @RequiresPermission({ permissionName: 'concessao.listar'})
  @ApiOperation({ summary: 'Lista concessões', description: 'Lista concessões com filtros opcionais por data, status, unidade, tipo de benefício, determinação judicial, prioridade e busca por nome/CPF/protocolo.' })
  @ApiQuery({ name: 'dataInicioDe', required: false, description: 'Data de início mínima (YYYY-MM-DD)' })
  @ApiQuery({ name: 'dataInicioAte', required: false, description: 'Data de início máxima (YYYY-MM-DD)' })
  @ApiQuery({ name: 'status', required: false, enum: StatusConcessao })
  @ApiQuery({ name: 'unidadeId', required: false, description: 'UUID da unidade' })
  @ApiQuery({ name: 'tipoBeneficioId', required: false, description: 'UUID do tipo de benefício' })
  @ApiQuery({ name: 'determinacaoJudicial', required: false, description: 'Flag de determinação judicial', type: Boolean })
  @ApiQuery({ name: 'prioridade', required: false, description: 'Prioridade (inteiro)' })
  @ApiQuery({ name: 'search', required: false, description: 'Busca por nome, CPF ou protocolo' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limite de registros por página (padrão: 100)', type: Number })
  @ApiQuery({ name: 'offset', required: false, description: 'Deslocamento para paginação (padrão: 0)', type: Number })
  @ApiResponse({ status: 200, description: 'Lista de concessões com informações de paginação', schema: { 
    type: 'object',
    properties: {
      data: { type: 'array', items: { type: 'object' } },
      total: { type: 'number', description: 'Total de registros' },
      limit: { type: 'number', description: 'Limite de registros por página' },
      offset: { type: 'number', description: 'Deslocamento atual' }
    }
  } })
  async listar(
    @Query() filtro: FiltroConcessaoDto,
    @GetUser() usuario: Usuario,
  ) {
    return this.concessaoService.findAll(filtro);
  }

    /**
   * Atualiza o status de uma concessão existente.
   *
   * Permite transitar entre os estados do ciclo de vida da concessão: pendente, concedido, suspenso, bloqueado, encerrado.
   *
   * @param id UUID da concessão
   * @body Exemplo: { "status": "concedido" }
   * @returns Concessão atualizada.
   */
  @Patch(':id/status')
  @RequiresPermission({ permissionName: 'concessao.atualizar'})
  @ApiOperation({ summary: 'Atualiza o status da concessão', description: 'Permite alterar o status da concessão para qualquer valor permitido pelo ciclo de vida.' })
  @ApiParam({ name: 'id', description: 'UUID da concessão', example: 'c9e1a5b2-4b7d-4a4b-8f5d-2a6b1e7a9c4e' })
  @ApiBody({ schema: { example: { status: 'concedido' } } })
  @ApiResponse({ status: 200, description: 'Status atualizado', type: Object })
  @ApiResponse({ status: 404, description: 'Concessão não encontrada' })
  async atualizarStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusConcessaoDto,
    @GetUser() usuario: Usuario,
    @ReqContext() ctx: any,
  ) {
    // Buscar estado anterior para auditoria
    const concessaoAnterior = await this.concessaoService.findById(id);
    
    const result = await this.concessaoService.atualizarStatus(id, dto.status as StatusConcessao);

    // Auditoria: Atualização de status da concessão
    await this.auditEventEmitter.emitEntityUpdated(
      'Concessao',
      id,
      {
        status: concessaoAnterior?.status,
      },
      {
        status: dto.status,
      },
      usuario.id,
    );

    return result;
  }

  /**
   * Prorroga uma concessão existente criando uma nova concessão vinculada.
   *
   * @param id UUID da concessão a ser prorrogada
   * @body Dados para prorrogação
   * @returns Nova concessão criada como prorrogação
   */
  @Post(':id/prorrogar')
  @RequiresPermission({ permissionName: 'concessao.prorrogar'})
  @ApiOperation({ 
    summary: 'Prorroga uma concessão', 
    description: 'Cria uma nova concessão como prorrogação da concessão original por igual período da concessão anterior. Apenas concessões com status CONCEDIDA podem ser prorrogadas.' 
  })
  @ApiParam({ name: 'id', description: 'UUID da concessão a ser prorrogada' })
  @ApiBody({ type: ProrrogarConcessaoDto })
  @ApiResponse({ status: 201, description: 'Concessão prorrogada com sucesso', type: Object })
  @ApiResponse({ status: 400, description: 'Concessão não pode ser prorrogada' })
  @ApiResponse({ status: 404, description: 'Concessão não encontrada' })
  async prorrogar(
    @Param('id') id: string,
    @Body() dto: ProrrogarConcessaoDto,
    @GetUser() usuario: Usuario,
    @ReqContext() ctx: RequestContext,
  ) {
    const result = await this.concessaoService.prorrogarConcessao(
      id,
      usuario.id,
      dto.documentoJudicialId,
    );

    // Auditoria: Prorrogação de concessão
    await this.auditEventEmitter.emitEntityCreated(
      'Concessao',
      result.id,
      {
        action: 'prorrogacao',
        concessaoOriginalId: id,
        documentoJudicialId: dto.documentoJudicialId,
      },
      usuario.id,
    );

    return result;
  }

  /**
   * Suspende uma concessão ativa.
   *
   * @param id UUID da concessão a ser suspensa
   * @body Dados para suspensão
   * @returns Concessão suspensa
   */
  @Patch(':id/suspender')
  @RequiresPermission({ permissionName: 'concessao.suspender'})
  @ApiOperation({ 
    summary: 'Suspende uma concessão', 
    description: 'Suspende uma concessão ativa. Apenas concessões com status CONCEDIDA podem ser suspensas.' 
  })
  @ApiParam({ name: 'id', description: 'UUID da concessão a ser suspensa' })
  @ApiBody({ type: SuspenderConcessaoDto })
  @ApiResponse({ status: 200, description: 'Concessão suspensa com sucesso', type: Object })
  @ApiResponse({ status: 400, description: 'Concessão não pode ser suspensa' })
  @ApiResponse({ status: 404, description: 'Concessão não encontrada' })
  async suspender(
    @Param('id') id: string,
    @Body() dto: SuspenderConcessaoDto,
    @GetUser() usuario: Usuario,
    @ReqContext() ctx: any,
  ) {
    const result = await this.concessaoService.suspenderConcessao(
      id,
      usuario.id,
      dto.motivo,
    );

    // Auditoria: Suspensão de concessão
    await this.auditEventEmitter.emitEntityUpdated(
      'Concessao',
      id,
      {},
      {
        action: 'suspensao',
        motivo: dto.motivo,
        status: 'SUSPENSA',
      },
      usuario.id,
    );

    return result;
  }

    /**
   * Bloqueia uma concessão.
   *
   * @param id UUID da concessão a ser bloqueada
   * @body Dados para bloqueio
   * @returns Concessão bloqueada
   */
  @Patch(':id/reativar')
  @RequiresPermission({ permissionName: 'concessao.reativar'})
  @ApiOperation({ 
    summary: 'Reativa uma concessão', 
    description: 'Reativa uma concessão. Concessões com status SUSPENSA podem ser reativadas.' 
  })
  @ApiParam({ name: 'id', description: 'UUID da concessão a ser bloqueada' })
  @ApiBody({ type: BloquearConcessaoDto })
  @ApiResponse({ status: 200, description: 'Concessão reativada com sucesso', type: Object })
  @ApiResponse({ status: 400, description: 'Concessão não pode ser reativada' })
  @ApiResponse({ status: 404, description: 'Concessão não encontrada' })
  async reativar(
    @Param('id') id: string,
    @Body() dto: DesbloquearConcessaoDto,
    @GetUser() usuario: Usuario,
    @ReqContext() ctx: any,
  ) {
    const result = await this.concessaoService.reativarConcessao(
      id,
      usuario.id,
      dto.motivo,
    );

    // Auditoria: Bloqueio de concessão
    await this.auditEventEmitter.emitEntityUpdated(
      'Concessao',
      id,
      {},
      {
        action: 'reativação',
        motivo: dto.motivo,
        status: 'ATIVO',
      },
      usuario.id,
    );

    return result;
  }

  /**
   * Bloqueia uma concessão.
   *
   * @param id UUID da concessão a ser bloqueada
   * @body Dados para bloqueio
   * @returns Concessão bloqueada
   */
  @Patch(':id/bloquear')
  @RequiresPermission({ permissionName: 'concessao.bloquear'})
  @ApiOperation({ 
    summary: 'Bloqueia uma concessão', 
    description: 'Bloqueia uma concessão. Concessões com status CONCEDIDA ou SUSPENSA podem ser bloqueadas.' 
  })
  @ApiParam({ name: 'id', description: 'UUID da concessão a ser bloqueada' })
  @ApiBody({ type: BloquearConcessaoDto })
  @ApiResponse({ status: 200, description: 'Concessão bloqueada com sucesso', type: Object })
  @ApiResponse({ status: 400, description: 'Concessão não pode ser bloqueada' })
  @ApiResponse({ status: 404, description: 'Concessão não encontrada' })
  async bloquear(
    @Param('id') id: string,
    @Body() dto: BloquearConcessaoDto,
    @GetUser() usuario: Usuario,
    @ReqContext() ctx: any,
  ) {
    const result = await this.concessaoService.bloquearConcessao(
      id,
      usuario.id,
      dto.motivo,
    );

    // Auditoria: Bloqueio de concessão
    await this.auditEventEmitter.emitEntityUpdated(
      'Concessao',
      id,
      {},
      {
        action: 'bloqueio',
        motivo: dto.motivo,
        status: 'BLOQUEADA',
      },
      usuario.id,
    );

    return result;
  }

  /**
   * Desbloqueia uma concessão bloqueada.
   *
   * @param id UUID da concessão a ser desbloqueada
   * @body Dados para desbloqueio
   * @returns Concessão desbloqueada
   */
  @Patch(':id/desbloquear')
  @RequiresPermission({ permissionName: 'concessao.desbloquear'})
  @ApiOperation({ 
    summary: 'Desbloqueia uma concessão', 
    description: 'Desbloqueia uma concessão bloqueada. Apenas concessões com status BLOQUEADA podem ser desbloqueadas.' 
  })
  @ApiParam({ name: 'id', description: 'UUID da concessão a ser desbloqueada' })
  @ApiBody({ type: DesbloquearConcessaoDto })
  @ApiResponse({ status: 200, description: 'Concessão desbloqueada com sucesso', type: Object })
  @ApiResponse({ status: 400, description: 'Concessão não pode ser desbloqueada' })
  @ApiResponse({ status: 404, description: 'Concessão não encontrada' })
  async desbloquear(
    @Param('id') id: string,
    @Body() dto: DesbloquearConcessaoDto,
    @GetUser() usuario: Usuario,
    @ReqContext() ctx: any,
  ) {
    const result = await this.concessaoService.desbloquearConcessao(
      id,
      usuario.id,
      dto.motivo,
    );

    // Auditoria: Desbloqueio de concessão
    await this.auditEventEmitter.emitEntityUpdated(
      'Concessao',
      id,
      {},
      {
        action: 'desbloqueio',
        motivo: dto.motivo,
        status: 'CONCEDIDA',
      },
      usuario.id,
    );

    return result;
  }

  /**
   * Cancela uma concessão.
   *
   * @param id UUID da concessão a ser cancelada
   * @body Dados para cancelamento
   * @returns Concessão cancelada
   */
  @Patch(':id/cancelar')
  @RequiresPermission({ permissionName: 'concessao.cancelar'})
  @ApiOperation({ 
    summary: 'Cancela uma concessão', 
    description: 'Cancela uma concessão. Concessões com status CONCEDIDA, SUSPENSA ou BLOQUEADA podem ser canceladas.' 
  })
  @ApiParam({ name: 'id', description: 'UUID da concessão a ser cancelada' })
  @ApiBody({ type: CancelarConcessaoDto })
  @ApiResponse({ status: 200, description: 'Concessão cancelada com sucesso', type: Object })
  @ApiResponse({ status: 400, description: 'Concessão não pode ser cancelada' })
  @ApiResponse({ status: 404, description: 'Concessão não encontrada' })
  async cancelar(
    @Param('id') id: string,
    @Body() dto: CancelarConcessaoDto,
    @GetUser() usuario: Usuario,
    @ReqContext() ctx: any,
  ) {
    const result = await this.concessaoService.cancelarConcessao(
      id,
      usuario.id,
      dto.motivo,
    );

    // Auditoria: Cancelamento de concessão
    await this.auditEventEmitter.emitEntityUpdated(
      'Concessao',
      id,
      {},
      {
        action: 'cancelamento',
        motivo: dto.motivo,
        status: 'CANCELADA',
      },
      usuario.id,
    );

    return result;
  }

  /**
   * Busca os motivos disponíveis para uma operação específica de concessão.
   *
   * @param operacao Tipo de operação (bloqueio, desbloqueio, suspensão, reativação, cancelamento)
   * @returns Lista de motivos disponíveis para a operação
   */
  @Get('motivos/:operacao')
  @RequiresPermission({ permissionName: 'concessao.visualizar'})
  @ApiOperation({ 
    summary: 'Busca motivos por operação', 
    description: 'Retorna a lista de motivos disponíveis para uma operação específica de concessão (bloqueio, desbloqueio, suspensão, reativação, cancelamento).' 
  })
  @ApiParam({ 
    name: 'operacao', 
    description: 'Tipo de operação para filtrar motivos',
    enum: OperacaoConcessao,
    example: OperacaoConcessao.BLOQUEIO 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de motivos disponíveis para a operação', 
    type: MotivosOperacaoResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Operação inválida' 
  })
  async buscarMotivosPorOperacao(
    @Param('operacao') operacao: string,
    @GetUser() usuario: Usuario,
  ): Promise<MotivosOperacaoResponseDto> {
    // Validar se a operação é válida
    const operacaoEnum = operacao as OperacaoConcessao;
    
    if (!Object.values(OperacaoConcessao).includes(operacaoEnum)) {
      throw new BadRequestException(
        `Operação '${operacao}' inválida. Valores aceitos: ${Object.values(OperacaoConcessao).join(', ')}`
      );
    }

    const motivos = await this.concessaoService.buscarMotivosPorOperacao(operacaoEnum);

    return {
      operacao: operacaoEnum,
      motivos,
      total: motivos.length,
    };
  }
}
