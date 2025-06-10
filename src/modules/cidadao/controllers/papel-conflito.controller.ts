import { Controller, Post, Body, UseGuards, Get, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { RequiresPermission } from '../../../auth/decorators/requires-permission.decorator';
import { VerificacaoPapelService } from '../services/verificacao-papel.service';
import { VerificacaoPapelConflitoDto } from '../dto/verificacao-papel-conflito.dto';
import {
  VerificacaoPapelConflitoResponseDto,
  RegraConflitoDto,
} from '../dto/verificacao-papel-conflito-response.dto';

/**
 * Controller de Verificação de Papéis Conflitantes
 *
 * Responsável por expor os endpoints de verificação de papéis conflitantes
 * para cidadãos, garantindo a integridade das regras de negócio.
 */
@Controller('cidadao/papel-conflito')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class PapelConflitoController {
  constructor(
    private readonly verificacaoPapelService: VerificacaoPapelService,
  ) {}

  /**
   * Verifica se existem conflitos entre papéis para um cidadão
   * @param verificacaoDto Dados para verificação
   * @returns Resultado da verificação
   */
  @Post('verificar')
  @RequiresPermission({ permissionName: 'cidadao.verificar-papel-conflito' })
  @ApiOperation({
    summary: 'Verifica conflitos entre papéis',
    description:
      'Verifica se existem conflitos entre os papéis que um cidadão possui ou está tentando obter.',
  })
  @ApiResponse({
    status: 200,
    description: 'Verificação realizada com sucesso',
    type: VerificacaoPapelConflitoResponseDto,
  })
  async verificarConflitos(
    @Body() verificacaoDto: VerificacaoPapelConflitoDto,
  ): Promise<VerificacaoPapelConflitoResponseDto> {
    return this.verificacaoPapelService.verificarPapeisConflitantes(
      verificacaoDto.cidadao_id,
      verificacaoDto.papeis.map((p) => p.papel_id),
    );
  }

  /**
   * Obtém as regras de conflito para papéis
   * @returns Lista de regras de conflito
   */
  @Get('regras')
  @RequiresPermission({ permissionName: 'cidadao.listar-regras-conflito' })
  @ApiOperation({
    summary: 'Lista regras de conflito entre papéis',
    description:
      'Retorna a lista de regras que definem conflitos entre papéis no sistema.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de regras retornada com sucesso',
    type: [RegraConflitoDto],
  })
  async listarRegrasConflito(): Promise<RegraConflitoDto[]> {
    return this.verificacaoPapelService.listarRegrasConflito();
  }

  /**
   * Verifica papéis conflitantes para um cidadão específico
   * @param cidadaoId ID do cidadão
   * @returns Resultado da verificação
   */
  @Get('cidadao/:cidadaoId')
  @RequiresPermission({ permissionName: 'cidadao.verificar-papel-conflito' })
  @ApiOperation({
    summary: 'Verifica papéis conflitantes para um cidadão',
    description: 'Verifica se o cidadão possui papéis conflitantes atualmente.',
  })
  @ApiResponse({
    status: 200,
    description: 'Verificação realizada com sucesso',
    type: VerificacaoPapelConflitoResponseDto,
  })
  async verificarConflitosCidadao(
    @Param('cidadaoId') cidadaoId: string,
  ): Promise<VerificacaoPapelConflitoResponseDto> {
    return this.verificacaoPapelService.verificarPapeisConflitantesCidadao(
      cidadaoId,
    );
  }
}
