import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { IntegracaoService } from '../services/integracao.service';
import { IntegracaoUpdateDto } from '../dtos/integracao/integracao-update.dto';
import { IntegracaoTestDto } from '../dtos/integracao/integracao-test.dto';
import { IntegracaoResponseDto } from '../dtos/integracao/integracao-response.dto';
import { IntegracaoTipoEnum } from '../../../enums/integracao-tipo.enum';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { ApiErrorResponse } from '../../../shared/dtos/api-error-response.dto';
import { EntityNotFoundException } from '../../../shared/exceptions';

/**
 * Controlador responsável pelas operações de configurações de integração externa
 */
@ApiTags('Configuração')
@Controller('configuracao/integracoes')
export class IntegracaoController {
  constructor(private readonly integracaoService: IntegracaoService) {}

  /**
   * Busca todas as configurações de integração
   * @param tipo Tipo opcional para filtrar
   * @returns Lista de configurações
   */
  @Get()
  @ApiOperation({ summary: 'Buscar todas as configurações de integração' })
  @ApiResponse({
    status: 200,
    description: 'Lista de configurações encontradas',
    type: [IntegracaoResponseDto],
  })
  async buscarTodas(
    @Query('tipo') tipo?: IntegracaoTipoEnum,
  ): Promise<IntegracaoResponseDto[]> {
    return this.integracaoService.buscarTodas(tipo);
  }

  /**
   * Busca uma configuração de integração específica por seu código
   * @param codigo Código da configuração
   * @returns Configuração encontrada
   */
  @Get(':codigo')
  @ApiOperation({ summary: 'Buscar configuração de integração por código' })
  @ApiParam({
    name: 'codigo',
    description: 'Código único da configuração',
    example: 'smtp-principal',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuração encontrada',
    type: IntegracaoResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Configuração não encontrada',
  })
  async buscarPorCodigo(
    @Param('codigo') codigo: string,
  ): Promise<IntegracaoResponseDto> {
    return this.integracaoService.buscarPorCodigo(codigo);
  }

  /**
   * Cria ou atualiza uma configuração de integração
   * @param codigo Código da configuração
   * @param dto Dados para atualização
   * @returns Configuração atualizada
   */
  @Put(':codigo')
  @ApiOperation({ summary: 'Criar ou atualizar configuração de integração' })
  @ApiParam({
    name: 'codigo',
    description: 'Código único da configuração',
    example: 'smtp-principal',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuração criada/atualizada com sucesso',
    type: IntegracaoResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos',
  })
  async atualizarOuCriar(
    @Param('codigo') codigo: string,
    @Body() dto: IntegracaoUpdateDto,
  ): Promise<IntegracaoResponseDto> {
    return this.integracaoService.atualizarOuCriar(codigo, dto);
  }

  /**
   * Remove uma configuração de integração
   * @param codigo Código da configuração
   */
  @Delete(':codigo')
  @ApiOperation({ summary: 'Remover configuração de integração' })
  @ApiParam({
    name: 'codigo',
    description: 'Código único da configuração',
    example: 'smtp-principal',
  })
  @ApiResponse({
    status: 204,
    description: 'Configuração removida com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Configuração não encontrada',
  })
  async remover(@Param('codigo') codigo: string): Promise<void> {
    await this.integracaoService.remover(codigo);
  }

  /**
   * Testa uma configuração de integração
   * @param dto Dados para teste da configuração
   * @returns Resultado do teste
   */
  @Post('testar')
  @ApiOperation({ summary: 'Testar configuração de integração' })
  @ApiResponse({
    status: 200,
    description: 'Teste executado com sucesso',
    schema: {
      type: 'object',
      properties: {
        sucesso: {
          type: 'boolean',
          description: 'Indica se o teste foi bem-sucedido',
        },
        mensagem: {
          type: 'string',
          description: 'Mensagem detalhada do resultado do teste',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou erro no teste',
  })
  async testar(
    @Body() dto: IntegracaoTestDto,
  ): Promise<{ sucesso: boolean; mensagem: string }> {
    return this.integracaoService.testar(dto);
  }

  /**
   * Ativa ou desativa uma configuração de integração
   * @param codigo Código da configuração
   * @param ativo Status de ativação
   * @returns Configuração atualizada
   */
  @Put(':codigo/status')
  @ApiOperation({ summary: 'Ativar ou desativar configuração de integração' })
  @ApiParam({
    name: 'codigo',
    description: 'Código único da configuração',
    example: 'smtp-principal',
  })
  @ApiResponse({
    status: 200,
    description: 'Status da configuração atualizado com sucesso',
    type: IntegracaoResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Configuração não encontrada',
  })
  async alterarStatus(
    @Param('codigo') codigo: string,
    @Body() { ativo }: { ativo: boolean },
  ): Promise<IntegracaoResponseDto> {
    return this.integracaoService.alterarStatus(codigo, ativo);
  }

  /**
   * Busca a configuração ativa para um determinado tipo de integração
   * @param tipo Tipo da integração
   * @returns Configuração ativa ou null
   */
  @Get('ativa/:tipo')
  @ApiOperation({ summary: 'Buscar configuração ativa por tipo' })
  @ApiParam({
    name: 'tipo',
    description: 'Tipo de integração',
    enum: IntegracaoTipoEnum,
  })
  @ApiResponse({
    status: 200,
    description: 'Configuração ativa encontrada',
    type: IntegracaoResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Nenhuma configuração ativa encontrada',
  })
  async buscarConfigAtiva(
    @Param('tipo') tipo: IntegracaoTipoEnum,
  ): Promise<IntegracaoResponseDto> {
    const config = await this.integracaoService.buscarConfigAtiva(tipo);
    if (!config) {
      throw new EntityNotFoundException(
        'Configuração de integração',
        tipo,
        'tipo',
      );
    }
    return config;
  }
}
