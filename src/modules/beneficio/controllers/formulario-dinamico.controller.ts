import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DadosDinamicosService } from '../services/dados-dinamicos.service';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';

/**
 * Controlador de formulários dinâmicos para benefícios
 *
 * Responsável por fornecer a estrutura de formulários dinâmicos
 * específicos para cada tipo de benefício.
 */
@ApiTags('formularios-dinamicos-beneficio')
@Controller('v1/beneficio/:tipoBeneficioId/formulario')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FormularioDinamicoController {
  constructor(private readonly dadosDinamicosService: DadosDinamicosService) {}

  /**
   * Obtém a estrutura do formulário dinâmico para um tipo de benefício
   */
  @Get()
  @ApiOperation({ summary: 'Obter estrutura de formulário dinâmico' })
  @ApiResponse({
    status: 200,
    description: 'Estrutura de formulário retornada com sucesso',
  })
  @ApiResponse({ status: 404, description: 'Tipo de benefício não encontrado' })
  async getFormularioDinamico(
    @Param('tipoBeneficioId') tipoBeneficioId: string,
  ) {
    return this.dadosDinamicosService.gerarFormularioDinamico(tipoBeneficioId);
  }
}
