import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpStatus,
  Logger,
  ParseUUIDPipe,
  ValidationPipe,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { AuditInterceptor } from '../../auditoria/interceptors/audit.interceptor';
import { AprovacaoService } from '../services/aprovacao.service';
import { NotificacaoAprovacaoService } from '../services/notificacao-aprovacao.service';
import { EscalacaoAprovacaoService } from '../services/escalacao-aprovacao.service';
import { EstrategiaEscalacao } from '../services/escalacao-aprovacao.service';
import {
  CreateSolicitacaoAprovacaoDto,
  AprovarSolicitacaoDto,
  RejeitarSolicitacaoDto,
  DelegarSolicitacaoDto,
  FiltroSolicitacaoDto,
  SolicitarInformacoesAdicionaisDto,
  CancelarSolicitacaoDto,
} from '../dtos';
import { SolicitacaoAprovacao } from '../entities/solicitacao-aprovacao.entity';
import { StatusSolicitacaoAprovacao, TipoAcaoCritica } from '../enums';
import { RequerAprovacao, AcaoCritica } from '../decorators/requer-aprovacao.decorator';
import { AprovacaoInterceptor } from '../interceptors/aprovacao.interceptor';
import { AprovadorGuard, PermissaoAcaoCriticaGuard } from '../guards/aprovacao.guard';
import {
  AprovacaoValidationPipe,
  SolicitacaoIdValidationPipe,
  FiltrosAprovacaoValidationPipe,
} from '../pipes/aprovacao-validation.pipe';
import { Usuario } from '../../../entities/usuario.entity';

/**
 * Controlador para gerenciamento de solicitações de aprovação
 * 
 * Este controlador expõe endpoints para:
 * - Criar e gerenciar solicitações de aprovação
 * - Processar aprovações, rejeições e delegações
 * - Consultar histórico e status de solicitações
 * - Gerenciar escalações e notificações
 * - Solicitar informações adicionais
 */
@ApiTags('Solicitações de Aprovação')
@Controller('aprovacao/solicitacoes')
@UseGuards(JwtAuthGuard, PermissionGuard)
@UseInterceptors(AuditInterceptor, AprovacaoInterceptor)
@ApiBearerAuth()
export class SolicitacaoAprovacaoController {
  private readonly logger = new Logger(SolicitacaoAprovacaoController.name);

  constructor(
    private readonly aprovacaoService: AprovacaoService,
    private readonly notificacaoService: NotificacaoAprovacaoService,
    private readonly escalacaoService: EscalacaoAprovacaoService,
  ) {}

  // ==================== GESTÃO DE SOLICITAÇÕES ====================

  /**
   * Listar solicitações de aprovação
   */
  @Get()
  @RequiresPermission({ permissionName: 'aprovacao.solicitacao.visualizar' })
  @ApiOperation({ summary: 'Listar solicitações de aprovação' })
  @ApiQuery({ name: 'status', enum: StatusSolicitacaoAprovacao, required: false })
  @ApiQuery({ name: 'solicitante_id', type: String, required: false })
  @ApiQuery({ name: 'aprovador_id', type: String, required: false })
  @ApiQuery({ name: 'acao_critica_id', type: String, required: false })
  @ApiQuery({ name: 'data_inicio', type: String, required: false, description: 'Data início (YYYY-MM-DD)' })
  @ApiQuery({ name: 'data_fim', type: String, required: false, description: 'Data fim (YYYY-MM-DD)' })
  @ApiQuery({ name: 'pendentes_apenas', type: Boolean, required: false })
  @ApiQuery({ name: 'minhas_solicitacoes', type: Boolean, required: false })
  @ApiQuery({ name: 'para_minha_aprovacao', type: Boolean, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false, description: 'Página (padrão: 1)' })
  @ApiQuery({ name: 'limit', type: Number, required: false, description: 'Itens por página (padrão: 10)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de solicitações de aprovação',
    type: [SolicitacaoAprovacao],
  })
  async listarSolicitacoes(
    @Query(FiltrosAprovacaoValidationPipe) filtros: FiltroSolicitacaoDto,
    @GetUser() usuario: Usuario,
  ) {
    this.logger.log('Listando solicitações de aprovação', { filtros, usuarioId: usuario.id });
    return this.aprovacaoService.listarSolicitacoes(filtros);
  }

  /**
   * Obter solicitação por ID
   */
  @Get(':id')
  @RequiresPermission({ permissionName: 'aprovacao.solicitacao.visualizar' })
  @ApiOperation({ summary: 'Obter solicitação de aprovação por ID' })
  @ApiParam({ name: 'id', description: 'ID da solicitação' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Solicitação encontrada',
    type: SolicitacaoAprovacao,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Solicitação não encontrada',
  })
  async obterSolicitacao(
    @Param('id', SolicitacaoIdValidationPipe) id: string,
    @GetUser() usuario: Usuario,
  ): Promise<SolicitacaoAprovacao> {
    this.logger.log('Obtendo solicitação de aprovação', { id, usuarioId: usuario.id });
    return this.aprovacaoService.buscarSolicitacaoPorId(id);
  }

  /**
   * Criar nova solicitação de aprovação
   */
  @Post()
  @RequiresPermission({ permissionName: 'aprovacao.solicitacao.criar' })
  @UseGuards(PermissaoAcaoCriticaGuard)
  @ApiOperation({ summary: 'Criar nova solicitação de aprovação' })
  @ApiBody({ type: CreateSolicitacaoAprovacaoDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Solicitação criada com sucesso',
    type: SolicitacaoAprovacao,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados inválidos ou ação não requer aprovação',
  })
  async criarSolicitacao(
    @Body(AprovacaoValidationPipe) dados: CreateSolicitacaoAprovacaoDto,
    @GetUser() usuario: Usuario,
    @Req() request: Request,
  ): Promise<SolicitacaoAprovacao> {
    this.logger.log('Criando solicitação de aprovação', { dados, usuarioId: usuario.id });
    
    const contextoRequisicao = {
      ip: request.ip,
      userAgent: request.get('User-Agent'),
      origem: request.get('Origin'),
    };

    return this.aprovacaoService.criarSolicitacao(dados, usuario, contextoRequisicao);
  }

  /**
   * Cancelar solicitação de aprovação
   */
  @Delete(':id')
  @RequiresPermission({ permissionName: 'aprovacao.solicitacao.cancelar' })
  @AcaoCritica(TipoAcaoCritica.CANCELAR_SOLICITACAO_APROVACAO, 'SolicitacaoAprovacao')
  @ApiOperation({ summary: 'Cancelar solicitação de aprovação' })
  @ApiParam({ name: 'id', description: 'ID da solicitação' })
  @ApiBody({ type: CancelarSolicitacaoDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Solicitação cancelada com sucesso',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Solicitação não encontrada',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Não é possível cancelar esta solicitação',
  })
  async cancelarSolicitacao(
    @Param('id', SolicitacaoIdValidationPipe) id: string,
    @Body(AprovacaoValidationPipe) dados: CancelarSolicitacaoDto,
    @GetUser() usuario: Usuario,
  ): Promise<void> {
    this.logger.log('Cancelando solicitação de aprovação', { id, dados, usuarioId: usuario.id });
    await this.aprovacaoService.cancelarSolicitacao(id, dados, usuario);
  }

  // ==================== PROCESSAMENTO DE APROVAÇÕES ====================

  /**
   * Aprovar solicitação
   */
  @Post(':id/aprovar')
  @RequiresPermission({ permissionName: 'aprovacao.solicitacao.aprovar' })
  @UseGuards(AprovadorGuard)
  @ApiOperation({ summary: 'Aprovar solicitação' })
  @ApiParam({ name: 'id', description: 'ID da solicitação' })
  @ApiBody({ type: AprovarSolicitacaoDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Solicitação aprovada com sucesso',
    type: SolicitacaoAprovacao,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Solicitação não encontrada',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Usuário não autorizado a aprovar esta solicitação',
  })
  async aprovarSolicitacao(
    @Param('id', SolicitacaoIdValidationPipe) id: string,
    @Body(AprovacaoValidationPipe) dados: AprovarSolicitacaoDto,
    @GetUser() usuario: Usuario,
  ): Promise<SolicitacaoAprovacao> {
    this.logger.log('Aprovando solicitação', { id, dados, usuarioId: usuario.id });
    return this.aprovacaoService.aprovarSolicitacao(id, dados, usuario.id);
  }

  /**
   * Rejeitar solicitação
   */
  @Post(':id/rejeitar')
  @RequiresPermission({ permissionName: 'aprovacao.solicitacao.rejeitar' })
  @UseGuards(AprovadorGuard)
  @ApiOperation({ summary: 'Rejeitar solicitação' })
  @ApiParam({ name: 'id', description: 'ID da solicitação' })
  @ApiBody({ type: RejeitarSolicitacaoDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Solicitação rejeitada com sucesso',
    type: SolicitacaoAprovacao,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Solicitação não encontrada',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Usuário não autorizado a rejeitar esta solicitação',
  })
  async rejeitarSolicitacao(
    @Param('id', SolicitacaoIdValidationPipe) id: string,
    @Body(AprovacaoValidationPipe) dados: RejeitarSolicitacaoDto,
    @GetUser() usuario: Usuario,
  ): Promise<SolicitacaoAprovacao> {
    this.logger.log('Rejeitando solicitação', { id, dados, usuarioId: usuario.id });
    return this.aprovacaoService.rejeitarSolicitacao(id, dados, usuario.id);
  }

  /**
   * Delegar solicitação
   */
  @Post(':id/delegar')
  @RequiresPermission({ permissionName: 'aprovacao.solicitacao.delegar' })
  @UseGuards(AprovadorGuard)
  @ApiOperation({ summary: 'Delegar solicitação para outro aprovador' })
  @ApiParam({ name: 'id', description: 'ID da solicitação' })
  @ApiBody({ type: DelegarSolicitacaoDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Solicitação delegada com sucesso',
    type: SolicitacaoAprovacao,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Solicitação não encontrada',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Usuário não autorizado a delegar esta solicitação',
  })
  async delegarSolicitacao(
    @Param('id', SolicitacaoIdValidationPipe) id: string,
    @Body(AprovacaoValidationPipe) dados: DelegarSolicitacaoDto,
    @GetUser() usuario: Usuario,
  ): Promise<SolicitacaoAprovacao> {
    this.logger.log('Delegando solicitação', { id, dados, usuarioId: usuario.id });
    return this.aprovacaoService.delegarSolicitacao(id, dados, usuario);
  }

  /**
   * Solicitar informações adicionais
   */
  @Post(':id/solicitar-informacoes')
  @RequiresPermission({ permissionName: 'aprovacao.solicitacao.solicitar_informacoes' })
  @UseGuards(AprovadorGuard)
  @ApiOperation({ summary: 'Solicitar informações adicionais ao solicitante' })
  @ApiParam({ name: 'id', description: 'ID da solicitação' })
  @ApiBody({ type: SolicitarInformacoesAdicionaisDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Solicitação de informações enviada com sucesso',
    type: SolicitacaoAprovacao,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Solicitação não encontrada',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Usuário não autorizado a solicitar informações',
  })
  async solicitarInformacoes(
    @Param('id', SolicitacaoIdValidationPipe) id: string,
    @Body(AprovacaoValidationPipe) dados: SolicitarInformacoesAdicionaisDto,
    @GetUser() usuario: Usuario,
  ): Promise<SolicitacaoAprovacao> {
    this.logger.log('Solicitando informações adicionais', { id, dados, usuarioId: usuario.id });
    return this.aprovacaoService.solicitarInformacoes(id, dados, usuario);
  }

  // ==================== CONSULTAS E RELATÓRIOS ====================

  /**
   * Obter histórico de uma solicitação
   */
  @Get(':id/historico')
  @RequiresPermission({ permissionName: 'aprovacao.solicitacao.visualizar' })
  @ApiOperation({ summary: 'Obter histórico completo de uma solicitação' })
  @ApiParam({ name: 'id', description: 'ID da solicitação' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Histórico da solicitação',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          acao: { type: 'string' },
          usuario_id: { type: 'string' },
          usuario_nome: { type: 'string' },
          data_acao: { type: 'string', format: 'date-time' },
          observacoes: { type: 'string' },
          dados_contexto: { type: 'object' },
        },
      },
    },
  })
  async obterHistorico(
    @Param('id', SolicitacaoIdValidationPipe) id: string,
    @GetUser() usuario: Usuario,
  ) {
    this.logger.log('Obtendo histórico da solicitação', { id, usuarioId: usuario.id });
    return this.aprovacaoService.obterHistoricoSolicitacao(id, usuario);
  }

  /**
   * Obter solicitações pendentes para o usuário atual
   */
  @Get('pendentes/para-mim')
  @RequiresPermission({ permissionName: 'aprovacao.solicitacao.visualizar' })
  @ApiOperation({ summary: 'Obter solicitações pendentes para aprovação do usuário atual' })
  @ApiQuery({ name: 'prioridade', type: String, required: false })
  @ApiQuery({ name: 'prazo_vencendo', type: Boolean, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Solicitações pendentes para o usuário',
    type: [SolicitacaoAprovacao],
  })
  async obterSolicitacoesPendentesParaMim(
    @Query(new ValidationPipe({ transform: true })) filtros: any,
    @GetUser() usuario: Usuario,
  ) {
    this.logger.log('Obtendo solicitações pendentes para o usuário', { filtros, usuarioId: usuario.id });
    return this.aprovacaoService.obterSolicitacoesPendentesParaAprovador(usuario, filtros);
  }

  /**
   * Obter minhas solicitações
   */
  @Get('minhas/solicitacoes')
  @RequiresPermission({ permissionName: 'aprovacao.solicitacao.visualizar' })
  @ApiOperation({ summary: 'Obter solicitações criadas pelo usuário atual' })
  @ApiQuery({ name: 'status', enum: StatusSolicitacaoAprovacao, required: false })
  @ApiQuery({ name: 'data_inicio', type: String, required: false })
  @ApiQuery({ name: 'data_fim', type: String, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Solicitações do usuário',
    type: [SolicitacaoAprovacao],
  })
  async obterMinhasSolicitacoes(
    @Query(new ValidationPipe({ transform: true })) filtros: any,
    @GetUser() usuario: Usuario,
  ) {
    this.logger.log('Obtendo solicitações do usuário', { filtros, usuarioId: usuario.id });
    return this.aprovacaoService.obterSolicitacoesPorSolicitante(usuario, filtros);
  }

  // ==================== ESCALAÇÃO E NOTIFICAÇÕES ====================

  /**
   * Escalar solicitação manualmente
   */
  @Post(':id/escalar')
  @RequiresPermission({ permissionName: 'aprovacao.solicitacao.gerenciar' })
  @AcaoCritica(TipoAcaoCritica.ESCALAR_SOLICITACAO_APROVACAO, 'SolicitacaoAprovacao')
  @ApiOperation({ summary: 'Escalar solicitação manualmente' })
  @ApiParam({ name: 'id', description: 'ID da solicitação' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        motivo: { type: 'string', description: 'Motivo da escalação' },
        novo_aprovador_id: { type: 'string', format: 'uuid', description: 'ID do novo aprovador' },
        prazo_adicional_horas: { type: 'number', description: 'Horas adicionais de prazo' },
      },
      required: ['motivo'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Solicitação escalada com sucesso',
  })
  async escalarSolicitacao(
    @Param('id', SolicitacaoIdValidationPipe) id: string,
    @Body() dados: {
      motivo: string;
      novo_aprovador_id?: string;
      prazo_adicional_horas?: number;
    },
    @GetUser() usuario: Usuario,
  ): Promise<void> {
    this.logger.log('Escalando solicitação manualmente', { id, dados, usuarioId: usuario.id });
    // Determinar aprovadores de escalação (usar o novo aprovador se fornecido, senão usar lista vazia para escalação automática)
    const aprovadoresEscalacao = dados.novo_aprovador_id ? [dados.novo_aprovador_id] : [];
    
    await this.escalacaoService.escalarSolicitacao(
      id,
      aprovadoresEscalacao,
      EstrategiaEscalacao.HIERARQUICA, // Estratégia padrão
      dados.motivo || 'Escalação manual',
      usuario.id
    );
  }

  /**
   * Reenviar notificações
   */
  @Post(':id/reenviar-notificacoes')
  @RequiresPermission({ permissionName: 'aprovacao.notificacao.gerenciar' })
  @ApiOperation({ summary: 'Reenviar notificações de uma solicitação' })
  @ApiParam({ name: 'id', description: 'ID da solicitação' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        canais: {
          type: 'array',
          items: { type: 'string' },
          description: 'Canais de notificação (email, sms, push, etc.)',
        },
        destinatarios: {
          type: 'array',
          items: { type: 'string' },
          description: 'IDs dos destinatários específicos',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notificações reenviadas com sucesso',
  })
  async reenviarNotificacoes(
    @Param('id', SolicitacaoIdValidationPipe) id: string,
    @Body() dados: {
      canais?: string[];
      destinatarios?: string[];
    },
    @GetUser() usuario: Usuario,
  ): Promise<void> {
    this.logger.log('Reenviando notificações', { id, dados, usuarioId: usuario.id });
    await this.notificacaoService.reenviarNotificacoes(id, dados, usuario);
  }

  // ==================== MÉTRICAS E ESTATÍSTICAS ====================

  /**
   * Obter estatísticas das solicitações
   */
  @Get('estatisticas/resumo')
  @RequiresPermission({ permissionName: 'aprovacao.estatisticas.visualizar' })
  @ApiOperation({ summary: 'Obter estatísticas resumidas das solicitações' })
  @ApiQuery({ name: 'periodo', type: String, required: false, description: 'Período (7d, 30d, 90d, 1y)' })
  @ApiQuery({ name: 'unidade_id', type: String, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estatísticas das solicitações',
    schema: {
      type: 'object',
      properties: {
        total_solicitacoes: { type: 'number' },
        pendentes: { type: 'number' },
        aprovadas: { type: 'number' },
        rejeitadas: { type: 'number' },
        canceladas: { type: 'number' },
        expiradas: { type: 'number' },
        tempo_medio_aprovacao: { type: 'number' },
        taxa_aprovacao: { type: 'number' },
        solicitacoes_por_dia: { type: 'array' },
      },
    },
  })
  async obterEstatisticas(
    @GetUser() usuario: Usuario,
    @Query('periodo') periodo: string = '30d',
    @Query('unidade_id') unidadeId?: string,
  ) {
    this.logger.log('Obtendo estatísticas das solicitações', { periodo, unidadeId, usuarioId: usuario.id });
    
    // Converte período para datas
    const agora = new Date();
    const diasAtras = parseInt(periodo.replace('d', '')) || 30;
    const dataInicio = new Date(agora.getTime() - (diasAtras * 24 * 60 * 60 * 1000));
    const dataFim = agora;
    
    return this.aprovacaoService.obterEstatisticasSolicitacoes({ data_inicio: dataInicio, data_fim: dataFim }, unidadeId, usuario);
  }
}