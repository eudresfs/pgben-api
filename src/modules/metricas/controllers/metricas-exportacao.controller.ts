import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/role.decorator';
import { ROLES } from '../../../shared/constants/roles.constants';

import { MetricasService } from '../services/metricas.service';

/**
 * Controlador para exportação de dados de métricas
 *
 * Este controlador fornece endpoints para:
 * 1. Exportar dados de uma métrica específica em formato CSV ou JSON
 * 2. Gerar relatório completo de métricas para análise externa
 */
@ApiTags('Métricas e Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('metricas/exportacao')
export class MetricasExportacaoController {
  constructor(private readonly metricasService: MetricasService) {}

  /**
   * Exporta dados de uma métrica específica em formato CSV ou JSON
   */
  @Get(':codigo')
  @Roles(ROLES.ADMIN, ROLES.GESTOR, ROLES.TECNICO)
  @ApiOperation({ summary: 'Exporta dados de uma métrica (CSV/JSON)' })
  @ApiResponse({ status: 200, description: 'Dados exportados com sucesso' })
  @ApiResponse({ status: 404, description: 'Métrica não encontrada' })
  async exportarDadosMetrica(
    @Param('codigo') codigo: string,
    @Query('dataInicio') dataInicio: Date,
    @Query('dataFim') dataFim: Date,
    @Query('formato') formato: 'csv' | 'json' = 'csv',
    @Query('incluirMetadados') incluirMetadados: boolean = false,
    @Res() res: Response,
  ) {
    // Implementação temporária até que o método seja adicionado ao serviço
    const dados = [
      {
        codigo,
        nome: `Métrica ${codigo}`,
        valor: 0,
        data_coleta: new Date(),
        unidade: 'un',
      },
    ];

    if (formato === 'json') {
      return res
        .setHeader('Content-Type', 'application/json')
        .setHeader(
          'Content-Disposition',
          `attachment; filename=${codigo}_${new Date().toISOString().split('T')[0]}.json`,
        )
        .send(JSON.stringify(dados, null, 2));
    } else {
      // Converter para CSV
      const csvData = this.converterParaCSV(dados);
      return res
        .setHeader('Content-Type', 'text/csv')
        .setHeader(
          'Content-Disposition',
          `attachment; filename=${codigo}_${new Date().toISOString().split('T')[0]}.csv`,
        )
        .send(csvData);
    }
  }

  /**
   * Gera relatório completo de métricas para análise externa
   */
  @Get('relatorio')
  @Roles(ROLES.ADMIN, ROLES.GESTOR)
  @ApiOperation({ summary: 'Gera relatório completo de métricas' })
  @ApiResponse({ status: 200, description: 'Relatório gerado com sucesso' })
  async gerarRelatorioCompleto(
    @Res() res: Response,
    @Query('formato') formato: 'csv' | 'json' | 'pdf' = 'pdf',
    @Query('categorias') categorias?: string[],
    @Query('periodo') periodo?: string,
  ) {
    // Implementação temporária até que o método seja adicionado ao serviço
    const relatorio = {
      titulo: 'Relatório Completo de Métricas',
      periodo: {
        inicio: new Date(),
        fim: new Date(),
        descricao: periodo || 'último mês',
      },
      categorias: categorias || 'todas',
      total_metricas: 0,
      data_geracao: new Date(),
      metricas: [],
    };

    let contentType = 'application/pdf';
    let filename = `relatorio_metricas_${new Date().toISOString().split('T')[0]}.pdf`;

    if (formato === 'json') {
      contentType = 'application/json';
      filename = `relatorio_metricas_${new Date().toISOString().split('T')[0]}.json`;
      return res
        .setHeader('Content-Type', contentType)
        .setHeader('Content-Disposition', `attachment; filename=${filename}`)
        .send(JSON.stringify(relatorio, null, 2));
    } else if (formato === 'csv') {
      contentType = 'text/csv';
      filename = `relatorio_metricas_${new Date().toISOString().split('T')[0]}.csv`;
      // Converter o objeto para array para poder usar o método converterParaCSV
      const relatorioArray = [relatorio];
      const csvData = this.converterParaCSV(relatorioArray);
      return res
        .setHeader('Content-Type', contentType)
        .setHeader('Content-Disposition', `attachment; filename=${filename}`)
        .send(csvData);
    } else {
      // PDF
      return res
        .setHeader('Content-Type', contentType)
        .setHeader('Content-Disposition', `attachment; filename=${filename}`)
        .send(relatorio);
    }
  }

  /**
   * Converte dados para formato CSV
   * @private
   */
  private converterParaCSV(dados: any[]): string {
    if (!dados || !dados.length) {
      return '';
    }

    // Obter cabeçalhos
    const headers = Object.keys(dados[0]);

    // Criar linha de cabeçalho
    let csv = headers.join(',') + '\n';

    // Adicionar linhas de dados
    dados.forEach((item) => {
      const values = headers.map((header) => {
        const value = item[header];
        // Tratar valores especiais
        if (value === null || value === undefined) {
          return '';
        }
        if (typeof value === 'string') {
          // Escapar aspas e envolver em aspas se contiver vírgulas
          const escaped = value.replace(/"/g, '""');
          return escaped.includes(',') ? `"${escaped}"` : escaped;
        }
        if (value instanceof Date) {
          return value.toISOString();
        }
        if (typeof value === 'object') {
          // Converter objetos para JSON e envolver em aspas
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        return value;
      });

      csv += values.join(',') + '\n';
    });

    return csv;
  }
}
