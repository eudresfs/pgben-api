import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { DadosSociaisService } from '../services/dados-sociais.service';
import { CreateDadosSociaisDto } from '../dto/create-dados-sociais.dto';
import { UpdateDadosSociaisDto } from '../dto/update-dados-sociais.dto';
import { DadosSociaisResponseDto } from '../dto/dados-sociais-response.dto';
import { CidadaoAuditInterceptor } from '../interceptors/cidadao-audit.interceptor';
import { DadosSociais } from '../entities/dados-sociais.entity';

/**
 * Controller responsável pelo gerenciamento dos dados sociais dos cidadãos
 * 
 * Fornece endpoints para CRUD completo dos dados sociais, incluindo:
 * - Criação de dados sociais para um cidadão
 * - Consulta de dados sociais existentes
 * - Atualização de dados sociais
 * - Remoção de dados sociais
 * 
 * Todas as operações incluem validações de negócio e auditoria automática.
 */
@ApiTags('Dados Sociais')
@Controller('v1/cidadao')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
@UseInterceptors(CidadaoAuditInterceptor)
export class DadosSociaisController {
  constructor(private readonly dadosSociaisService: DadosSociaisService) {}

  /**
   * Cria dados sociais para um cidadão específico
   * 
   * Valida se o cidadão existe e se não possui dados sociais já cadastrados.
   * Calcula automaticamente a renda per capita baseada na composição familiar.
   */
  @Post(':id/dados-sociais')
  @HttpCode(HttpStatus.CREATED)
  @RequiresPermission({ permissionName: 'cidadao:dados-sociais:create' })
  @ApiOperation({ 
    summary: 'Criar dados sociais para um cidadão',
    description: 'Cria um novo registro de dados sociais para o cidadão especificado. Valida unicidade e calcula renda per capita automaticamente.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID do cidadão', 
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Dados sociais criados com sucesso',
    type: DadosSociaisResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Dados inválidos ou cidadão já possui dados sociais'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Cidadão não encontrado'
  })
  async create(
    @Param('id', ParseUUIDPipe) cidadaoId: string,
    @Body() createDadosSociaisDto: CreateDadosSociaisDto,
  ): Promise<DadosSociaisResponseDto> {
    const dadosSociais = await this.dadosSociaisService.create(cidadaoId, createDadosSociaisDto);
    return new DadosSociaisResponseDto(dadosSociais);
  }

  /**
   * Busca os dados sociais de um cidadão específico
   * 
   * Retorna os dados sociais completos incluindo informações calculadas
   * como renda per capita e status de benefícios.
   */
  @Get(':id/dados-sociais')
  @RequiresPermission({ permissionName: 'cidadao:dados-sociais:read' })
  @ApiOperation({ 
    summary: 'Buscar dados sociais de um cidadão',
    description: 'Retorna os dados sociais completos do cidadão especificado, incluindo cálculos automáticos.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID do cidadão', 
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Dados sociais encontrados',
    type: DadosSociaisResponseDto
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Cidadão ou dados sociais não encontrados'
  })
  async findByCidadaoId(
    @Param('id', ParseUUIDPipe) cidadaoId: string,
  ): Promise<DadosSociaisResponseDto> {
    const dadosSociais = await this.dadosSociaisService.findByCidadaoId(cidadaoId);
    return new DadosSociaisResponseDto(dadosSociais);
  }

  /**
   * Atualiza os dados sociais de um cidadão
   * 
   * Permite atualização parcial dos dados sociais.
   * Recalcula automaticamente valores derivados como renda per capita.
   */
  @Put(':id/dados-sociais')
  @RequiresPermission({ permissionName: 'cidadao:dados-sociais:update' })
  @ApiOperation({ 
    summary: 'Atualizar dados sociais de um cidadão',
    description: 'Atualiza os dados sociais do cidadão. Recalcula automaticamente valores derivados.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID do cidadão', 
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Dados sociais atualizados com sucesso',
    type: DadosSociaisResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Dados inválidos'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Cidadão ou dados sociais não encontrados'
  })
  async update(
    @Param('id', ParseUUIDPipe) cidadaoId: string,
    @Body() updateDadosSociaisDto: UpdateDadosSociaisDto,
  ): Promise<DadosSociaisResponseDto> {
    const dadosSociais = await this.dadosSociaisService.update(cidadaoId, updateDadosSociaisDto);
    return new DadosSociaisResponseDto(dadosSociais);
  }

  /**
   * Remove os dados sociais de um cidadão
   * 
   * Realiza soft delete dos dados sociais, mantendo histórico para auditoria.
   * Verifica dependências antes da remoção.
   */
  @Delete(':id/dados-sociais')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequiresPermission({ permissionName: 'cidadao:dados-sociais:delete' })
  @ApiOperation({ 
    summary: 'Remover dados sociais de um cidadão',
    description: 'Remove os dados sociais do cidadão (soft delete). Verifica dependências antes da remoção.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID do cidadão', 
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({ 
    status: 204, 
    description: 'Dados sociais removidos com sucesso'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Cidadão ou dados sociais não encontrados'
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Não é possível remover dados sociais devido a dependências'
  })
  async remove(
    @Param('id', ParseUUIDPipe) cidadaoId: string,
  ): Promise<void> {
    await this.dadosSociaisService.remove(cidadaoId);
  }
}