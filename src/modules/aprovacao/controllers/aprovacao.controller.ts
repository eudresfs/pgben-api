import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { AprovacaoService } from '../services';
import { CriarSolicitacaoDto, ProcessarAprovacaoDto } from '../dtos';
import { ListaAprovacoesPendentesResponseDto } from '../dtos/response/aprovacao-response.dto';
import { StatusSolicitacao } from '../enums';
import { 
  AuditEntity, 
  AutoAudit, 
  SecurityAudit 
} from '../../../modules/auditoria';
import { AuditEventType, RiskLevel } from '../../../modules/auditoria/events/types/audit-event.types';

/**
 * Controller simplificado para gerenciar solicitações de aprovação
 * Consolida funcionalidades que antes estavam espalhadas em múltiplos controllers
 */
@ApiTags('Aprovação - Solicitações')
@Controller('aprovacao/solicitacoes')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
@AutoAudit({
  enabled: true,
  includeRequest: true,
  includeResponse: false,
  async: true
})
export class AprovacaoController {
  constructor(private readonly aprovacaoService: AprovacaoService) {}

  /**
   * Cria uma nova solicitação de aprovação
   */
  @Post()
  @RequiresPermission({ permissionName: 'aprovacao.criar' })
  @AuditEntity('SolicitacaoAprovacao', 'create', {
    eventType: AuditEventType.ENTITY_CREATED,
    riskLevel: RiskLevel.MEDIUM,
    async: true
  })
  @ApiOperation({ 
    summary: 'Criar solicitação de aprovação',
    description: 'Cria uma nova solicitação de aprovação para ação crítica'
  })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Solicitação criada com sucesso' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Dados inválidos' 
  })
  async criarSolicitacao(
    @Body(ValidationPipe) dto: CriarSolicitacaoDto,
    @Request() req: any
  ) {
    const solicitacao = await this.aprovacaoService.criarSolicitacao(
      dto,
      req.user.id
    );

    return {
      message: 'Solicitação de aprovação criada com sucesso',
      data: solicitacao
    };
  }

  /**
   * Lista solicitações de aprovação com filtros
   */
  @Get()
  @RequiresPermission({ permissionName: 'aprovacao.listar' })
  @ApiOperation({ 
    summary: 'Listar solicitações',
    description: 'Lista solicitações de aprovação com filtros opcionais'
  })
  @ApiQuery({ name: 'status', required: false, enum: StatusSolicitacao })
  @ApiQuery({ name: 'solicitante_id', required: false, type: String })
  @ApiQuery({ name: 'tipo_acao', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Lista de solicitações retornada com sucesso',
    type: ListaAprovacoesPendentesResponseDto
  })
  async listarSolicitacoes(
    @Request() req: any,
    @Query('status') status?: StatusSolicitacao,
    @Query('solicitante_id') solicitanteId?: string,
    @Query('tipo_acao') tipoAcao?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    const filtros = {
      status,
      solicitante_id: solicitanteId,
      tipo_acao: tipoAcao
    };

    // Remove filtros undefined
    Object.keys(filtros).forEach(key => 
      filtros[key] === undefined && delete filtros[key]
    );

    const resultado = await this.aprovacaoService.listarSolicitacoes(
      filtros,
      { page, limit },
      req.user.id
    );

    return {
      message: 'Solicitações listadas com sucesso',
      data: resultado.solicitacoes,
      meta: {
        total: resultado.total,
        page,
        limit,
        totalPages: Math.ceil(resultado.total / limit)
      }
    };
  }

  /**
   * Obtém detalhes de uma solicitação específica
   */
  @Get(':id')
  @RequiresPermission({ permissionName: 'aprovacao.visualizar' })
  @ApiOperation({ 
    summary: 'Obter solicitação',
    description: 'Obtém detalhes de uma solicitação específica'
  })
  @ApiParam({ name: 'id', description: 'ID da solicitação' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Solicitação encontrada' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Solicitação não encontrada' 
  })
  async obterSolicitacao(
    @Param('id', ParseUUIDPipe) id: string
  ) {
    const solicitacao = await this.aprovacaoService.obterSolicitacao(id);

    return {
      message: 'Solicitação encontrada',
      data: solicitacao
    };
  }

  /**
   * Processa uma aprovação (aprovar ou rejeitar)
   */
  @Put(':id/processar')
  @RequiresPermission({ permissionName: 'aprovacao.processar' })
  @AuditEntity('SolicitacaoAprovacao', 'process', {
    eventType: AuditEventType.ENTITY_UPDATED,
    riskLevel: RiskLevel.HIGH,
    async: true
  })
  @SecurityAudit('approval_decision', RiskLevel.HIGH)
  @ApiOperation({ 
    summary: 'Processar aprovação',
    description: 'Aprova ou rejeita uma solicitação de aprovação'
  })
  @ApiParam({ name: 'id', description: 'ID da solicitação' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Aprovação processada com sucesso' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Dados inválidos ou solicitação já processada' 
  })
  @ApiResponse({ 
    status: HttpStatus.FORBIDDEN, 
    description: 'Usuário não autorizado a processar esta aprovação' 
  })
  async processarAprovacao(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: ProcessarAprovacaoDto,
    @Request() req: any
  ) {
    const resultado = await this.aprovacaoService.processarAprovacao(
      id,
      req.user.id,
      dto.aprovado,
      dto.justificativa,
      dto.anexos
    );

    return {
      message: `Solicitação ${dto.aprovado ? 'aprovada' : 'rejeitada'} com sucesso`,
      data: resultado
    };
  }

  /**
   * Lista solicitações pendentes para o usuário atual
   */
  @Get('pendentes/minhas')
  @RequiresPermission({ permissionName: 'aprovacao.listar.pendentes' })
  @ApiOperation({ 
    summary: 'Minhas solicitações pendentes',
    description: 'Lista solicitações pendentes de aprovação para o usuário atual'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Lista de solicitações pendentes',
    type: ListaAprovacoesPendentesResponseDto
  })
  async minhasSolicitacoesPendentes(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Request() req: any
  ) {
    const resultado = await this.aprovacaoService.listarSolicitacoesPendentes(
      req.user.id,
      { page, limit }
    );

    return {
      message: 'Solicitações pendentes listadas com sucesso',
      data: resultado.solicitacoes,
      meta: {
        total: resultado.total,
        page,
        limit,
        totalPages: Math.ceil(resultado.total / limit)
      }
    };
  }

  /**
   * Lista aprovações pendentes por ID de entidade
   */
  @Get('pendentes/entidade/:entidade_id')
  @RequiresPermission({ permissionName: 'aprovacao.listar.pendentes' })
  @ApiOperation({ 
    summary: 'Aprovações pendentes por entidade',
    description: 'Lista aprovações pendentes para uma entidade específica (benefício, pagamento, etc.)'
  })
  @ApiParam({ 
    name: 'entidade_id', 
    description: 'ID da entidade para buscar aprovações pendentes',
    type: String
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Lista de aprovações pendentes para a entidade',
    type: ListaAprovacoesPendentesResponseDto
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'ID de entidade inválido' 
  })
  async listarAprovacoesPendentesPorEntidade(
    @Param('entidade_id', ParseUUIDPipe) entidadeId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    const resultado = await this.aprovacaoService.listarAprovacoesPendentesPorEntidade(
      entidadeId,
      { page, limit }
    );

    return {
       message: 'Aprovações pendentes por entidade listadas com sucesso',
       data: resultado
     };
  }

  /**
   * Cancela uma solicitação pendente
   */
  @Put(':id/cancelar')
  @RequiresPermission({ permissionName: 'aprovacao.cancelar' })
  @AuditEntity('SolicitacaoAprovacao', 'cancel', {
    eventType: AuditEventType.ENTITY_UPDATED,
    riskLevel: RiskLevel.MEDIUM,
    async: true
  })
  @ApiOperation({ 
    summary: 'Cancelar solicitação',
    description: 'Cancela uma solicitação de aprovação pendente'
  })
  @ApiParam({ name: 'id', description: 'ID da solicitação' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Solicitação cancelada com sucesso' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Solicitação não pode ser cancelada' 
  })
  @ApiResponse({ 
    status: HttpStatus.FORBIDDEN, 
    description: 'Usuário não autorizado a cancelar esta solicitação' 
  })
  async cancelarSolicitacao(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any
  ) {
    const resultado = await this.aprovacaoService.cancelarSolicitacao(
      id,
      req.user.id
    );

    return {
      message: 'Solicitação cancelada com sucesso',
      data: resultado
    };
  }
}