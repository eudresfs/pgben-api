import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
  NotFoundException,
  BadRequestException,
  Query,
  Logger,
  Patch,
  ParseIntPipe,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { MonitoramentoAluguelSocialService } from '../services/monitoramento-aluguel-social.service';
import { RegistrarVisitaMonitoramentoDto } from '../dto/registrar-visita-monitoramento.dto';
import { AtualizarVisitaMonitoramentoDto } from '../dto/atualizar-visita-monitoramento.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { Request } from 'express';
import { TipoEscopo } from '@/entities/user-permission.entity';

/**
 * Controller para gerenciar o monitoramento de benefícios de Aluguel Social
 */
@ApiTags('Monitoramento de Aluguel Social')
@Controller('monitoramento-aluguel-social')
@UseGuards(JwtAuthGuard)
export class MonitoramentoAluguelSocialController {
  private readonly logger = new Logger(MonitoramentoAluguelSocialController.name);

  constructor(
    private readonly monitoramentoService: MonitoramentoAluguelSocialService,
  ) {}

  /**
   * Registra uma nova visita de monitoramento para uma solicitação de Aluguel Social
   */
  @Post('registrar-visita')
  @RequiresPermission({
    permissionName: 'solicitacao.registrar_visita_monitoramento',
    scopeType: TipoEscopo.UNIDADE,
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @ApiOperation({ 
    summary: 'Registra visita de monitoramento',
    description: 'Registra uma visita de monitoramento para uma solicitação de Aluguel Social' 
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Visita registrada com sucesso' 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Solicitação inválida ou não é de Aluguel Social' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Solicitação não encontrada' 
  })
  async registrarVisita(
    @Body() registrarVisitaDto: RegistrarVisitaMonitoramentoDto,
    @Req() req: Request,
  ) {
    this.logger.log(`Registrando visita para solicitação ${registrarVisitaDto.solicitacao_id}`);
    
    try {
      await this.monitoramentoService.registrarVisita(
        registrarVisitaDto.solicitacao_id,
        registrarVisitaDto.data_visita,
        registrarVisitaDto.observacoes,
        req.user,
      );
      
      return {
        message: 'Visita de monitoramento registrada com sucesso',
        success: true,
      };
    } catch (error) {
      if (error.message === 'Solicitação não encontrada') {
        throw new NotFoundException(error.message);
      }
      if (error.message === 'Solicitação não é de Aluguel Social') {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * Obtém as solicitações que precisam de monitoramento
   */
  @Get('pendentes')
  @RequiresPermission({
    permissionName: 'solicitacao.listar_monitoramento_pendente',
    scopeType: TipoEscopo.UNIDADE,
  })
  @ApiOperation({ 
    summary: 'Lista solicitações pendentes de monitoramento',
    description: 'Retorna a lista de solicitações de Aluguel Social que precisam de monitoramento' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de solicitações retornada com sucesso' 
  })
  async getSolicitacoesPendentes() {
    const solicitacoes = await this.monitoramentoService.getSolicitacoesParaMonitoramento();
    
    return {
      total: solicitacoes.length,
      data: solicitacoes,
    };
  }

  /**
   * Obtém as solicitações com alerta de monitoramento próximo
   */
  @Get('alertas')
  @RequiresPermission({
    permissionName: 'solicitacao.listar_monitoramento_alertas',
    scopeType: TipoEscopo.UNIDADE,
  })
  @ApiOperation({ 
    summary: 'Lista solicitações com alerta de monitoramento',
    description: 'Retorna a lista de solicitações de Aluguel Social com monitoramento próximo' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de alertas retornada com sucesso' 
  })
  async getAlertasMonitoramento() {
    const solicitacoes = await this.monitoramentoService.getSolicitacoesComAlertaMonitoramento();
    
    return {
      total: solicitacoes.length,
      data: solicitacoes,
    };
  }

  /**
   * Verifica se uma solicitação é de Aluguel Social e requer monitoramento
   */
  @Get(':id/status-monitoramento')
  @RequiresPermission({
    permissionName: 'solicitacao.verificar_status_monitoramento',
    scopeType: TipoEscopo.UNIDADE,
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @ApiOperation({ 
    summary: 'Verifica status de monitoramento',
    description: 'Verifica se uma solicitação é de Aluguel Social e requer monitoramento' 
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID da solicitação a ser verificada' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Status de monitoramento retornado com sucesso' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Solicitação não encontrada' 
  })
  async verificarStatusMonitoramento(@Param('id') id: string) {
    const solicitacao = await this.monitoramentoService.getSolicitacaoById(id);
    
    if (!solicitacao) {
      throw new NotFoundException('Solicitação não encontrada');
    }
    
    const isAluguelSocial = this.monitoramentoService.isAluguelSocial(solicitacao);
    const requiresMonitoring = this.monitoramentoService.requiresMonitoring(solicitacao);
    
    return {
      solicitacao_id: id,
      is_aluguel_social: isAluguelSocial,
      requires_monitoring: requiresMonitoring,
      proxima_visita: solicitacao.dados_complementares?.proxima_visita_monitoramento || null,
      total_visitas: solicitacao.dados_complementares?.visitas_monitoramento?.length || 0,
      ultima_visita: solicitacao.dados_complementares?.visitas_monitoramento?.length > 0
        ? solicitacao.dados_complementares.visitas_monitoramento[solicitacao.dados_complementares.visitas_monitoramento.length - 1]
        : null,
    };
  }

  /**
   * Obtém o histórico de visitas de monitoramento de uma solicitação
   */
  @Get(':id/historico-visitas')
  @RequiresPermission({
    permissionName: 'solicitacao.consultar_historico_visitas',
    scopeType: TipoEscopo.UNIDADE,
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @ApiOperation({ 
    summary: 'Obtém histórico de visitas',
    description: 'Retorna o histórico completo de visitas de monitoramento de uma solicitação' 
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID da solicitação' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Histórico de visitas retornado com sucesso' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Solicitação não encontrada' 
  })
  async getHistoricoVisitas(@Param('id') id: string) {
    const solicitacao = await this.monitoramentoService.getSolicitacaoById(id);
    
    if (!solicitacao) {
      throw new NotFoundException('Solicitação não encontrada');
    }
    
    if (!this.monitoramentoService.isAluguelSocial(solicitacao)) {
      throw new BadRequestException('Solicitação não é de Aluguel Social');
    }
    
    const visitas = solicitacao.dados_complementares?.visitas_monitoramento || [];
    
    return {
      solicitacao_id: id,
      protocolo: solicitacao.protocolo,
      total_visitas: visitas.length,
      proxima_visita: solicitacao.dados_complementares?.proxima_visita_monitoramento || null,
      visitas: visitas,
    };
  }

  /**
   * Atualiza parcialmente uma visita de monitoramento existente
   */
  @Patch(':id/visitas/:indice')
  @RequiresPermission({
    permissionName: 'solicitacao.atualizar_visita_monitoramento',
    scopeType: TipoEscopo.UNIDADE,
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @ApiOperation({ 
    summary: 'Atualiza uma visita de monitoramento',
    description: 'Permite atualizar parcialmente os dados de uma visita de monitoramento existente' 
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID da solicitação' 
  })
  @ApiParam({ 
    name: 'indice', 
    description: 'Índice da visita no array de visitas', 
    type: 'number' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Visita atualizada com sucesso' 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Solicitação inválida ou dados incorretos' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Solicitação ou visita não encontrada' 
  })
  async atualizarVisita(
    @Param('id') id: string,
    @Param('indice', ParseIntPipe) indice: number,
    @Body() atualizarVisitaDto: AtualizarVisitaMonitoramentoDto,
    @Req() req: Request,
  ) {
    this.logger.log(`Atualizando visita ${indice} para solicitação ${id}`);
    
    try {
      const visitaAtualizada = await this.monitoramentoService.atualizarVisitaMonitoramento(
        id,
        indice,
        {
          data_visita: atualizarVisitaDto.data_visita,
          observacoes: atualizarVisitaDto.observacoes,
          dados_adicionais: atualizarVisitaDto.dados_adicionais
        },
        req.user,
      );
      
      return {
        message: 'Visita de monitoramento atualizada com sucesso',
        success: true,
        visita: visitaAtualizada
      };
    } catch (error) {
      if (error.message === 'Solicitação não encontrada') {
        throw new NotFoundException(error.message);
      }
      if (error.message === 'Solicitação não é de Aluguel Social') {
        throw new BadRequestException(error.message);
      }
      if (error.message === 'Solicitação não possui visitas de monitoramento registradas') {
        throw new BadRequestException(error.message);
      }
      if (error.message === 'Visita não encontrada com o índice fornecido') {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  /**
   * Remove uma visita de monitoramento existente
   */
  @Delete(':id/visitas/:indice')
  @RequiresPermission({
    permissionName: 'solicitacao.remover_visita_monitoramento',
    scopeType: TipoEscopo.UNIDADE,
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @ApiOperation({ 
    summary: 'Remove uma visita de monitoramento',
    description: 'Remove uma visita de monitoramento existente da solicitação' 
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID da solicitação' 
  })
  @ApiParam({ 
    name: 'indice', 
    description: 'Índice da visita no array de visitas', 
    type: 'number' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Visita removida com sucesso' 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Solicitação inválida ou operação não permitida' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Solicitação ou visita não encontrada' 
  })
  async removerVisita(
    @Param('id') id: string,
    @Param('indice', ParseIntPipe) indice: number,
    @Req() req: Request,
  ) {
    this.logger.log(`Removendo visita ${indice} da solicitação ${id}`);
    
    try {
      const resultado = await this.monitoramentoService.removerVisitaMonitoramento(
        id,
        indice,
        req.user,
      );
      
      return {
        message: 'Visita de monitoramento removida com sucesso',
        success: true,
        proximaVisitaAtualizada: resultado.proximaVisitaAtualizada
      };
    } catch (error) {
      if (error.message === 'Solicitação não encontrada') {
        throw new NotFoundException(error.message);
      }
      if (error.message === 'Solicitação não é de Aluguel Social') {
        throw new BadRequestException(error.message);
      }
      if (error.message === 'Solicitação não possui visitas de monitoramento registradas') {
        throw new BadRequestException(error.message);
      }
      if (error.message === 'Visita não encontrada com o índice fornecido') {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
