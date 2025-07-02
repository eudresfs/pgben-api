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
import { RenovacaoAutomaticaService } from '../services/renovacao-automatica.service';
import { ConfiguracaoRenovacao } from '../../../entities/configuracao-renovacao.entity';
import { CreateConfiguracaoRenovacaoDto } from '../dto/create-configuracao-renovacao.dto';
import { UpdateConfiguracaoRenovacaoDto } from '../dto/update-configuracao-renovacao.dto';
import { Solicitacao } from '../../../entities/solicitacao.entity';
import { VerificacaoRenovacaoResponseDto } from '../dto/verificacao-renovacao-response.dto';
import { VerificacaoRenovacoesPendentesResponseDto } from '../dto/verificacao-renovacoes-pendentes-response.dto';
import { AuditEventEmitter } from '../../auditoria/events/emitters/audit-event.emitter';
import { AuditEventType } from '../../auditoria/events/types/audit-event.types';
import { ReqContext } from '../../../shared/request-context/req-context.decorator';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { Usuario } from '../../../entities/usuario.entity';
import { ConfigurarRenovacaoSolicitacaoDto } from '../dto/configurar-renovacao-solicitacao.dto';
import { VerificacaoConfiguracaoRenovacaoResponseDto } from '../dto/verificacao-configuracao-renovacao-response.dto';
import { ConfiguracaoRenovacaoResponseDto } from '../dto/configuracao-renovacao-response.dto';

// Usando o DTO importado ConfigurarRenovacaoSolicitacaoDto

/**
 * Controller de Renovação Automática
 *
 * Responsável por expor os endpoints de gerenciamento das configurações de renovação
 * automática e do processo de renovação automática mensal.
 */
@Controller('beneficio/renovacao-automatica')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class RenovacaoAutomaticaController {
  constructor(
    private readonly renovacaoService: RenovacaoAutomaticaService,
    private readonly auditEventEmitter: AuditEventEmitter,
  ) {}

  /**
   * Cria uma nova configuração de renovação automática
   * @param createConfiguracaoDto Dados da configuração
   * @param req Requisição
   * @returns Configuração criada
   */
  @Post('configuracao')
  @RequiresPermission({ permissionName: 'beneficio.configuracao.criar' })
  @ApiOperation({
    summary: 'Cria uma nova configuração de renovação automática',
    description:
      'Cria uma configuração de renovação automática para um tipo de benefício.',
  })
  @ApiResponse({
    status: 201,
    description: 'Configuração criada com sucesso',
    type: ConfiguracaoRenovacao,
  })
  async create(
    @Body() createConfiguracaoDto: CreateConfiguracaoRenovacaoDto,
    @GetUser() usuario: Usuario,
    @ReqContext() ctx: any,
  ): Promise<ConfiguracaoRenovacao> {
    const result = await this.renovacaoService.create(
      createConfiguracaoDto,
      usuario.id,
    );

    // Auditoria: Criação de configuração de renovação automática
    await this.auditEventEmitter.emitEntityCreated(
      'ConfiguracaoRenovacao',
      result.id,
      {
        tipoBeneficioId: createConfiguracaoDto.tipo_beneficio_id,
        renovacaoAutomatica: createConfiguracaoDto.renovacao_automatica,
        diasAntecedenciaRenovacao:
          createConfiguracaoDto.dias_antecedencia_renovacao,
        numeroMaximoRenovacoes: createConfiguracaoDto.numero_maximo_renovacoes,
        requerAprovacaoRenovacao:
          createConfiguracaoDto.requer_aprovacao_renovacao,
        observacoes: createConfiguracaoDto.observacoes,
      },
      usuario.id,
    );

    return result;
  }

  /**
   * Busca todas as configurações de renovação
   * @returns Lista de configurações
   */
  @Get('configuracao')
  @RequiresPermission({ permissionName: 'beneficio.configuracao.listar' })
  @ApiOperation({
    summary: 'Busca todas as configurações de renovação',
    description:
      'Retorna a lista de todas as configurações de renovação automática.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de configurações retornada com sucesso',
    type: [ConfiguracaoRenovacao],
  })
  async findAll(): Promise<ConfiguracaoRenovacao[]> {
    return this.renovacaoService.findAll();
  }

  /**
   * Busca uma configuração de renovação pelo ID
   * @param id ID da configuração
   * @returns Configuração
   */
  @Get('configuracao/:id')
  @RequiresPermission({ permissionName: 'beneficio.configuracao.visualizar' })
  @ApiOperation({
    summary: 'Busca uma configuração de renovação pelo ID',
    description:
      'Retorna os detalhes de uma configuração de renovação específica.',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuração encontrada com sucesso',
    type: ConfiguracaoRenovacao,
  })
  async findById(@Param('id') id: string): Promise<ConfiguracaoRenovacao> {
    return this.renovacaoService.findById(id);
  }

  /**
   * Busca uma configuração de renovação pelo tipo de benefício
   * @param tipoBeneficioId ID do tipo de benefício
   * @returns Configuração
   */
  @Get('configuracao/tipo-beneficio/:tipoBeneficioId')
  @RequiresPermission({ permissionName: 'beneficio.configuracao.visualizar' })
  @ApiOperation({
    summary: 'Busca uma configuração de renovação pelo tipo de benefício',
    description:
      'Retorna a configuração de renovação para um tipo de benefício específico.',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuração encontrada com sucesso',
    type: ConfiguracaoRenovacao,
  })
  async findByTipoBeneficio(
    @Param('tipoBeneficioId') tipoBeneficioId: string,
  ): Promise<ConfiguracaoRenovacao> {
    return this.renovacaoService.findByTipoBeneficio(tipoBeneficioId);
  }

  /**
   * Atualiza uma configuração de renovação
   * @param id ID da configuração
   * @param updateConfiguracaoDto Dados para atualização
   * @returns Configuração atualizada
   */
  @Patch('configuracao/:id')
  @RequiresPermission({ permissionName: 'beneficio.configuracao.atualizar' })
  @ApiOperation({
    summary: 'Atualiza uma configuração de renovação',
    description:
      'Atualiza os dados de uma configuração de renovação existente.',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuração atualizada com sucesso',
    type: ConfiguracaoRenovacao,
  })
  async update(
    @Param('id') id: string,
    @Body() updateConfiguracaoDto: UpdateConfiguracaoRenovacaoDto,
    @GetUser() usuario: Usuario,
    @ReqContext() ctx: any,
  ): Promise<ConfiguracaoRenovacao> {
    // Buscar estado anterior para auditoria
    const configuracaoAnterior = await this.renovacaoService.findById(id);

    const result = await this.renovacaoService.update(
      id,
      updateConfiguracaoDto,
    );

    // Auditoria: Atualização de configuração de renovação automática
    await this.auditEventEmitter.emitEntityUpdated(
      'ConfiguracaoRenovacao',
      id,
      {
        diasAntecedenciaRenovacao:
          configuracaoAnterior?.dias_antecedencia_renovacao,
        renovacaoAutomatica: configuracaoAnterior?.renovacao_automatica,
        observacoes: configuracaoAnterior?.observacoes,
      },
      updateConfiguracaoDto,
      usuario.id,
    );

    return result;
  }

  /**
   * Remove uma configuração de renovação
   * @param id ID da configuração
   * @returns void
   */
  @Delete('configuracao/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequiresPermission({ permissionName: 'beneficio.configuracao.remover' })
  @ApiOperation({
    summary: 'Remove uma configuração de renovação',
    description: 'Remove permanentemente uma configuração de renovação.',
  })
  @ApiResponse({
    status: 204,
    description: 'Configuração removida com sucesso',
  })
  async remove(
    @Param('id') id: string,
    @GetUser() usuario: Usuario,
    @ReqContext() ctx: any,
  ): Promise<void> {
    // Buscar configuração antes da exclusão para auditoria
    const configuracao = await this.renovacaoService.findById(id);

    await this.renovacaoService.remove(id);

    // Auditoria: Remoção de configuração de renovação automática
    await this.auditEventEmitter.emitEntityDeleted(
      'ConfiguracaoRenovacao',
      id,
      {
        tipoBeneficioId: configuracao?.tipo_beneficio_id,
        diasAntecedenciaRenovacao: configuracao?.dias_antecedencia_renovacao,
        renovacaoAutomatica: configuracao?.renovacao_automatica,
        observacoes: configuracao?.observacoes,
      },
      usuario.id,
    );
  }

  /**
   * Ativa ou desativa uma configuração de renovação
   * @param id ID da configuração
   * @param body Corpo da requisição
   * @returns Configuração atualizada
   */
  @Patch('configuracao/:id/ativar')
  @RequiresPermission({ permissionName: 'beneficio.configuracao.atualizar' })
  @ApiOperation({
    summary: 'Ativa ou desativa uma configuração de renovação',
    description:
      'Altera o status de ativação de uma configuração de renovação.',
  })
  @ApiResponse({
    status: 200,
    description: 'Status de ativação atualizado com sucesso',
    type: ConfiguracaoRenovacao,
  })
  async toggleAtivo(
    @Param('id') id: string,
    @Body() body: { ativo: boolean },
    @GetUser() usuario: Usuario,
    @ReqContext() ctx: any,
  ): Promise<ConfiguracaoRenovacao> {
    // Buscar estado anterior para auditoria
    const configuracaoAnterior = await this.renovacaoService.findById(id);

    const result = await this.renovacaoService.toggleAtivo(id, body.ativo);

    // Auditoria: Alteração de status de configuração de renovação automática
    await this.auditEventEmitter.emitEntityUpdated(
      'ConfiguracaoRenovacao',
      id,
      { ativo: configuracaoAnterior?.ativo },
      { ativo: body.ativo },
      usuario.id,
    );

    return result;
  }

  /**
   * Verifica a configuração de renovação automática de uma solicitação
   * @param solicitacaoId ID da solicitação
   * @returns Informações sobre a configuração de renovação da solicitação
   */
  @Get('solicitacao/:solicitacaoId/verificar')
  @RequiresPermission({
    permissionName: 'solicitacao.visualizar',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @ApiOperation({
    summary:
      'Verifica a configuração de renovação automática de uma solicitação',
    description:
      'Retorna informações sobre a configuração de renovação automática de uma solicitação específica.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Informações sobre renovação automática retornadas com sucesso',
    type: VerificacaoRenovacaoResponseDto,
  })
  async verificarRenovacaoSolicitacao(
    @Param('solicitacaoId') solicitacaoId: string,
  ): Promise<VerificacaoRenovacaoResponseDto> {
    return this.renovacaoService.verificarRenovacaoSolicitacao(solicitacaoId);
  }

  /**
   * Configura a renovação automática para uma solicitação
   * @param solicitacaoId ID da solicitação
   * @param body Corpo da requisição
   * @param req Requisição
   * @returns Solicitação atualizada
   */
  @Patch('solicitacao/:solicitacaoId')
  @RequiresPermission({
    permissionName: 'solicitacao.configurar-renovacao',
    scopeType: ScopeType.UNIT,
    scopeIdExpression: 'solicitacao.unidadeId',
  })
  @ApiOperation({
    summary: 'Configura a renovação automática para uma solicitação',
    description:
      'Ativa ou desativa a renovação automática para uma solicitação específica.',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuração de renovação atualizada com sucesso',
    type: Solicitacao,
  })
  async configurarRenovacaoSolicitacao(
    @Param('solicitacaoId') solicitacaoId: string,
    @Body() body: ConfigurarRenovacaoSolicitacaoDto,
    @Req() req: any,
  ): Promise<Solicitacao> {
    return this.renovacaoService.configurarRenovacaoSolicitacao(
      solicitacaoId,
      body.renovacao_automatica,
      req.user.id,
    );
  }

  /**
   * Verifica e processa manualmente as renovações pendentes
   * @param req Requisição
   * @returns Número de solicitações renovadas
   */
  @Post('verificar-pendentes')
  @RequiresPermission({ permissionName: 'beneficio.renovacao.verificar' })
  @ApiOperation({
    summary: 'Verifica e processa manualmente as renovações pendentes',
    description:
      'Executa manualmente o processo de verificação e renovação automática.',
  })
  @ApiResponse({
    status: 200,
    description: 'Verificação concluída com sucesso',
    type: VerificacaoRenovacoesPendentesResponseDto,
  })
  async verificarRenovacoesPendentes(
    @Req() req: any,
  ): Promise<VerificacaoRenovacoesPendentesResponseDto> {
    const renovacoesProcessadas =
      await this.renovacaoService.verificarRenovacoesPendentes(req.user.id);
    const response: VerificacaoRenovacoesPendentesResponseDto = {
      renovacoes_processadas: renovacoesProcessadas,
    };
    return response;
  }
}
