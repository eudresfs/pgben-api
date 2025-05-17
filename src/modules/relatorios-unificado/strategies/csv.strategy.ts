import { Injectable, Logger } from '@nestjs/common';
import { RelatorioStrategy } from '../interfaces/relatorio-strategy.interface';
import { createObjectCsvWriter } from 'csv-writer';
import * as fs from 'fs';
import { TempFilesService } from '../services/temp-files.service';

/**
 * Estratégia de geração de relatórios em formato CSV
 *
 * Implementa a geração de relatórios em formato CSV usando csv-writer
 */
@Injectable()
export class CsvStrategy implements RelatorioStrategy {
  private readonly logger = new Logger(CsvStrategy.name);

  constructor(private readonly tempFilesService: TempFilesService) {}

  /**
   * Gera um relatório em formato CSV
   * @param tipo Tipo de relatório
   * @param dados Dados do relatório
   * @param opcoes Opções de configuração
   * @returns Buffer contendo o CSV gerado
   */
  async gerar(tipo: string, dados: any, opcoes: any): Promise<Buffer> {
    this.logger.log(`Gerando relatório CSV do tipo: ${tipo}`);

    // Criar arquivo temporário
    const tempFilePath = this.tempFilesService.getTempFilePath(
      'relatorio-csv',
      'csv',
    );

    try {
      // Adicionar conteúdo específico conforme o tipo de relatório
      switch (tipo) {
        case 'beneficios-concedidos':
          return await this.gerarBeneficiosConcedidos(
            tempFilePath,
            dados,
            opcoes,
          );
        case 'solicitacoes-por-status':
          return await this.gerarSolicitacoesPorStatus(
            tempFilePath,
            dados,
            opcoes,
          );
        case 'atendimentos-por-unidade':
          return await this.gerarAtendimentosPorUnidade(
            tempFilePath,
            dados,
            opcoes,
          );
        default:
          throw new Error(`Tipo de relatório não implementado: ${tipo}`);
      }
    } catch (error) {
      this.logger.error(`Erro ao gerar relatório CSV: ${error.message}`);

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
   * Retorna o tipo MIME para arquivos CSV
   */
  getMimeType(): string {
    return 'text/csv';
  }

  /**
   * Retorna a extensão para arquivos CSV
   */
  getExtensao(): string {
    return 'csv';
  }

  /**
   * Gera conteúdo para relatório de benefícios concedidos
   * @param tempFilePath Caminho do arquivo temporário
   * @param dados Dados para o relatório
   * @param opcoes Opções de configuração
   * @returns Buffer com o conteúdo do arquivo CSV
   */
  private async gerarBeneficiosConcedidos(
    tempFilePath: string,
    solicitacoes: any[],
    opcoes: any,
  ): Promise<Buffer> {
    const csvWriter = createObjectCsvWriter({
      path: tempFilePath,
      header: [
        { id: 'protocolo', title: 'Protocolo' },
        { id: 'beneficiario', title: 'Beneficiário' },
        { id: 'beneficio', title: 'Benefício' },
        { id: 'unidade', title: 'Unidade' },
        { id: 'data_liberacao', title: 'Data Liberação' },
        { id: 'valor', title: 'Valor' },
      ],
    });

    const records = solicitacoes.map((solicitacao) => ({
      protocolo: solicitacao.protocolo || '',
      beneficiario: solicitacao.beneficiario?.nome || 'N/A',
      beneficio: solicitacao.tipo_beneficio?.nome || 'N/A',
      unidade: solicitacao.unidade?.nome || 'N/A',
      data_liberacao: solicitacao.data_liberacao
        ? new Date(solicitacao.data_liberacao).toLocaleDateString('pt-BR')
        : 'N/A',
      valor: solicitacao.tipo_beneficio?.valor || 0,
    }));

    await csvWriter.writeRecords(records);
    return this.tempFilesService.readAndRemove(tempFilePath);
  }

  /**
   * Gera conteúdo para relatório de solicitações por status
   * @param tempFilePath Caminho do arquivo temporário
   * @param dados Dados para o relatório
   * @param opcoes Opções de configuração
   * @returns Buffer com o conteúdo do arquivo CSV
   */
  private async gerarSolicitacoesPorStatus(
    tempFilePath: string,
    agrupadas: any,
    opcoes: any,
  ): Promise<Buffer> {
    const csvWriter = createObjectCsvWriter({
      path: tempFilePath,
      header: [
        { id: 'status', title: 'Status' },
        { id: 'protocolo', title: 'Protocolo' },
        { id: 'beneficiario', title: 'Beneficiário' },
        { id: 'beneficio', title: 'Benefício' },
        { id: 'unidade', title: 'Unidade' },
        { id: 'data_abertura', title: 'Data de Abertura' },
      ],
    });

    // Definir interface para os registros do CSV
    interface RegistroCSV {
      status: string;
      protocolo: string;
      beneficiario: string;
      beneficio: string;
      unidade: string;
      data_abertura: string;
    }

    const records: RegistroCSV[] = [];
    Object.keys(agrupadas).forEach((status) => {
      agrupadas[status].forEach((solicitacao) => {
        records.push({
          status,
          protocolo: solicitacao.protocolo || '',
          beneficiario: solicitacao.beneficiario?.nome || 'N/A',
          beneficio: solicitacao.tipo_beneficio?.nome || 'N/A',
          unidade: solicitacao.unidade?.nome || 'N/A',
          data_abertura: solicitacao.data_abertura
            ? new Date(solicitacao.data_abertura).toLocaleDateString('pt-BR')
            : 'N/A',
        });
      });
    });

    await csvWriter.writeRecords(records);
    return this.tempFilesService.readAndRemove(tempFilePath);
  }

  /**
   * Gera conteúdo para relatório de atendimentos por unidade
   * @param tempFilePath Caminho do arquivo temporário
   * @param dados Dados para o relatório
   * @param opcoes Opções de configuração
   * @returns Buffer com o conteúdo do arquivo CSV
   */
  private async gerarAtendimentosPorUnidade(
    tempFilePath: string,
    resultado: any[],
    opcoes: any,
  ): Promise<Buffer> {
    const csvWriter = createObjectCsvWriter({
      path: tempFilePath,
      header: [
        { id: 'unidade', title: 'Unidade' },
        { id: 'total', title: 'Total de Solicitações' },
        { id: 'liberadas', title: 'Solicitações Liberadas' },
        { id: 'pendentes', title: 'Solicitações Pendentes' },
        { id: 'taxa_aprovacao', title: 'Taxa de Aprovação (%)' },
      ],
    });

    const records = resultado.map((item) => {
      const taxaAprovacao =
        item.totalSolicitacoes > 0
          ? (
              (item.solicitacoesLiberadas / item.totalSolicitacoes) *
              100
            ).toFixed(2)
          : '0.00';

      return {
        unidade: item.unidade.nome || 'N/A',
        total: item.totalSolicitacoes,
        liberadas: item.solicitacoesLiberadas,
        pendentes: item.solicitacoesPendentes,
        taxa_aprovacao: taxaAprovacao,
      };
    });

    await csvWriter.writeRecords(records);
    return this.tempFilesService.readAndRemove(tempFilePath);
  }
}
