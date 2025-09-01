import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Patch,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { UnidadeService } from '../services/unidade.service';
import { CreateUnidadeDto } from '../dto/create-unidade.dto';
import { UpdateUnidadeDto } from '../dto/update-unidade.dto';
import { UpdateStatusUnidadeDto } from '../dto/update-status-unidade.dto';
import {
  UnidadeFiltrosAvancadosDto,
  UnidadeFiltrosResponseDto,
} from '../dto/unidade-filtros-avancados.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { ScopeType } from '../../../entities/user-permission.entity';
import { AuditEntity } from '../../auditoria/decorators/audit-entity.decorator';
import { AuditOperation } from '../../auditoria/decorators/audit-operation.decorator';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';
import { RiskLevel } from '../../auditoria/events/types/audit-event.types';

/**
 * Controlador de unidades
 *
 * Responsável por gerenciar as rotas relacionadas a unidades (CRAS, CREAS, etc.)
 */
@ApiTags('Unidades')
@Controller('unidade')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
@AuditEntity({
  entity: 'Unidade',
  operation: 'controller'
})
export class UnidadeController {
  constructor(private readonly unidadeService: UnidadeService) {}

  /**
   * Lista todas as unidades com filtros e paginação
   */
  @Get()
  @ApiOperation({ summary: 'Listar unidades' })
  @ApiResponse({
    status: 200,
    description: 'Lista de unidades retornada com sucesso',
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
    name: 'search',
    required: false,
    type: String,
    description: 'Termo de busca',
  })
  @ApiQuery({
    name: 'tipo',
    required: false,
    type: String,
    description: 'Filtro por tipo de unidade',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filtro por status',
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('tipo') tipo?: string,
    @Query('status') status?: string,
  ) {
    const unidades = this.unidadeService.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
      tipo,
      status,
    });

    return unidades
  }

  /**
   * Obtém detalhes de uma unidade específica
   */
  @Get(':id')
  @RequiresPermission({
    permissionName: 'unidade.visualizar',
    scopeType: ScopeType.GLOBAL,
  })
  @AuditOperation({
    tipo: TipoOperacao.READ,
    entidade: 'Unidade',
    descricao: 'Consulta detalhes de unidade',
    riskLevel: RiskLevel.LOW,
    sensitiveFields: ['responsavel_matricula'],
  })
  @ApiOperation({ summary: 'Obter detalhes de uma unidade' })
  @ApiResponse({ status: 200, description: 'Unidade encontrada com sucesso' })
  @ApiResponse({ status: 404, description: 'Unidade não encontrada' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.unidadeService.findById(id);
  }

  /**
   * Cria uma nova unidade
   */
  @Post()
  @RequiresPermission({
    permissionName: 'unidade.criar',
    scopeType: ScopeType.GLOBAL,
  })
  @AuditOperation({
    tipo: TipoOperacao.CREATE,
    entidade: 'Unidade',
    descricao: 'Criação de nova unidade',
    riskLevel: RiskLevel.MEDIUM,
    sensitiveFields: ['responsavel_matricula', 'email'],
  })
  @ApiOperation({ summary: 'Criar nova unidade' })
  @ApiResponse({ status: 201, description: 'Unidade criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 409, description: 'Código já em uso' })
  async create(@Body() createUnidadeDto: CreateUnidadeDto) {
    return this.unidadeService.create(createUnidadeDto);
  }

  /**
   * Atualiza uma unidade existente
   */
  @Put(':id')
  @RequiresPermission({
    permissionName: 'unidade.editar',
    scopeType: ScopeType.GLOBAL,
  })
  @AuditOperation({
    tipo: TipoOperacao.UPDATE,
    entidade: 'Unidade',
    descricao: 'Atualização de dados da unidade',
    riskLevel: RiskLevel.MEDIUM,
    sensitiveFields: ['responsavel_matricula', 'email'],
  })
  @ApiOperation({ summary: 'Atualizar unidade existente' })
  @ApiResponse({ status: 200, description: 'Unidade atualizada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Unidade não encontrada' })
  @ApiResponse({ status: 409, description: 'Código já em uso' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUnidadeDto: UpdateUnidadeDto,
  ) {
    return this.unidadeService.update(id, updateUnidadeDto);
  }

  /**
   * Atualiza o status de uma unidade
   */
  @Patch(':id/status')
  @RequiresPermission({
    permissionName: 'unidade.status.alterar',
    scopeType: ScopeType.GLOBAL,
  })
  @AuditOperation({
    tipo: TipoOperacao.UPDATE,
    entidade: 'Unidade',
    descricao: 'Alteração de status da unidade',
    riskLevel: RiskLevel.HIGH,

  })
  @ApiOperation({ summary: 'Ativar/inativar unidade' })
  @ApiResponse({ status: 200, description: 'Status atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Unidade não encontrada' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusUnidadeDto: UpdateStatusUnidadeDto,
  ) {
    return this.unidadeService.updateStatus(id, updateStatusUnidadeDto);
  }

  /**
   * Busca avançada de unidades com filtros complexos
   */
  @Post('filtros-avancados')
  @RequiresPermission({
    permissionName: 'unidade.listar',
    scopeType: ScopeType.GLOBAL,
  })
  @AuditOperation({
    tipo: TipoOperacao.READ,
    entidade: 'Unidade',
    descricao: 'Busca avançada de unidades com filtros',
    riskLevel: RiskLevel.LOW,
  })
  @ApiOperation({
    summary: 'Busca avançada de unidades',
    description: `
      Permite busca avançada de unidades com múltiplos filtros:
      - Filtros por status (ativo, inativo)
      - Filtros por tipo de unidade (CRAS, CREAS, etc.)
      - Busca textual por nome, código ou sigla
      - Filtros por período de criação/atualização
      - Inclusão opcional de relacionamentos (setores, usuários)
      - Paginação e ordenação customizáveis
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Busca realizada com sucesso',
    type: UnidadeFiltrosResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Parâmetros de filtro inválidos',
  })
  @ApiBody({
    type: UnidadeFiltrosAvancadosDto,
    description: 'Filtros para busca avançada',
    examples: {
      basico: {
        summary: 'Busca básica com paginação',
        value: {
          page: 1,
          limit: 10,
          search: 'CRAS',
        },
      },
      avancado: {
        summary: 'Busca avançada com múltiplos filtros',
        value: {
          page: 1,
          limit: 20,
          status: ['ativo'],
          tipo: ['CRAS', 'CREAS'],
          search: 'Centro',
          include_relations: ['setores'],
          created_at_inicio: '2024-01-01T00:00:00.000Z',
          created_at_fim: '2024-12-31T23:59:59.999Z',
        },
      },
    },
  })
  async filtrosAvancados(
    @Body() filtros: UnidadeFiltrosAvancadosDto,
  ): Promise<UnidadeFiltrosResponseDto> {
    const startTime = Date.now();
    const resultado = await this.unidadeService.filtrosAvancados(filtros);
    const executionTime = Date.now() - startTime;

    return {
      ...resultado,
      tempo_execucao: executionTime,
    };
  }

  /**
   * Lista os setores de uma unidade específica
   */
  @Get(':id/setor')
  @RequiresPermission({
    permissionName: 'unidade.setor.listar',
    scopeType: ScopeType.GLOBAL,
  })
  @ApiOperation({ summary: 'Listar setores de uma unidade' })
  @ApiResponse({
    status: 200,
    description: 'Lista de setores retornada com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Unidade não encontrada' })
  async findSetores(@Param('id', ParseUUIDPipe) id: string) {
    return this.unidadeService.findSetoresByUnidadeId(id);
  }
}
