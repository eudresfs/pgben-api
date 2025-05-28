import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  Patch,
  Delete,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { DeterminacaoJudicialConsolidadoService } from '../services/determinacao-judicial-consolidado.service';
import { DeterminacaoJudicial } from '../entities/determinacao-judicial.entity';
import { CreateDeterminacaoJudicialDto, UpdateDeterminacaoJudicialDto } from '../dtos/determinacao-judicial.dto';

/**
 * DTO para marcar determinação como cumprida
 */
class CumprimentoDeterminacaoDto {
  observacao: string;
}

/**
 * Controller de Determinações Judiciais
 *
 * Responsável por expor os endpoints de gerenciamento das determinações judiciais
 * relacionadas a processos e solicitações de benefício.
 */
@ApiTags('Solicitação')
@Controller('v1/judicial/determinacoes')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class DeterminacaoJudicialController {
  constructor(private readonly determinacaoJudicialService: DeterminacaoJudicialConsolidadoService) {}

  /**
   * Cria uma nova determinação judicial
   * @param createDeterminacaoDto Dados da determinação
   * @param req Requisição
   * @returns Determinação criada
   */
  @Post()
  @RequiresPermission({ permissionName: 'judicial.criar-determinacao' })
  @ApiOperation({
    summary: 'Cria uma nova determinação judicial',
    description: 'Cria uma determinação judicial relacionada a um processo judicial.',
  })
  @ApiResponse({
    status: 201,
    description: 'Determinação criada com sucesso',
    type: DeterminacaoJudicial,
  })
  async create(
    @Body() createDeterminacaoDto: CreateDeterminacaoJudicialDto,
    @Req() req: any,
  ): Promise<DeterminacaoJudicial> {
    return this.determinacaoJudicialService.create(createDeterminacaoDto, req.user.id);
  }

  /**
   * Busca todas as determinações judiciais
   * @param includeInactive Se deve incluir determinações inativas
   * @returns Lista de determinações
   */
  @Get()
  @RequiresPermission({ permissionName: 'judicial.listar-determinacao' })
  @ApiOperation({
    summary: 'Busca todas as determinações judiciais',
    description: 'Retorna a lista de todas as determinações judiciais.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de determinações retornada com sucesso',
    type: [DeterminacaoJudicial],
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('processoJudicialId') processoJudicialId?: string,
    @Query('solicitacaoId') solicitacaoId?: string,
    @Query('cidadaoId') cidadaoId?: string,
    @Query('tipo') tipo?: string,
    @Query('cumprida') cumprida?: boolean,
    @Query('termo') termo?: string,
  ) {
    return this.determinacaoJudicialService.findAll({
      page,
      limit,
      processoJudicialId,
      solicitacaoId,
      cidadaoId,
      tipo: tipo as any,
      cumprida,
      termo,
    });
  }

  /**
   * Busca uma determinação pelo ID
   * @param id ID da determinação
   * @returns Determinação
   */
  @Get(':id')
  @RequiresPermission({ permissionName: 'judicial.visualizar-determinacao' })
  @ApiOperation({
    summary: 'Busca uma determinação pelo ID',
    description: 'Retorna os detalhes de uma determinação judicial específica.',
  })
  @ApiResponse({
    status: 200,
    description: 'Determinação encontrada com sucesso',
    type: DeterminacaoJudicial,
  })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<DeterminacaoJudicial> {
    return this.determinacaoJudicialService.findById(id);
  }

  /**
   * Busca determinações por processo judicial
   * @param processoId ID do processo judicial
   * @param includeInactive Se deve incluir determinações inativas
   * @returns Lista de determinações
   */
  @Get('processo/:processoId')
  @RequiresPermission({ permissionName: 'judicial.listar-determinacao' })
  @ApiOperation({
    summary: 'Busca determinações por processo judicial',
    description: 'Retorna a lista de determinações judiciais relacionadas a um processo específico.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de determinações retornada com sucesso',
    type: [DeterminacaoJudicial],
  })
  async findByProcesso(
    @Param('processoId') processoId: string,
  ): Promise<DeterminacaoJudicial[]> {
    return this.determinacaoJudicialService.findByProcessoJudicial(processoId);
  }

  /**
   * Busca determinações por cidadão
   * @param cidadaoId ID do cidadão
   * @param includeInactive Se deve incluir determinações inativas
   * @returns Lista de determinações
   */
  @Get('cidadao/:cidadaoId')
  @RequiresPermission({ permissionName: 'judicial.listar-determinacao' })
  @ApiOperation({
    summary: 'Busca determinações por cidadão',
    description: 'Retorna a lista de determinações judiciais relacionadas a um cidadão específico.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de determinações retornada com sucesso',
    type: [DeterminacaoJudicial],
  })
  async findByCidadao(
    @Param('cidadaoId') cidadaoId: string,
  ): Promise<DeterminacaoJudicial[]> {
    return this.determinacaoJudicialService.findByCidadao(cidadaoId);
  }

  /**
   * Busca determinações por solicitação
   * @param solicitacaoId ID da solicitação
   * @param includeInactive Se deve incluir determinações inativas
   * @returns Lista de determinações
   */
  @Get('solicitacao/:solicitacaoId')
  @RequiresPermission({ permissionName: 'judicial.listar-determinacao' })
  @ApiOperation({
    summary: 'Busca determinações por solicitação',
    description: 'Retorna a lista de determinações judiciais relacionadas a uma solicitação específica.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de determinações retornada com sucesso',
    type: [DeterminacaoJudicial],
  })
  async findBySolicitacao(
    @Param('solicitacaoId') solicitacaoId: string,
  ): Promise<DeterminacaoJudicial[]> {
    return this.determinacaoJudicialService.findBySolicitacao(solicitacaoId);
  }

  @Get('pendentes')
  @ApiOperation({ summary: 'Buscar determinações pendentes de cumprimento' })
  @ApiResponse({ status: 200, description: 'Lista de determinações pendentes', type: [DeterminacaoJudicial] })
  async findPendentes(): Promise<DeterminacaoJudicial[]> {
    return this.determinacaoJudicialService.findPendentes();
  }

  /**
   * Atualiza uma determinação
   * @param id ID da determinação
   * @param updateDeterminacaoDto Dados para atualização
   * @param req Requisição
   * @returns Determinação atualizada
   */
  @Patch(':id')
  @RequiresPermission({ permissionName: 'judicial.atualizar-determinacao' })
  @ApiOperation({
    summary: 'Atualiza uma determinação',
    description: 'Atualiza os dados de uma determinação judicial existente.',
  })
  @ApiResponse({
    status: 200,
    description: 'Determinação atualizada com sucesso',
    type: DeterminacaoJudicial,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDeterminacaoDto: UpdateDeterminacaoJudicialDto,
    @Req() req: any,
  ): Promise<DeterminacaoJudicial> {
    return this.determinacaoJudicialService.update(id, updateDeterminacaoDto, req.user.id);
  }

  /**
   * Marca uma determinação como cumprida
   * @param id ID da determinação
   * @param cumprimentoDto Dados do cumprimento
   * @param req Requisição
   * @returns Determinação atualizada
   */
  @Patch(':id/cumprir')
  @RequiresPermission({ permissionName: 'judicial.cumprir-determinacao' })
  @ApiOperation({
    summary: 'Marca uma determinação como cumprida',
    description: 'Atualiza o status de uma determinação judicial para cumprida.',
  })
  @ApiResponse({
    status: 200,
    description: 'Determinação marcada como cumprida com sucesso',
    type: DeterminacaoJudicial,
  })
  async marcarComoCumprida(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CumprimentoDeterminacaoDto,
    @Req() req: any,
  ): Promise<DeterminacaoJudicial> {
    return this.determinacaoJudicialService.marcarComoCumprida(id, body.observacao, req.user.id);
  }

  @Patch(':id/ativar')
  @ApiOperation({ summary: 'Ativar ou desativar uma determinação judicial' })
  @ApiParam({ name: 'id', description: 'ID da determinação judicial' })
  @ApiResponse({ status: 200, description: 'Determinação judicial atualizada', type: DeterminacaoJudicial })
  @ApiResponse({ status: 404, description: 'Determinação judicial não encontrada' })
  async toggleAtivo(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ): Promise<DeterminacaoJudicial> {
    return this.determinacaoJudicialService.toggleAtivo(id, req.user.id);
  }

  /**
   * Remove uma determinação
   * @param id ID da determinação
   * @returns void
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequiresPermission({ permissionName: 'judicial.remover-determinacao' })
  @ApiOperation({
    summary: 'Remove uma determinação',
    description: 'Remove permanentemente uma determinação judicial.',
  })
  @ApiResponse({
    status: 204,
    description: 'Determinação removida com sucesso',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.determinacaoJudicialService.remove(id);
  }
}
