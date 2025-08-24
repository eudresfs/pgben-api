import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { AprovacaoService } from '../services';
import { CriarAcaoAprovacaoDto } from '../dtos';
import { TipoAcaoCritica, EstrategiaAprovacao } from '../enums';

/**
 * Controller simplificado para gerenciar configurações de aprovação
 * Consolida o gerenciamento de ações críticas e suas configurações
 */
@ApiTags('Aprovação - Configurações')
@Controller('aprovacao/configuracoes')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class ConfiguracaoAprovacaoController {
  constructor(private readonly aprovacaoService: AprovacaoService) {}

  /**
   * Cria uma nova configuração de ação de aprovação
   */
  @Post()
  @RequiresPermission({ permissionName: 'aprovacao.configuracao.criar' })
  @ApiOperation({ 
    summary: 'Criar configuração de aprovação',
    description: 'Cria uma nova configuração para ação crítica que requer aprovação'
  })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Configuração criada com sucesso' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Dados inválidos' 
  })
  @ApiResponse({ 
    status: HttpStatus.CONFLICT, 
    description: 'Configuração já existe para este tipo de ação' 
  })
  async criarConfiguracao(
    @Body(ValidationPipe) dto: CriarAcaoAprovacaoDto
  ) {
    const configuracao = await this.aprovacaoService.criarAcaoAprovacao(dto);

    return {
      message: 'Configuração de aprovação criada com sucesso',
      data: configuracao
    };
  }

  /**
   * Lista todas as configurações de aprovação
   */
  @Get()
  @RequiresPermission({ permissionName: 'aprovacao.configuracao.listar' })
  @ApiOperation({ 
    summary: 'Listar configurações',
    description: 'Lista todas as configurações de aprovação disponíveis'
  })
  @ApiQuery({ name: 'ativo', required: false, type: Boolean })
  @ApiQuery({ name: 'tipo_acao', required: false, enum: TipoAcaoCritica })
  @ApiQuery({ name: 'estrategia', required: false, enum: EstrategiaAprovacao })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Lista de configurações retornada com sucesso' 
  })
  async listarConfiguracoes(
    @Query('ativo') ativo?: boolean,
    @Query('tipo_acao') tipoAcao?: TipoAcaoCritica,
    @Query('estrategia') estrategia?: EstrategiaAprovacao
  ) {
    const filtros = { ativo, tipo_acao: tipoAcao, estrategia };
    
    // Remove filtros undefined
    Object.keys(filtros).forEach(key => 
      filtros[key] === undefined && delete filtros[key]
    );

    const configuracoes = await this.aprovacaoService.listarAcoesAprovacao(filtros);

    return {
      message: 'Configurações listadas com sucesso',
      data: configuracoes
    };
  }

  /**
   * Obtém detalhes de uma configuração específica
   */
  @Get(':id')
  @RequiresPermission({ permissionName: 'aprovacao.configuracao.visualizar' })
  @ApiOperation({ 
    summary: 'Obter configuração',
    description: 'Obtém detalhes de uma configuração específica'
  })
  @ApiParam({ name: 'id', description: 'ID da configuração' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Configuração encontrada' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Configuração não encontrada' 
  })
  async obterConfiguracao(
    @Param('id', ParseUUIDPipe) id: string
  ) {
    const configuracao = await this.aprovacaoService.obterAcaoAprovacao(id);

    return {
      message: 'Configuração encontrada',
      data: configuracao
    };
  }

  /**
   * Atualiza uma configuração de aprovação
   */
  @Put(':id')
  @RequiresPermission({ permissionName: 'aprovacao.configuracao.atualizar' })
  @ApiOperation({ 
    summary: 'Atualizar configuração',
    description: 'Atualiza uma configuração de aprovação existente'
  })
  @ApiParam({ name: 'id', description: 'ID da configuração' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Configuração atualizada com sucesso' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Configuração não encontrada' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Dados inválidos' 
  })
  async atualizarConfiguracao(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: Partial<CriarAcaoAprovacaoDto>
  ) {
    const configuracao = await this.aprovacaoService.atualizarAcaoAprovacao(id, dto);

    return {
      message: 'Configuração atualizada com sucesso',
      data: configuracao
    };
  }

  /**
   * Remove uma configuração de aprovação
   */
  @Delete(':id')
  @RequiresPermission({ permissionName: 'aprovacao.configuracao.excluir' })
  @ApiOperation({ 
    summary: 'Remover configuração',
    description: 'Remove uma configuração de aprovação (soft delete)'
  })
  @ApiParam({ name: 'id', description: 'ID da configuração' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Configuração removida com sucesso' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Configuração não encontrada' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Configuração não pode ser removida (possui solicitações ativas)' 
  })
  async removerConfiguracao(
    @Param('id', ParseUUIDPipe) id: string
  ) {
    await this.aprovacaoService.removerAcaoAprovacao(id);

    return {
      message: 'Configuração removida com sucesso'
    };
  }

  /**
   * Adiciona um aprovador a uma configuração
   */
  @Post(':id/aprovadores')
  @RequiresPermission({ permissionName: 'aprovacao.configuracao.gerenciar.aprovadores' })
  @ApiOperation({ 
    summary: 'Adicionar aprovador',
    description: 'Adiciona um aprovador a uma configuração de aprovação'
  })
  @ApiParam({ name: 'id', description: 'ID da configuração' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Aprovador adicionado com sucesso' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Dados inválidos ou aprovador já existe' 
  })
  async adicionarAprovador(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('usuario_id', ParseUUIDPipe) usuarioId: string
  ) {
    const aprovador = await this.aprovacaoService.adicionarAprovador(id, usuarioId);

    return {
      message: 'Aprovador adicionado com sucesso',
      data: aprovador
    };
  }

  /**
   * Lista aprovadores de uma configuração
   */
  @Get(':id/aprovadores')
  @RequiresPermission({ permissionName: 'aprovacao.configuracao.listar.aprovadores' })
  @ApiOperation({ 
    summary: 'Listar aprovadores',
    description: 'Lista todos os aprovadores de uma configuração'
  })
  @ApiParam({ name: 'id', description: 'ID da configuração' })
  @ApiQuery({ name: 'ativo', required: false, type: Boolean })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Lista de aprovadores retornada com sucesso' 
  })
  async listarAprovadores(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('ativo') ativo?: boolean
  ) {
    const aprovadores = await this.aprovacaoService.listarAprovadores(id, ativo);

    return {
      message: 'Aprovadores listados com sucesso',
      data: aprovadores
    };
  }

  /**
   * Remove um aprovador de uma configuração
   */
  @Delete(':id/aprovadores/:aprovadorId')
  @RequiresPermission({ permissionName: 'aprovacao.configuracao.gerenciar.aprovadores' })
  @ApiOperation({ 
    summary: 'Remover aprovador',
    description: 'Remove um aprovador de uma configuração (soft delete)'
  })
  @ApiParam({ name: 'id', description: 'ID da configuração' })
  @ApiParam({ name: 'aprovadorId', description: 'ID do aprovador' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Aprovador removido com sucesso' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Aprovador não encontrado' 
  })
  async removerAprovador(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('aprovadorId', ParseUUIDPipe) aprovadorId: string
  ) {
    await this.aprovacaoService.removerAprovador(id, aprovadorId);

    return {
      message: 'Aprovador removido com sucesso'
    };
  }

  /**
   * Verifica se um tipo de ação requer aprovação
   */
  @Get('verificar/:tipoAcao')
  @RequiresPermission({ permissionName: 'aprovacao.configuracao.verificar' })
  @ApiOperation({ 
    summary: 'Verificar necessidade de aprovação',
    description: 'Verifica se um tipo de ação específico requer aprovação'
  })
  @ApiParam({ name: 'tipoAcao', enum: TipoAcaoCritica, description: 'Tipo da ação' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Verificação realizada com sucesso' 
  })
  async verificarAprovacao(
    @Param('tipoAcao') tipoAcao: TipoAcaoCritica
  ) {
    const requerAprovacao = await this.aprovacaoService.requerAprovacao(tipoAcao);
    const configuracao = requerAprovacao ? 
      await this.aprovacaoService.obterConfiguracaoAprovacao(tipoAcao) : null;

    return {
      message: 'Verificação realizada com sucesso',
      data: {
        tipo_acao: tipoAcao,
        requer_aprovacao: requerAprovacao,
        configuracao
      }
    };
  }
}