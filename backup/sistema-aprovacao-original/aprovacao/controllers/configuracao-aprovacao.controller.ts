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
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { AuditInterceptor } from '../../auditoria/interceptors/audit.interceptor';
import { ConfiguracaoAprovacaoService } from '../services/configuracao-aprovacao.service';
import { AcaoCriticaService } from '../services/acao-critica.service';
import {
  CreateConfiguracaoAprovacaoDto,
  UpdateConfiguracaoAprovacaoDto,
  CreateAcaoCriticaDto,
  UpdateAcaoCriticaDto,
  FiltroConfiguracaoDto,
  FiltroAcaoCriticaDto,
} from '../dtos';
import { ConfiguracaoAprovacao } from '../entities/configuracao-aprovacao.entity';
import { AcaoCritica as AcaoCriticaEntity } from '../entities/acao-critica.entity';
import { TipoAcaoCritica, EstrategiaAprovacao } from '../enums';
import { RequerAprovacao, AcaoCritica } from '../decorators/requer-aprovacao.decorator';
import { AprovacaoInterceptor } from '../interceptors/aprovacao.interceptor';
import { AprovacaoValidationPipe } from '../pipes/aprovacao-validation.pipe';

/**
 * Controlador para gerenciamento de configurações de aprovação
 * 
 * Este controlador expõe endpoints para:
 * - Gerenciar ações críticas
 * - Configurar regras de aprovação
 * - Definir estratégias de aprovação
 * - Configurar aprovadores por ação
 */
@ApiTags('Configuração de Aprovação')
@Controller('aprovacao/configuracao')
@UseGuards(JwtAuthGuard, PermissionGuard)
@UseInterceptors(AuditInterceptor, AprovacaoInterceptor)
@ApiBearerAuth()
export class ConfiguracaoAprovacaoController {
  private readonly logger = new Logger(ConfiguracaoAprovacaoController.name);

  constructor(
    private readonly configuracaoService: ConfiguracaoAprovacaoService,
    private readonly acaoCriticaService: AcaoCriticaService,
  ) {}

  // ==================== AÇÕES CRÍTICAS ====================

  /**
   * Listar ações críticas
   */
  @Get('acoes-criticas')
  @RequiresPermission({ permissionName: 'aprovacao.acoes-criticas.visualizar' })
  @ApiOperation({ summary: 'Listar ações críticas' })
  @ApiQuery({ name: 'ativo', type: Boolean, required: false })
  @ApiQuery({ name: 'tipo', enum: TipoAcaoCritica, required: false })
  @ApiQuery({ name: 'requer_aprovacao', type: Boolean, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false, description: 'Página (padrão: 1)' })
  @ApiQuery({ name: 'limit', type: Number, required: false, description: 'Itens por página (padrão: 10)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de ações críticas',
    type: [AcaoCriticaEntity],
  })
  async listarAcoesCriticas(
    @Query(new ValidationPipe({ transform: true })) filtros: FiltroAcaoCriticaDto,
  ) {
    this.logger.log('Listando ações críticas', { filtros });
    return this.acaoCriticaService.listarComFiltros(filtros);
  }

  /**
   * Obter ação crítica por ID
   */
  @Get('acoes-criticas/:id')
  @RequiresPermission({ permissionName: 'aprovacao.acoes-criticas.visualizar' })
  @ApiOperation({ summary: 'Obter ação crítica por ID' })
  @ApiParam({ name: 'id', description: 'ID da ação crítica' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ação crítica encontrada',
    type: AcaoCriticaEntity,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ação crítica não encontrada',
  })
  async obterAcaoCritica(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AcaoCriticaEntity> {
    this.logger.log('Obtendo ação crítica', { id });
    return this.acaoCriticaService.obterPorId(id);
  }

  /**
   * Criar nova ação crítica
   */
  @Post('acoes-criticas')
  @RequiresPermission({ permissionName: 'aprovacao.acoes-criticas.criar' })
  @AcaoCritica(TipoAcaoCritica.CRIAR_ACAO_CRITICA, 'AcaoCritica')
  @ApiOperation({ summary: 'Criar nova ação crítica' })
  @ApiBody({ type: CreateAcaoCriticaDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Ação crítica criada com sucesso',
    type: AcaoCriticaEntity,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados inválidos',
  })
  async criarAcaoCritica(
    @Body(AprovacaoValidationPipe) dados: CreateAcaoCriticaDto,
  ): Promise<AcaoCriticaEntity> {
    this.logger.log('Criando ação crítica', { dados });
    return this.acaoCriticaService.criar(dados);
  }

  /**
   * Atualizar ação crítica
   */
  @Put('acoes-criticas/:id')
  @RequiresPermission({ permissionName: 'aprovacao.acoes-criticas.atualizar' })
  @AcaoCritica(TipoAcaoCritica.ATUALIZAR_ACAO_CRITICA, 'AcaoCritica')
  @ApiOperation({ summary: 'Atualizar ação crítica' })
  @ApiParam({ name: 'id', description: 'ID da ação crítica' })
  @ApiBody({ type: UpdateAcaoCriticaDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ação crítica atualizada com sucesso',
    type: AcaoCriticaEntity,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ação crítica não encontrada',
  })
  async atualizarAcaoCritica(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(AprovacaoValidationPipe) dados: UpdateAcaoCriticaDto,
  ): Promise<AcaoCriticaEntity> {
    this.logger.log('Atualizando ação crítica', { id, dados });
    return this.acaoCriticaService.atualizar(id, dados);
  }

  /**
   * Desativar ação crítica
   */
  @Delete('acoes-criticas/:id')
  @RequiresPermission({ permissionName: 'aprovacao.acoes-criticas.remover' })
  @AcaoCritica(TipoAcaoCritica.REMOVER_ACAO_CRITICA, 'AcaoCritica')
  @ApiOperation({ summary: 'Desativar ação crítica' })
  @ApiParam({ name: 'id', description: 'ID da ação crítica' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ação crítica desativada com sucesso',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ação crítica não encontrada',
  })
  async desativarAcaoCritica(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    this.logger.log('Desativando ação crítica', { id });
    await this.acaoCriticaService.toggleStatus(id, false);
  }

  // ==================== CONFIGURAÇÕES DE APROVAÇÃO ====================

  /**
   * Listar configurações de aprovação
   */
  @Get('configuracoes')
  @RequiresPermission({ permissionName: 'aprovacao.configuracao.visualizar' })
  @ApiOperation({ summary: 'Listar configurações de aprovação' })
  @ApiQuery({ name: 'acao_critica_id', type: String, required: false })
  @ApiQuery({ name: 'role', type: String, required: false })
  @ApiQuery({ name: 'estrategia', enum: EstrategiaAprovacao, required: false })
  @ApiQuery({ name: 'ativo', type: Boolean, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false, description: 'Página (padrão: 1)' })
  @ApiQuery({ name: 'limit', type: Number, required: false, description: 'Itens por página (padrão: 10)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de configurações de aprovação',
    type: [ConfiguracaoAprovacao],
  })
  async listarConfiguracoes(
    @Query(new ValidationPipe({ transform: true })) filtros: FiltroConfiguracaoDto,
  ) {
    this.logger.log('Listando configurações de aprovação', { filtros });
    return this.configuracaoService.listarComFiltros(filtros);
  }

  /**
   * Obter configuração por ID
   */
  @Get('configuracoes/:id')
  @RequiresPermission({ permissionName: 'aprovacao.configuracao.visualizar' })
  @ApiOperation({ summary: 'Obter configuração por ID' })
  @ApiParam({ name: 'id', description: 'ID da configuração' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configuração encontrada',
    type: ConfiguracaoAprovacao,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Configuração não encontrada',
  })
  async obterConfiguracao(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ConfiguracaoAprovacao> {
    this.logger.log('Obtendo configuração de aprovação', { id });
    return this.configuracaoService.obterPorId(id);
  }

  /**
   * Criar nova configuração de aprovação
   */
  @Post('configuracoes')
  @RequiresPermission({ permissionName: 'aprovacao.configuracao.criar' })
  @AcaoCritica(TipoAcaoCritica.CLONAR_CONFIGURACAO_APROVACAO, 'ConfiguracaoAprovacao')
  @ApiOperation({ summary: 'Criar nova configuração de aprovação' })
  @ApiBody({ type: CreateConfiguracaoAprovacaoDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Configuração criada com sucesso',
    type: ConfiguracaoAprovacao,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados inválidos',
  })
  async criarConfiguracao(
    @Body(AprovacaoValidationPipe) dados: CreateConfiguracaoAprovacaoDto,
  ): Promise<ConfiguracaoAprovacao> {
    this.logger.log('Criando configuração de aprovação', { dados });
    return this.configuracaoService.criar(dados);
  }

  /**
   * Atualizar configuração de aprovação
   */
  @Put('configuracoes/:id')
  @RequiresPermission({ permissionName: 'aprovacao.configuracao.atualizar' })
  @AcaoCritica(TipoAcaoCritica.ALTERAR_CONFIGURACAO_APROVACAO, 'ConfiguracaoAprovacao')
  @ApiOperation({ summary: 'Atualizar configuração de aprovação' })
  @ApiParam({ name: 'id', description: 'ID da configuração' })
  @ApiBody({ type: UpdateConfiguracaoAprovacaoDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configuração atualizada com sucesso',
    type: ConfiguracaoAprovacao,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Configuração não encontrada',
  })
  async atualizarConfiguracao(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(AprovacaoValidationPipe) dados: UpdateConfiguracaoAprovacaoDto,
  ): Promise<ConfiguracaoAprovacao> {
    this.logger.log('Atualizando configuração de aprovação', { id, dados });
    return this.configuracaoService.atualizar(id, dados);
  }

  /**
   * Desativar configuração de aprovação
   */
  @Delete('configuracoes/:id')
  @RequiresPermission({ permissionName: 'aprovacao.configuracao.remover' })
  @AcaoCritica(TipoAcaoCritica.REMOVER_CONFIGURACAO_APROVACAO, 'ConfiguracaoAprovacao')
  @ApiOperation({ summary: 'Desativar configuração de aprovação' })
  @ApiParam({ name: 'id', description: 'ID da configuração' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configuração desativada com sucesso',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Configuração não encontrada',
  })
  async desativarConfiguracao(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    this.logger.log('Desativando configuração de aprovação', { id });
    await this.configuracaoService.desativar(id);
  }

  // ==================== OPERAÇÕES ESPECIAIS ====================

  /**
   * Obter configuração para uma ação específica
   */
  @Get('configuracoes/por-acao/:tipoAcao')
  @RequiresPermission({ permissionName: 'aprovacao.configuracao.visualizar' })
  @ApiOperation({ summary: 'Obter configuração para uma ação específica' })
  @ApiParam({ name: 'tipoAcao', enum: TipoAcaoCritica, description: 'Tipo da ação crítica' })
  @ApiQuery({ name: 'role', type: String, required: false, description: 'Role do usuário' })
  @ApiQuery({ name: 'unidade_id', type: String, required: false, description: 'ID da unidade' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configuração encontrada',
    type: ConfiguracaoAprovacao,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Configuração não encontrada',
  })
  async obterConfiguracaoPorAcao(
    @Param('tipoAcao') tipoAcao: TipoAcaoCritica,
    @Query('role') role?: string,
    @Query('unidade_id') unidadeId?: string,
  ): Promise<ConfiguracaoAprovacao | null> {
    this.logger.log('Obtendo configuração por ação', { tipoAcao });
    return this.configuracaoService.buscarConfiguracaoPorAcao(tipoAcao);
  }

  /**
   * Verificar se uma ação requer aprovação
   */
  @Get('verificar-aprovacao/:tipoAcao')
  @RequiresPermission({ permissionName: 'aprovacao.configuracao.verificar' })
  @ApiOperation({ summary: 'Verificar se uma ação requer aprovação' })
  @ApiParam({ name: 'tipoAcao', enum: TipoAcaoCritica, description: 'Tipo da ação crítica' })
  @ApiQuery({ name: 'role', type: String, required: false, description: 'Role do usuário' })
  @ApiQuery({ name: 'unidade_id', type: String, required: false, description: 'ID da unidade' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resultado da verificação',
    schema: {
      type: 'object',
      properties: {
        requerAprovacao: { type: 'boolean' },
        configuracao: { $ref: '#/components/schemas/ConfiguracaoAprovacao' },
        motivo: { type: 'string' },
      },
    },
  })
  async verificarSeRequerAprovacao(
    @Param('tipoAcao') tipoAcao: TipoAcaoCritica,
    @Query('role') role?: string,
    @Query('unidade_id') unidadeId?: string,
  ) {
    this.logger.log('Verificando se ação requer aprovação', { tipoAcao, role, unidadeId });
    
    const configuracao = await this.configuracaoService.buscarConfiguracaoPorAcao(tipoAcao);

    if (!configuracao) {
      return {
        requerAprovacao: false,
        configuracao: null,
        motivo: 'Nenhuma configuração encontrada para esta ação',
      };
    }

    const requerAprovacao = configuracao.ativa;
    
    return {
      requerAprovacao,
      configuracao,
      motivo: requerAprovacao 
        ? 'Ação configurada para exigir aprovação'
        : 'Ação configurada para execução direta',
    };
  }

  /**
   * Clonar configuração existente
   */
  @Post('configuracoes/:id/clonar')
  @RequiresPermission({ permissionName: 'aprovacao.configuracao.clonar' })
  @AcaoCritica(TipoAcaoCritica.CLONAR_CONFIGURACAO_APROVACAO, 'ConfiguracaoAprovacao')
  @ApiOperation({ summary: 'Clonar configuração de aprovação existente' })
  @ApiParam({ name: 'id', description: 'ID da configuração a ser clonada' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        nova_acao_critica_id: { type: 'string', format: 'uuid' },
        nova_role: { type: 'string' },
        nova_unidade_id: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Configuração clonada com sucesso',
    type: ConfiguracaoAprovacao,
  })
  async clonarConfiguracao(
     @Param('id', ParseUUIDPipe) id: string,
     @Body() dadosClone?: Partial<CreateConfiguracaoAprovacaoDto>,
   ): Promise<ConfiguracaoAprovacao> {
     this.logger.log('Clonando configuração de aprovação', { id, dadosClone });
     return this.configuracaoService.clonar(id, dadosClone);
  }
}