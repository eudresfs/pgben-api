import { Injectable, Logger } from '@nestjs/common';
import { RelatorioStrategy } from '../interfaces/relatorio-strategy.interface';
import PDFDocument from 'pdfkit';
import * as PDFKit from 'pdfkit';
import * as fs from 'fs';
import { TempFilesService } from '../services/temp-files.service';

/**
 * Estratégia de geração de relatórios em formato PDF
 *
 * Implementa a geração de relatórios em formato PDF usando PDFKit
 */
@Injectable()
export class PdfStrategy implements RelatorioStrategy {
  private readonly logger = new Logger(PdfStrategy.name);

  constructor(private readonly tempFilesService: TempFilesService) {}

  /**
   * Gera um relatório em formato PDF
   * @param tipo Tipo de relatório
   * @param dados Dados do relatório
   * @param opcoes Opções de configuração
   * @returns Buffer contendo o PDF gerado
   */
  async gerar(tipo: string, dados: any, opcoes: any): Promise<Buffer> {
    this.logger.log(`Gerando relatório PDF do tipo: ${tipo}`);

    // Criar arquivo temporário
    const tempFilePath = this.tempFilesService.getTempFilePath(
      'relatorio-pdf',
      'pdf',
    );

    try {
      // Criar documento PDF
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
      });

      // Conectar stream do PDF ao arquivo temporário
      const stream = fs.createWriteStream(tempFilePath);
      doc.pipe(stream);

      // Adicionar título
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text(this.getTitulo(tipo), { align: 'center' });
      doc.moveDown();

      // Adicionar período
      if (opcoes.dataInicio && opcoes.dataFim) {
        const dataInicio = new Date(opcoes.dataInicio).toLocaleDateString(
          'pt-BR',
        );
        const dataFim = new Date(opcoes.dataFim).toLocaleDateString('pt-BR');
        doc
          .fontSize(12)
          .font('Helvetica')
          .text(`Período: ${dataInicio} a ${dataFim}`, { align: 'center' });
        doc.moveDown(2);
      }

      // Adicionar conteúdo específico conforme o tipo de relatório
      switch (tipo) {
        case 'beneficios-concedidos':
          await this.gerarBeneficiosConcedidos(doc, dados, opcoes);
          break;
        case 'solicitacoes-por-status':
          await this.gerarSolicitacoesPorStatus(doc, dados, opcoes);
          break;
        case 'atendimentos-por-unidade':
          await this.gerarAtendimentosPorUnidade(doc, dados, opcoes);
          break;
        default:
          doc
            .fontSize(12)
            .font('Helvetica')
            .text('Tipo de relatório não implementado');
      }

      // Adicionar rodapé com data de geração
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc
          .fontSize(8)
          .font('Helvetica')
          .text(
            `Gerado em: ${new Date().toLocaleString('pt-BR')} - Página ${i + 1} de ${pageCount}`,
            50,
            doc.page.height - 50,
            { align: 'center' },
          );
      }

      // Finalizar documento
      doc.end();

      // Aguardar finalização da gravação
      return new Promise((resolve, reject) => {
        stream.on('finish', () => {
          try {
            const buffer = this.tempFilesService.readAndRemove(tempFilePath);
            resolve(buffer);
          } catch (error) {
            reject(error);
          }
        });

        stream.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error) {
      this.logger.error(`Erro ao gerar relatório PDF: ${error.message}`);

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
   * Retorna o tipo MIME para arquivos PDF
   */
  getMimeType(): string {
    return 'application/pdf';
  }

  /**
   * Retorna a extensão para arquivos PDF
   */
  getExtensao(): string {
    return 'pdf';
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
   * @param doc Documento PDF
   * @param dados Dados para o relatório
   * @param opcoes Opções de configuração
   */
  private async gerarBeneficiosConcedidos(
    doc: PDFKit.PDFDocument,
    dados: any[],
    opcoes: any,
  ): Promise<void> {
    // Adicionar cabeçalho da tabela
    this.desenharCabecalhoTabela(doc, [
      'Protocolo',
      'Beneficiário',
      'Benefício',
      'Unidade',
      'Data Liberação',
    ]);

    // Adicionar linhas da tabela
    let alturaLinha = 160;
    const alturaMaxima = doc.page.height - 100;

    for (const solicitacao of dados) {
      // Verificar se precisa adicionar nova página
      if (alturaLinha > alturaMaxima) {
        doc.addPage();
        alturaLinha = 100;
        this.desenharCabecalhoTabela(doc, [
          'Protocolo',
          'Beneficiário',
          'Benefício',
          'Unidade',
          'Data Liberação',
        ]);
      }

      // Desenhar linha
      doc
        .font('Helvetica')
        .fontSize(10)
        .text(solicitacao.protocolo || '', 50, alturaLinha, { width: 80 })
        .text(solicitacao.beneficiario?.nome || 'N/A', 130, alturaLinha, {
          width: 150,
        })
        .text(solicitacao.tipo_beneficio?.nome || 'N/A', 280, alturaLinha, {
          width: 100,
        })
        .text(solicitacao.unidade?.nome || 'N/A', 380, alturaLinha, {
          width: 100,
        })
        .text(
          solicitacao.data_liberacao
            ? new Date(solicitacao.data_liberacao).toLocaleDateString('pt-BR')
            : 'N/A',
          480,
          alturaLinha,
        );

      alturaLinha += 20;
    }

    // Adicionar resumo
    doc.moveDown(2);
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .text(`Total de benefícios concedidos: ${dados.length}`);
  }

  /**
   * Gera conteúdo para relatório de solicitações por status
   * @param doc Documento PDF
   * @param dados Dados para o relatório
   * @param opcoes Opções de configuração
   */
  private async gerarSolicitacoesPorStatus(
    doc: PDFKit.PDFDocument,
    dados: any,
    opcoes: any,
  ): Promise<void> {
    const statusList = Object.keys(dados);

    // Adicionar resumo
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('Resumo por Status:', { underline: true });
    doc.moveDown();

    let totalGeral = 0;
    for (const status of statusList) {
      const quantidade = dados[status].length;
      totalGeral += quantidade;
      doc
        .font('Helvetica')
        .fontSize(10)
        .text(`${status}: ${quantidade} solicitações`);
    }

    doc.moveDown();
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(`Total Geral: ${totalGeral} solicitações`);
    doc.moveDown(2);

    // Adicionar detalhamento por status
    for (const status of statusList) {
      doc.addPage();
      doc
        .font('Helvetica-Bold')
        .fontSize(14)
        .text(`Solicitações com Status: ${status}`, { align: 'center' });
      doc.moveDown();

      // Adicionar cabeçalho da tabela
      this.desenharCabecalhoTabela(doc, [
        'Protocolo',
        'Beneficiário',
        'Benefício',
        'Unidade',
        'Data Abertura',
      ]);

      // Adicionar linhas da tabela
      let alturaLinha = 160;
      const alturaMaxima = doc.page.height - 100;

      for (const solicitacao of dados[status]) {
        // Verificar se precisa adicionar nova página
        if (alturaLinha > alturaMaxima) {
          doc.addPage();
          alturaLinha = 100;
          this.desenharCabecalhoTabela(doc, [
            'Protocolo',
            'Beneficiário',
            'Benefício',
            'Unidade',
            'Data Abertura',
          ]);
        }

        // Desenhar linha
        doc
          .font('Helvetica')
          .fontSize(10)
          .text(solicitacao.protocolo || '', 50, alturaLinha, { width: 80 })
          .text(solicitacao.beneficiario?.nome || 'N/A', 130, alturaLinha, {
            width: 150,
          })
          .text(solicitacao.tipo_beneficio?.nome || 'N/A', 280, alturaLinha, {
            width: 100,
          })
          .text(solicitacao.unidade?.nome || 'N/A', 380, alturaLinha, {
            width: 100,
          })
          .text(
            solicitacao.data_abertura
              ? new Date(solicitacao.data_abertura).toLocaleDateString('pt-BR')
              : 'N/A',
            480,
            alturaLinha,
          );

        alturaLinha += 20;
      }
    }
  }

  /**
   * Gera conteúdo para relatório de atendimentos por unidade
   * @param doc Documento PDF
   * @param dados Dados para o relatório
   * @param opcoes Opções de configuração
   */
  private async gerarAtendimentosPorUnidade(
    doc: PDFKit.PDFDocument,
    dados: any[],
    opcoes: any,
  ): Promise<void> {
    // Adicionar cabeçalho da tabela
    this.desenharCabecalhoTabela(doc, [
      'Unidade',
      'Total Solicit.',
      'Liberadas',
      'Pendentes',
      'Taxa Aprovação',
    ]);

    // Adicionar linhas da tabela
    let alturaLinha = 160;
    const alturaMaxima = doc.page.height - 100;

    for (const item of dados) {
      const taxaAprovacao =
        item.totalSolicitacoes > 0
          ? (
              (item.solicitacoesLiberadas / item.totalSolicitacoes) *
              100
            ).toFixed(2)
          : '0.00';

      // Desenhar linha
      doc
        .font('Helvetica')
        .fontSize(10)
        .text(item.unidade.nome || 'N/A', 50, alturaLinha, { width: 150 })
        .text(item.totalSolicitacoes.toString(), 200, alturaLinha, {
          width: 80,
        })
        .text(item.solicitacoesLiberadas.toString(), 280, alturaLinha, {
          width: 80,
        })
        .text(item.solicitacoesPendentes.toString(), 360, alturaLinha, {
          width: 80,
        })
        .text(`${taxaAprovacao}%`, 440, alturaLinha, { width: 80 });

      alturaLinha += 20;
    }

    // Adicionar totais
    doc.moveDown(2);
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

    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .text(`Total Geral: ${totais.total} solicitações`);
    doc
      .font('Helvetica')
      .fontSize(10)
      .text(
        `Liberadas: ${totais.liberadas} | Pendentes: ${totais.pendentes} | Taxa de Aprovação: ${taxaGeral}%`,
      );
  }

  /**
   * Desenha o cabeçalho de uma tabela no PDF
   * @param doc Documento PDF
   * @param colunas Array com os títulos das colunas
   */
  private desenharCabecalhoTabela(
    doc: PDFKit.PDFDocument,
    colunas: string[],
  ): void {
    const y = 130;

    // Desenhar retângulo de fundo
    doc.rect(50, y, doc.page.width - 100, 20).fill('#f0f0f0');

    // Desenhar títulos das colunas
    doc.fillColor('black');
    doc.font('Helvetica-Bold').fontSize(10);

    // Posicionar cada coluna (ajustar conforme necessário)
    const posicoes = [50, 130, 280, 380, 480];

    colunas.forEach((coluna, index) => {
      doc.text(coluna, posicoes[index], y + 5);
    });

    // Linha horizontal abaixo do cabeçalho
    doc
      .moveTo(50, y + 20)
      .lineTo(doc.page.width - 50, y + 20)
      .stroke();
  }
}
