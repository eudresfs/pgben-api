import { Injectable } from '@nestjs/common';
import { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { TemplatePadronizadoBase } from '../template-base-padronizado.abstract';
import { IPdfTemplateConfig } from '../../interfaces/pdf-template-config.interface';
import { PdfTipoAssinatura } from '../../enums/pdf-tipo-assinatura.enum';
import { PdfTipoConteudo } from '../../enums/pdf-tipo-conteudo.enum';

/**
 * Interface para dados de relatório de pagamentos
 */
export interface IDadosRelatorioPagamentos {
  titulo: string;
  subtitulo?: string;
  numeroMemo?: string;
  dataEmissao: string;
  observacoes?: string;
  valorTotal?: number;
  pagamentos?: any[];
  codigoTipoBeneficio?: string;
  // Campos adicionais para seguir padrão dos exemplos
  numeroProcesso?: string;
  exercicio?: string;
  mes?: string;
  ano?: string;
}

/**
 * Template para relatórios de pagamentos
 * Herda do template base padronizado com header e footer obrigatórios
 */
@Injectable()
export class RelatorioPagamentosTemplate extends TemplatePadronizadoBase<IDadosRelatorioPagamentos> {
  readonly config: IPdfTemplateConfig = {
    nome: 'Relatório de Pagamentos',
    tipo: 'relatorio_pagamentos',
    conteudo: {
      tipos: [
        PdfTipoConteudo.TEXTO,
        PdfTipoConteudo.TABELA,
        PdfTipoConteudo.PARAGRAFO
      ],
      permitirCustomizacao: false
    },
    assinaturas: {
      tipos: [PdfTipoAssinatura.TECNICO_RESPONSAVEL, PdfTipoAssinatura.COORDENADOR_BENEFICIOS],
      maxPorLinha: 2,
      obrigatorias: [PdfTipoAssinatura.TECNICO_RESPONSAVEL, PdfTipoAssinatura.COORDENADOR_BENEFICIOS]
    },
    headerPadronizado: true,
    footerPadronizado: true
  };

  /**
   * Cria o conteúdo específico do relatório de pagamentos
   * Segue exatamente o padrão dos exemplos em exemplos-relatorios.md
   */
  criarConteudoEspecifico(dados: IDadosRelatorioPagamentos): Content[] {
    const conteudo: Content[] = [];

    // Espaçamento inicial
    conteudo.push({ text: '', margin: [0, 30, 0, 0] });

    // Número do memorando (seguindo padrão dos exemplos)
    if (dados.numeroMemo) {
      conteudo.push({
        text: dados.numeroMemo,
        fontSize: 12,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 20]
      });
    }

    // Título principal (seguindo padrão dos exemplos)
    conteudo.push({
      text: dados.titulo,
      fontSize: 12,
      bold: true,
      alignment: 'center',
      margin: [0, 0, 0, 20]
    });

    // Subtítulo se existir
    if (dados.subtitulo) {
      conteudo.push({
        text: dados.subtitulo,
        fontSize: 11,
        alignment: 'center',
        margin: [0, 0, 0, 20]
      });
    }

    // Tabela de pagamentos (seguindo estrutura dos exemplos)
    if (dados.pagamentos && dados.pagamentos.length > 0) {
      // Determinar tipo de benefício dos dados
      const tipoBeneficio = dados.pagamentos[0]?.solicitacao?.tipo_beneficio?.codigo || 
                           dados.pagamentos[0]?.concessao?.solicitacao?.tipo_beneficio?.codigo;
      conteudo.push(this.criarTabelaPagamentosEstruturada(dados.pagamentos, tipoBeneficio));
    }

    // Valor total em destaque (seguindo padrão dos exemplos)
    if (dados.valorTotal) {
      conteudo.push({
        text: `VALOR TOTAL: ${this.formatarMoeda(dados.valorTotal)}`,
        fontSize: 11,
        bold: true,
        alignment: 'right',
        margin: [0, 20, 0, 30]
      });
    }

    // Observações se existirem (seguindo padrão dos exemplos)
    if (dados.observacoes) {
      conteudo.push({
        text: 'OBSERVAÇÕES:',
        fontSize: 11,
        bold: true,
        margin: [0, 20, 0, 10]
      });
      conteudo.push({
        text: dados.observacoes,
        fontSize: 10,
        margin: [0, 0, 0, 30]
      });
    }

    // Data de emissão no final (seguindo padrão dos exemplos)
    conteudo.push({
      text: `Natal/RN, ${dados.dataEmissao}`,
      fontSize: 11,
      alignment: 'center',
      margin: [0, 30, 0, 40]
    });

    // Seção de assinaturas
    conteudo.push(...this.criarSecaoAssinaturas(dados));

    return conteudo;
  }

  /**
   * Cria a tabela de pagamentos seguindo exatamente o padrão dos exemplos
   */
  private criarTabelaPagamentosEstruturada(pagamentos: any[], codigoTipoBeneficio?: string): Content {    
    const body: any[][] = [];
    
    // Determinar tipo de benefício baseado no código ou no primeiro pagamento
    const tipoBeneficio = codigoTipoBeneficio || pagamentos?.[0]?.solicitacao?.tipo_beneficio?.codigo || 'cesta-basica';
    
    // Criar cabeçalho e dados baseado no tipo de benefício
    switch (tipoBeneficio.toLowerCase()) {
      case 'cesta-basica':
        return this.criarTabelaCestaBasica(pagamentos);
      case 'aluguel-social':
        return this.criarTabelaAluguelSocial(pagamentos);
      case 'ataude':
      case 'beneficio-morte':
        return this.criarTabelaAtaude(pagamentos);
      case 'beneficio-natalidade':
      case 'natalidade':
        return this.criarTabelaNatalidade(pagamentos);
      default:
        return this.criarTabelaCestaBasica(pagamentos); // Fallback para cesta básica
    }
  }

  /**
   * Cria tabela específica para Cesta Básica
   * Estrutura: Nº, PROTOCOLO, NOME, CPF, PARCELA, UNIDADE
   */
  private criarTabelaCestaBasica(pagamentos: any[]): Content {
    const body: any[][] = [];
    
    // Cabeçalho conforme exemplo
    body.push([
      { text: 'Nº', style: 'tabelaCabecalho', alignment: 'center' },
      { text: 'PROTOCOLO', style: 'tabelaCabecalho', alignment: 'center' },
      { text: 'NOME', style: 'tabelaCabecalho' },
      { text: 'CPF', style: 'tabelaCabecalho', alignment: 'center' },
      { text: 'PARCELA', style: 'tabelaCabecalho', alignment: 'center' },
      { text: 'UNIDADE', style: 'tabelaCabecalho', alignment: 'center' }
    ]);

    // Dados dos pagamentos
    pagamentos.forEach((pagamento, index) => {
      const beneficiario = pagamento.solicitacao?.beneficiario || pagamento.concessao?.solicitacao?.beneficiario;
      const solicitacao = pagamento.solicitacao || pagamento.concessao?.solicitacao;
      const unidade = solicitacao?.unidade;
      
      body.push([
        { text: (index + 1).toString(), fontSize: 9, alignment: 'center' },
        { text: solicitacao?.protocolo || 'N/A', fontSize: 9, alignment: 'center' },
        { text: beneficiario?.nome || 'N/A', fontSize: 9, noWrap: true },
        { text: this.formatarCpf(beneficiario?.cpf || ''), fontSize: 9, alignment: 'center' },
        { text: `${pagamento.numero_parcela || 1}/${pagamento.total_parcelas || 1}`, fontSize: 9, alignment: 'center' },
        { text: unidade?.nome || 'N/A', fontSize: 9, alignment: 'center' }
      ]);
    });

    return this.criarTabelaComLayout(body, [30, 110, '*', 80, 60, 100]);
  }

  /**
   * Cria tabela específica para Aluguel Social
   * Estrutura: Nº, PROTOCOLO, CPF, NOME, PARCELA, UNIDADE
   */
  private criarTabelaAluguelSocial(pagamentos: any[]): Content {
    const body: any[][] = [];
    
    // Cabeçalho conforme exemplo
    body.push([
      { text: 'Nº', style: 'tabelaCabecalho', alignment: 'center' },
      { text: 'PROTOCOLO', style: 'tabelaCabecalho', alignment: 'center' },
      { text: 'CPF', style: 'tabelaCabecalho', alignment: 'center' },
      { text: 'NOME', style: 'tabelaCabecalho' },
      { text: 'PARCELA', style: 'tabelaCabecalho', alignment: 'center' },
      { text: 'UNIDADE', style: 'tabelaCabecalho', alignment: 'center' }
    ]);

    // Dados dos pagamentos
    pagamentos.forEach((pagamento, index) => {
      const beneficiario = pagamento.solicitacao?.beneficiario || pagamento.concessao?.solicitacao?.beneficiario;
      const solicitacao = pagamento.solicitacao || pagamento.concessao?.solicitacao;
      const unidade = solicitacao?.unidade;
      
      body.push([
        { text: (index + 1).toString(), fontSize: 9, alignment: 'center' },
        { text: solicitacao?.protocolo || 'N/A', fontSize: 9, alignment: 'center' },
        { text: this.formatarCpf(beneficiario?.cpf || ''), fontSize: 9, alignment: 'center' },
        { text: beneficiario?.nome || 'N/A', fontSize: 9, noWrap: true },
        { text: `${pagamento.numero_parcela || 1}/${pagamento.total_parcelas || 1}`, fontSize: 9, alignment: 'center' },
        { text: unidade?.nome || 'N/A', fontSize: 9, alignment: 'center' }
      ]);
    });

    return this.criarTabelaComLayout(body, [30, 110, 80, '*', 60, 100]);
  }

  /**
   * Cria tabela específica para Ataúde (Benefício por morte)
   * Estrutura: Nº, PROTOCOLO, NOME BENEFICIÁRIO/FALECIDO, TIPO URNA, VALOR
   */
  private criarTabelaAtaude(pagamentos: any[]): Content {
    const body: any[][] = [];
    
    // Cabeçalho conforme exemplo
    body.push([
      { text: 'Nº', style: 'tabelaCabecalho', alignment: 'center' },
      { text: 'PROTOCOLO', style: 'tabelaCabecalho', alignment: 'center' },
      { text: 'NOME', style: 'tabelaCabecalho', alignment: 'center' },
      { text: 'TIPO DA URNA', style: 'tabelaCabecalho', alignment: 'center' },
      { text: 'VALOR', style: 'tabelaCabecalho', alignment: 'center' }
    ]);

    // Dados dos pagamentos
    pagamentos.forEach((pagamento, index) => {
      const beneficiario = pagamento.solicitacao?.beneficiario || pagamento.concessao?.solicitacao?.beneficiario;
      const solicitacao = pagamento.solicitacao || pagamento.concessao?.solicitacao;
      
      body.push([
        { text: (index + 1).toString().padStart(2, '0'), fontSize: 9, alignment: 'center' },
        { text: solicitacao?.protocolo || 'N/A', fontSize: 9, alignment: 'center' },
        { text: beneficiario?.nome || 'N/A', fontSize: 9, noWrap: true },
        { text: 'PADRÃO', fontSize: 9, alignment: 'center' }, // Valor padrão, pode ser customizado
        { text: this.formatarMoeda(pagamento.valor || 0), fontSize: 9, alignment: 'right' }
      ]);
    });

    return this.criarTabelaComLayout(body, [28, 110, '*', 80, 80]);
  }

  /**
   * Cria tabela específica para Benefício Natalidade
   * Estrutura: Nº, PROTOCOLO, NOME, CPF, PREVISÃO PARTO, UNIDADE
   */
  private criarTabelaNatalidade(pagamentos: any[]): Content {
    const body: any[][] = [];
    
    // Cabeçalho conforme exemplo
    body.push([
      { text: 'Nº', style: 'tabelaCabecalho', alignment: 'center' },
      { text: 'PROTOCOLO', style: 'tabelaCabecalho', alignment: 'center' },
      { text: 'NOME', style: 'tabelaCabecalho', alignment: 'center' },
      { text: 'CPF', style: 'tabelaCabecalho', alignment: 'center' },
      { text: 'PREVISÃO DO PARTO', style: 'tabelaCabecalho', alignment: 'center' },
      { text: 'UNIDADE', style: 'tabelaCabecalho', alignment: 'center' }
    ]);

    // Dados dos pagamentos
    pagamentos.forEach((pagamento, index) => {
      const beneficiario = pagamento.solicitacao?.beneficiario || pagamento.concessao?.solicitacao?.beneficiario;
      const solicitacao = pagamento.solicitacao || pagamento.concessao?.solicitacao;
      const unidade = solicitacao?.unidade;
      
      body.push([
        { text: (index + 1).toString(), fontSize: 9, alignment: 'center' },
        { text: solicitacao?.protocolo || 'N/A', fontSize: 9, alignment: 'center' },
        { text: beneficiario?.nome || 'N/A', fontSize: 9, noWrap: true },
        { text: this.formatarCpf(beneficiario?.cpf || ''), fontSize: 9, alignment: 'center' },
        { text: 'N/A', fontSize: 9, alignment: 'center' }, // Campo para previsão do parto
        { text: unidade?.nome || 'N/A', fontSize: 9, alignment: 'center' }
      ]);
    });

    return this.criarTabelaComLayout(body, [30, 110, '*', 80, 90, 90]);
  }

  /**
   * Cria tabela com layout padrão
   */
  private criarTabelaComLayout(body: any[][], widths: any[]): Content {
    return {
      table: {
        headerRows: 1,
        widths: widths,
        body: body
      },
      layout: {
        fillColor: function (rowIndex: number) {
          return rowIndex === 0 ? '#EEEEEE' : null;
        },
        hLineColor: function(i: number, node: any) { 
          return '#CCCCCC'; 
        },
        vLineColor: function(i: number, node: any) { 
          return '#CCCCCC'; 
        }
      },
      margin: [0, 20, 0, 20]
    };
  }

  /**
   * Formata data para exibição
   */
  private formatarData(data: string | Date): string {
    if (!data) return 'N/A';
    
    const dataObj = typeof data === 'string' ? new Date(data) : data;
    return dataObj.toLocaleDateString('pt-BR');
  }

  /**
   * Valida os dados do relatório
   */
  validarDados(dados: IDadosRelatorioPagamentos): boolean {
    if (!dados) {
      throw new Error('Dados do relatório são obrigatórios');
    }

    if (!dados.titulo) {
      throw new Error('Título do relatório é obrigatório');
    }

    if (!dados.dataEmissao) {
      throw new Error('Data de emissão é obrigatória');
    }

    return true;
  }
}