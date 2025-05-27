import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { ScopeType } from '../../../auth/entities/user-permission.entity';
import { WorkflowSolicitacaoService, ResultadoTransicaoEstado } from '../services/workflow-solicitacao.service';
import { StatusSolicitacao } from '../entities/solicitacao.entity';
import { UpdateStatusSolicitacaoDto } from '../dto/update-status-solicitacao.dto';

/**
 * DTO para observação de transição de estado
 */
class ObservacaoTransicaoDto {
  observacao: string;
}

/**
 * Controller de Workflow de Solicitação
 *
 * Responsável por expor os endpoints de gerenciamento do workflow de solicitações,
 * permitindo a transição entre estados.
 */
@ApiTags('Solicitação')
@Controller('v1/solicitacao/workflow')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class WorkflowSolicitacaoController {
  constructor(private readonly workflowService: WorkflowSolicitacaoService) {}

  /**
   * Obtém os estados possíveis para uma solicitação
   * @param solicitacaoId ID da solicitação
   * @returns Lista de estados possíveis
   */
  @Get(':solicitacaoId/estados-possiveis')
  @RequiresPermission({ permissionName: 'solicitacao.visualizar' })
  @ApiOperation({
    summary: 'Obtém os estados possíveis para uma solicitação',
    description: 'Retorna a lista de estados para os quais a solicitação pode transicionar.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de estados possíveis retornada com sucesso',
  })
  async getEstadosPossiveis(
    @Param('solicitacaoId') solicitacaoId: string,
  ): Promise<StatusSolicitacao[]> {
    return this.workflowService.getEstadosPossiveis(solicitacaoId);
  }

  /**
   * Submete um rascunho de solicitação
   * @param solicitacaoId ID da solicitação
   * @param req Requisição
   * @returns Resultado da transição
   */
  @Post(':solicitacaoId/submeter')
  @RequiresPermission({ 
    permissionName: 'solicitacao.submeter',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId'
  })
  @ApiOperation({
    summary: 'Submete um rascunho de solicitação',
    description: 'Altera o estado de uma solicitação de RASCUNHO para PENDENTE.',
  })
  @ApiResponse({
    status: 200,
    description: 'Rascunho submetido com sucesso',
  })
  async submeterRascunho(
    @Param('solicitacaoId') solicitacaoId: string,
    @Req() req: any,
  ): Promise<ResultadoTransicaoEstado> {
    return this.workflowService.submeterRascunho(solicitacaoId, req.user.id);
  }

  /**
   * Envia uma solicitação para análise
   * @param solicitacaoId ID da solicitação
   * @param req Requisição
   * @returns Resultado da transição
   */
  @Post(':solicitacaoId/enviar-para-analise')
  @RequiresPermission({ 
    permissionName: 'solicitacao.enviar-para-analise',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId'
  })
  @ApiOperation({
    summary: 'Envia uma solicitação para análise',
    description: 'Altera o estado de uma solicitação de PENDENTE para EM_ANALISE.',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitação enviada para análise com sucesso',
  })
  async enviarParaAnalise(
    @Param('solicitacaoId') solicitacaoId: string,
    @Req() req: any,
  ): Promise<ResultadoTransicaoEstado> {
    return this.workflowService.enviarParaAnalise(solicitacaoId, req.user.id);
  }

  /**
   * Inicia a análise de uma solicitação
   * @param solicitacaoId ID da solicitação
   * @param req Requisição
   * @returns Resultado da transição
   */
  @Post(':solicitacaoId/iniciar-analise')
  @RequiresPermission({ 
    permissionName: 'solicitacao.analisar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId'
  })
  @ApiOperation({
    summary: 'Inicia a análise de uma solicitação',
    description: 'Altera o estado de uma solicitação de PENDENTE para EM_ANALISE.',
  })
  @ApiResponse({
    status: 200,
    description: 'Análise iniciada com sucesso',
  })
  async iniciarAnalise(
    @Param('solicitacaoId') solicitacaoId: string,
    @Req() req: any,
  ): Promise<ResultadoTransicaoEstado> {
    return this.workflowService.iniciarAnalise(solicitacaoId, req.user.id);
  }

  /**
   * Aprova uma solicitação
   * @param solicitacaoId ID da solicitação
   * @param body Corpo da requisição
   * @param req Requisição
   * @returns Resultado da transição
   */
  @Post(':solicitacaoId/aprovar')
  @RequiresPermission({ 
    permissionName: 'solicitacao.aprovar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId'
  })
  @ApiOperation({
    summary: 'Aprova uma solicitação',
    description: 'Altera o estado de uma solicitação de EM_ANALISE para APROVADA.',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitação aprovada com sucesso',
  })
  async aprovarSolicitacao(
    @Param('solicitacaoId') solicitacaoId: string,
    @Body() body: ObservacaoTransicaoDto,
    @Req() req: any,
  ): Promise<ResultadoTransicaoEstado> {
    return this.workflowService.aprovarSolicitacao(
      solicitacaoId,
      req.user.id,
      body.observacao,
    );
  }

  /**
   * Libera uma solicitação
   * @param solicitacaoId ID da solicitação
   * @param req Requisição
   * @returns Resultado da transição
   */
  @Post(':solicitacaoId/liberar')
  @RequiresPermission({ 
    permissionName: 'solicitacao.liberar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId'
  })
  @ApiOperation({
    summary: 'Libera uma solicitação',
    description: 'Altera o estado de uma solicitação de APROVADA para LIBERADA.',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitação liberada com sucesso',
  })
  async liberarSolicitacao(
    @Param('solicitacaoId') solicitacaoId: string,
    @Req() req: any,
  ): Promise<ResultadoTransicaoEstado> {
    return this.workflowService.liberarSolicitacao(solicitacaoId, req.user.id);
  }

  /**
   * Rejeita uma solicitação
   * @param solicitacaoId ID da solicitação
   * @param body Corpo da requisição
   * @param req Requisição
   * @returns Resultado da transição
   */
  @Post(':solicitacaoId/rejeitar')
  @RequiresPermission({ 
    permissionName: 'solicitacao.rejeitar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId'
  })
  @ApiOperation({
    summary: 'Rejeita uma solicitação',
    description: 'Altera o estado de uma solicitação de EM_ANALISE para REPROVADA.',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitação rejeitada com sucesso',
  })
  async rejeitarSolicitacao(
    @Param('solicitacaoId') solicitacaoId: string,
    @Body() body: ObservacaoTransicaoDto,
    @Req() req: any,
  ): Promise<ResultadoTransicaoEstado> {
    return this.workflowService.rejeitarSolicitacao(
      solicitacaoId,
      req.user.id,
      body.observacao,
    );
  }

  /**
   * Cancela uma solicitação
   * @param solicitacaoId ID da solicitação
   * @param body Corpo da requisição
   * @param req Requisição
   * @returns Resultado da transição
   */
  @Post(':solicitacaoId/cancelar')
  @RequiresPermission({ 
    permissionName: 'solicitacao.cancelar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId'
  })
  @ApiOperation({
    summary: 'Cancela uma solicitação',
    description: 'Altera o estado de uma solicitação para CANCELADA.',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitação cancelada com sucesso',
  })
  async cancelarSolicitacao(
    @Param('solicitacaoId') solicitacaoId: string,
    @Body() body: ObservacaoTransicaoDto,
    @Req() req: any,
  ): Promise<ResultadoTransicaoEstado> {
    return this.workflowService.cancelarSolicitacao(
      solicitacaoId,
      req.user.id,
      body.observacao,
    );
  }

  /**
   * Inicia o processamento de uma solicitação
   * @param solicitacaoId ID da solicitação
   * @param req Requisição
   * @returns Resultado da transição
   */
  @Post(':solicitacaoId/iniciar-processamento')
  @RequiresPermission({ 
    permissionName: 'solicitacao.processar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId'
  })
  @ApiOperation({
    summary: 'Inicia o processamento de uma solicitação',
    description: 'Altera o estado de uma solicitação de LIBERADA para EM_PROCESSAMENTO.',
  })
  @ApiResponse({
    status: 200,
    description: 'Processamento iniciado com sucesso',
  })
  async iniciarProcessamento(
    @Param('solicitacaoId') solicitacaoId: string,
    @Req() req: any,
  ): Promise<ResultadoTransicaoEstado> {
    return this.workflowService.iniciarProcessamento(solicitacaoId, req.user.id);
  }

  /**
   * Conclui uma solicitação
   * @param solicitacaoId ID da solicitação
   * @param req Requisição
   * @returns Resultado da transição
   */
  @Post(':solicitacaoId/concluir')
  @RequiresPermission({ 
    permissionName: 'solicitacao.concluir',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId'
  })
  @ApiOperation({
    summary: 'Conclui uma solicitação',
    description: 'Altera o estado de uma solicitação de EM_PROCESSAMENTO para CONCLUIDA.',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitação concluída com sucesso',
  })
  async concluirSolicitacao(
    @Param('solicitacaoId') solicitacaoId: string,
    @Req() req: any,
  ): Promise<ResultadoTransicaoEstado> {
    return this.workflowService.concluirSolicitacao(solicitacaoId, req.user.id);
  }

  /**
   * Arquiva uma solicitação
   * @param solicitacaoId ID da solicitação
   * @param req Requisição
   * @returns Resultado da transição
   */
  @Post(':solicitacaoId/arquivar')
  @RequiresPermission({ 
    permissionName: 'solicitacao.arquivar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId'
  })
  @ApiOperation({
    summary: 'Arquiva uma solicitação',
    description: 'Altera o estado de uma solicitação para ARQUIVADA.',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitação arquivada com sucesso',
  })
  async arquivarSolicitacao(
    @Param('solicitacaoId') solicitacaoId: string,
    @Req() req: any,
  ): Promise<ResultadoTransicaoEstado> {
    return this.workflowService.arquivarSolicitacao(solicitacaoId, req.user.id);
  }

  /**
   * Realiza uma transição de estado genérica
   * @param solicitacaoId ID da solicitação
   * @param novoEstado Novo estado desejado
   * @param body Corpo da requisição
   * @param req Requisição
   * @returns Resultado da transição
   */
  @Post(':solicitacaoId/transicao/:novoEstado')
  @RequiresPermission({ 
    permissionName: 'solicitacao.transicao-manual',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId'
  })
  @ApiOperation({
    summary: 'Realiza uma transição de estado genérica',
    description: 'Permite a transição manual entre estados, desde que seja uma transição permitida.',
  })
  @ApiResponse({
    status: 200,
    description: 'Transição realizada com sucesso',
  })
  async realizarTransicao(
    @Param('solicitacaoId') solicitacaoId: string,
    @Param('novoEstado') novoEstado: StatusSolicitacao,
    @Body() body: ObservacaoTransicaoDto,
    @Req() req: any,
  ): Promise<ResultadoTransicaoEstado> {
    return this.workflowService.realizarTransicao(
      solicitacaoId,
      novoEstado,
      req.user.id,
      body.observacao,
    );
  }

  /**
   * Atualiza o status de uma solicitação com informações adicionais para conformidade
   * @param solicitacaoId ID da solicitação
   * @param updateStatusDto DTO com informações de atualização
   * @param req Requisição
   * @returns Resultado da transição
   */
  @Post(':solicitacaoId/atualizar-status')
  @RequiresPermission({ 
    permissionName: 'solicitacao.atualizar-status',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId'
  })
  @ApiOperation({
    summary: 'Atualiza o status de uma solicitação',
    description: 'Permite a atualização do status de uma solicitação com informações adicionais para conformidade com a API.',
  })
  @ApiResponse({
    status: 200,
    description: 'Status atualizado com sucesso',
    schema: {
      type: 'object',
      properties: {
        sucesso: { type: 'boolean' },
        mensagem: { type: 'string' },
        status_anterior: { type: 'string', enum: Object.values(StatusSolicitacao) },
        status_atual: { type: 'string', enum: Object.values(StatusSolicitacao) },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async atualizarStatus(
    @Param('solicitacaoId') solicitacaoId: string,
    @Body() updateStatusDto: UpdateStatusSolicitacaoDto,
    @Req() req: any,
  ): Promise<ResultadoTransicaoEstado> {
    return this.workflowService.atualizarStatus(
      solicitacaoId,
      updateStatusDto.novo_status,
      req.user.id,
      {
        observacao: updateStatusDto.observacao,
        processo_judicial_id: updateStatusDto.processo_judicial_id,
        determinacao_judicial_id: updateStatusDto.determinacao_judicial_id,
        justificativa: updateStatusDto.justificativa,
      },
    );
  }
}
