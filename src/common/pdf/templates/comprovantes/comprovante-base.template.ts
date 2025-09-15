import { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { IDadosComprovante, IComprovanteTemplate } from '../../interfaces/comprovante-pdf.interface';

/**
 * Classe base para templates de comprovantes PDF
 */
export abstract class ComprovanteBaseTemplate {
  /**
   * Cria o cabeçalho padrão do comprovante
   * @param dados Dados do comprovante
   * @param template Configuração do template
   * @returns Conteúdo do cabeçalho
   */
  protected criarCabecalho(
    dados: IDadosComprovante,
    template: IComprovanteTemplate,
  ): Content {
    const stackContent: any[] = [
      {
        text: dados.unidade.nome,
        style: 'header',
        alignment: 'center',
      },
      {
        text: template.titulo,
        style: 'title',
        alignment: 'center',
        margin: [0, 10, 0, 5] as [number, number, number, number],
      },
    ];

    if (template.subtitulo) {
      stackContent.push({
        text: template.subtitulo,
        style: 'subtitle',
        alignment: 'center',
        margin: [0, 0, 0, 20] as [number, number, number, number],
      });
    }

    return {
      columns: [
        {
          width: '*',
          stack: stackContent,
        },
      ],
    };
  }

  /**
   * Cria a seção de informações do beneficiário
   * @param dados Dados do comprovante
   * @returns Conteúdo da seção do beneficiário
   */
  protected criarSecaoBeneficiario(dados: IDadosComprovante): Content {
    const endereco = dados.beneficiario.endereco;
    let enderecoCompleto = 'Endereço não informado';
    
    if (endereco) {
      enderecoCompleto = `${endereco.logradouro}, ${endereco.numero}${
        endereco.complemento ? `, ${endereco.complemento}` : ''
      }, ${endereco.bairro}, ${endereco.cidade}/${endereco.estado} - CEP: ${endereco.cep}`;
    }

    const leftColumn: any[] = [
      {
        text: [
          { text: 'Nome: ', style: 'label' },
          { text: dados.beneficiario.nome, style: 'value' },
        ],
        margin: [0, 0, 0, 5] as [number, number, number, number],
      },
      {
        text: [
          { text: 'CPF: ', style: 'label' },
          { text: dados.beneficiario.cpf, style: 'value' },
        ],
        margin: [0, 0, 0, 5] as [number, number, number, number],
      },
    ];

    if (dados.beneficiario.rg) {
      leftColumn.push({
        text: [
          { text: 'RG: ', style: 'label' },
          { text: dados.beneficiario.rg, style: 'value' },
        ],
        margin: [0, 0, 0, 5] as [number, number, number, number],
      });
    }

    const rightColumn: any[] = [
      {
        text: [
          { text: 'Endereço: ', style: 'label' },
          { text: enderecoCompleto, style: 'value' },
        ],
        margin: [0, 0, 0, 5] as [number, number, number, number],
      },
    ];

    if (dados.beneficiario.contatos?.telefone) {
      rightColumn.push({
        text: [
          { text: 'Telefone: ', style: 'label' },
          { text: dados.beneficiario.contatos.telefone, style: 'value' },
        ],
        margin: [0, 0, 0, 5] as [number, number, number, number],
      });
    }

    if (dados.beneficiario.contatos?.email) {
      rightColumn.push({
        text: [
          { text: 'Email: ', style: 'label' },
          { text: dados.beneficiario.contatos.email, style: 'value' },
        ],
        margin: [0, 0, 0, 5] as [number, number, number, number],
      });
    }

    return {
      stack: [
        {
          text: 'DADOS DO BENEFICIÁRIO',
          style: 'sectionHeader',
          margin: [0, 20, 0, 10],
        },
        {
          columns: [
            {
              width: '50%',
              stack: leftColumn,
            },
            {
              width: '50%',
              stack: rightColumn,
            },
          ],
        },
      ],
    };
  }

  /**
   * Cria a seção de informações do pagamento
   * @param dados Dados do comprovante
   * @returns Conteúdo da seção do pagamento
   */
  protected criarSecaoPagamento(dados: IDadosComprovante): Content {
    const valorFormatado = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(dados.pagamento.valor);

    // Validar e converter data de liberação
    let dataFormatada = 'Data não informada';
    if (dados.pagamento.dataLiberacao) {
      try {
        const dataLiberacao = new Date(dados.pagamento.dataLiberacao);
        if (!isNaN(dataLiberacao.getTime())) {
          dataFormatada = new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }).format(dataLiberacao);
        }
      } catch (error) {
        console.warn('Erro ao formatar data de liberação:', error);
      }
    }

    return {
      stack: [
        {
          text: 'DADOS DO PAGAMENTO',
          style: 'sectionHeader',
          margin: [0, 20, 0, 10],
        },
        {
          columns: [
            {
              width: '50%',
              stack: [
                {
                  text: [
                    { text: 'Benefício: ', style: 'label' },
                    { text: dados.pagamento.tipoBeneficio.nome, style: 'value' },
                  ],
                  margin: [0, 0, 0, 5] as [number, number, number, number],
                },
                {
                  text: [
                    { text: 'Valor: ', style: 'label' },
                    { text: valorFormatado, style: 'valueHighlight' },
                  ],
                  margin: [0, 0, 0, 5] as [number, number, number, number],
                },
                {
                  text: [
                    { text: 'Data de Liberação: ', style: 'label' },
                    { text: dataFormatada, style: 'value' },
                  ],
                  margin: [0, 0, 0, 5] as [number, number, number, number],
                },
              ],
            },
            {
              width: '50%',
              stack: [
                {
                  text: [
                    { text: 'Método de Pagamento: ', style: 'label' },
                    { text: dados.pagamento.metodoPagamento, style: 'value' },
                  ],
                  margin: [0, 0, 0, 5] as [number, number, number, number],
                },
                ...(dados.pagamento.numeroParcela && dados.pagamento.totalParcelas
                  ? [{
                      text: [
                        { text: 'Parcela: ', style: 'label' },
                        {
                          text: `${dados.pagamento.numeroParcela}/${dados.pagamento.totalParcelas}`,
                          style: 'value',
                        },
                      ],
                      margin: [0, 0, 0, 5] as [number, number, number, number],
                    }]
                  : []),
                {
                  text: [
                    { text: 'Status: ', style: 'label' },
                    { text: dados.pagamento.status, style: 'value' },
                  ],
                  margin: [0, 0, 0, 5] as [number, number, number, number],
                },
              ],
            },
          ],
        },
      ],
    };
  }

  /**
   * Cria a seção de dados bancários (se disponível)
   * @param dados Dados do comprovante
   * @returns Conteúdo da seção de dados bancários
   */
  protected criarSecaoDadosBancarios(dados: IDadosComprovante): Content {
    if (!dados.dadosBancarios) {
      return { text: '' };
    }

    const leftColumn: any[] = [];
    const rightColumn: any[] = [];

    if (dados.dadosBancarios.banco) {
      leftColumn.push({
        text: [
          { text: 'Banco: ', style: 'label' },
          { text: dados.dadosBancarios.banco, style: 'value' },
        ],
        margin: [0, 0, 0, 5] as [number, number, number, number],
      });
    }

    if (dados.dadosBancarios.agencia) {
      leftColumn.push({
        text: [
          { text: 'Agência: ', style: 'label' },
          { text: dados.dadosBancarios.agencia, style: 'value' },
        ],
        margin: [0, 0, 0, 5] as [number, number, number, number],
      });
    }

    if (dados.dadosBancarios.conta) {
      rightColumn.push({
        text: [
          { text: 'Conta: ', style: 'label' },
          { text: dados.dadosBancarios.conta, style: 'value' },
        ],
        margin: [0, 0, 0, 5] as [number, number, number, number],
      });
    }

    if (dados.dadosBancarios.chavePix) {
      rightColumn.push({
        text: [
          { text: 'Chave PIX: ', style: 'label' },
          { text: dados.dadosBancarios.chavePix, style: 'value' },
        ],
        margin: [0, 0, 0, 5] as [number, number, number, number],
      });
    }

    return {
      stack: [
        {
          text: 'DADOS BANCÁRIOS',
          style: 'sectionHeader',
          margin: [0, 20, 0, 10],
        },
        {
          columns: [
            {
              width: '50%',
              stack: leftColumn,
            },
            {
              width: '50%',
              stack: rightColumn,
            },
          ],
        },
      ],
    };
  }

  /**
   * Cria a seção de assinaturas
   * @param dados Dados do comprovante
   * @param template Configuração do template
   * @returns Conteúdo da seção de assinaturas
   */
  protected criarSecaoAssinaturas(
    dados: IDadosComprovante,
    template: IComprovanteTemplate,
  ): Content {
    const assinaturas: Content[] = [];

    if (template.camposAssinatura.beneficiario) {
      assinaturas.push({
        columns: [
          {
            width: '45%',
            stack: [
              {
                canvas: [
                  {
                    type: 'line',
                    x1: 0,
                    y1: 0,
                    x2: 200,
                    y2: 0,
                    lineWidth: 1,
                  },
                ],
                margin: [0, 40, 0, 5],
              },
              {
                text: `${dados.beneficiario.nome}\nBeneficiário`,
                style: 'signature',
                alignment: 'center',
              },
            ],
          },
          { width: '10%', text: '' },
          {
            width: '45%',
            stack: [
              {
                canvas: [
                  {
                    type: 'line',
                    x1: 0,
                    y1: 0,
                    x2: 200,
                    y2: 0,
                    lineWidth: 1,
                  },
                ],
                margin: [0, 40, 0, 5],
              },
              {
                text: 'Data: ___/___/______',
                style: 'signature',
                alignment: 'center',
              },
            ],
          },
        ],
        margin: [0, 30, 0, 0],
      });
    }

    if (template.camposAssinatura.tecnico && dados.tecnico) {
      assinaturas.push({
        columns: [
          {
            width: '45%',
            stack: [
              {
                canvas: [
                  {
                    type: 'line',
                    x1: 0,
                    y1: 0,
                    x2: 200,
                    y2: 0,
                    lineWidth: 1,
                  },
                ],
                margin: [0, 40, 0, 5],
              },
              {
                text: `${dados.tecnico.nome}\n${dados.tecnico.cargo || 'Técnico Responsável'}`,
                style: 'signature',
                alignment: 'center',
              },
            ],
          },
          { width: '10%', text: '' },
          {
            width: '45%',
            stack: [
              {
                canvas: [
                  {
                    type: 'line',
                    x1: 0,
                    y1: 0,
                    x2: 200,
                    y2: 0,
                    lineWidth: 1,
                  },
                ],
                margin: [0, 40, 0, 5],
              },
              {
                text: dados.tecnico.matricula
                  ? `Matrícula: ${dados.tecnico.matricula}`
                  : 'Matrícula: _______________',
                style: 'signature',
                alignment: 'center',
              },
            ],
          },
        ],
        margin: [0, 30, 0, 0],
      });
    }

    if (template.camposAssinatura.testemunha) {
      assinaturas.push({
        columns: [
          {
            width: '45%',
            stack: [
              {
                canvas: [
                  {
                    type: 'line',
                    x1: 0,
                    y1: 0,
                    x2: 200,
                    y2: 0,
                    lineWidth: 1,
                  },
                ],
                margin: [0, 40, 0, 5],
              },
              {
                text: 'Testemunha\nNome: _________________________',
                style: 'signature',
                alignment: 'center',
              },
            ],
          },
          { width: '10%', text: '' },
          {
            width: '45%',
            stack: [
              {
                canvas: [
                  {
                    type: 'line',
                    x1: 0,
                    y1: 0,
                    x2: 200,
                    y2: 0,
                    lineWidth: 1,
                  },
                ],
                margin: [0, 40, 0, 5],
              },
              {
                text: 'CPF: ___.___.___-__',
                style: 'signature',
                alignment: 'center',
              },
            ],
          },
        ],
        margin: [0, 30, 0, 0],
      });
    }

    return {
      stack: [
        {
          text: 'ASSINATURAS',
          style: 'sectionHeader',
          margin: [0, 30, 0, 20],
        },
        ...assinaturas,
      ],
    };
  }

  /**
   * Cria o rodapé do comprovante
   * @param dados Dados do comprovante
   * @param template Configuração do template
   * @returns Conteúdo do rodapé
   */
  protected criarRodape(
    dados: IDadosComprovante,
    template: IComprovanteTemplate,
  ): Content {
    // Validar e converter data de geração
    let dataGeracao = 'Data não informada';
    if (dados.dataGeracao) {
      try {
        const dataGeracaoObj = new Date(dados.dataGeracao);
        if (!isNaN(dataGeracaoObj.getTime())) {
          dataGeracao = new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }).format(dataGeracaoObj);
        }
      } catch (error) {
        console.warn('Erro ao formatar data de geração:', error);
      }
    }

    const stackContent: any[] = [];
    
    if (template.rodape) {
      stackContent.push({
        text: template.rodape,
        style: 'footer',
        alignment: 'center',
        margin: [0, 30, 0, 10],
      });
    }
    
    stackContent.push({
      columns: [
        {
          width: '50%',
          text: dados.numeroComprovante
            ? `Comprovante: ${dados.numeroComprovante}`
            : '',
          style: 'footerInfo',
        },
        {
          width: '50%',
          text: `Gerado em: ${dataGeracao}`,
          style: 'footerInfo',
          alignment: 'right',
        },
      ],
      margin: [0, 20, 0, 0],
    });

    return {
      stack: stackContent,
    };
  }

  /**
   * Define os estilos padrão para o documento
   * @returns Objeto com definições de estilos
   */
  protected obterEstilos() {
    return {
      header: {
        fontSize: 16,
        bold: true,
        color: '#2c3e50',
      },
      title: {
        fontSize: 18,
        bold: true,
        color: '#34495e',
      },
      subtitle: {
        fontSize: 12,
        italics: true,
        color: '#7f8c8d',
      },
      sectionHeader: {
        fontSize: 12,
        bold: true,
        color: '#2c3e50',
        decoration: 'underline' as any,
      },
      label: {
        fontSize: 10,
        bold: true,
        color: '#34495e',
      },
      value: {
        fontSize: 10,
        color: '#2c3e50',
      },
      valueHighlight: {
        fontSize: 12,
        bold: true,
        color: '#e74c3c',
      },
      signature: {
        fontSize: 9,
        color: '#7f8c8d',
      },
      footer: {
        fontSize: 8,
        italics: true,
        color: '#95a5a6',
      },
      footerInfo: {
        fontSize: 8,
        color: '#7f8c8d',
      },
    };
  }

  /**
   * Método abstrato que deve ser implementado pelas classes filhas
   * para criar o conteúdo específico do template
   */
  abstract criarConteudoEspecifico(dados: IDadosComprovante): Content;

  /**
   * Cria a definição completa do documento PDF
   * @param dados Dados do comprovante
   * @param template Configuração do template
   * @returns Definição do documento para o pdfmake
   */
  public criarDefinicaoDocumento(
    dados: IDadosComprovante,
    template: IComprovanteTemplate,
  ): TDocumentDefinitions {
    return {
      content: [
        this.criarCabecalho(dados, template),
        this.criarSecaoBeneficiario(dados),
        this.criarSecaoPagamento(dados),
        this.criarSecaoDadosBancarios(dados),
        this.criarConteudoEspecifico(dados),
        this.criarSecaoAssinaturas(dados, template),
        this.criarRodape(dados, template),
      ],
      styles: this.obterEstilos(),
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      info: {
        title: `${template.titulo} - ${dados.beneficiario.nome}`,
        author: dados.unidade.nome,
        subject: `Comprovante de ${template.titulo}`,
        creator: 'Sistema PGBEN',
        producer: 'Sistema PGBEN',
      },
    };
  }
}