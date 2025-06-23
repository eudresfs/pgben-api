import {
  Controller,
  Post,
  Param,
  ParseUUIDPipe,
  Body,
  UseGuards,
  Req,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { ScopeType } from '../../../entities/user-permission.entity';
import {
  WorkflowSolicitacaoService,
  ResultadoTransicaoEstado,
} from '../services/workflow-solicitacao.service';
import { StatusSolicitacao } from '../../../entities';
import { UpdateStatusSolicitacaoDto } from '../dto/update-status-solicitacao.dto';
import {
  ObservacaoTransicaoDto,
  AprovacaoSolicitacaoDto,
} from '../dto/observacao-transicao.dto';

/**
 * Controller de Workflow de Solicitação
 *
 * Responsável por expor os endpoints de gerenciamento do workflow de solicitações,
 * permitindo a transição entre estados.
 */
@ApiTags('Solicitação')
@Controller('solicitacao/workflow')
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
    description:
      'Retorna a lista de estados para os quais a solicitação pode transicionar.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de estados possíveis retornada com sucesso',
  })
  async getEstadosPossiveis(
    @Param('solicitacaoId', ParseUUIDPipe) solicitacaoId: string,
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
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @ApiOperation({
    summary: 'Submete um rascunho de solicitação',
    description: 'Altera o estado de uma solicitação de RASCUNHO para ABERTA.',
  })
  @ApiResponse({
    status: 200,
    description: 'Rascunho submetido com sucesso',
  })
  async submeterRascunho(
    @Param('solicitacaoId', ParseUUIDPipe) solicitacaoId: string,
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
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @ApiOperation({
    summary: 'Envia uma solicitação para análise',
    description:
      'Altera o estado de uma solicitação de PENDENTE para EM_ANALISE.',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitação enviada para análise com sucesso',
  })
  async enviarParaAnalise(
    @Param('solicitacaoId', ParseUUIDPipe) solicitacaoId: string,
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
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @ApiOperation({
    summary: 'Inicia a análise de uma solicitação',
    description:
      'Altera o estado de uma solicitação de PENDENTE para EM_ANALISE.',
  })
  @ApiResponse({
    status: 200,
    description: 'Análise iniciada com sucesso',
  })
  async iniciarAnalise(
    @Param('solicitacaoId', ParseUUIDPipe) solicitacaoId: string,
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
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @ApiOperation({
    summary: 'Aprova uma solicitação',
    description:
      'Altera o estado de uma solicitação de EM_ANALISE para APROVADA. No novo ciclo de vida simplificado, APROVADA é um status final que indica que a solicitação foi deferida.',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitação aprovada com sucesso',
  })
  async aprovarSolicitacao(
    @Param('solicitacaoId', ParseUUIDPipe) solicitacaoId: string,
    @Body() body: AprovacaoSolicitacaoDto,
    @Req() req: any,
  ): Promise<ResultadoTransicaoEstado> {
    return this.workflowService.aprovarSolicitacao(
      solicitacaoId,
      req.user.id,
      body.observacao ?? '',
      body.parecer_semtas,
    );
  }

  // Endpoint de liberação removido - não faz parte do novo ciclo de vida simplificado

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
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @ApiOperation({
    summary: 'Rejeita uma solicitação',
    description:
      'Altera o estado de uma solicitação de EM_ANALISE para INDEFERIDA.',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitação rejeitada com sucesso',
  })
  async rejeitarSolicitacao(
    @Param('solicitacaoId', ParseUUIDPipe) solicitacaoId: string,
    @Body() body: ObservacaoTransicaoDto,
    @Req() req: any,
  ): Promise<ResultadoTransicaoEstado> {
    return this.workflowService.rejeitarSolicitacao(
      solicitacaoId,
      req.user.id,
      body.observacao ?? '',
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
    scopeIdExpression: 'solicitacao.unidadeId',
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
    @Param('solicitacaoId', ParseUUIDPipe) solicitacaoId: string,
    @Body() body: ObservacaoTransicaoDto,
    @Req() req: any,
  ): Promise<ResultadoTransicaoEstado> {
    return this.workflowService.cancelarSolicitacao(
      solicitacaoId,
      req.user.id,
      body.observacao ?? '',
    );
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
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @ApiOperation({
    summary: 'Realiza uma transição de estado genérica',
    description:
      'Permite a transição manual entre estados, desde que seja uma transição permitida.',
  })
  @ApiResponse({
    status: 200,
    description: 'Transição realizada com sucesso',
  })
  async realizarTransicao(
    @Param('solicitacaoId', ParseUUIDPipe) solicitacaoId: string,
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
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @ApiOperation({
    summary: 'Atualiza o status de uma solicitação',
    description:
      'Permite a atualização do status de uma solicitação com informações adicionais para conformidade com a API.',
  })
  @ApiResponse({
    status: 200,
    description: 'Status atualizado com sucesso',
    schema: {
      type: 'object',
      properties: {
        sucesso: { type: 'boolean' },
        mensagem: { type: 'string' },
        status_anterior: {
          type: 'string',
          enum: Object.values(StatusSolicitacao),
        },
        status_atual: {
          type: 'string',
          enum: Object.values(StatusSolicitacao),
        },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async atualizarStatus(
    @Param('solicitacaoId', ParseUUIDPipe) solicitacaoId: string,
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
