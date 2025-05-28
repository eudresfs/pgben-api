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
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { RegraConflitoPapelRepository } from '../repositories/regra-conflito-papel.repository';
import { RegraConflitoPapel } from '../entities/regra-conflito-papel.entity';
import { VerificacaoRegraConflitoResponseDto, RegraConflitoResponseDto } from '../dto/verificacao-regra-conflito-response.dto';

/**
 * DTO para criação de regra de conflito
 */
class CreateRegraConflitoDto {
  papel_origem_id: string;
  papel_destino_id: string;
  descricao: string;
  ativo: boolean;
}

/**
 * DTO para atualização de regra de conflito
 */
class UpdateRegraConflitoDto {
  descricao?: string;
  ativo?: boolean;
}

/**
 * Controller de Regras de Conflito de Papéis
 *
 * Responsável por expor os endpoints de gerenciamento das regras de conflito
 * entre papéis de cidadãos no sistema.
 */
@ApiTags('Cidadão')
@Controller('v1/cidadao/regra-conflito')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class RegraConflitoPapelController {
  constructor(private readonly regraRepository: RegraConflitoPapelRepository) {}

  /**
   * Cria uma nova regra de conflito
   * @param createRegraDto Dados da regra
   * @param req Requisição
   * @returns Regra criada
   */
  @Post()
  @RequiresPermission(
    
    { permissionName: 'cidadao.criar-regra-conflito' }
  )
  @ApiOperation({
    summary: 'Cria uma nova regra de conflito',
    description: 'Cria uma regra que define conflito entre dois papéis no sistema.',
  })
  @ApiResponse({
    status: 201,
    description: 'Regra criada com sucesso',
    type: RegraConflitoPapel,
  })
  async create(
    @Body() createRegraDto: CreateRegraConflitoDto,
    @Req() req: any,
  ): Promise<RegraConflitoPapel> {
    return this.regraRepository.create({
      ...createRegraDto,
      created_by: req.user.id,
      updated_by: req.user.id,
    });
  }

  /**
   * Busca todas as regras de conflito
   * @param includeInactive Se deve incluir regras inativas
   * @returns Lista de regras
   */
  @Get()
  @RequiresPermission(
    
    { permissionName: 'cidadao.listar-regra-conflito' }
  )
  @ApiOperation({
    summary: 'Busca todas as regras de conflito',
    description: 'Retorna a lista de todas as regras de conflito entre papéis.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de regras retornada com sucesso',
    type: [RegraConflitoPapel],
  })
  async findAll(@Req() req: any): Promise<RegraConflitoPapel[]> {
    const includeInactive = req.query.includeInactive === 'true';
    return this.regraRepository.findAll(includeInactive);
  }

  /**
   * Busca uma regra pelo ID
   * @param id ID da regra
   * @returns Regra
   */
  @Get(':id')
  @RequiresPermission(
    
    { permissionName: 'cidadao.visualizar-regra-conflito' }
  )
  @ApiOperation({
    summary: 'Busca uma regra pelo ID',
    description: 'Retorna os detalhes de uma regra de conflito específica.',
  })
  @ApiResponse({
    status: 200,
    description: 'Regra encontrada com sucesso',
    type: RegraConflitoPapel,
  })
  async findById(@Param('id') id: string): Promise<RegraConflitoPapel> {
    const regra = await this.regraRepository.findById(id);
    if (!regra) {
      throw new NotFoundException(`Regra de conflito com ID ${id} não encontrada`);
    }
    return regra;
  }

  /**
   * Busca regras por papel de origem
   * @param papelOrigemId ID do papel de origem
   * @param includeInactive Se deve incluir regras inativas
   * @returns Lista de regras
   */
  @Get('papel-origem/:papelOrigemId')
  @RequiresPermission(
    
    { permissionName: 'cidadao.listar-regra-conflito' }
  )
  @ApiOperation({
    summary: 'Busca regras por papel de origem',
    description: 'Retorna a lista de regras de conflito que têm o papel especificado como origem.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de regras retornada com sucesso',
    type: [RegraConflitoPapel],
  })
  async findByPapelOrigem(
    @Param('papelOrigemId') papelOrigemId: string,
    @Req() req: any,
  ): Promise<RegraConflitoPapel[]> {
    const includeInactive = req.query.includeInactive === 'true';
    return this.regraRepository.findByPapelOrigem(papelOrigemId, includeInactive);
  }

  /**
   * Busca regras por papel de destino
   * @param papelDestinoId ID do papel de destino
   * @param includeInactive Se deve incluir regras inativas
   * @returns Lista de regras
   */
  @Get('papel-destino/:papelDestinoId')
  @RequiresPermission(
    
    { permissionName: 'cidadao.listar-regra-conflito' }
  )
  @ApiOperation({
    summary: 'Busca regras por papel de destino',
    description: 'Retorna a lista de regras de conflito que têm o papel especificado como destino.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de regras retornada com sucesso',
    type: [RegraConflitoPapel],
  })
  async findByPapelDestino(
    @Param('papelDestinoId') papelDestinoId: string,
    @Req() req: any,
  ): Promise<RegraConflitoPapel[]> {
    const includeInactive = req.query.includeInactive === 'true';
    return this.regraRepository.findByPapelDestino(papelDestinoId, includeInactive);
  }

  /**
   * Verifica se existe conflito entre dois papéis
   * @param papelOrigemId ID do papel de origem
   * @param papelDestinoId ID do papel de destino
   * @returns Resultado da verificação
   */
  @Get('verificar/:papelOrigemId/:papelDestinoId')
  @RequiresPermission(
    
    { permissionName: 'cidadao.verificar-regra-conflito' }
  )
  @ApiOperation({
    summary: 'Verifica se existe conflito entre dois papéis',
    description: 'Verifica se existe uma regra de conflito entre os papéis especificados.',
  })
  @ApiResponse({
    status: 200,
    description: 'Verificação realizada com sucesso',
    type: VerificacaoRegraConflitoResponseDto,
  })
  async verificarConflito(
    @Param('papelOrigemId') papelOrigemId: string,
    @Param('papelDestinoId') papelDestinoId: string,
  ): Promise<VerificacaoRegraConflitoResponseDto> {
    const regra = await this.regraRepository.verificarConflito(papelOrigemId, papelDestinoId);
    
    const response: VerificacaoRegraConflitoResponseDto = {
      possui_conflito: !!regra,
      regra: regra ? { id: regra.id, descricao: regra.descricao } : null,
    };
    
    return response;
  }

  /**
   * Atualiza uma regra
   * @param id ID da regra
   * @param updateRegraDto Dados para atualização
   * @param req Requisição
   * @returns Regra atualizada
   */
  @Patch(':id')
  @RequiresPermission(
    
    { permissionName: 'cidadao.atualizar-regra-conflito' }
  )
  @ApiOperation({
    summary: 'Atualiza uma regra',
    description: 'Atualiza os dados de uma regra de conflito existente.',
  })
  @ApiResponse({
    status: 200,
    description: 'Regra atualizada com sucesso',
    type: RegraConflitoPapel,
  })
  async update(
    @Param('id') id: string,
    @Body() updateRegraDto: UpdateRegraConflitoDto,
    @Req() req: any,
  ): Promise<RegraConflitoPapel> {
    return this.regraRepository.update(id, {
      ...updateRegraDto,
      updated_by: req.user.id,
    });
  }

  /**
   * Ativa ou desativa uma regra
   * @param id ID da regra
   * @param body Corpo da requisição
   * @param req Requisição
   * @returns Regra atualizada
   */
  @Patch(':id/ativar')
  @RequiresPermission(
    
    { permissionName: 'cidadao.atualizar-regra-conflito' }
  )
  @ApiOperation({
    summary: 'Ativa ou desativa uma regra',
    description: 'Altera o status de ativação de uma regra de conflito.',
  })
  @ApiResponse({
    status: 200,
    description: 'Status de ativação atualizado com sucesso',
    type: RegraConflitoPapel,
  })
  async toggleAtivo(
    @Param('id') id: string,
    @Body() body: { ativo: boolean },
    @Req() req: any,
  ): Promise<RegraConflitoPapel> {
    await this.regraRepository.update(id, { updated_by: req.user.id });
    return this.regraRepository.toggleAtivo(id, body.ativo);
  }

  /**
   * Remove uma regra
   * @param id ID da regra
   * @returns void
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequiresPermission(
    
    { permissionName: 'cidadao.remover-regra-conflito' }
  )
  @ApiOperation({
    summary: 'Remove uma regra',
    description: 'Remove permanentemente uma regra de conflito.',
  })
  @ApiResponse({
    status: 204,
    description: 'Regra removida com sucesso',
  })
  async remove(@Param('id') id: string): Promise<void> {
    return this.regraRepository.remove(id);
  }
}
