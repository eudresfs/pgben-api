import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  UseInterceptors,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ConcessaoService } from '../services/concessao.service';
import { CreateConcessaoDto } from '../dto/create-concessao.dto';
import { UpdateStatusConcessaoDto } from '../dto/update-status-concessao.dto';
import { ProrrogarConcessaoDto } from '../dto/prorrogar-concessao.dto';
import {
  SuspenderConcessaoDto,
  BloquearConcessaoDto,
  DesbloquearConcessaoDto,
  CancelarConcessaoDto,
} from '../dto/suspender-concessao.dto';
import { StatusConcessao } from '../../../enums/status-concessao.enum';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { Usuario } from '../../../entities/usuario.entity';
import { FiltroConcessaoDto } from '../dto/filtro-concessao.dto';
import { ConcessaoListResponseDto } from '../dto/concessao-response.dto';
import {
  PaginatedResponseDto,
  PaginationMetaDto,
} from '../../../shared/dtos/pagination.dto';
import { AuditEventEmitter } from '../../auditoria/events/emitters/audit-event.emitter';
import { ReqContext } from '../../../shared/request-context/req-context.decorator';
import { RequestContext } from '@/shared/request-context/request-context.dto';
import { MotivosOperacaoResponseDto } from '../dto/motivos-operacao.dto';
import { OperacaoConcessao } from '../../../enums/operacao-concessao.enum';
import { ScopeType } from '@/entities';
import { RequerAprovacao } from '../../aprovacao/decorators/requer-aprovacao.decorator';
import { TipoAcaoCritica } from '../../aprovacao/enums';
import { AprovacaoInterceptor } from '../../aprovacao/interceptors/aprovacao.interceptor';

@ApiTags('Benefícios')
@Controller('concessoes')
@UseGuards(JwtAuthGuard, PermissionGuard)
@UseInterceptors(AprovacaoInterceptor)
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
  @RequiresPermission({ permissionName: 'concessao.criar' })
  @ApiOperation({
    summary: 'Cria uma nova concessão para uma solicitação aprovada',
    description:
      'Cria uma concessão vinculada a uma solicitação aprovada. Se já existir, retorna a concessão existente.',
  })
  @ApiResponse({ status: 201, description: 'Concessão criada', type: Object })
  @ApiResponse({
    status: 200,
    description: 'Concessão já existente para a solicitação',
    type: Object,
  })
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
  @RequiresPermission({ permissionName: 'concessao.visualizar' })
  @ApiOperation({
    summary: 'Consulta concessão por ID',
    description:
      'Obtém os dados completos de uma concessão pelo seu identificador único.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID da concessão',
    example: 'c9e1a5b2-4b7d-4a4b-8f5d-2a6b1e7a9c4e',
  })
  @ApiResponse({
    status: 200,
    description: 'Concessão encontrada',
    type: Object,
  })
  @ApiResponse({ status: 404, description: 'Concessão não encontrada' })
  async obter(@Param('id') id: string, @GetUser() usuario: Usuario) {
    return this.concessaoService.findById(id);
  }

  /**
   * Lista todas as concessões cadastradas no sistema com paginação.
   *
   * Endpoint paginado para listagem de concessões com filtros avançados.
   * Suporta busca por múltiplos critérios e retorna dados estruturados com metadados de paginação.
   *
   * @param filtro Parâmetros de filtro e paginação
   * @param usuario Usuário autenticado
   * @returns Resposta paginada com lista de concessões e metadados
   */
  @Get()
  @RequiresPermission({
    permissionName: 'concessao.listar',
    scopeType: ScopeType.UNIT,
  })
  @ApiOperation({
    summary: 'Lista concessões com paginação',
    description:
      'Lista concessões com filtros opcionais por data, status, unidade, tipo de benefício, determinação judicial, prioridade e busca por nome/CPF/protocolo. Suporta paginação via page/limit ou offset/limit.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description:
      'Número da página (começa em 1). Se informado, sobrescreve o offset',
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Limite de registros por página (padrão: 100, máximo: 1000)',
    type: Number,
    example: 100,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description:
      'Deslocamento para paginação (padrão: 0). Ignorado se page for informado',
    type: Number,
    example: 0,
  })
  @ApiQuery({
    name: 'dataInicioDe',
    required: false,
    description: 'Data de início mínima (YYYY-MM-DD)',
    example: '2025-01-01',
  })
  @ApiQuery({
    name: 'dataInicioAte',
    required: false,
    description: 'Data de início máxima (YYYY-MM-DD)',
    example: '2025-12-31',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: StatusConcessao,
    description: 'Status da concessão para filtrar',
  })
  @ApiQuery({
    name: 'unidadeId',
    required: false,
    description: 'UUID da unidade para filtrar',
    example: 'c9e1a5b2-4b7d-4a4b-8f5d-2a6b1e7a9c4e',
  })
  @ApiQuery({
    name: 'tipoBeneficioId',
    required: false,
    description: 'UUID do tipo de benefício para filtrar',
    example: 'c9e1a5b2-4b7d-4a4b-8f5d-2a6b1e7a9c4e',
  })
  @ApiQuery({
    name: 'determinacaoJudicial',
    required: false,
    description: 'Flag de determinação judicial (true/false)',
    type: Boolean,
    example: false,
  })
  @ApiQuery({
    name: 'prioridade',
    required: false,
    description: 'Prioridade da concessão (1-5)',
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Busca textual por nome do beneficiário, CPF ou protocolo',
    example: 'João Silva',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de concessões retornada com sucesso',
    type: PaginatedResponseDto<ConcessaoListResponseDto>,
  })
  @ApiResponse({
    status: 400,
    description: 'Parâmetros de filtro ou paginação inválidos',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example: 'Data de início deve ser anterior à data final',
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async listar(
    @Query() filtro: FiltroConcessaoDto,
    @GetUser() usuario: Usuario,
  ): Promise<PaginatedResponseDto<ConcessaoListResponseDto>> {
    const result = await this.concessaoService.findAll(filtro);

    // Calcular metadados de paginação seguindo o padrão do projeto
    const page = filtro.page || Math.floor(result.offset / result.limit) + 1;
    const totalPages = Math.ceil(result.total / result.limit);
    const hasNext = page < totalPages;
    const hasPrevious = page > 1;

    // Criar metadados de paginação
    const meta: PaginationMetaDto = {
      page,
      limit: result.limit,
      total: result.total,
      pages: totalPages,
      hasNext,
      hasPrev: hasPrevious,
    };

    // Os dados já vêm na estrutura correta do service, sem necessidade de mapeamento
    const items: ConcessaoListResponseDto[] =
      result.data as ConcessaoListResponseDto[];

    return new PaginatedResponseDto(items, meta);
  }

  /**
   * Atualiza o status de uma concessão existente.
   *
   * Permite transitar entre os estados do ciclo de vida da concessão: apto, ativo, suspenso, bloqueado, cessado, cancelado.
   *
   * @param id UUID da concessão
   * @body Exemplo: { "status": "ativo" }
   * @returns Concessão atualizada.
   */
  @Patch(':id/status')
  @RequiresPermission({ permissionName: 'concessao.atualizar' })
  @RequerAprovacao({
    tipo: TipoAcaoCritica.ALTERACAO_STATUS_CONCESSAO,
    permitirAutoAprovacao: false,
    descricao: 'Alteração de status de concessão'
  })
  @ApiOperation({
    summary: 'Atualiza o status da concessão',
    description:
      'Permite alterar o status da concessão para qualquer valor permitido pelo ciclo de vida.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID da concessão',
    example: 'c9e1a5b2-4b7d-4a4b-8f5d-2a6b1e7a9c4e',
  })
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

    const result = await this.concessaoService.atualizarStatus(
      id,
      dto.status as StatusConcessao,
    );

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
  @RequiresPermission({ permissionName: 'concessao.prorrogar' })
  @ApiOperation({
    summary: 'Prorroga uma concessão',
    description:
      'Cria uma nova concessão como prorrogação da concessão original por igual período da concessão anterior. Apenas concessões com status CONCEDIDA podem ser prorrogadas.',
  })
  @ApiParam({ name: 'id', description: 'UUID da concessão a ser prorrogada' })
  @ApiBody({ type: ProrrogarConcessaoDto })
  @ApiResponse({
    status: 201,
    description: 'Concessão prorrogada com sucesso',
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description: 'Concessão não pode ser prorrogada',
  })
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
  @RequiresPermission({ permissionName: 'concessao.suspender' })
  @RequerAprovacao({
    tipo: TipoAcaoCritica.SUSPENSAO_BENEFICIO,
    perfilAutoAprovacao: ['SUPER_ADMIN', 'ADMIN', 'GESTOR'],
    descricao: 'Suspensão de benefício'
  })
  @ApiOperation({
    summary: 'Suspende uma concessão',
    description:
      'Suspende uma concessão ativa. Apenas concessões com status CONCEDIDA podem ser suspensas.',
  })
  @ApiParam({ name: 'id', description: 'UUID da concessão a ser suspensa' })
  @ApiBody({ type: SuspenderConcessaoDto })
  @ApiResponse({
    status: 200,
    description: 'Concessão suspensa com sucesso',
    type: Object,
  })
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

    // Otimização: Auditoria assíncrona para não bloquear resposta
    this.auditEventEmitter.emitEntityUpdated(
      'Concessao',
      id,
      {},
      {
        action: 'suspensao',
        motivo: dto.motivo,
        status: 'SUSPENSA',
      },
      usuario.id,
    ).catch(error => {
      // Log do erro sem interromper o fluxo principal
      console.error('Erro na auditoria assíncrona:', error);
    });

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
  @RequiresPermission({ permissionName: 'concessao.reativar' })
  @RequerAprovacao({
    tipo: TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS,
    permitirAutoAprovacao: true,
    descricao: 'Reativação de benefício'
  })
  @ApiOperation({
    summary: 'Reativa uma concessão',
    description:
      'Reativa uma concessão. Concessões com status SUSPENSA podem ser reativadas.',
  })
  @ApiParam({ name: 'id', description: 'UUID da concessão a ser bloqueada' })
  @ApiBody({ type: BloquearConcessaoDto })
  @ApiResponse({
    status: 200,
    description: 'Concessão reativada com sucesso',
    type: Object,
  })
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
  @RequiresPermission({ permissionName: 'concessao.bloquear' })
  @RequerAprovacao({
    tipo: TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS,
    permitirAutoAprovacao: false,
    descricao: 'Bloqueio de benefício'
  })
  @ApiOperation({
    summary: 'Bloqueia uma concessão',
    description:
      'Bloqueia uma concessão. Concessões com status CONCEDIDA ou SUSPENSA podem ser bloqueadas.',
  })
  @ApiParam({ name: 'id', description: 'UUID da concessão a ser bloqueada' })
  @ApiBody({ type: BloquearConcessaoDto })
  @ApiResponse({
    status: 200,
    description: 'Concessão bloqueada com sucesso',
    type: Object,
  })
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
  @RequiresPermission({ permissionName: 'concessao.desbloquear' })
  @RequerAprovacao({
    tipo: TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS,
    permitirAutoAprovacao: true,
    descricao: 'Desbloqueio de benefício'
  })
  @ApiOperation({
    summary: 'Desbloqueia uma concessão',
    description:
      'Desbloqueia uma concessão bloqueada. Apenas concessões com status BLOQUEADA podem ser desbloqueadas.',
  })
  @ApiParam({ name: 'id', description: 'UUID da concessão a ser desbloqueada' })
  @ApiBody({ type: DesbloquearConcessaoDto })
  @ApiResponse({
    status: 200,
    description: 'Concessão desbloqueada com sucesso',
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description: 'Concessão não pode ser desbloqueada',
  })
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
  @RequiresPermission({ permissionName: 'concessao.cancelar' })
  @ApiOperation({
    summary: 'Cancela uma concessão',
    description:
      'Cancela uma concessão. Concessões com status CONCEDIDA, SUSPENSA ou BLOQUEADA podem ser canceladas.',
  })
  @ApiParam({ name: 'id', description: 'UUID da concessão a ser cancelada' })
  @ApiBody({ type: CancelarConcessaoDto })
  @ApiResponse({
    status: 200,
    description: 'Concessão cancelada com sucesso',
    type: Object,
  })
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
      dto.observacoes,
    );

    // Auditoria: Cancelamento de concessão
    await this.auditEventEmitter.emitEntityUpdated(
      'Concessao',
      id,
      {},
      {
        action: 'cancelamento',
        motivo: dto.motivo,
        observacoes: dto.observacoes,
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
  @RequiresPermission({ permissionName: 'concessao.visualizar' })
  @ApiOperation({
    summary: 'Busca motivos por operação',
    description:
      'Retorna a lista de motivos disponíveis para uma operação específica de concessão (bloqueio, desbloqueio, suspensão, reativação, cancelamento).',
  })
  @ApiParam({
    name: 'operacao',
    description: 'Tipo de operação para filtrar motivos',
    enum: OperacaoConcessao,
    example: OperacaoConcessao.BLOQUEIO,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de motivos disponíveis para a operação',
    type: MotivosOperacaoResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Operação inválida',
  })
  async buscarMotivosPorOperacao(
    @Param('operacao') operacao: string,
    @GetUser() usuario: Usuario,
  ): Promise<MotivosOperacaoResponseDto> {
    // Validar se a operação é válida
    const operacaoEnum = operacao as OperacaoConcessao;

    if (!Object.values(OperacaoConcessao).includes(operacaoEnum)) {
      throw new BadRequestException(
        `Operação '${operacao}' inválida. Valores aceitos: ${Object.values(OperacaoConcessao).join(', ')}`,
      );
    }

    const motivos =
      await this.concessaoService.buscarMotivosPorOperacao(operacaoEnum);

    return {
      operacao: operacaoEnum,
      motivos,
      total: motivos.length,
    };
  }
}
