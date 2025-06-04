import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  UseGuards,
  Req,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { RecursoService } from '../services/recurso.service';
import { CreateRecursoDto } from '../dto/create-recurso.dto';
import { AnalisarRecursoDto } from '../dto/analisar-recurso.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { ScopeType } from '../../../entities/user-permission.entity';
import { StatusRecurso } from '../../../entities/recurso.entity';
import { Request } from 'express';

/**
 * Controlador de Recursos de Primeira Instância
 *
 * Responsável por gerenciar as rotas relacionadas aos recursos de primeira instância
 * para solicitações de benefícios indeferidas
 */
@ApiTags('Recursos')
@Controller('recursos')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class RecursoController {
  constructor(private readonly recursoService: RecursoService) {}

  /**
   * Lista todos os recursos com filtros e paginação
   */
  @Get()
  @RequiresPermission({
    permissionName: 'recurso.listar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'query.setor_id',
  })
  @ApiOperation({ summary: 'Listar recursos' })
  @ApiResponse({
    status: 200,
    description: 'Lista de recursos retornada com sucesso',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Página atual',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Itens por página',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: StatusRecurso,
    description: 'Filtro por status',
  })
  @ApiQuery({
    name: 'solicitacao_id',
    required: false,
    type: String,
    description: 'Filtro por solicitação',
  })
  @ApiQuery({
    name: 'setor_id',
    required: false,
    type: String,
    description: 'Filtro por setor responsável',
  })
  @ApiQuery({
    name: 'data_inicio',
    required: false,
    type: String,
    description: 'Data inicial (formato: YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'data_fim',
    required: false,
    type: String,
    description: 'Data final (formato: YYYY-MM-DD)',
  })
  async findAll(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: StatusRecurso,
    @Query('solicitacao_id') solicitacao_id?: string,
    @Query('setor_id') setor_id?: string,
    @Query('data_inicio') data_inicio?: string,
    @Query('data_fim') data_fim?: string,
  ) {
    const user = req.user;

    return this.recursoService.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      status,
      solicitacao_id,
      setor_id,
      data_inicio,
      data_fim,
      user,
    });
  }

  /**
   * Obtém detalhes de um recurso específico
   */
  @Get(':id')
  @RequiresPermission({
    permissionName: 'recurso.visualizar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'recurso.setorResponsavelId',
  })
  @ApiOperation({ summary: 'Obter detalhes de um recurso' })
  @ApiResponse({
    status: 200,
    description: 'Recurso encontrado com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Recurso não encontrado' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.recursoService.findById(id);
  }

  /**
   * Cria um novo recurso
   */
  @Post()
  @RequiresPermission({
    permissionName: 'recurso.criar',
    scopeType: ScopeType.GLOBAL,
  })
  @ApiOperation({ summary: 'Criar novo recurso' })
  @ApiResponse({ status: 201, description: 'Recurso criado com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos para criação do recurso',
  })
  @ApiBody({ type: CreateRecursoDto })
  async create(
    @Body() createRecursoDto: CreateRecursoDto,
    @Req() req: Request,
  ) {
    const user = req.user;
    return this.recursoService.create(createRecursoDto, user);
  }

  /**
   * Lista recursos de uma solicitação específica
   */
  @Get('solicitacao/:solicitacaoId')
  @RequiresPermission({
    permissionName: 'recurso.listar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @ApiOperation({ summary: 'Listar recursos de uma solicitação' })
  @ApiResponse({
    status: 200,
    description: 'Lista de recursos retornada com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Solicitação não encontrada' })
  async findBySolicitacao(
    @Param('solicitacaoId') solicitacaoId: string,
    @Req() req: Request,
  ) {
    const user = req.user;

    return this.recursoService.findAll({
      solicitacao_id: solicitacaoId,
      user,
    });
  }

  /**
   * Inicia a análise de um recurso
   */
  @Put(':id/iniciar-analise')
  @RequiresPermission({
    permissionName: 'recurso.analisar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'recurso.setorResponsavelId',
  })
  @ApiOperation({ summary: 'Iniciar análise de um recurso' })
  @ApiResponse({
    status: 200,
    description: 'Análise iniciada com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Recurso não pode ser analisado',
  })
  @ApiResponse({ status: 404, description: 'Recurso não encontrado' })
  async iniciarAnalise(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const user = req.user;
    return this.recursoService.iniciarAnalise(id, user);
  }

  /**
   * Analisa um recurso (deferir/indeferir)
   */
  @Put(':id/analisar')
  @RequiresPermission({
    permissionName: 'recurso.analisar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'recurso.setorResponsavelId',
  })
  @ApiOperation({ summary: 'Analisar um recurso' })
  @ApiResponse({ status: 200, description: 'Recurso analisado com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Recurso não pode ser analisado',
  })
  @ApiResponse({ status: 404, description: 'Recurso não encontrado' })
  @ApiBody({ type: AnalisarRecursoDto })
  async analisarRecurso(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() analisarRecursoDto: AnalisarRecursoDto,
    @Req() req: Request,
  ) {
    const user = req.user;
    return this.recursoService.analisarRecurso(id, analisarRecursoDto, user);
  }

  /**
   * Cancela um recurso
   */
  @Put(':id/cancelar')
  @RequiresPermission({
    permissionName: 'recurso.cancelar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'recurso.setorResponsavelId',
  })
  @ApiOperation({ summary: 'Cancelar recurso' })
  @ApiResponse({ status: 200, description: 'Recurso cancelado com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Recurso não pode ser cancelado',
  })
  @ApiResponse({ status: 404, description: 'Recurso não encontrado' })
  async cancelarRecurso(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const user = req.user;
    return this.recursoService.cancelarRecurso(id, user);
  }

  /**
   * Lista o histórico de um recurso
   */
  @Get(':id/historico')
  @RequiresPermission({
    permissionName: 'recurso.visualizar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'recurso.setorResponsavelId',
  })
  @RequiresPermission({
    permissionName: 'recurso.historico.visualizar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'recurso.setorResponsavelId',
  })
  @ApiOperation({ summary: 'Listar histórico de um recurso' })
  @ApiResponse({ status: 200, description: 'Histórico retornado com sucesso' })
  @ApiResponse({ status: 404, description: 'Recurso não encontrado' })
  async getHistorico(@Param('id', ParseUUIDPipe) id: string) {
    return this.recursoService.getHistorico(id);
  }
}
