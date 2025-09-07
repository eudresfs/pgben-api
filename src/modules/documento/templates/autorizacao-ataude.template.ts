import { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { DocumentoBaseTemplate } from './documento-base.template';
import { IDadosDocumento, IDocumentoTemplate } from '../interfaces/documento-pdf.interface';
import { TipoDocumentoEnum, TipoUrnaEnum } from '@/enums';

/**
 * Template para geração de documentos de Autorização de Ataúde
 * Segue o padrão estabelecido pela SEMTAS/Natal
 */
export class AutorizacaoAtaudeTemplate extends DocumentoBaseTemplate {
  constructor() {
    super(TipoDocumentoEnum.AUTORIZACAO_ATAUDE);
  }
  /**
   * Cria a definição do documento PDF para autorização de ataúde
   * @param dados - Dados necessários para geração do documento
   * @returns Definição do documento no formato PDFMake
   */
  criarDefinicaoDocumento(dados: IDadosDocumento, template: IDocumentoTemplate): TDocumentDefinitions {
    return {
      pageSize: 'A4',
      pageMargins: [50, 50, 50, 50],
      defaultStyle: {
        lineHeight: 1.2
      },

      content: [
        this.criarCabecalho(dados, template),
        this.criarDadosRequerimento(dados),
        this.criarSecaoBeneficioAtaude(dados),
        this.criarTextoAutorizacao(dados),
        this.criarSecaoAssinaturas(dados, template),
      ],
      styles: {
        header: { fontSize: 12, bold: true, alignment: 'center' },
        title: { fontSize: 12, bold: true, alignment: 'center' },
        tableExample: {
          margin: [0, 5, 0, 15]
        },
        tableHeader: {
          bold: true,
          fontSize: 13,
          color: 'black'
        }
      },
      footer: this.criarRodape(dados, template)
    };
  }

  /**
   * Cria seção com dados do beneficiário
   * @param dados Dados do documento
   * @returns Conteúdo da seção
   */
  protected criarDadosRequerimento(dados: IDadosDocumento): Content {
    if (!dados.dados_ataude) {
      return null;
    }

    return {
      stack: [
        { text: `AUTORIZAÇÃO Nº ${dados.solicitacao.protocolo}`, style: "title", margin: [0, 0, 0, 30] },

        { text: `DATA ÓBITO: ${dados.dados_ataude?.data_obito || '__/__/_____'}`, alignment: "right", margin: [0, 5, 0, 5] },
        { text: `DATA AUTORIZAÇÃO: ${dados.dados_ataude?.data_autorizacao || '__/__/_____'}`, alignment: "right", margin: [0, 0, 0, 30] },

        {
          text: [
            { text: 'OBJETO: FUNERAL ', bold: true, lineHeight: 1.5 },
            { text: `${dados.dados_ataude?.tipo_urna.toUpperCase()}\n`, lineHeight: 1.5 },
            { text: 'DESTINO: ', bold: true, lineHeight: 1.5 },
            { text: `${dados.dados_ataude?.funeraria?.nome || 'FUNERÁRIA PADRE CÍCERO'}\n`, lineHeight: 1.5 },
            { text: 'ENDEREÇO: ', bold: true, lineHeight: 1.5 },
            { text: `${dados.dados_ataude?.funeraria?.endereco || 'RUA PRESIDENTE LEÃO VELOSO, 376. ALECRIM'}\n`, lineHeight: 1.5 },
            { text: 'ORIGEM: ', bold: true, lineHeight: 1.5 },
            { text: `${dados.unidade.nome}`, lineHeight: 1.5 }
          ]
        },
        { text: 'Solicitamos a prestação do serviço abaixo relacionado.', margin: [0, 30, 0, 10] },
      ],
    };
  }

  /**
   * Cria seção com dados específicos do benefício ataúde
   * @param dados Dados do documento
   * @returns Conteúdo da seção
   */
  private criarSecaoBeneficioAtaude(dados: IDadosDocumento): Content {
    if (!dados.dados_ataude) {
      return null;
    }

    const tipoUrna = dados.dados_ataude.tipo_urna;
    const translado = dados.dados_ataude.translado
    const descricaoUrna = this.obterDescricaoUrna(tipoUrna, translado);

    return {
      stack: [
        {
          style: 'tableExample',
          table: {
            widths: ['*', 'auto'],
            body: [
              [
                { text: `DESCRIÇÃO/${tipoUrna.toUpperCase()}`, style: 'tableHeader', alignment: 'center' },
                { text: 'QUANTIDADE', style: 'tableHeader', alignment: 'center' }
              ],
              [
                { text: descricaoUrna, alignment: 'justify', margin: [5, 5, 5, 5], fontSize: 10 },
                { text: '01', alignment: 'center', valign: 'middle' }
              ]
            ]
          },
          layout: {
            hLineWidth: function () { return 1; },
            vLineWidth: function () { return 1; },
            hLineColor: function () { return 'black'; },
            vLineColor: function () { return 'black'; }
          }
        },
      ],
    };
  }

  /**
   * Cria o texto de autorização principal
   * @param dados Dados do documento
   * @returns Conteúdo do texto
   */
  private criarTextoAutorizacao(dados: IDadosDocumento): Content {
    const nomeBeneficiario = dados.beneficiario?.nome || 'BENEFICIÁRIO NÃO INFORMADO';
    const enderecoBeneficiario = dados.beneficiario?.endereco;
    const requerente = dados.requerente;
    const dados_ataude = dados.dados_ataude;

    return {
      stack: [
        {
          text: [
            { text: `Em benefício de ${nomeBeneficiario} (conforme atestado de óbito ou declaração médica), documento D.O. nº ${dados.dados_ataude?.declaracao_obito || '_'.repeat(15)}. ` },
            { text: `Residente à ${enderecoBeneficiario?.logradouro || '_'.repeat(35)}, bairro ${enderecoBeneficiario?.bairro || '_'.repeat(15)} nesta cidade do Natal.` }
          ], margin: [0, 20, 0, 20], alignment: "justify"
        },
        {
          text: [
            { text: 'REQUERENTE:\n\n', bold: true },
            `Nome: ${requerente?.nome || '_'.repeat(50)}\n`,
            `RG: ${requerente?.rg || '_'.repeat(15)} / CPF: ${requerente?.cpf || '_'.repeat(14)}\n`,
            `Telefone: ${requerente?.telefone || '_'.repeat(15)}\n`,
            `Residente à ${requerente?.endereco?.logradouro || '_'.repeat(35)}, bairro ${requerente?.endereco?.bairro || '_'.repeat(20)} nesta cidade do Natal.\n`,
            `Grau de parentesco: ${dados_ataude?.grau_parentesco || '_'.repeat(20)}\n`,
          ], margin: [0, 20, 0, 20]
        },
      ],
    };
  }

  /**
   * Cria seção de observações se houver
   * @param dados Dados do documento
   * @returns Conteúdo das observações
   */
  private criarSecaoObservacoes(dados: IDadosDocumento): Content {
    // Verificar se há observações nos dados (pode ser adicionado futuramente)
    const observacoes = (dados as any).observacoes;

    if (!observacoes) {
      return null;
    }

    return {
      stack: [
        {
          text: 'OBSERVAÇÕES',
          style: 'secaoTitulo',
          margin: [0, 15, 0, 8],
        },
        {
          text: observacoes,
          style: 'textoObservacoes',
          alignment: 'justify',
          margin: [0, 0, 0, 10],
        },
      ],
    };
  }

  /**
   * Formata dados específicos para o documento
   * @param dados Dados originais
   * @returns Dados formatados
   */
  private formatarDados(dados: IDadosDocumento): IDadosDocumento {
    // Aplicar formatações específicas se necessário
    return {
      ...dados,
      beneficiario: dados.beneficiario ? {
        ...dados.beneficiario,
        nome: dados.beneficiario.nome?.toUpperCase(),
      } : undefined,
    };
  }

  /**
   * Obtém a descrição detalhada da urna baseada no tipo
   * @param tipoUrna - Tipo da urna (ESPECIAL, PADRAO, OBESO, INFANTIL)
   * @returns Descrição completa da urna e serviços inclusos
   */
  private obterDescricaoUrna(tipoUrna: string, translado: string): string {
    const descricoes = {
      ESPECIAL: `FUNERAL COMPOSTO POR: urna sextavada em madeira de pinus, edredom, higienização simples, suporte para urna, castiçais e traslado no município de Natal.

URNA MORTUÁRIA
- Caixa: madeira de pinus, fundo misto (madeira + chapadur de alta resistência).
- Tampa: pinus, com encaixes, guias e 4 chavetas de fechamento.
- Tampo: chapadur (fibra de eucalipto) com silk screen dourado (sem símbolos religiosos), visor de ¼, sobre-tampo com 3 chavetas douradas.
- Alças: 3 parreiras articuladas douradas em cada lateral.
- Acabamento interno: material biodegradável branco, babado de tecido (8 cm) e travesseiro solto.
- Acabamento externo: castanho-escuro com verniz alto brilho.
- Capacidade: até 100 kg.
- Medidas internas: 1,96m x 56cm x 35cm.
- Medidas externas: 2,00m x 61cm x 41cm.

TRASLADO: ${translado}`,

      PADRAO: `FUNERAL COMPOSTO POR: urna em pinus, edredom, higienização simples, suporte para urna, castiçais e traslado no município de Natal.

URNA MORTUÁRIA
- Caixa: pinus, tampa em Duratex e 2 sobre-tampos em MDF.
- Tampo: visor de ¼, fechamento com 3 chavetas douradas.
- Alças: 3 parreiras articuladas douradas em cada lateral.
- Acabamento interno: material biodegradável branco, babado de tecido (8 cm) e travesseiro solto.
- Acabamento externo: cor imbuia, verniz brilhante.
- Capacidade: até 100 kg.
- Medidas internas: 1,96m x 56cm x 35cm.
- Medidas externas: 2,00m x 61cm x 41cm.

TRASLADO: ${translado}`,

      OBESO: `FUNERAL COMPOSTO POR: urna reforçada em pinus, edredom, higienização simples, suporte para urna, castiçais e traslado no município de Natal.

URNA MORTUÁRIA
- Caixa: pinus, tampa em Duratex e 2 sobre-tampos em MDF.
- Tampo: visor de ¼, fechamento com 3 chavetas douradas.
- Alças: 3 parreiras articuladas douradas em cada lateral.
- Acabamento interno: material biodegradável branco, babado de tecido (8 cm) e travesseiro solto.
- Acabamento externo: cor imbuia, verniz brilhante.
- Capacidade: até 150 kg.
- Medidas internas: 2,05m x 76cm x 35cm.
- Medidas externas: 2,10m x 78cm x 41cm.

TRASLADO: ${translado}`,

      INFANTIL: `FUNERAL COMPOSTO POR: urna infantil, edredom, suporte para urna, castiçais e traslado no município de Natal.

URNA MORTUÁRIA
- Caixa: fundo em compensado, tampa em eucatex, forro interior completo.
- Acabamento externo: cor imbuia.
- Capacidade: até 50 kg.
- Medida: 1,50m de comprimento.

TRASLADO: ${translado}`
    };

    return descricoes[tipoUrna?.toUpperCase()] || descricoes.PADRAO;
  }


  /**
   * Formata valor monetário
   * @param valor Valor a ser formatado
   * @returns Valor formatado
   */
  private formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  }

}

// Exporta a classe como padrão
export default AutorizacaoAtaudeTemplate;