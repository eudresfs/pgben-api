import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { ScopeType } from '../../../auth/entities/user-permission.entity';
import { DeterminacaoJudicialService } from '../services/determinacao-judicial.service';
import { SolicitacaoCreateDeterminacaoJudicialDto } from '../dto/create-determinacao-judicial.dto';
import { SolicitacaoUpdateDeterminacaoJudicialDto } from '../dto/update-determinacao-judicial.dto';
import { DeterminacaoJudicial } from '../../judicial/entities/determinacao-judicial.entity';

/**
 * Controller de Determinação Judicial
 *
 * Responsável por expor os endpoints de gerenciamento de determinações judiciais
 * relacionadas às solicitações de benefício.
 */
@ApiTags('Determinação Judicial')
@Controller('v1/solicitacao/determinacao-judicial')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class DeterminacaoJudicialController {
  constructor(private readonly determinacaoService: DeterminacaoJudicialService) {}

  /**
   * Cria uma nova determinação judicial
   * @param createDeterminacaoDto Dados da determinação judicial
   * @param req Requisição
   * @returns Determinação judicial criada
   */
  @Post()
  @RequiresPermission({ permissionName: 'solicitacao.criar-determinacao-judicial' })
  @ApiOperation({ summary: 'Cria uma nova determinação judicial' })
  @ApiResponse({
    status: 201,
    description: 'Determinação judicial criada com sucesso',
    type: DeterminacaoJudicial,
  })
  async create(
    @Body() createDeterminacaoDto: SolicitacaoCreateDeterminacaoJudicialDto,
    @Req() req: any,
  ): Promise<DeterminacaoJudicial> {
    const usuarioId = req.user.id;
    return this.determinacaoService.create(createDeterminacaoDto, usuarioId);
  }

  /**
   * Busca todas as determinações judiciais de uma solicitação
   * @param solicitacaoId ID da solicitação
   * @returns Lista de determinações judiciais
   */
  @Get('solicitacao/:solicitacaoId')
  @RequiresPermission({ permissionName: 'solicitacao.listar-determinacao-judicial' })
  @ApiOperation({
    summary: 'Busca todas as determinações judiciais de uma solicitação',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de determinações judiciais',
    type: [DeterminacaoJudicial],
  })
  async findBySolicitacaoId(
    @Param('solicitacaoId') solicitacaoId: string,
  ): Promise<DeterminacaoJudicial[]> {
    return this.determinacaoService.findBySolicitacaoId(solicitacaoId);
  }

  /**
   * Busca uma determinação judicial pelo ID
   * @param id ID da determinação judicial
   * @returns Determinação judicial
   */
  @Get(':id')
  @RequiresPermission({ permissionName: 'solicitacao.visualizar-determinacao-judicial' })
  @ApiOperation({ summary: 'Busca uma determinação judicial pelo ID' })
  @ApiResponse({
    status: 200,
    description: 'Determinação judicial encontrada',
    type: DeterminacaoJudicial,
  })
  async findById(@Param('id') id: string): Promise<DeterminacaoJudicial> {
    return this.determinacaoService.findById(id);
  }

  /**
   * Atualiza uma determinação judicial
   * @param id ID da determinação judicial
   * @param updateDeterminacaoDto Dados para atualização
   * @returns Determinação judicial atualizada
   */
  @Patch(':id')
  @RequiresPermission({ permissionName: 'solicitacao.atualizar-determinacao-judicial' })
  @ApiOperation({ summary: 'Atualiza uma determinação judicial' })
  @ApiResponse({
    status: 200,
    description: 'Determinação judicial atualizada com sucesso',
    type: DeterminacaoJudicial,
  })
  async update(
    @Param('id') id: string,
    @Body() updateDeterminacaoDto: SolicitacaoUpdateDeterminacaoJudicialDto,
  ): Promise<DeterminacaoJudicial> {
    return this.determinacaoService.update(id, updateDeterminacaoDto);
  }

  /**
   * Registra o cumprimento de uma determinação judicial
   * @param id ID da determinação judicial
   * @param body Observações sobre o cumprimento
   * @returns Determinação judicial atualizada
   */
  @Patch(':id/cumprir')
  @RequiresPermission({ permissionName: 'solicitacao.cumprir-determinacao-judicial' })
  @ApiOperation({ summary: 'Registra o cumprimento de uma determinação judicial' })
  @ApiResponse({
    status: 200,
    description: 'Cumprimento registrado com sucesso',
    type: DeterminacaoJudicial,
  })
  async registrarCumprimento(
    @Param('id') id: string,
    @Body() body: { observacoes?: string },
  ): Promise<DeterminacaoJudicial> {
    return this.determinacaoService.registrarCumprimento(id, body.observacoes);
  }

  /**
   * Remove uma determinação judicial
   * @param id ID da determinação judicial
   * @returns Void
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequiresPermission({ permissionName: 'solicitacao.remover-determinacao-judicial' })
  @ApiOperation({ summary: 'Remove uma determinação judicial' })
  @ApiResponse({
    status: 204,
    description: 'Determinação judicial removida com sucesso',
  })
  async remove(@Param('id') id: string): Promise<void> {
    return this.determinacaoService.remove(id);
  }
}
