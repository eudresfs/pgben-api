import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
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
  getSchemaPath,
} from '@nestjs/swagger';
import { SolicitacaoService } from '../services/solicitacao.service';
import { CreateSolicitacaoDto } from '../dto/create-solicitacao.dto';
import { UpdateSolicitacaoDto } from '../dto/update-solicitacao.dto';
import { AvaliarSolicitacaoDto } from '../dto/avaliar-solicitacao.dto';
import { VincularProcessoJudicialDto } from '../dto/vincular-processo-judicial.dto';
import { VincularDeterminacaoJudicialDto } from '../dto/vincular-determinacao-judicial.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { ScopeType } from '../../../auth/entities/user-permission.entity';
import { StatusSolicitacao } from '../entities/solicitacao.entity';
import { Request } from 'express';

/**
 * Controlador de Solicitações
 *
 * Responsável por gerenciar as rotas relacionadas às solicitações de benefícios
 */
@ApiTags('Solicitações')
@Controller('v1/solicitacao')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class SolicitacaoController {
  constructor(private readonly solicitacaoService: SolicitacaoService) {}

  /**
   * Lista todas as solicitações com filtros e paginação
   */
  @Get()
  @RequiresPermission({
    permissionName: 'solicitacao.listar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'query.unidade_id',
  })
  @ApiOperation({ summary: 'Listar solicitações' })
  @ApiResponse({
    status: 200,
    description: 'Lista de solicitações retornada com sucesso',
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
    enum: StatusSolicitacao,
    description: 'Filtro por status',
  })
  @ApiQuery({
    name: 'unidade_id',
    required: false,
    type: String,
    description: 'Filtro por unidade',
  })
  @ApiQuery({
    name: 'beneficio_id',
    required: false,
    type: String,
    description: 'Filtro por tipo de benefício',
  })
  @ApiQuery({
    name: 'protocolo',
    required: false,
    type: String,
    description: 'Busca por protocolo',
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
    @Query('status') status?: StatusSolicitacao,
    @Query('unidade_id') unidade_id?: string,
    @Query('beneficio_id') beneficio_id?: string,
    @Query('protocolo') protocolo?: string,
    @Query('data_inicio') data_inicio?: string,
    @Query('data_fim') data_fim?: string,
  ) {
    // Verificar permissões do usuário para filtrar solicitações por unidade
    const user = req.user;

    return this.solicitacaoService.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      status,
      unidade_id,
      beneficio_id,
      protocolo,
      data_inicio,
      data_fim,
      user,
    });
  }

  /**
   * Obtém detalhes de uma solicitação específica
   */
  @Get(':id')
  @RequiresPermission({
    permissionName: 'solicitacao.visualizar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @ApiOperation({ summary: 'Obter detalhes de uma solicitação' })
  @ApiResponse({
    status: 200,
    description: 'Solicitação encontrada com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Solicitação não encontrada' })
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const solicitacao = await this.solicitacaoService.findById(id);

    // Verificar se o usuário tem permissão para acessar esta solicitação
    // (Administradores, gestores SEMTAS, ou usuários da mesma unidade)
    const user = req.user;
    if (!this.solicitacaoService.canAccessSolicitacao(solicitacao, user)) {
      throw new UnauthorizedException(
        'Você não tem permissão para acessar esta solicitação',
      );
    }

    return solicitacao;
  }

  /**
   * Cria uma nova solicitação de benefício
   */
  @Post()
  @RequiresPermission({
    permissionName: 'solicitacao.criar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'body.unidadeId',
  })
  @ApiOperation({ summary: 'Criar nova solicitação de benefício' })
  @ApiResponse({ status: 201, description: 'Solicitação criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async create(
    @Body() createSolicitacaoDto: CreateSolicitacaoDto,
    @Req() req: Request,
  ) {
    const user = req.user;
    return this.solicitacaoService.create(createSolicitacaoDto, user);
  }

  /**
   * Atualiza uma solicitação existente
   */
  @Put(':id')
  @RequiresPermission({
    permissionName: 'solicitacao.editar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @ApiOperation({ summary: 'Atualizar solicitação existente' })
  @ApiBody({
    description: 'Dados da solicitação atualizada',
    schema: {
      example: {
        nome: 'João Silva',
        cpf: '12345678901',
        data_nascimento: '1990-01-01',
        endereco: {
          logradouro: 'Rua Exemplo',
          numero: '123',
          bairro: 'Bairro Exemplo',
          cidade: 'Cidade Exemplo',
          estado: 'Estado Exemplo',
          cep: '12345678',
        },
        contato: {
          telefone: '123456789',
          email: 'joao.silva@example.com',
        },
        beneficio: {
          id: 1,
          nome: 'Benefício Exemplo',
        },
        status: 'EM_ANALISE',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitação atualizada com sucesso',
    schema: {
      example: {
        id: 1,
        nome: 'João Silva',
        cpf: '12345678901',
        data_nascimento: '1990-01-01',
        endereco: {
          logradouro: 'Rua Exemplo',
          numero: '123',
          bairro: 'Bairro Exemplo',
          cidade: 'Cidade Exemplo',
          estado: 'Estado Exemplo',
          cep: '12345678',
        },
        contato: {
          telefone: '123456789',
          email: 'joao.silva@example.com',
        },
        beneficio: {
          id: 1,
          nome: 'Benefício Exemplo',
        },
        status: 'EM_ANALISE',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Solicitação não encontrada' })
  async update(
    @Param('id') id: string,
    @Body() updateSolicitacaoDto: UpdateSolicitacaoDto,
    @Req() req: Request,
  ) {
    const user = req.user;
    return this.solicitacaoService.update(id, updateSolicitacaoDto, user);
  }

  /**
   * Submete uma solicitação para análise
   */
  @Put(':id/submeter')
  @RequiresPermission({
    permissionName: 'solicitacao.status.transicao.RASCUNHO.ENVIADA',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @ApiOperation({ summary: 'Submeter solicitação para análise' })
  @ApiResponse({
    status: 200,
    description: 'Solicitação submetida com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Solicitação não pode ser submetida',
  })
  @ApiResponse({ status: 404, description: 'Solicitação não encontrada' })
  async submeterSolicitacao(@Param('id') id: string, @Req() req: Request) {
    const user = req.user;
    return this.solicitacaoService.submeterSolicitacao(id, user);
  }

  /**
   * Avalia uma solicitação (aprovar/reprovar)
   */
  @Put(':id/avaliar')
  @RequiresPermission({
    permissionName: 'solicitacao.status.transicao.ENVIADA.EM_ANALISE',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @RequiresPermission({
    permissionName: 'solicitacao.status.transicao.EM_ANALISE.APROVADA',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @RequiresPermission({
    permissionName: 'solicitacao.status.transicao.EM_ANALISE.REJEITADA',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @ApiOperation({ summary: 'Avaliar solicitação (aprovar/reprovar)' })
  @ApiBody({
    description: 'Dados da avaliação da solicitação',
    schema: {
      example: "",
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitação avaliada com sucesso',
    schema: {
      example: "",
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Solicitação não pode ser avaliada',
  })
  @ApiResponse({ status: 404, description: 'Solicitação não encontrada' })
  async avaliarSolicitacao(
    @Param('id') id: string,
    @Body() avaliarSolicitacaoDto: AvaliarSolicitacaoDto,
    @Req() req: Request,
  ) {
    const user = req.user;
    return this.solicitacaoService.avaliarSolicitacao(
      id,
      avaliarSolicitacaoDto,
      user,
    );
  }

  /**
   * Libera um benefício aprovado
   */
  @Put(':id/liberar')
  @RequiresPermission({
    permissionName: 'solicitacao.status.transicao.APROVADA.CONCEDIDA',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @RequiresPermission({
    permissionName: 'beneficio.conceder',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @ApiOperation({ summary: 'Liberar benefício aprovado' })
  @ApiResponse({ status: 200, description: 'Benefício liberado com sucesso' })
  @ApiResponse({ status: 400, description: 'Benefício não pode ser liberado' })
  @ApiResponse({ status: 404, description: 'Solicitação não encontrada' })
  async liberarBeneficio(@Param('id') id: string, @Req() req: Request) {
    const user = req.user;
    return this.solicitacaoService.liberarBeneficio(id, user);
  }

  /**
   * Cancela uma solicitação
   */
  @Put(':id/cancelar')
  @RequiresPermission({
    permissionName: 'solicitacao.status.transicao.*.CANCELADA',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @ApiOperation({ summary: 'Cancelar solicitação' })
  @ApiResponse({
    status: 200,
    description: 'Solicitação cancelada com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Solicitação não pode ser cancelada',
  })
  @ApiResponse({ status: 404, description: 'Solicitação não encontrada' })
  async cancelarSolicitacao(@Param('id') id: string, @Req() req: Request) {
    const user = req.user;
    return this.solicitacaoService.cancelarSolicitacao(id, user);
  }

  /**
   * Lista o histórico de uma solicitação
   */
  @Get(':id/historico')
  @RequiresPermission({
    permissionName: 'solicitacao.visualizar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @RequiresPermission({
    permissionName: 'solicitacao.historico.visualizar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @ApiOperation({ summary: 'Listar histórico de uma solicitação' })
  @ApiResponse({ status: 200, description: 'Histórico retornado com sucesso' })
  @ApiResponse({ status: 404, description: 'Solicitação não encontrada' })
  async getHistorico(@Param('id') id: string, @Req() req: Request) {
    const user = req.user;
    const solicitacao = await this.solicitacaoService.findById(id);

    if (!this.solicitacaoService.canAccessSolicitacao(solicitacao, user)) {
      throw new UnauthorizedException(
        'Você não tem permissão para acessar esta solicitação',
      );
    }

    return this.solicitacaoService.getHistorico(id);
  }

  /**
   * Lista as pendências de uma solicitação
   */
  @Get(':id/pendencias')
  @RequiresPermission({
    permissionName: 'solicitacao.visualizar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @RequiresPermission({
    permissionName: 'solicitacao.pendencia.visualizar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @ApiOperation({ summary: 'Listar pendências de uma solicitação' })
  @ApiResponse({
    status: 200,
    description: 'Pendências retornadas com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Solicitação não encontrada' })
  async getPendencias(@Param('id') id: string, @Req() req: Request) {
    const user = req.user;
    const solicitacao = await this.solicitacaoService.findById(id);

    if (!this.solicitacaoService.canAccessSolicitacao(solicitacao, user)) {
      throw new UnauthorizedException(
        'Você não tem permissão para acessar esta solicitação',
      );
    }

    return this.solicitacaoService.getPendencias(id);
  }

  /**
   * Vincula um processo judicial a uma solicitação
   */
  @Post(':id/processo-judicial')
  @RequiresPermission({
    permissionName: 'solicitacao.processo_judicial.vincular',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @ApiOperation({ summary: 'Vincular processo judicial a uma solicitação' })
  @ApiResponse({
    status: 200,
    description: 'Processo judicial vinculado com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Solicitação ou processo não encontrado' })
  @ApiResponse({ status: 409, description: 'Processo já vinculado a esta solicitação' })
  @ApiBody({ type: VincularProcessoJudicialDto })
  async vincularProcessoJudicial(
    @Param('id') id: string,
    @Body() vincularDto: VincularProcessoJudicialDto,
    @Req() req: Request,
  ) {
    const user = req.user;
    const solicitacao = await this.solicitacaoService.findById(id);

    if (!this.solicitacaoService.canAccessSolicitacao(solicitacao, user)) {
      throw new UnauthorizedException(
        'Você não tem permissão para acessar esta solicitação',
      );
    }

    return this.solicitacaoService.vincularProcessoJudicial(id, vincularDto, user);
  }

  /**
   * Desvincula um processo judicial de uma solicitação
   */
  @Delete(':id/processo-judicial')
  @RequiresPermission({
    permissionName: 'solicitacao.processo_judicial.desvincular',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @ApiOperation({ summary: 'Desvincular processo judicial de uma solicitação' })
  @ApiResponse({
    status: 200,
    description: 'Processo judicial desvinculado com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Solicitação não encontrada' })
  @ApiResponse({ status: 400, description: 'Solicitação não possui processo judicial vinculado' })
  async desvincularProcessoJudicial(@Param('id') id: string, @Req() req: Request) {
    const user = req.user;
    const solicitacao = await this.solicitacaoService.findById(id);

    if (!this.solicitacaoService.canAccessSolicitacao(solicitacao, user)) {
      throw new UnauthorizedException(
        'Você não tem permissão para acessar esta solicitação',
      );
    }

    return this.solicitacaoService.desvincularProcessoJudicial(id, user);
  }

  /**
   * Vincula uma determinação judicial a uma solicitação
   */
  @Post(':id/determinacao-judicial')
  @RequiresPermission({
    permissionName: 'solicitacao.determinacao_judicial.vincular',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @ApiOperation({ summary: 'Vincular determinação judicial a uma solicitação' })
  @ApiResponse({
    status: 200,
    description: 'Determinação judicial vinculada com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Solicitação ou determinação não encontrada' })
  @ApiResponse({ status: 409, description: 'Determinação já vinculada a esta solicitação' })
  @ApiBody({ type: VincularDeterminacaoJudicialDto })
  async vincularDeterminacaoJudicial(
    @Param('id') id: string,
    @Body() vincularDto: VincularDeterminacaoJudicialDto,
    @Req() req: Request,
  ) {
    const user = req.user;
    const solicitacao = await this.solicitacaoService.findById(id);

    if (!this.solicitacaoService.canAccessSolicitacao(solicitacao, user)) {
      throw new UnauthorizedException(
        'Você não tem permissão para acessar esta solicitação',
      );
    }

    return this.solicitacaoService.vincularDeterminacaoJudicial(id, vincularDto, user);
  }

  /**
   * Desvincula uma determinação judicial de uma solicitação
   */
  @Delete(':id/determinacao-judicial')
  @RequiresPermission({
    permissionName: 'solicitacao.determinacao_judicial.desvincular',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @ApiOperation({ summary: 'Desvincular determinação judicial de uma solicitação' })
  @ApiResponse({
    status: 200,
    description: 'Determinação judicial desvinculada com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Solicitação não encontrada' })
  @ApiResponse({ status: 400, description: 'Solicitação não possui determinação judicial vinculada' })
  async desvincularDeterminacaoJudicial(@Param('id') id: string, @Req() req: Request) {
    const user = req.user;
    const solicitacao = await this.solicitacaoService.findById(id);

    if (!this.solicitacaoService.canAccessSolicitacao(solicitacao, user)) {
      throw new UnauthorizedException(
        'Você não tem permissão para acessar esta solicitação',
      );
    }

    return this.solicitacaoService.desvincularDeterminacaoJudicial(id, user);
  }
}
