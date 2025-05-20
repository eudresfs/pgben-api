import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpStatus, HttpCode, Req, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';

import { MetricasService as MetricasDefinicaoService } from '../services/metricas-definicao.service';
import { MetricasColetaService } from '../services/metricas-coleta.service';
import { MetricasCacheService } from '../services/metricas-cache.service';
import { CriarMetricaDefinicaoDto, AtualizarMetricaDefinicaoDto, FiltroMetricasDto } from '../dto/metrica-definicao.dto';
import { CriarMetricaConfiguracaoDto, AtualizarMetricaConfiguracaoDto } from '../dto/metrica-configuracao.dto';
import { ColetaManualMetricaDto, ConsultaValorMetricaDto, ConsultaSerieTemporalDto } from '../dto/metrica-snapshot.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/role.decorator';
import { Role } from '../../../shared/enums/role.enum';

/**
 * Controlador para gerenciamento de métricas
 */
@ApiTags('Métricas')
@Controller('v1/metricas')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MetricasDefinicaoController {
  constructor(
    private readonly metricasService: MetricasDefinicaoService,
    private readonly coletaService: MetricasColetaService,
    private readonly cacheService: MetricasCacheService,
  ) {}

  /**
   * Cria uma nova definição de métrica
   */
  @Post()
  @Roles(Role.ADMIN, Role.GESTOR)
  @ApiOperation({ summary: 'Criar nova métrica' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Métrica criada com sucesso' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Dados inválidos' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Não autorizado' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Acesso negado' })
  async criarMetrica(
    @Body() dto: CriarMetricaDefinicaoDto,
    @Req() req: Request,
  ) {
    // Obter usuário atual da requisição
    const usuarioId = req.user?.['sub'] || 'sistema';
    const usuarioNome = req.user?.['nome'] || 'Sistema';
    
    return this.metricasService.criarMetrica(dto, usuarioId, usuarioNome);
  }

  /**
   * Atualiza uma definição de métrica existente
   */
  @Put(':id')
  @Roles(Role.ADMIN, Role.GESTOR)
  @ApiOperation({ summary: 'Atualizar métrica existente' })
  @ApiParam({ name: 'id', description: 'ID da métrica' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Métrica atualizada com sucesso' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Dados inválidos' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Métrica não encontrada' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Não autorizado' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Acesso negado' })
  async atualizarMetrica(
    @Param('id') id: string,
    @Body() dto: AtualizarMetricaDefinicaoDto,
    @Req() req: Request,
  ) {
    // Obter usuário atual da requisição
    const usuarioId = req.user?.['sub'] || 'sistema';
    const usuarioNome = req.user?.['nome'] || 'Sistema';
    
    return this.metricasService.atualizarMetrica(id, dto, usuarioId, usuarioNome);
  }

  /**
   * Busca uma métrica pelo ID
   */
  @Get(':id')
  @Roles(Role.ADMIN, Role.GESTOR, Role.COORDENADOR)
  @ApiOperation({ summary: 'Buscar métrica por ID' })
  @ApiParam({ name: 'id', description: 'ID da métrica' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Métrica encontrada' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Métrica não encontrada' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Não autorizado' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Acesso negado' })
  async buscarMetricaPorId(@Param('id') id: string) {
    const metrica = await this.metricasService.buscarMetricaPorId(id);
    
    if (!metrica) {
      throw new HttpException('Métrica não encontrada', HttpStatus.NOT_FOUND);
    }
    
    return metrica;
  }

  /**
   * Busca uma métrica pelo código
   */
  @Get('codigo/:codigo')
  @Roles(Role.ADMIN, Role.GESTOR, Role.COORDENADOR)
  @ApiOperation({ summary: 'Buscar métrica por código' })
  @ApiParam({ name: 'codigo', description: 'Código da métrica' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Métrica encontrada' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Métrica não encontrada' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Não autorizado' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Acesso negado' })
  async buscarMetricaPorCodigo(@Param('codigo') codigo: string) {
    const metrica = await this.metricasService.buscarMetricaPorCodigo(codigo);
    
    if (!metrica) {
      throw new HttpException('Métrica não encontrada', HttpStatus.NOT_FOUND);
    }
    
    return metrica;
  }

  /**
   * Lista métricas com filtros e paginação
   */
  @Get()
  @Roles(Role.ADMIN, Role.GESTOR, Role.COORDENADOR)
  @ApiOperation({ summary: 'Listar métricas com filtros' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lista de métricas' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Não autorizado' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Acesso negado' })
  async listarMetricas(@Query() filtros: FiltroMetricasDto) {
    return this.metricasService.listarMetricas(filtros);
  }

  /**
   * Remove uma métrica (exclusão lógica)
   */
  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover métrica' })
  @ApiParam({ name: 'id', description: 'ID da métrica' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Métrica removida com sucesso' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Métrica não encontrada' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Não autorizado' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Acesso negado' })
  async removerMetrica(@Param('id') id: string) {
    await this.metricasService.removerMetrica(id);
  }

  /**
   * Cria configuração para uma métrica
   */
  @Post('configuracao')
  @Roles(Role.ADMIN, Role.GESTOR)
  @ApiOperation({ summary: 'Criar configuração para métrica' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Configuração criada com sucesso' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Dados inválidos' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Não autorizado' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Acesso negado' })
  async criarConfiguracao(
    @Body() dto: CriarMetricaConfiguracaoDto,
    @Req() req: Request,
  ) {
    // Obter usuário atual da requisição
    const usuarioId = req.user?.['sub'] || 'sistema';
    const usuarioNome = req.user?.['nome'] || 'Sistema';
    
    return this.metricasService.criarConfiguracao(dto, usuarioId, usuarioNome);
  }

  /**
   * Atualiza configuração de uma métrica
   */
  @Put('configuracao/:id')
  @Roles(Role.ADMIN, Role.GESTOR)
  @ApiOperation({ summary: 'Atualizar configuração de métrica' })
  @ApiParam({ name: 'id', description: 'ID da configuração' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Configuração atualizada com sucesso' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Dados inválidos' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Configuração não encontrada' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Não autorizado' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Acesso negado' })
  async atualizarConfiguracao(
    @Param('id') id: string,
    @Body() dto: AtualizarMetricaConfiguracaoDto,
    @Req() req: Request,
  ) {
    // Obter usuário atual da requisição
    const usuarioId = req.user?.['sub'] || 'sistema';
    const usuarioNome = req.user?.['nome'] || 'Sistema';
    
    return this.metricasService.atualizarConfiguracao(id, dto, usuarioId, usuarioNome);
  }

  /**
   * Busca configuração de uma métrica
   */
  @Get('configuracao/metrica/:metricaId')
  @Roles(Role.ADMIN, Role.GESTOR, Role.COORDENADOR)
  @ApiOperation({ summary: 'Buscar configuração de uma métrica' })
  @ApiParam({ name: 'metricaId', description: 'ID da métrica' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Configuração encontrada' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Configuração não encontrada' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Não autorizado' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Acesso negado' })
  async buscarConfiguracaoPorMetrica(@Param('metricaId') metricaId: string) {
    const configuracao = await this.metricasService.buscarConfiguracaoPorMetrica(metricaId);
    
    if (!configuracao) {
      throw new HttpException('Configuração não encontrada', HttpStatus.NOT_FOUND);
    }
    
    return configuracao;
  }

  /**
   * Coleta manualmente uma métrica específica
   */
  @Post('coleta')
  @Roles(Role.ADMIN, Role.GESTOR)
  @ApiOperation({ summary: 'Coletar métrica manualmente' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Métrica coletada com sucesso' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Dados inválidos' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Métrica não encontrada' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Não autorizado' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Acesso negado' })
  async coletarMetrica(@Body() dto: ColetaManualMetricaDto) {
    return this.coletaService.coletarMetricaManual(dto.codigo, dto.dimensoes);
  }

  /**
   * Consulta o valor atual de uma métrica
   */
  @Post('valor')
  @Roles(Role.ADMIN, Role.GESTOR, Role.COORDENADOR, Role.TECNICO)
  @ApiOperation({ summary: 'Consultar valor atual de uma métrica' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Valor da métrica' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Dados inválidos' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Métrica não encontrada' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Não autorizado' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Acesso negado' })
  async consultarValorMetrica(@Body() dto: ConsultaValorMetricaDto) {
    const metrica = await this.metricasService.buscarMetricaPorCodigo(dto.codigo);
    
    if (!metrica) {
      throw new HttpException('Métrica não encontrada', HttpStatus.NOT_FOUND);
    }
    
    // Buscar último snapshot
    const snapshot = await this.cacheService.obterUltimoSnapshot(metrica.id, dto.dimensoes);
    
    if (!snapshot) {
      throw new HttpException('Nenhum valor disponível para a métrica', HttpStatus.NOT_FOUND);
    }
    
    return {
      metrica: {
        id: metrica.id,
        codigo: metrica.codigo,
        nome: metrica.nome,
        descricao: metrica.descricao,
        unidade: metrica.unidade,
        prefixo: metrica.prefixo,
        sufixo: metrica.sufixo,
      },
      snapshot: {
        id: snapshot.id,
        valor: snapshot.valor,
        valor_formatado: snapshot.valor_formatado,
        periodo_inicio: snapshot.periodo_inicio,
        periodo_fim: snapshot.periodo_fim,
        dimensoes: snapshot.dimensoes,
        data_coleta: snapshot.created_at,
      }
    };
  }

  /**
   * Consulta série temporal de uma métrica
   */
  @Post('serie-temporal')
  @Roles(Role.ADMIN, Role.GESTOR, Role.COORDENADOR)
  @ApiOperation({ summary: 'Consultar série temporal de uma métrica' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Série temporal da métrica' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Dados inválidos' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Métrica não encontrada' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Não autorizado' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Acesso negado' })
  async consultarSerieTemporalMetrica(@Body() dto: ConsultaSerieTemporalDto) {
    const metrica = await this.metricasService.buscarMetricaPorCodigo(dto.codigo);
    
    if (!metrica) {
      throw new HttpException('Métrica não encontrada', HttpStatus.NOT_FOUND);
    }
    
    // Buscar snapshots para o período
    const snapshots = await this.cacheService.obterSerieTemporal(
      metrica.id,
      dto.data_inicial,
      dto.data_final,
      dto.dimensoes
    );
    
    return {
      metrica: {
        id: metrica.id,
        codigo: metrica.codigo,
        nome: metrica.nome,
        descricao: metrica.descricao,
        unidade: metrica.unidade,
        prefixo: metrica.prefixo,
        sufixo: metrica.sufixo,
      },
      periodo: {
        inicio: dto.data_inicial,
        fim: dto.data_final,
        granularidade: dto.granularidade || metrica.granularidade,
      },
      dimensoes: dto.dimensoes || {},
      pontos: snapshots.map(s => ({
        valor: s.valor,
        valor_formatado: s.valor_formatado,
        periodo_inicio: s.periodo_inicio,
        periodo_fim: s.periodo_fim,
      })),
    };
  }

  /**
   * Limpa o cache de métricas
   */
  @Post('cache/limpar')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Limpar cache de métricas' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Cache limpo com sucesso' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Não autorizado' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Acesso negado' })
  async limparCache() {
    this.cacheService.limparCacheCompleto();
  }

  /**
   * Obtém estatísticas de uso do cache
   */
  @Get('cache/estatisticas')
  @Roles(Role.ADMIN, Role.GESTOR)
  @ApiOperation({ summary: 'Obter estatísticas do cache de métricas' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Estatísticas do cache' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Não autorizado' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Acesso negado' })
  async obterEstatisticasCache() {
    return this.cacheService.obterEstatisticas();
  }
}
