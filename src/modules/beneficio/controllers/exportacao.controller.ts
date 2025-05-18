import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { ExportacaoService } from '../services/exportacao.service';

/**
 * Controlador de Exportação de Dados
 *
 * Responsável por fornecer endpoints para exportação de dados de solicitações
 * de benefícios em diferentes formatos.
 */
@ApiTags('Benefícios')
@Controller('v1/beneficio/exportacao')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ExportacaoController {
  constructor(private readonly exportacaoService: ExportacaoService) {}

  /**
   * Exporta solicitações de benefício em formato CSV
   */
  @Get('csv')
  @ApiOperation({ summary: 'Exportar solicitações de benefício em CSV' })
  @ApiResponse({ status: 200, description: 'CSV gerado com sucesso' })
  @ApiResponse({ status: 500, description: 'Erro ao gerar CSV' })
  @ApiQuery({ name: 'cidadao_id', required: false, type: String })
  @ApiQuery({ name: 'tipo_beneficio_id', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'data_inicio', required: false, type: String })
  @ApiQuery({ name: 'data_fim', required: false, type: String })
  async exportarCSV(@Query() filtros: any, @Res() res: Response) {
    const csv = await this.exportacaoService.exportarSolicitacoesCSV(filtros);

    // Configurar cabeçalhos para download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=solicitacoes.csv',
    );

    // Enviar CSV como resposta
    return res.send(csv);
  }
}
