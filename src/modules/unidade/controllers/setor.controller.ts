import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SetorService } from '../services/setor.service';
import { CreateSetorDto } from '../dto/create-setor.dto';
import { UpdateSetorDto } from '../dto/update-setor.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { ScopeType } from '@/entities/user-permission.entity';
import { AuditEntity } from '../../auditoria/decorators/audit-entity.decorator';
import { AuditOperation } from '../../auditoria/decorators/audit-operation.decorator';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';
import { RiskLevel } from '../../auditoria/events/types/audit-event.types';

/**
 * Controlador de setores
 *
 * Responsável por gerenciar as rotas relacionadas a setores dentro das unidades
 */
@ApiTags('Unidades')
@Controller('setor')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@AuditEntity({
  entity: 'Setor',
  operation: 'controller'
})
export class SetorController {
  private readonly logger = new Logger(SetorController.name);

  constructor(private readonly setorService: SetorService) {}

  /**
   * Cria um novo setor
   */
  @Post()
  @RequiresPermission({
    permissionName: 'setor.criar',
    scopeType: ScopeType.GLOBAL,
  })
  @AuditOperation({
    tipo: TipoOperacao.CREATE,
    entidade: 'Setor',
    descricao: 'Criação de novo setor',
    riskLevel: RiskLevel.MEDIUM,
    sensitiveFields: ['responsavel_matricula'],
  })
  @ApiOperation({ summary: 'Criar novo setor' })
  @ApiResponse({ status: 201, description: 'Setor criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Unidade não encontrada' })
  async create(@Body() createSetorDto: CreateSetorDto) {
    this.logger.log(
      'Dados recebidos para criação de setor:',
      JSON.stringify(createSetorDto, null, 2),
    );
    const result = await this.setorService.create(createSetorDto);
    this.logger.log(
      'Setor criado com sucesso:',
      JSON.stringify(result, null, 2),
    );
    return result;
  }

  /**
   * Atualiza um setor existente
   */
  @Put(':id')
  @RequiresPermission({
    permissionName: 'setor.atualizar',
    scopeType: ScopeType.GLOBAL,
  })
  @AuditOperation({
    tipo: TipoOperacao.UPDATE,
    entidade: 'Setor',
    descricao: 'Atualização de dados do setor',
    riskLevel: RiskLevel.MEDIUM,
    sensitiveFields: ['responsavel_matricula'],
  })
  @ApiOperation({ summary: 'Atualizar setor existente' })
  @ApiResponse({ status: 200, description: 'Setor atualizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Setor não encontrado' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSetorDto: UpdateSetorDto,
  ) {
    return this.setorService.update(id, updateSetorDto);
  }

  /**
   * Obtém detalhes de um setor específico
   */
  @Get(':id')
  @RequiresPermission({
    permissionName: 'setor.listar',
    scopeType: ScopeType.GLOBAL,
  })
  @AuditOperation({
    tipo: TipoOperacao.READ,
    entidade: 'Setor',
    descricao: 'Consulta detalhes de setor',
    riskLevel: RiskLevel.LOW,
    sensitiveFields: ['responsavel_matricula'],
  })
  @ApiOperation({ summary: 'Obter detalhes de um setor' })
  @ApiResponse({ status: 200, description: 'Setor encontrado com sucesso' })
  @ApiResponse({ status: 404, description: 'Setor não encontrado' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.setorService.findById(id);
  }
}
