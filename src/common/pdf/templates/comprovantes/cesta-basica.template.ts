import { Injectable } from '@nestjs/common';
import { Content } from 'pdfmake/interfaces';
import { TemplatePadronizadoBase } from '../template-base-padronizado.abstract';
import { IPdfTemplateConfig } from '../../interfaces/pdf-template-config.interface';
import { PdfTipoConteudo } from '../../enums/pdf-tipo-conteudo.enum';
import { PdfTipoAssinatura } from '../../enums/pdf-tipo-assinatura.enum';
import { CestaBasicaTemplateDto } from '../../dtos/cesta-basica-template.dto';
import { PdfTipoTemplate } from '../../enums';

/**
 * Template padronizado para comprovantes de Cesta Básica
 * Utiliza header e footer padronizados obrigatórios
 */
@Injectable()
export class CestaBasicaTemplate extends TemplatePadronizadoBase<CestaBasicaTemplateDto> {
  public readonly tipo = PdfTipoTemplate.CESTA_BASICA;

  /**
   * Configuração do template de cesta básica
   */
  public readonly config: IPdfTemplateConfig = {
    nome: 'Comprovante de Cesta Básica',
    tipo: PdfTipoTemplate.CESTA_BASICA,
    conteudo: {
      tipos: [
        PdfTipoConteudo.TEXTO,
        PdfTipoConteudo.TABELA,
        PdfTipoConteudo.PARAGRAFO
      ],
      permitirCustomizacao: false
    },
    assinaturas: {
      tipos: [
        PdfTipoAssinatura.TECNICO_RESPONSAVEL
      ],
      maxPorLinha: 1,
      obrigatorias: [
        PdfTipoAssinatura.TECNICO_RESPONSAVEL
      ]
    },
    headerPadronizado: true,
    footerPadronizado: true
  };

  /**
   * Valida os dados específicos do template de cesta básica
   */
  public validarDados(dados: CestaBasicaTemplateDto): boolean {
    return !!(dados?.beneficiario?.nome &&
      dados?.beneficiario?.cpf &&
      dados?.unidade?.nome &&
      dados?.pagamento?.valor);
  }

  /**
   * Cria o conteúdo específico do comprovante de cesta básica
   */
  public criarConteudoEspecifico(dados: CestaBasicaTemplateDto): Content[] {
    const nomeCompleto = dados.beneficiario.nome;
    const cpfFormatado = this.formatarCpf(dados.beneficiario.cpf);
    const rg = dados.beneficiario.rg || this.criarCampoOpcional(undefined, 20);
    const nomeUnidade = dados.unidade.nome;
    const quantidadeParcelas = dados.pagamento.numeroParcela || 1;
    const totalParcelas = dados.pagamento.totalParcelas || 1;
    const quantidadeParcelasNominal = this.converterNumeroParaNominal(quantidadeParcelas);
    const totalParcelasNominal = this.converterNumeroParaNominal(totalParcelas);
    // Data atual formatada
    const agora = new Date();
    const mes = this.obterNomeMes(agora.getMonth());
    const ano = agora.getFullYear().toString();

    return [
      // Título do documento - replicando exatamente do template original
      { text: "RECIBO DE ENTREGA DE CESTA(S) BÁSICA(S)", style: "headerSubtitle", margin: [0, 30, 0, 30] },
      
      {
        table: {
          widths: ["*", "*"], // duas colunas de largura flexível
          body: [
            [
              { text: `Nome do Beneficiário: ${nomeCompleto.toUpperCase()}`, colSpan: 2, border: [true, true, true, true], margin: [5, 5], fontSize: 12 },
              {} // célula vazia porque o colSpan ocupa as duas colunas
            ],
            [
              { text: `CPF: ${cpfFormatado}`, border: [true, true, false, true], margin: [5, 5], fontSize: 12 },
              { text: `RG: ${rg}`, border: [false, true, true, true], margin: [5, 5], fontSize: 12 }
            ],
            [
              { text: `Concessão: ${quantidadeParcelas}ª/${totalParcelas}ª`, border: [true, true, false, true], margin: [5, 5], fontSize: 12 },
              { text: `Nº do Memorando: ${dados.pagamento?.solicitacao?.protocolo || 'N/A'}`, border: [false, true, true, true], margin: [5, 5], fontSize: 12 }
            ]
          ]
        },
        layout: {
          hLineWidth: function (i, node) { return 1; },
          vLineWidth: function (i, node) { return 1; },
          hLineColor: function (i, node) { return "black"; },
          vLineColor: function (i, node) { return "black"; }
        }
      },
      {
        text: `Atesto ter recebido da Secretaria Municipal do Trabalho e Assistência Social (SEMTAS), por meio do ${nomeUnidade}, ${quantidadeParcelas}/${totalParcelas} (${quantidadeParcelasNominal} de ${totalParcelasNominal}) cesta(s) básica(s), ofertada enquanto benefício eventual da assistência social.`,
        alignment: "justify",
        margin: [0, 30, 0, 20],
        lineHeight: 1.5,
        fontSize: 12
      },

      { 
          text: "Assinatura legível do recebedor: ________________________________________", 
          margin: [0, 10, 0, 10],
          alignment: "justify",
          fontSize: 12
      },
      
      { 
          text: "CPF ou RG: _______________________________________________________", 
          margin: [0, 0, 0, 20],
          alignment: "justify",
          fontSize: 12
      },
      
      { text: "Foi o próprio beneficiário a quem foi entregue o benefício: (   ) Sim      (   ) Não", margin: [0, 10, 0, 10], fontSize: 12 },
      { text: "Se não, qual o grau de parentesco a quem foi entregue: ___________________________", margin: [0, 0, 0, 30], fontSize: 12 },

      { 
          text: `Natal, ___ de ${mes} de ${ano}`, 
          margin: [0, 40, 0, 40], 
          alignment: "center",
          fontSize: 12
      },

      // Adicionar seção de assinaturas usando o método da classe base
      ...this.criarSecaoAssinaturas(dados)
    ];
  }

  /**
   * Converte número para nominal
   */
  private converterNumeroParaNominal(numero: number): string {
    const nominais = {
      1: 'primeira', 2: 'segunda', 3: 'terceira', 4: 'quarta', 5: 'quinta',
      6: 'sexta', 7: 'sétima', 8: 'oitava', 9: 'nona', 10: 'décima'
    };
    return nominais[numero] || numero.toString();
  }
}