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
    const descricaoUrna = this.obterDescricaoUrna(tipoUrna);

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
  private obterDescricaoUrna(tipoUrna: string): string {
    const descricoes = {
      ESPECIAL: `FUNERAL COMPOSTO POR URNA, EDREDOM, HIGIENIZAÇÃO SIMPLES, SUPORTE PARA URNA, CASTIÇAL E TRANSLADO DENTRO DO MUNICÍPIO DE NATAL.

URNA MORTUÁRIA - MODELO: SEXTAVADO - CAIXA: CONFECCIONADA EM MADEIRA DE PINUS, FUNDO MISTO EM MADEIRA E CHAPADUR DE ALTA RESISTÊNCIA COLADO E GRAMPEADO, BORDADA EM RELEVO NAS LATERAIS, COM CAPACIDADE PARA ATÉ 100 KG. TAMPA: CONFECCIONADA EM MADEIRA DE PINUS BORDADAS NAS LATERAIS, COM ENCAIXES E GUIAS, COM 4 CHAVETAS PARA SEU FECHAMENTO. TAMPO: CONFECCIONADO EM CHAPADUR (FIBRA DE EUCALIPTO) DECORADO ARTISTICAMENTE EM SILK SCREEN DOURADO SEM MOTIVOS RELIGIOSOS, COM VISOR NA MEDIDA DE ¼. SOBRE TAMPA: FECHAMENTO DO SOBRE TAMPO COM 3 CHAVETAS DOURADAS. ALÇAS: PARREIRAS ARTICULADAS DOURADAS, SENDO 3 EM CADA LATERAL DA CAIXA. ACABAMENTO INTERNO: FORRADA EM MATERIAL BIODEGRADÁVEL BRANCO, BABADO DE TECIDO DE 8 CM E TRAVESSEIRO SOLTO. ACABAMENTO EXTERNO: NA COR CASTANHO ESCURO, COM VERNIZ DE ALTO BRILHO.
MEDIDAS INTERNAS: COMPRIMENTO: 1,96M X LARGURA: 56CM X ALTURA: 35CM.
MEDIDAS EXTERNAS: COMPRIMENTO: 2,00M X LARGURA: 61CM X ALTURA: 41CM.

O TRANSLADO DO LOCAL DO ÓBITO PARA O SVO E/OU ITEP, DO SVO E/OU ITEP PARA O LOCAL DO VELÓRIO E DO LOCAL DO VELÓRIO PARA UM DOS CEMITÉRIOS DA CIDADE DO NATAL.`,

      PADRAO: `FUNERAL COMPOSTO POR URNA, EDREDOM, HIGIENIZAÇÃO SIMPLES, SUPORTE PARA URNA, CASTIÇAL E TRANSLADO DENTRO DO MUNICÍPIO DE NATAL.

A URNA EM PINOS, COM TAMPA EM DURATEX E 2 SOBRE TAMPOS EM MDF, VISOR DE ¼, COM ALÇA PARREIRA, ACABAMENTO EXTERNO PADRÃO NA COR IMBUIA EM VERNIZ BRILHANTE. COM CAPACIDADE PARA ATÉ 100 KG.
MEDIDAS INTERNAS: COMPRIMENTO: 1,96 X LARGURA: 56cm X ALTURA: 35cm.
MEDIDAS EXTERNAS: COMPRIMENTO: 2,00M X LARGURA: 61cm X ALTURA: 41cm.

CHAVETAS: FECHAMENTO DO SOBRE TAMPO COM 3 CHAVETAS DOURADAS. ALÇAS: PARREIRAS ARTICULADAS DOURADAS, SENDO 3 EM CADA LATERAL DA CAIXA. ACABAMENTO INTERNO: FORRADA EM MATERIAL BIODEGRADÁVEL BRANCO, BABADO DE TECIDO DE 8 CM E TRAVESSEIRO SOLTO

O TRANSLADO DO LOCAL DO ÓBITO PARA O SVO E/OU ITEP, DO SVO E/OU ITEP PARA O LOCAL DO VELÓRIO E DO LOCAL DO VELÓRIO PARA UM DOS CEMITÉRIOS DA CIDADE DO NATAL.`,

      OBESO: `FUNERAL COMPOSTO POR URNA, EDREDOM, HIGIENIZAÇÃO SIMPLES, SUPORTE PARA URNA, CASTIÇAL E TRANSLADO DENTRO DO MUNICÍPIO.

A URNA EM PINOS, COM TAMPA EM DURATEX E 2 SOBRE TAMPOS EM MDF, VISOR DE ¼, ALÇA PARREIRA, ACABAMENTO EXTERNO PADRÃO NA COR IMBUIA EM VERNIZ BRILHANTE. COM CAPACIDADE PARA ATÉ 150 KG.
MEDIDAS INTERNAS: COMPRIMENTO: 2,05 X LARGURA: 76cm X ALTURA: 35cm.
MEDIDAS EXTERNAS: COMPRIMENTO: 2,10M X LARGURA: 78cm X ALTURA: 41cm.

CHAVETAS: FECHAMENTO DO SOBRE TAMPO COM 3 CHAVETAS DOURADAS. ALÇAS: PARREIRAS ARTICULADAS DOURADAS, SENDO 3 EM CADA LATERAL DA CAIXA. ACABAMENTO INTERNO: FORRADA EM MATERIAL BIODEGRADÁVEL BRANCO, BABADO DE TECIDO DE 8 CM E TRAVESSEIRO SOLTO

O TRANSLADO DO LOCAL DO ÓBITO PARA O SVO E/OU ITEP, DO SVO E/OU ITEP PARA O LOCAL DO VELÓRIO E DO LOCAL DO VELÓRIO PARA UM DOS CEMITÉRIOS DA CIDADE DO NATAL.`,

      INFANTIL: `FUNERAL COMPOSTO DE URNA FUNERÁRIA COM FUNDO EM COMPENSADO, TAMPA EM EUCATEX E FORRO INTERIOR COMPLETO NA COR IMBUIA, COM CAPACIDADE PARA 50 KG, MEDINDO 1,50M, EDREDON, SUPORTE PARA URNA, CASTIÇAL E TRANSLADO DO LOCAL DO ÓBITO PARA O SVO E/OU ITEP DO SVO E/OU ITEP PARA O LOCAL DO VELÓRIO E DO LOCAL DO VELÓRIO PARA UM DOS CEMITÉRIOS DA CIDADE DO NATAL.`
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