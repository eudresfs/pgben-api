import { Injectable } from '@nestjs/common';
import { Content } from 'pdfmake/interfaces';
import { TemplatePadronizadoBase } from '../template-base-padronizado.abstract';
import { IPdfTemplateConfig } from '../../interfaces/pdf-template-config.interface';
import { PdfTipoAssinatura } from '../../enums/pdf-tipo-assinatura.enum';
import { AutorizacaoAtaudeTemplateDto } from '../../dtos/autorizacao-ataude-template.dto';
import { TipoUrnaEnum } from '@/enums';

/**
 * Template para geração de documentos de Autorização de Ataúde
 * Segue o padrão estabelecido pela SEMTAS/Natal
 */
@Injectable()
export class AutorizacaoAtaudeTemplate extends TemplatePadronizadoBase<AutorizacaoAtaudeTemplateDto> {
  /**
   * Configuração específica do template
   */
  readonly config: IPdfTemplateConfig = {
    nome: 'AUTORIZAÇÃO DE ATAÚDE',
    tipo: 'comprovante',
    conteudo: {
      tipos: ['texto', 'paragrafo'] as any[],
      permitirCustomizacao: true
    },
    assinaturas: {
      tipos: [
        PdfTipoAssinatura.REQUERENTE,
        PdfTipoAssinatura.TECNICO_RESPONSAVEL
      ],
      maxPorLinha: 2,
      obrigatorias: [
        PdfTipoAssinatura.REQUERENTE,
        PdfTipoAssinatura.TECNICO_RESPONSAVEL
      ]
    },
    headerPadronizado: true,
    footerPadronizado: true
  };

  /**
   * Valida os dados necessários para o template
   */
  validarDados(dados: AutorizacaoAtaudeTemplateDto): boolean {
    console.log('[AutorizacaoAtaudeTemplate] Iniciando validação de dados...');
    
    if (!dados) {
      console.error('[AutorizacaoAtaudeTemplate] Dados são null ou undefined');
      return false;
    }

    console.log('[AutorizacaoAtaudeTemplate] Dados recebidos:', JSON.stringify(dados, null, 2));

    // Validações obrigatórias
    if (!dados.beneficiario?.nome || !dados.beneficiario?.cpf) {
      console.error('[AutorizacaoAtaudeTemplate] Beneficiário inválido:', {
        nome: dados.beneficiario?.nome,
        cpf: dados.beneficiario?.cpf
      });
      return false;
    }

    if (!dados.dadosAtaude?.tipoUrna) {
      console.error('[AutorizacaoAtaudeTemplate] Dados do ataúde inválidos:', {
        dadosAtaude: dados.dadosAtaude,
        tipoUrna: dados.dadosAtaude?.tipoUrna
      });
      return false;
    }

    if (!dados.unidade?.nome) {
      console.error('[AutorizacaoAtaudeTemplate] Unidade inválida:', {
        unidade: dados.unidade,
        nome: dados.unidade?.nome
      });
      return false;
    }

    if (!dados.pagamento?.solicitacao?.protocolo) {
      console.error('[AutorizacaoAtaudeTemplate] Pagamento/solicitação inválidos:', {
        pagamento: dados.pagamento,
        solicitacao: dados.pagamento?.solicitacao,
        protocolo: dados.pagamento?.solicitacao?.protocolo
      });
      return false;
    }

    console.log('[AutorizacaoAtaudeTemplate] Validação concluída com sucesso');
    return true;
  }

  /**
   * Cria o conteúdo específico do documento
   */
  criarConteudoEspecifico(dados: AutorizacaoAtaudeTemplateDto): Content[] {
    // Formatação do endereço do beneficiário
    const enderecoBeneficiario = dados.beneficiario.endereco
      ? `${dados.beneficiario.endereco.logradouro}, ${dados.beneficiario.endereco.numero || 'S/N'}, ${dados.beneficiario.endereco.bairro}, ${dados.beneficiario.endereco.cidade}/${dados.beneficiario.endereco.estado}`
      : 'Endereço não informado';

    // Dados do locador (funerária)
    const nomeFuneraria = dados.dadosAtaude.funeraria?.nome || 'FUNERÁRIA PADRE CÍCERO';
    const enderecoFuneraria = dados.dadosAtaude.funeraria?.endereco || 'RUA PRESIDENTE LEÃO VELOSO, 376. ALECRIM';

    const conteudo: Content[] = [
      // Título da autorização
      {
        text: `AUTORIZAÇÃO Nº ${dados.pagamento.solicitacao?.protocolo || dados.numeroAutorizacao || '___________'}`,
        style: 'headerSetor',
        alignment: 'center',
        margin: [0, 25, 0, 35] // Margem superior um pouco maior e inferior consistente
      },

      // Título da autorização
      {
        style: 'tabelaConteudo',
        table: {
          widths: ['auto', '*', 'auto'], // terceira coluna reservada para as datas
          body: [
            [
              { text: 'OBJETO:', bold: true },
              { text: `FUNERAL ${dados.dadosAtaude.tipoUrna?.toString().toUpperCase() || 'PADRÃO'}` },
              { text: `DATA ÓBITO: ${dados.dadosAtaude.dataObito || '__/__/_____'}`, alignment: 'right', noWrap: true }
            ],
            [
              { text: 'DESTINO:', bold: true },
              { text: nomeFuneraria },
              { text: `DATA AUTORIZAÇÃO: ${dados.dadosAtaude.dataAutorizacao || '__/__/_____'}`, alignment: 'right', noWrap: true }
            ],
            [
              { text: 'ENDEREÇO:', bold: true },
              { text: enderecoFuneraria },
              { text: '' } // vazio para não quebrar alinhamento
            ],
            [
              { text: 'ORIGEM:', bold: true },
              { text: dados.unidade.nome },
              { text: '' }
            ]
          ]
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 2,
          paddingBottom: () => 2
        }
      },
      {
        text: 'Solicitamos a prestação do serviço abaixo relacionado.',
        margin: [0, 15, 0, 15],
        style: 'value'
      },

      // Tabela com detalhes do benefício
      {
        style: 'tableExample',
        table: {
          widths: ['*', 'auto'],
          body: [
            [
              { text: `DESCRIÇÃO/${dados.dadosAtaude.tipoUrna?.toString().toUpperCase() || 'PADRÃO'}`, style: 'tabelaCabecalho', alignment: 'center' },
              { text: 'QUANTIDADE', style: 'tabelaCabecalho', alignment: 'center' }
            ],
            [
              { text: this.obterDescricaoUrna(dados.dadosAtaude.tipoUrna, dados.dadosAtaude.translado), alignment: 'justify', margin: [5, 5, 5, 5], fontSize: 10 },
              { text: '01', alignment: 'center', valign: 'middle' }
            ]
          ]
        },
        layout: {
          hLineWidth: function () { return 1; },
          vLineWidth: function () { return 1; },
          hLineColor: function () { return 'black'; },
          vLineColor: function () { return 'black'; }
        },
        margin: [0, 5, 0, 15]
      },

      // Texto de autorização principal
      {
        text: [
          { text: `Em benefício de ${dados.beneficiario.nome} (conforme atestado de óbito ou declaração médica), documento D.O. nº ${dados.dadosAtaude?.declaracaoObito || '_'.repeat(15)}. ` },
          { text: `Residente à ${dados.beneficiario.endereco?.logradouro || '_'.repeat(35)}, bairro ${dados.beneficiario.endereco?.bairro || '_'.repeat(15)} nesta cidade do Natal.` }
        ],
        margin: [0, 10, 0, 20],
        alignment: "justify",
        style: 'value'
      },

      // Dados do requerente
      {
        style: 'value',
        margin: [0, 10, 0, 20],
        table: {
          widths: ['auto', '*'],
          body: [
            [
              { text: 'REQUERENTE:', bold: true, colSpan: 2, margin: [0, 0, 0, 10] },
              {}
            ],
            [
              { text: 'Nome:', bold: true },
              { text: dados.requerente?.nome || '_'.repeat(50), noWrap: true }
            ],
            [
              { text: 'RG / CPF:', bold: true },
              { text: `${dados.requerente?.rg || '_'.repeat(15)} / ${dados.requerente?.cpf || '_'.repeat(14)}`, noWrap: true }
            ],
            [
              { text: 'Telefone:', bold: true },
              { text: dados.requerente?.telefone || '_'.repeat(15), noWrap: true }
            ],
            [
              { text: 'Grau de parentesco:', bold: true, noWrap: true },
              { text: dados.dadosAtaude?.grauParentesco || dados.requerente?.grauParentesco || '_'.repeat(20), noWrap: true }
            ]
          ]
        },
        layout: 'noBorders'
      },

      {
        text: `Residente à ${dados.requerente?.endereco?.logradouro || '_'.repeat(35)}, bairro ${dados.requerente?.endereco?.bairro || '_'.repeat(20)} nesta cidade do Natal.`
      },

      // Observações (se houver)
      ...(dados.dadosAtaude.observacoes ? [{
        text: [
          { text: 'OBSERVAÇÕES: ', bold: true },
          { text: dados.dadosAtaude.observacoes }
        ],
        margin: [0, 10, 0, 30] as [number, number, number, number],
        style: 'value',
        lineHeight: 1.5
      }] : []),

      // Seção de assinaturas
      ...this.criarSecaoAssinaturas(dados)
    ];

    return conteudo;
  }

  /**
   * Obtém a descrição detalhada da urna baseada no tipo
   * @param tipoUrna - Tipo da urna (ESPECIAL, PADRAO, OBESO, INFANTIL)
   * @param translado - Informações do translado
   * @returns Descrição completa da urna e serviços inclusos
   */
  private obterDescricaoUrna(tipoUrna: TipoUrnaEnum, translado?: string): string {
    const tipoUrnaString = tipoUrna?.toString().toUpperCase() || 'PADRAO';
    const transladoTexto = translado || 'no município de Natal';

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

TRASLADO: ${transladoTexto}`,

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

TRASLADO: ${transladoTexto}`,

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

TRASLADO: ${transladoTexto}`,

      INFANTIL: `FUNERAL COMPOSTO POR: urna infantil, edredom, suporte para urna, castiçais e traslado no município de Natal.

URNA MORTUÁRIA
- Caixa: fundo em compensado, tampa em eucatex, forro interior completo.
- Acabamento externo: cor imbuia.
- Capacidade: até 50 kg.
- Medida: 1,50m de comprimento.

TRASLADO: ${transladoTexto}`
    };

    return descricoes[tipoUrnaString] || descricoes.PADRAO;
  }

  /**
   * Formata valor monetário
   * @param valor Valor a ser formatado
   * @returns Valor formatado
   */
  protected formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  }
}