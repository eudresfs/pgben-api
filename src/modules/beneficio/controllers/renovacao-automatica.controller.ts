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
import { RenovacaoAutomaticaService } from '../services/renovacao-automatica.service';
import { ConfiguracaoRenovacao } from '../entities/configuracao-renovacao.entity';
import { CreateConfiguracaoRenovacaoDto } from '../dto/create-configuracao-renovacao.dto';
import { UpdateConfiguracaoRenovacaoDto } from '../dto/update-configuracao-renovacao.dto';
import { Solicitacao } from '../../solicitacao/entities/solicitacao.entity';
import { VerificacaoRenovacaoResponseDto } from '../dto/verificacao-renovacao-response.dto';
import { VerificacaoRenovacoesPendentesResponseDto } from '../dto/verificacao-renovacoes-pendentes-response.dto';
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
@ApiTags('Benefícios')
@Controller('v1/beneficio/renovacao-automatica')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class RenovacaoAutomaticaController {
  constructor(private readonly renovacaoService: RenovacaoAutomaticaService) {}

  /**
   * Cria uma nova configuração de renovação automática
   * @param createConfiguracaoDto Dados da configuração
   * @param req Requisição
   * @returns Configuração criada
   */
  @Post('configuracao')
  @RequiresPermission(
    { permissionName: '*.*' },
    { permissionName: 'beneficio.configuracao.criar' }
  )
  @ApiOperation({
    summary: 'Cria uma nova configuração de renovação automática',
    description: 'Cria uma configuração de renovação automática para um tipo de benefício.',
  })
  @ApiResponse({
    status: 201,
    description: 'Configuração criada com sucesso',
    type: ConfiguracaoRenovacao,
  })
  async create(
    @Body() createConfiguracaoDto: CreateConfiguracaoRenovacaoDto,
    @Req() req: any,
  ): Promise<ConfiguracaoRenovacao> {
    return this.renovacaoService.create(createConfiguracaoDto, req.user.id);
  }

  /**
   * Busca todas as configurações de renovação
   * @returns Lista de configurações
   */
  @Get('configuracao')
  @RequiresPermission(
    { permissionName: '*.*' },
    { permissionName: 'beneficio.configuracao.listar' }
  )
  @ApiOperation({
    summary: 'Busca todas as configurações de renovação',
    description: 'Retorna a lista de todas as configurações de renovação automática.',
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
  @RequiresPermission(
    { permissionName: '*.*' },
    { permissionName: 'beneficio.configuracao.visualizar' }
  )
  @ApiOperation({
    summary: 'Busca uma configuração de renovação pelo ID',
    description: 'Retorna os detalhes de uma configuração de renovação específica.',
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
  @RequiresPermission(
    { permissionName: '*.*' },
    { permissionName: 'beneficio.configuracao.visualizar' }
  )
  @ApiOperation({
    summary: 'Busca uma configuração de renovação pelo tipo de benefício',
    description: 'Retorna a configuração de renovação para um tipo de benefício específico.',
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
  @RequiresPermission(
    { permissionName: '*.*' },
    { permissionName: 'beneficio.configuracao.atualizar' }
  )
  @ApiOperation({
    summary: 'Atualiza uma configuração de renovação',
    description: 'Atualiza os dados de uma configuração de renovação existente.',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuração atualizada com sucesso',
    type: ConfiguracaoRenovacao,
  })
  async update(
    @Param('id') id: string,
    @Body() updateConfiguracaoDto: UpdateConfiguracaoRenovacaoDto,
  ): Promise<ConfiguracaoRenovacao> {
    return this.renovacaoService.update(id, updateConfiguracaoDto);
  }

  /**
   * Remove uma configuração de renovação
   * @param id ID da configuração
   * @returns void
   */
  @Delete('configuracao/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequiresPermission(
    { permissionName: '*.*' },
    { permissionName: 'beneficio.configuracao.remover' }
  )
  @ApiOperation({
    summary: 'Remove uma configuração de renovação',
    description: 'Remove permanentemente uma configuração de renovação.',
  })
  @ApiResponse({
    status: 204,
    description: 'Configuração removida com sucesso',
  })
  async remove(@Param('id') id: string): Promise<void> {
    return this.renovacaoService.remove(id);
  }

  /**
   * Ativa ou desativa uma configuração de renovação
   * @param id ID da configuração
   * @param body Corpo da requisição
   * @returns Configuração atualizada
   */
  @Patch('configuracao/:id/ativar')
  @RequiresPermission(
    { permissionName: '*.*' },
    { permissionName: 'beneficio.configuracao.atualizar' }
  )
  @ApiOperation({
    summary: 'Ativa ou desativa uma configuração de renovação',
    description: 'Altera o status de ativação de uma configuração de renovação.',
  })
  @ApiResponse({
    status: 200,
    description: 'Status de ativação atualizado com sucesso',
    type: ConfiguracaoRenovacao,
  })
  async toggleAtivo(
    @Param('id') id: string,
    @Body() body: { ativo: boolean },
  ): Promise<ConfiguracaoRenovacao> {
    return this.renovacaoService.toggleAtivo(id, body.ativo);
  }

  /**
   * Verifica a configuração de renovação automática de uma solicitação
   * @param solicitacaoId ID da solicitação
   * @returns Informações sobre a configuração de renovação da solicitação
   */
  @Get('solicitacao/:solicitacaoId/verificar')
  @RequiresPermission(
    { permissionName: '*.*' },
    { 
      permissionName: 'solicitacao.visualizar',
      scopeType: ScopeType.UNIT,
      scopeIdExpression: 'solicitacao.unidadeId'
    }
  )
  @ApiOperation({
    summary: 'Verifica a configuração de renovação automática de uma solicitação',
    description: 'Retorna informações sobre a configuração de renovação automática de uma solicitação específica.',
  })
  @ApiResponse({
    status: 200,
    description: 'Informações sobre renovação automática retornadas com sucesso',
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
  @RequiresPermission(
    { permissionName: '*.*' },
    { 
      permissionName: 'solicitacao.configurar-renovacao',
      scopeType: ScopeType.UNIT,
      scopeIdExpression: 'solicitacao.unidadeId'
    }
  )
  @ApiOperation({
    summary: 'Configura a renovação automática para uma solicitação',
    description: 'Ativa ou desativa a renovação automática para uma solicitação específica.',
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
  @RequiresPermission(
    { permissionName: '*.*' },
    { permissionName: 'beneficio.renovacao.verificar' }
  )
  @ApiOperation({
    summary: 'Verifica e processa manualmente as renovações pendentes',
    description: 'Executa manualmente o processo de verificação e renovação automática.',
  })
  @ApiResponse({
    status: 200,
    description: 'Verificação concluída com sucesso',
    type: VerificacaoRenovacoesPendentesResponseDto,
  })
  async verificarRenovacoesPendentes(@Req() req: any): Promise<VerificacaoRenovacoesPendentesResponseDto> {
    const renovacoesProcessadas = await this.renovacaoService.verificarRenovacoesPendentes(req.user.id);
    const response: VerificacaoRenovacoesPendentesResponseDto = {
      renovacoes_processadas: renovacoesProcessadas
    };
    return response;
  }
}
