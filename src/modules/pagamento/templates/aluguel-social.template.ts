import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { IDadosComprovante } from '../interfaces/comprovante-pdf.interface';
import { TipoComprovante } from '../dtos/gerar-comprovante.dto';

/**
 * Template específico para comprovantes de Aluguel Social
 * Segue exatamente a especificação definida no documento de referência
 */
export class AluguelSocialTemplate {
  public readonly tipo = TipoComprovante.ALUGUEL_SOCIAL;

  /**
   * Cria a definição completa do documento PDF para Aluguel Social
   * @param dados Dados do comprovante
   * @returns Definição do documento PDF
   */
  public criarDefinicaoDocumento(dados: IDadosComprovante): TDocumentDefinitions {
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

    // Dados específicos do aluguel social - endereço do imóvel
    const endereco = dados.beneficiario.endereco
      ? `${dados.beneficiario.endereco.logradouro}, 
        ${dados.beneficiario.endereco.numero || 'S/N'}, ${dados.beneficiario.endereco.bairro}, ${dados.beneficiario.endereco.cidade}/${dados.beneficiario.endereco.estado}, ${dados.beneficiario.endereco.cep}`
      : '_________________________________________________________';

    // Dados do locador - TODO: Implementar busca do locador nos dados do pagamento
    // Por enquanto, usando valores placeholder até que os dados do locador sejam disponibilizados
    const nomeCompletoLocador = '_________________________________'; // TODO: Buscar dados do locador
    const cpfFormatadoLocador = '__________________'; // TODO: Buscar CPF do locador

    return {
      pageSize: 'A4',
      pageMargins: [50, 60, 50, 60],
      content: [
        { 
          text: 'RECIBO DE PAGAMENTO DO ALUGUEL SOCIAL', 
          style: 'title', 
          margin: [0, 0, 0, 30] 
        },
        { 
          text: `Eu ${nomeCompletoLocador}, CPF ${cpfFormatadoLocador}, recebi do(da) Sr.(a) ${nomeCompletoBeneficiario}, CPF ${cpfFormatadoBeneficiario}, a importância de ${valorParcela} como forma de pagamento do Aluguel, localizado no endereço ${endereco} referente ao mês de ${mesNominal} de ${ano}, dando plena, total e irrevogável quitação.`, 
          margin: [0, 0, 0, 50],
          alignment: 'justify',
          lineHeight: 1.5
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
      ],
      styles: {
        title: { fontSize: 13, bold: true, alignment: 'center' }
      }
    };
  }

  /**
   * Formata CPF no padrão XXX.XXX.XXX-XX
   */
  private formatarCpf(cpf: string): string {
    if (!cpf) return 'Não informado';
    const apenasNumeros = cpf.replace(/\D/g, '');
    if (apenasNumeros.length !== 11) return cpf;
    return apenasNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  /**
   * Formata valor monetário no padrão brasileiro
   */
  private formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  }

  /**
   * Obtém o nome do mês
   */
  private obterNomeMes(mes: number): string {
    const meses = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    return meses[mes];
  }
}