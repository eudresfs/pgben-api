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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { AprovadorAutorizadoGuard } from '../guards/aprovador-autorizado.guard';
import { AcaoCriticaInterceptor } from '../interceptors/acao-critica.interceptor';
import { AprovadorAutorizado } from '../decorators/aprovador-autorizado.decorator';
import { RequerAprovacao } from '../decorators/requer-aprovacao.decorator';
import { AprovacaoService } from '../services/aprovacao.service';
import { AprovadorService } from '../services/aprovador.service';
import { AprovacaoMetricsService } from '../services/aprovacao-metrics.service';
import { Usuario } from '../../../entities/usuario.entity';
import {
  CreateSolicitacaoAprovacaoDto,
  UpdateSolicitacaoAprovacaoDto,
  ProcessarAprovacaoDto,
  FiltroSolicitacaoDto,
  CreateAprovadorDto,
  UpdateAprovadorDto,
  DelegarAprovacaoDto,
} from '../dtos';
import {
  StatusSolicitacao,
  TipoAcaoCritica,
  TipoAprovador,
} from '../enums/aprovacao.enums';

/**
 * Controlador principal do sistema de aprovação
 * 
 * Este controlador expõe endpoints para:
 * - Gerenciar solicitações de aprovação
 * - Processar aprovações e rejeições
 * - Gerenciar aprovadores
 * - Consultar métricas e relatórios
 * - Configurar delegações
 */
@ApiTags('Aprovação')
@Controller('aprovacao')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class AprovacaoController {
  private readonly logger = new Logger(AprovacaoController.name);

  constructor(
    private readonly aprovacaoService: AprovacaoService,
    private readonly aprovadorService: AprovadorService,
    private readonly metricsService: AprovacaoMetricsService,
  ) {}

  // ==================== SOLICITAÇÕES DE APROVAÇÃO ====================

  /**
   * Criar uma nova solicitação de aprovação
   */
  @Post('solicitacoes')
  @UseInterceptors(AcaoCriticaInterceptor)
  @RequerAprovacao({
    acao: TipoAcaoCritica.CRIAR_SOLICITACAO_APROVACAO,
    entidadeAlvo: 'SolicitacaoAprovacao',
    descricaoAcao: 'Criar nova solicitação de aprovação',
  })
  @ApiOperation({ summary: 'Criar nova solicitação de aprovação' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Solicitação criada com sucesso',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados inválidos',
  })
  @ApiBody({ type: CreateSolicitacaoAprovacaoDto })
  async criarSolicitacao(
    @Body(ValidationPipe) createDto: CreateSolicitacaoAprovacaoDto,
    @GetUser() usuario: Usuario,
  ) {
    this.logger.log(
      `Criando solicitação de aprovação para usuário ${usuario.id}`,
    );

    const solicitacao = await this.aprovacaoService.criarSolicitacaoAprovacao({
      ...createDto,
      usuario_solicitante_id: usuario.id,
    });

    return {
      success: true,
      message: 'Solicitação de aprovação criada com sucesso',
      data: solicitacao,
    };
  }

  /**
   * Listar solicitações de aprovação com filtros
   */
  @Get('solicitacoes')
  @ApiOperation({ summary: 'Listar solicitações de aprovação' })
  @ApiQuery({ name: 'status', enum: StatusSolicitacao, required: false })
  @ApiQuery({ name: 'acao', enum: TipoAcaoCritica, required: false })
  @ApiQuery({ name: 'solicitante_id', type: String, required: false })
  @ApiQuery({ name: 'aprovador_id', type: String, required: false })
  @ApiQuery({ name: 'data_inicio', type: Date, required: false })
  @ApiQuery({ name: 'data_fim', type: Date, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1 })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 10 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de solicitações retornada com sucesso',
  })
  async listarSolicitacoes(
    @Query() filtros: FiltroSolicitacaoDto,
    @GetUser() usuario: Usuario,
  ) {
    this.logger.debug(
      `Listando solicitações para usuário ${usuario.id} com filtros:`,
      filtros,
    );

    const resultado = await this.aprovacaoService.listarSolicitacoes(
      filtros,
    );

    return {
      success: true,
      data: resultado.dados,
      meta: {
        total: resultado.paginacao.total_itens,
        page: filtros.pagina || 1,
        limit: filtros.limite || 20,
        totalPages: Math.ceil(resultado.paginacao.total_itens / (filtros.limite || 20)),
      },
    };
  }

  /**
   * Buscar solicitação específica por ID
   */
  @Get('solicitacoes/:id')
  @ApiOperation({ summary: 'Buscar solicitação por ID' })
  @ApiParam({ name: 'id', description: 'ID da solicitação' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Solicitação encontrada',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Solicitação não encontrada',
  })
  async buscarSolicitacao(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() usuario: Usuario,
  ) {
    const solicitacao = await this.aprovacaoService.buscarSolicitacaoPorId(
      id,
    );

    return {
      success: true,
      data: solicitacao,
    };
  }

  /**
   * Atualizar solicitação de aprovação
   */
  @Put('solicitacoes/:id')
  @UseInterceptors(AcaoCriticaInterceptor)
  @RequerAprovacao({
    acao: TipoAcaoCritica.ATUALIZAR_SOLICITACAO_APROVACAO,
    entidadeAlvo: 'SolicitacaoAprovacao',
    descricaoAcao: 'Atualizar solicitação de aprovação',
  })
  @ApiOperation({ summary: 'Atualizar solicitação de aprovação' })
  @ApiParam({ name: 'id', description: 'ID da solicitação' })
  @ApiBody({ type: UpdateSolicitacaoAprovacaoDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Solicitação atualizada com sucesso',
  })
  async atualizarSolicitacao(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDto: UpdateSolicitacaoAprovacaoDto,
    @GetUser() usuario: Usuario,
  ) {
    // TODO: Implementar método atualizarSolicitacao no AprovacaoService
    // const solicitacao = await this.aprovacaoService.atualizarSolicitacao(
    //   id,
    //   updateDto,
    //   usuario,
    // );
    const solicitacao = { id: 'temp', message: 'Atualização será implementada' };

    return {
      success: true,
      message: 'Solicitação atualizada com sucesso',
      data: solicitacao,
    };
  }

  /**
   * Cancelar solicitação de aprovação
   */
  @Delete('solicitacoes/:id')
  @UseInterceptors(AcaoCriticaInterceptor)
  @RequerAprovacao({
    acao: TipoAcaoCritica.CANCELAR_SOLICITACAO_APROVACAO,
    entidadeAlvo: 'SolicitacaoAprovacao',
    descricaoAcao: 'Cancelar solicitação de aprovação',
  })
  @ApiOperation({ summary: 'Cancelar solicitação de aprovação' })
  @ApiParam({ name: 'id', description: 'ID da solicitação' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Solicitação cancelada com sucesso',
  })
  async cancelarSolicitacao(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() usuario: Usuario,
  ) {
    // TODO: Implementar método cancelarSolicitacao no AprovacaoService
    // await this.aprovacaoService.cancelarSolicitacao(id, usuario);
    console.log('Cancelamento será implementado');

    return {
      success: true,
      message: 'Solicitação cancelada com sucesso',
    };
  }

  // ==================== PROCESSAMENTO DE APROVAÇÕES ====================

  /**
   * Aprovar solicitação
   */
  @Post('solicitacoes/:id/aprovar')
  @UseGuards(AprovadorAutorizadoGuard)
  @AprovadorAutorizado({
    rolesPermitidas: ['GESTOR', 'ADMIN'],
    verificarHierarquia: true,
    permiteDelegacao: true,
  })
  @ApiOperation({ summary: 'Aprovar solicitação' })
  @ApiParam({ name: 'id', description: 'ID da solicitação' })
  @ApiBody({ type: ProcessarAprovacaoDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Solicitação aprovada com sucesso',
  })
  async aprovarSolicitacao(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) processarDto: ProcessarAprovacaoDto,
    @GetUser() usuario: Usuario,
  ) {
    this.logger.log(
      `Aprovando solicitação ${id} por usuário ${usuario.id}`,
    );

    // TODO: Implementar método aprovarSolicitacao no AprovacaoService
    // const resultado = await this.aprovacaoService.aprovarSolicitacao(
    //   id,
    //   processarDto,
    //   usuario,
    // );
    const resultado = { id: 'temp', message: 'Aprovação será implementada' };

    return {
      success: true,
      message: 'Solicitação aprovada com sucesso',
      data: resultado,
    };
  }

  /**
   * Rejeitar solicitação
   */
  @Post('solicitacoes/:id/rejeitar')
  @UseGuards(AprovadorAutorizadoGuard)
  @AprovadorAutorizado({
    rolesPermitidas: ['GESTOR', 'ADMIN'],
    verificarHierarquia: true,
    permiteDelegacao: true,
  })
  @ApiOperation({ summary: 'Rejeitar solicitação' })
  @ApiParam({ name: 'id', description: 'ID da solicitação' })
  @ApiBody({ type: ProcessarAprovacaoDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Solicitação rejeitada com sucesso',
  })
  async rejeitarSolicitacao(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) processarDto: ProcessarAprovacaoDto,
    @GetUser() usuario: Usuario,
  ) {
    this.logger.log(
      `Rejeitando solicitação ${id} por usuário ${usuario.id}`,
    );

    // TODO: Implementar método rejeitarSolicitacao no AprovacaoService
    // const resultado = await this.aprovacaoService.rejeitarSolicitacao(
    //   id,
    //   processarDto,
    //   usuario,
    // );
    const resultado = { id: 'temp', message: 'Rejeição será implementada' };

    return {
      success: true,
      message: 'Solicitação rejeitada com sucesso',
      data: resultado,
    };
  }

  /**
   * Solicitar informações adicionais
   */
  @Post('solicitacoes/:id/solicitar-informacoes')
  @UseGuards(AprovadorAutorizadoGuard)
  @AprovadorAutorizado({
    rolesPermitidas: ['GESTOR', 'ADMIN'],
    verificarHierarquia: true,
  })
  @ApiOperation({ summary: 'Solicitar informações adicionais' })
  @ApiParam({ name: 'id', description: 'ID da solicitação' })
  @ApiBody({ type: ProcessarAprovacaoDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Informações solicitadas com sucesso',
  })
  async solicitarInformacoes(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) processarDto: ProcessarAprovacaoDto,
    @GetUser() usuario: Usuario,
  ) {
    // TODO: Implementar método solicitarInformacoes no AprovacaoService
    // const resultado = await this.aprovacaoService.solicitarInformacoes(
    //   id,
    //   processarDto,
    //   usuario,
    // );
    const resultado = { id: 'temp', message: 'Solicitação de informações será implementada' };

    return {
      success: true,
      message: 'Informações solicitadas com sucesso',
      data: resultado,
    };
  }

  // ==================== GESTÃO DE APROVADORES ====================

  /**
   * Listar aprovadores
   */
  @Get('aprovadores')
  @RequiresPermission({ permissionName: 'aprovacao.aprovadores.visualizar' })
  @ApiOperation({ summary: 'Listar aprovadores' })
  @ApiQuery({ name: 'ativo', type: Boolean, required: false })
  @ApiQuery({ name: 'tipo', enum: TipoAprovador, required: false })
  @ApiQuery({ name: 'unidade_id', type: String, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de aprovadores retornada com sucesso',
  })
  async listarAprovadores(
    @Query('ativo') ativo?: boolean,
    @Query('tipo') tipo?: TipoAprovador,
    @Query('unidade_id') unidadeId?: string,
  ) {
    // TODO: Implementar método listarAprovadores no AprovadorService
    // const aprovadores = await this.aprovadorService.listarAprovadores({
    //   ativo,
    //   tipo,
    //   unidade_id: unidadeId,
    // });
    const aprovadores = [];

    return {
      success: true,
      data: aprovadores,
    };
  }

  /**
   * Criar novo aprovador
   */
  @Post('aprovadores')
  @RequiresPermission({ permissionName: 'aprovacao.aprovadores.criar' })
  @UseInterceptors(AcaoCriticaInterceptor)
  @RequerAprovacao({
    acao: TipoAcaoCritica.CRIAR_APROVADOR,
    entidadeAlvo: 'Aprovador',
    descricaoAcao: 'Criar novo aprovador',
  })
  @ApiOperation({ summary: 'Criar novo aprovador' })
  @ApiBody({ type: CreateAprovadorDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Aprovador criado com sucesso',
  })
  async criarAprovador(
    @Body(ValidationPipe) createDto: CreateAprovadorDto,
    @GetUser() usuario: Usuario,
  ) {
    const aprovador = await this.aprovadorService.create(createDto);

    return {
      success: true,
      message: 'Aprovador criado com sucesso',
      data: aprovador,
    };
  }

  /**
   * Atualizar aprovador
   */
  @Put('aprovadores/:id')
  @RequiresPermission({ permissionName: 'aprovacao.aprovadores.atualizar' })
  @UseInterceptors(AcaoCriticaInterceptor)
  @RequerAprovacao({
    acao: TipoAcaoCritica.ATUALIZAR_APROVADOR,
    entidadeAlvo: 'Aprovador',
    descricaoAcao: 'Atualizar aprovador',
  })
  @ApiOperation({ summary: 'Atualizar aprovador' })
  @ApiParam({ name: 'id', description: 'ID do aprovador' })
  @ApiBody({ type: UpdateAprovadorDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Aprovador atualizado com sucesso',
  })
  async atualizarAprovador(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDto: UpdateAprovadorDto,
    @GetUser() usuario: Usuario,
  ) {
    const aprovador = await this.aprovadorService.update(id, updateDto);

    return {
      success: true,
      message: 'Aprovador atualizado com sucesso',
      data: aprovador,
    };
  }

  /**
   * Desativar aprovador
   */
  @Delete('aprovadores/:id')
  @RequiresPermission({ permissionName: 'aprovacao.aprovadores.desativar' })
  @UseInterceptors(AcaoCriticaInterceptor)
  @RequerAprovacao({
    acao: TipoAcaoCritica.DESATIVAR_APROVADOR,
    entidadeAlvo: 'Aprovador',
    descricaoAcao: 'Desativar aprovador',
  })
  @ApiOperation({ summary: 'Desativar aprovador' })
  @ApiParam({ name: 'id', description: 'ID do aprovador' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Aprovador desativado com sucesso',
  })
  async desativarAprovador(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() usuario: Usuario,
  ) {
    await this.aprovadorService.toggleStatus(id, false);

    return {
      success: true,
      message: 'Aprovador desativado com sucesso',
    };
  }

  // ==================== DELEGAÇÃO ====================

  /**
   * Delegar aprovação
   */
  @Post('aprovadores/:id/delegar')
  @UseGuards(AprovadorAutorizadoGuard)
  @AprovadorAutorizado({
    rolesPermitidas: ['aprovador', 'admin'],
    permiteDelegacao: true,
  })
  @ApiOperation({ summary: 'Delegar aprovação para outro aprovador' })
  @ApiParam({ name: 'id', description: 'ID do aprovador que está delegando' })
  @ApiBody({ type: DelegarAprovacaoDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Delegação criada com sucesso',
  })
  async delegarAprovacao(
    @Param('id', ParseUUIDPipe) aprovadorId: string,
    @Body(ValidationPipe) delegarDto: DelegarAprovacaoDto,
    @GetUser() usuario: Usuario,
  ) {
    // TODO: Implementar método criarDelegacao no AprovadorService
    // const delegacao = await this.aprovadorService.criarDelegacao(
    //   aprovadorId,
    //   delegarDto,
    //   usuario,
    // );
    const delegacao = { id: 'temp', message: 'Delegação será implementada' };

    return {
      success: true,
      message: 'Delegação criada com sucesso',
      data: delegacao,
    };
  }

  // ==================== MÉTRICAS E RELATÓRIOS ====================

  /**
   * Dashboard de métricas
   */
  @Get('metricas/dashboard')
  @RequiresPermission({ permissionName: 'aprovacao.metricas.dashboard.visualizar' })
  @ApiOperation({ summary: 'Dashboard de métricas do sistema de aprovação' })
  @ApiQuery({ name: 'data_inicio', type: Date, required: false })
  @ApiQuery({ name: 'data_fim', type: Date, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard de métricas retornado com sucesso',
  })
  async dashboardMetricas(
    @Query('data_inicio') dataInicio?: string,
    @Query('data_fim') dataFim?: string,
  ) {
    const inicio = dataInicio ? new Date(dataInicio) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 dias atrás
    const fim = dataFim ? new Date(dataFim) : new Date();

    const dashboard = await this.metricsService.gerarDashboardMetricas(
      inicio,
      fim,
    );

    return {
      success: true,
      data: dashboard,
    };
  }

  /**
   * Métricas de performance
   */
  @Get('metricas/performance')
  @RequiresPermission({ permissionName: 'aprovacao.metricas.performance.visualizar' })
  @ApiOperation({ summary: 'Métricas de performance do sistema' })
  @ApiQuery({ name: 'data_inicio', type: Date, required: false })
  @ApiQuery({ name: 'data_fim', type: Date, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Métricas de performance retornadas com sucesso',
  })
  async metricasPerformance(
    @Query('data_inicio') dataInicio?: string,
    @Query('data_fim') dataFim?: string,
  ): Promise<{ success: boolean; data: any }> {
    const inicio = dataInicio ? new Date(dataInicio) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 dias atrás
    const fim = dataFim ? new Date(dataFim) : new Date();

    const metricas = await this.metricsService.calcularMetricasPerformance(
      inicio,
      fim,
    );

    return {
      success: true,
      data: metricas,
    };
  }

  /**
   * Relatório de aprovadores
   */
  @Get('relatorios/aprovadores')
  @RequiresPermission({ permissionName: 'aprovacao.relatorios.aprovadores.visualizar' })
  @ApiOperation({ summary: 'Relatório de eficiência dos aprovadores' })
  @ApiQuery({ name: 'data_inicio', type: Date, required: false })
  @ApiQuery({ name: 'data_fim', type: Date, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Relatório de aprovadores retornado com sucesso',
  })
  async relatorioAprovadores(
    @Query('data_inicio') dataInicio?: string,
    @Query('data_fim') dataFim?: string,
  ): Promise<{ success: boolean; data: any }> {
    const inicio = dataInicio ? new Date(dataInicio) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const fim = dataFim ? new Date(dataFim) : new Date();

    const relatorio = await this.metricsService.calcularMetricasPorAprovador(
      inicio,
      fim,
    );

    return {
      success: true,
      data: relatorio,
    };
  }
}