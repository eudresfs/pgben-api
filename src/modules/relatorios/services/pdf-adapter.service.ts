import { Injectable, Logger } from '@nestjs/common';
import { PdfCommonService, PdfTemplateService } from '../../../common/pdf/services';
import { IPdfDados, IPdfConteudo } from '../../../common/pdf/interfaces';
import { PdfTipoConteudo, PdfTipoTemplate } from '../../../common/pdf/enums';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { RelatorioPagamentosTemplate, IDadosRelatorioPagamentos } from '../../../common/pdf/templates/relatorios/relatorio-pagamentos.template';
import { PdfVazioTemplate, IDadosPdfVazio } from '../../../common/pdf/templates/relatorios/pdf-vazio.template';

/**
 * Interface para dados de relatório (compatibilidade com código existente)
 */
interface IDadosRelatorio {
  titulo: string;
  subtitulo?: string;
  numeroMemo?: string;
  dataEmissao: string;
  observacoes?: string;
  valorTotal?: number;
  pagamentos?: any[];
  tipoBeneficio?: string;
  totalPagamentos?: number;
  dataGeracao?: Date;
}

/**
 * Adaptador para integrar o PdfTemplatesService com o novo módulo PDF comum
 * Mantém compatibilidade com a interface existente enquanto usa a nova infraestrutura
 */
@Injectable()
export class PdfAdapterService {
  private readonly logger = new Logger(PdfAdapterService.name);

  constructor(
    private readonly pdfCommonService: PdfCommonService,
    private readonly pdfTemplateService: PdfTemplateService,
    private readonly relatorioPagamentosTemplate: RelatorioPagamentosTemplate,
    private readonly pdfVazioTemplate: PdfVazioTemplate,
  ) {}

  /**
   * Gera PDF de relatório de pagamentos usando o novo módulo PDF
   * @param dadosRelatorio Dados do relatório
   * @param codigoTipoBeneficio Código do tipo de benefício
   * @param observacoes Observações adicionais
   * @returns Buffer do PDF gerado
   */
  async gerarRelatorioPagamentos(
    dadosRelatorio: IDadosRelatorio,
    codigoTipoBeneficio: string,
    observacoes?: string
  ): Promise<Buffer> {
    try {
      this.logger.log(`Gerando relatório PDF para tipo de benefício: ${codigoTipoBeneficio}`);

      // Converter dados para o template específico de relatório de pagamentos
      const dadosTemplate: IDadosRelatorioPagamentos = {
        titulo: dadosRelatorio.titulo,
        subtitulo: dadosRelatorio.subtitulo,
        numeroMemo: dadosRelatorio.numeroMemo,
        dataEmissao: dadosRelatorio.dataEmissao,
        observacoes: observacoes,
        valorTotal: dadosRelatorio.valorTotal,
        pagamentos: dadosRelatorio.pagamentos || [],
        codigoTipoBeneficio: codigoTipoBeneficio
      };

      // Gerar PDF usando o template específico
      return await this.relatorioPagamentosTemplate.gerarDocumento(dadosTemplate);
    } catch (error) {
      this.logger.error(`Erro ao gerar PDF: ${error.message}`);
      throw error;
    }
  }

  /**
   * Converte dados do relatório para o formato IPdfDados
   * @param dadosRelatorio Dados originais
   * @param observacoes Observações adicionais
   * @returns Dados convertidos
   */
  private converterDadosRelatorio(
    dadosRelatorio: IDadosRelatorio,
    observacoes?: string
  ): IPdfDados {
    const conteudo: IPdfConteudo[] = [];

    // Adicionar título
    if (dadosRelatorio.titulo) {
      conteudo.push({
        tipo: PdfTipoConteudo.TEXTO,
        dados: dadosRelatorio.titulo,
        estilo: 'titulo'
      });
    }

    // Adicionar subtítulo se existir
    if (dadosRelatorio.subtitulo) {
      conteudo.push({
        tipo: PdfTipoConteudo.TEXTO,
        dados: dadosRelatorio.subtitulo,
        estilo: 'subtitulo'
      });
    }

    // Adicionar informações do memorando
    if (dadosRelatorio.numeroMemo) {
      conteudo.push({
        tipo: PdfTipoConteudo.TEXTO,
        dados: `Memorando: ${dadosRelatorio.numeroMemo}`,
        estilo: 'texto'
      });
    }

    // Adicionar data de emissão
    conteudo.push({
      tipo: PdfTipoConteudo.TEXTO,
      dados: `Data de Emissão: ${dadosRelatorio.dataEmissao}`,
      estilo: 'texto'
    });

    // Adicionar valor total se existir
    if (dadosRelatorio.valorTotal) {
      conteudo.push({
        tipo: PdfTipoConteudo.TEXTO,
        dados: `Valor Total: ${this.formatarMoeda(dadosRelatorio.valorTotal)}`,
        estilo: 'texto'
      });
    }

    return {
      titulo: dadosRelatorio.titulo,
      conteudo,
      observacoes: observacoes ? [observacoes] : undefined,
      metadados: {
        autor: 'Sistema PGBEN',
        assunto: 'Relatório de Pagamentos'
      }
    };
  }

  /**
   * Seleciona o template baseado no código do tipo de benefício
   * @param codigoTipoBeneficio Código do tipo de benefício
   * @returns Tipo de template correspondente
   */
  private selecionarTemplate(codigoTipoBeneficio: string): PdfTipoTemplate {
    // Mapear códigos de benefício para templates
    const mapeamentoTemplates: Record<string, PdfTipoTemplate> = {
      'ALU': PdfTipoTemplate.COMPROVANTE, // Aluguel Social
      'ATA': PdfTipoTemplate.COMPROVANTE, // Ataúde
      'CES': PdfTipoTemplate.COMPROVANTE, // Cesta Básica
      'NAT': PdfTipoTemplate.COMPROVANTE, // Natalidade
    };

    return mapeamentoTemplates[codigoTipoBeneficio] || PdfTipoTemplate.RELATORIO;
  }

  /**
   * Formata valor monetário
   * @param valor Valor numérico
   * @returns Valor formatado
   */
  private formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }

  /**
   * Gera PDF vazio para casos onde não há dados
   * @returns Buffer do PDF vazio
   */
  async gerarPdfVazio(): Promise<Buffer> {
    // Dados para PDF vazio
    const dadosTemplate: IDadosPdfVazio = {
      titulo: 'Relatório de Pagamentos',
      mensagem: 'Nenhum dado encontrado para os critérios especificados.',
      dataEmissao: new Date().toLocaleDateString('pt-BR')
    };

    // Gerar PDF vazio usando o template específico
    return await this.pdfVazioTemplate.gerarDocumento(dadosTemplate);
  }
}