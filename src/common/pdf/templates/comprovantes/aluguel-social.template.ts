import { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { TemplatePadronizadoBase } from '../template-base-padronizado.abstract';
import { AluguelSocialTemplateDto } from '../../dtos/aluguel-social-template.dto';
import { PdfTipoConteudo } from '../../enums/pdf-tipo-conteudo.enum';
import { PdfTipoAssinatura } from '../../enums/pdf-tipo-assinatura.enum';
import { IPdfTemplateConfig } from '../../interfaces/pdf-template-config.interface';

/**
 * Template específico para comprovantes de Aluguel Social
 * Estende a base padronizada com header e footer centralizados
 */
export class AluguelSocialTemplate extends TemplatePadronizadoBase<AluguelSocialTemplateDto> {
  /**
   * Configuração específica do template de aluguel social
   */
  readonly config: IPdfTemplateConfig = {
    nome: 'Aluguel Social',
    tipo: 'comprovante',
    conteudo: {
      tipos: [PdfTipoConteudo.TEXTO, PdfTipoConteudo.TABELA]
    },
    assinaturas: {
      tipos: [PdfTipoAssinatura.BENEFICIARIO, PdfTipoAssinatura.LOCADOR, PdfTipoAssinatura.TECNICO_RESPONSAVEL],
      maxPorLinha: 2
    },
    headerPadronizado: true,
    footerPadronizado: true
  };

  /**
   * Valida os dados específicos do template de aluguel social
   */
  validarDados(dados: AluguelSocialTemplateDto): boolean {
    return !!(dados.beneficiario?.nome && dados.beneficiario?.cpf && dados.pagamento?.valor);
  }

  /**
   * Cria o conteúdo específico do template de aluguel social
   */
  criarConteudoEspecifico(dados: AluguelSocialTemplateDto): Content[] {
    // Formatação de dados do beneficiário (locatário)
    const nomeCompletoBeneficiario = dados.beneficiario.nome || 'Não informado';
    const cpfFormatadoBeneficiario = this.formatarCpf(dados.beneficiario.cpf) || 'Não informado';
    const valorParcela = this.formatarMoeda(dados.pagamento.valor);

    // Data atual formatada
    const agora = new Date();
    const data = agora.getDate().toString().padStart(2, '0');
    const mes = this.obterNomeMes(agora.getMonth());
    const ano = agora.getFullYear().toString();
    const mesNominal = this.obterNomeMes(agora.getMonth());

    // Dados específicos do aluguel social - endereço do imóvel pretendido
    const enderecoObj = dados.imovel?.endereco
      ? (() => {
        try {
          return JSON.parse(dados.imovel.endereco);
        } catch {
          return null;
        }
      })()
      : dados.beneficiario?.endereco ?? null;

    let endereco = '_'.repeat(50);

    if (enderecoObj) {
      const partes = [
        enderecoObj.logradouro,
        enderecoObj.numero || (enderecoObj.logradouro ? 'S/N' : null), // só põe S/N se tiver logradouro
        enderecoObj.bairro,
        enderecoObj.cidade && enderecoObj.estado
          ? `${enderecoObj.cidade}/${enderecoObj.estado}`
          : enderecoObj.cidade || enderecoObj.estado,
        enderecoObj.cep,
      ].filter(Boolean);

      if (partes.length > 0) {
        endereco = partes.join(', ');
      }
    }

    // Dados do locador obtidos da entidade DadosAluguelSocial
    const nomeCompletoLocador = dados.locador?.nome || '_'.repeat(20);
    const cpfFormatadoLocador = dados.locador?.cpf || '_'.repeat(11);

    return [
      {
        text: 'RECIBO DE PAGAMENTO DO ALUGUEL SOCIAL',
        style: 'headerSetor',
        alignment: 'center',
        margin: [0, 20, 0, 30]
      },
      {
        text: `Eu ${nomeCompletoLocador}, CPF ${cpfFormatadoLocador}, recebi do(da) Sr.(a) ${nomeCompletoBeneficiario}, CPF ${cpfFormatadoBeneficiario}, a importância de R$ _______ como forma de pagamento do Aluguel, localizado no endereço ${endereco} referente ao mês de ${mesNominal} de ${ano}, dando plena, total e irrevogável quitação.`,
        margin: [0, 0, 0, 50],
        alignment: 'justify',
        lineHeight: 1.5,
        fontSize: 12
      },
      {
        table: {
          widths: ['*', '*'], // duas colunas de largura flexível
          body: [
            [
              {
                text: 'ASSINATURA DO LOCADOR:',
                colSpan: 2,
                border: [true, true, true, true],
                margin: [3, 3],
                fillColor: '#f0f0f0'
              },
              {} // célula vazia porque o colSpan ocupa as duas colunas
            ],
            [
              {
                text: '',
                colSpan: 2,
                border: [true, true, true, true],
                margin: [3, 20] // espaço para assinatura
              },
              {}
            ],
            [
              {
                text: 'ASSINATURA DO LOCATÁRIO:',
                colSpan: 2,
                border: [true, true, true, true],
                margin: [3, 3],
                fillColor: '#f0f0f0'
              },
              {}
            ],
            [
              {
                text: '',
                colSpan: 2,
                border: [true, true, true, true],
                margin: [3, 20] // espaço para assinatura
              },
              {}
            ]
          ]
        },
        layout: {
          hLineWidth: function (i, node) { return 1; },
          vLineWidth: function (i, node) { return 1; },
          hLineColor: function (i, node) { return 'black'; },
          vLineColor: function (i, node) { return 'black'; }
        }
      },
      {
        text: `Natal, ${data} de ${mes} de ${ano}`,
        alignment: 'right',
        margin: [0, 50, 0, 0]
      }
    ];
  }


}