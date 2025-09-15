import { Injectable, Logger } from '@nestjs/common';
import { RelatorioStrategy } from '../interfaces/relatorio-strategy.interface';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import { TempFilesService } from '../services/temp-files.service';

/**
 * Estratégia de geração de relatórios em formato Excel
 *
 * Implementa a geração de relatórios em formato Excel usando ExcelJS
 */
@Injectable()
export class ExcelStrategy implements RelatorioStrategy {
  private readonly logger = new Logger(ExcelStrategy.name);

  constructor(private readonly tempFilesService: TempFilesService) {}

  /**
   * Gera um relatório em formato Excel
   * @param tipo Tipo de relatório
   * @param dados Dados do relatório
   * @param opcoes Opções de configuração
   * @returns Buffer contendo o Excel gerado
   */
  async gerar(tipo: string, dados: any, opcoes: any): Promise<Buffer> {
    this.logger.log(`Gerando relatório Excel do tipo: ${tipo}`);

    // Criar arquivo temporário
    const tempFilePath = this.tempFilesService.getTempFilePath(
      'relatorio-excel',
      'xlsx',
    );

    try {
      // Criar workbook e planilha
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(this.getTitulo(tipo));

      // Adicionar título
      worksheet.mergeCells('A1:E1');
      const tituloCell = worksheet.getCell('A1');
      tituloCell.value = this.getTitulo(tipo);
      tituloCell.font = { size: 16, bold: true };
      tituloCell.alignment = { horizontal: 'center' };

      // Adicionar período
      if (opcoes.dataInicio && opcoes.dataFim) {
        const dataInicio = new Date(opcoes.dataInicio).toLocaleDateString(
          'pt-BR',
        );
        const dataFim = new Date(opcoes.dataFim).toLocaleDateString('pt-BR');

        worksheet.mergeCells('A2:E2');
        const periodoCell = worksheet.getCell('A2');
        periodoCell.value = `Período: ${dataInicio} a ${dataFim}`;
        periodoCell.font = { size: 12 };
        periodoCell.alignment = { horizontal: 'center' };
      }

      // Adicionar data de geração
      worksheet.mergeCells('A3:E3');
      const dataGeracaoCell = worksheet.getCell('A3');
      dataGeracaoCell.value = `Gerado em: ${new Date().toLocaleString('pt-BR')}`;
      dataGeracaoCell.font = { size: 10 };
      dataGeracaoCell.alignment = { horizontal: 'right' };

      // Adicionar linha em branco
      worksheet.addRow([]);

      // Adicionar conteúdo específico conforme o tipo de relatório
      switch (tipo) {
        case 'beneficios-concedidos':
          await this.gerarBeneficiosConcedidos(worksheet, dados, opcoes);
          break;
        case 'solicitacoes-por-status':
          await this.gerarSolicitacoesPorStatus(worksheet, dados, opcoes);
          break;
        case 'atendimentos-por-unidade':
          await this.gerarAtendimentosPorUnidade(worksheet, dados, opcoes);
          break;
        default:
          worksheet.addRow(['Tipo de relatório não implementado']);
      }

      // Auto-ajustar colunas
      if (worksheet.columns) {
        worksheet.columns.forEach((column) => {
          if (column && typeof column.eachCell === 'function') {
            let maxColumnLength = 0;
            column.eachCell({ includeEmpty: true }, (cell) => {
              const columnLength = cell.value
                ? cell.value.toString().length
                : 10;
              if (columnLength > maxColumnLength) {
                maxColumnLength = columnLength;
              }
            });
            column.width = maxColumnLength < 10 ? 10 : maxColumnLength + 2;
          }
        });
      }

      // Salvar arquivo
      await workbook.xlsx.writeFile(tempFilePath);

      // Retornar buffer e remover arquivo temporário
      return this.tempFilesService.readAndRemove(tempFilePath);
    } catch (error) {
      this.logger.error(`Erro ao gerar relatório Excel: ${error.message}`);

      // Tentar limpar arquivo temporário em caso de erro
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (cleanupError) {
        this.logger.warn(
          `Erro ao limpar arquivo temporário: ${cleanupError.message}`,
        );
      }

      throw error;
    }
  }

  /**
   * Retorna o tipo MIME para arquivos Excel
   */
  getMimeType(): string {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }

  /**
   * Retorna a extensão para arquivos Excel
   */
  getExtensao(): string {
    return 'xlsx';
  }

  /**
   * Retorna o título do relatório com base no tipo
   * @param tipo Tipo de relatório
   * @returns Título formatado
   */
  private getTitulo(tipo: string): string {
    switch (tipo) {
      case 'beneficios-concedidos':
        return 'Relatório de Benefícios Concedidos';
      case 'solicitacoes-por-status':
        return 'Relatório de Solicitações por Status';
      case 'atendimentos-por-unidade':
        return 'Relatório de Atendimentos por Unidade';
      default:
        return 'Relatório';
    }
  }

  /**
   * Gera conteúdo para relatório de benefícios concedidos
   * @param worksheet Planilha Excel
   * @param dados Dados para o relatório
   * @param opcoes Opções de configuração
   */
  private async gerarBeneficiosConcedidos(
    worksheet: ExcelJS.Worksheet,
    dados: any[],
    opcoes: any,
  ): Promise<void> {
    // Adicionar cabeçalho da tabela
    const cabecalho = [
      'Protocolo',
      'Beneficiário',
      'Benefício',
      'Unidade',
      'Data Liberação',
      'Valor',
    ];
    const headerRow = worksheet.addRow(cabecalho);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9D9D9' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Adicionar dados
    dados.forEach((solicitacao) => {
      const row = worksheet.addRow([
        solicitacao.protocolo || '',
        solicitacao.beneficiario?.nome || 'N/A',
        solicitacao.tipo_beneficio?.nome || 'N/A',
        solicitacao.unidade?.nome || 'N/A',
        solicitacao.data_liberacao
          ? new Date(solicitacao.data_liberacao).toLocaleDateString('pt-BR')
          : 'N/A',
        solicitacao.tipo_beneficio?.valor || 0,
      ]);

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Adicionar linha em branco
    worksheet.addRow([]);

    // Adicionar resumo
    const resumoRow = worksheet.addRow([
      'Total de benefícios concedidos:',
      dados.length,
    ]);
    resumoRow.getCell(1).font = { bold: true };

    // Calcular valor total
    const valorTotal = dados.reduce(
      (total, item) => total + (item.tipo_beneficio?.valor || 0),
      0,
    );
    const valorRow = worksheet.addRow([
      'Valor total:',
      valorTotal.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }),
    ]);
    valorRow.getCell(1).font = { bold: true };
  }

  /**
   * Gera conteúdo para relatório de solicitações por status
   * @param worksheet Planilha Excel
   * @param dados Dados para o relatório
   * @param opcoes Opções de configuração
   */
  private async gerarSolicitacoesPorStatus(
    worksheet: ExcelJS.Worksheet,
    dados: any,
    opcoes: any,
  ): Promise<void> {
    const statusList = Object.keys(dados);

    // Adicionar resumo geral
    worksheet.mergeCells('A5:C5');
    const resumoCell = worksheet.getCell('A5');
    resumoCell.value = 'Resumo por Status';
    resumoCell.font = { size: 14, bold: true };

    let row = 6;
    let totalGeral = 0;

    statusList.forEach((status, index) => {
      const quantidade = dados[status].length;
      totalGeral += quantidade;

      const statusRow = worksheet.getRow(row + index);
      statusRow.getCell(1).value = status;
      statusRow.getCell(2).value = quantidade;
      statusRow.getCell(3).value = 'solicitações';
    });

    row += statusList.length + 1;
    const totalRow = worksheet.getRow(row);
    totalRow.getCell(1).value = 'Total Geral';
    totalRow.getCell(2).value = totalGeral;
    totalRow.getCell(3).value = 'solicitações';
    totalRow.getCell(1).font = { bold: true };
    totalRow.getCell(2).font = { bold: true };

    // Adicionar detalhamento por status em novas planilhas
    if (worksheet.workbook) {
      statusList.forEach((status) => {
        this.criarPlanilhaStatus(worksheet.workbook, status, dados[status]);
      });
    }
  }

  /**
   * Cria uma nova planilha para um status específico
   * @param workbook Workbook Excel
   * @param status Nome do status
   * @param solicitacoes Lista de solicitações com este status
   */
  private criarPlanilhaStatus(
    workbook: ExcelJS.Workbook,
    status: string,
    solicitacoes: any[],
  ): ExcelJS.Worksheet {
    const statusWorksheet = workbook.addWorksheet(`Status - ${status}`);

    // Adicionar título
    statusWorksheet.mergeCells('A1:E1');
    const tituloCell = statusWorksheet.getCell('A1');
    tituloCell.value = `Solicitações com Status: ${status}`;
    tituloCell.font = { size: 16, bold: true };
    tituloCell.alignment = { horizontal: 'center' };

    // Adicionar data de geração
    statusWorksheet.mergeCells('A2:E2');
    const dataGeracaoCell = statusWorksheet.getCell('A2');
    dataGeracaoCell.value = `Gerado em: ${new Date().toLocaleString('pt-BR')}`;
    dataGeracaoCell.font = { size: 10 };
    dataGeracaoCell.alignment = { horizontal: 'right' };

    // Adicionar linha em branco
    statusWorksheet.addRow([]);

    // Adicionar cabeçalho da tabela
    const cabecalho = [
      'Protocolo',
      'Beneficiário',
      'Benefício',
      'Unidade',
      'Data Abertura',
    ];
    const headerRow = statusWorksheet.addRow(cabecalho);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9D9D9' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Adicionar dados
    solicitacoes.forEach((solicitacao) => {
      const row = statusWorksheet.addRow([
        solicitacao.protocolo || '',
        solicitacao.beneficiario?.nome || 'N/A',
        solicitacao.tipo_beneficio?.nome || 'N/A',
        solicitacao.unidade?.nome || 'N/A',
        solicitacao.data_abertura
          ? new Date(solicitacao.data_abertura).toLocaleDateString('pt-BR')
          : 'N/A',
      ]);

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Auto-ajustar colunas
    if (statusWorksheet.columns) {
      statusWorksheet.columns.forEach((column) => {
        if (column && typeof column.eachCell === 'function') {
          let maxColumnLength = 0;
          column.eachCell({ includeEmpty: true }, (cell) => {
            const columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxColumnLength) {
              maxColumnLength = columnLength;
            }
          });
          column.width = maxColumnLength < 10 ? 10 : maxColumnLength + 2;
        }
      });
    }

    return statusWorksheet;
  }

  /**
   * Gera conteúdo para relatório de atendimentos por unidade
   * @param worksheet Planilha Excel
   * @param dados Dados para o relatório
   * @param opcoes Opções de configuração
   */
  private async gerarAtendimentosPorUnidade(
    worksheet: ExcelJS.Worksheet,
    dados: any[],
    opcoes: any,
  ): Promise<void> {
    // Adicionar cabeçalho da tabela
    const cabecalho = [
      'Unidade',
      'Total Solicitações',
      'Liberadas',
      'Pendentes',
      'Taxa Aprovação',
    ];
    const headerRow = worksheet.addRow(cabecalho);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9D9D9' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Adicionar dados
    dados.forEach((item) => {
      const taxaAprovacao =
        item.totalSolicitacoes > 0
          ? (
              (item.solicitacoesLiberadas / item.totalSolicitacoes) *
              100
            ).toFixed(2)
          : '0.00';

      const row = worksheet.addRow([
        item.unidade.nome || 'N/A',
        item.totalSolicitacoes,
        item.solicitacoesLiberadas,
        item.solicitacoesPendentes,
        `${taxaAprovacao}%`,
      ]);

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Adicionar linha em branco
    worksheet.addRow([]);

    // Adicionar totais
    const totais = dados.reduce(
      (acc, item) => {
        acc.total += item.totalSolicitacoes;
        acc.liberadas += item.solicitacoesLiberadas;
        acc.pendentes += item.solicitacoesPendentes;
        return acc;
      },
      { total: 0, liberadas: 0, pendentes: 0 },
    );

    const taxaGeral =
      totais.total > 0
        ? ((totais.liberadas / totais.total) * 100).toFixed(2)
        : '0.00';

    const totalRow = worksheet.addRow([
      'Total Geral',
      totais.total,
      totais.liberadas,
      totais.pendentes,
      `${taxaGeral}%`,
    ]);
    totalRow.eachCell((cell) => {
      cell.font = { bold: true };
    });
  }
}
