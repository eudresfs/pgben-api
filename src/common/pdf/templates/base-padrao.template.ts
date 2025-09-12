import { Injectable } from '@nestjs/common';
import { IPdfDados, IPdfConfiguracao, IPdfTemplate, IPdfConteudo } from '../interfaces';
import { PdfTipoTemplate, PdfTipoConteudo } from '../enums';
import { ESTILOS_PADRAO, CONFIGURACAO_PADRAO } from '../constants';
import { TDocumentDefinitions } from 'pdfmake/interfaces';

/**
 * Template base padrão com cabeçalho e rodapé fixos
 * Implementa o padrão definido para todos os documentos do sistema
 */
@Injectable()
export abstract class BasePadraoTemplate implements IPdfTemplate {
  abstract nome: string;
  abstract tipo: PdfTipoTemplate;
  
  configuracaoPadrao: IPdfConfiguracao = {
    ...CONFIGURACAO_PADRAO,
    margens: [40, 80, 40, 60] as [number, number, number, number]
  };

  /**
   * Gera a definição completa do documento com padrão fixo
   * @param dados Dados do documento
   * @returns Definição do documento
   */
  gerarDefinicao(dados: IPdfDados): TDocumentDefinitions {
    return {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: this.configuracaoPadrao.margens,
      info: {
        title: dados.titulo,
        author: dados.metadados?.autor || 'Sistema PGBEN',
        subject: dados.metadados?.assunto || 'Documento do Sistema PGBEN',
        creator: 'Sistema PGBEN - Prefeitura Municipal'
      },
      defaultStyle: ESTILOS_PADRAO.texto,
      styles: ESTILOS_PADRAO,
      header: this.criarCabecalhoFixo(),
      footer: this.criarRodapeFixo(),
      content: [
        // Título do documento
        {
          text: dados.titulo,
          style: 'titulo',
          alignment: 'center',
          margin: [0, 20, 0, 30]
        },
        // Conteúdo específico do documento
        ...this.converterConteudoArray(dados.conteudo),
        // Assinaturas (se houver)
        ...(dados.assinaturas ? this.criarSecaoAssinaturas(dados.assinaturas) : [])
      ]
    };
  }

  /**
   * Cria o cabeçalho padrão fixo para todos os documentos
   * @returns Definição do cabeçalho
   */
  criarCabecalho(): any {
    // Método mantido para compatibilidade, mas usa o cabeçalho fixo
    return this.criarCabecalhoFixo();
  }

  /**
   * Cria o rodapé padrão fixo para todos os documentos
   * @returns Definição do rodapé
   */
  criarRodape(): any {
    // Método mantido para compatibilidade, mas usa o rodapé fixo
    return this.criarRodapeFixo();
  }

  /**
   * Cria o cabeçalho fixo padrão do sistema
   * @returns Definição do cabeçalho fixo
   */
  private criarCabecalhoFixo(): any {
    return function(currentPage: number, pageCount: number, pageSize: any) {
      return {
        columns: [
          {
            // Logo da prefeitura (placeholder)
            text: '🏛️',
            fontSize: 24,
            width: 60,
            alignment: 'center'
          },
          {
            // Informações da prefeitura
            stack: [
              {
                text: 'PREFEITURA MUNICIPAL',
                style: 'textoDestaque',
                fontSize: 14,
                bold: true,
                alignment: 'center'
              },
              {
                text: 'SECRETARIA DE ASSISTÊNCIA SOCIAL',
                style: 'texto',
                fontSize: 11,
                alignment: 'center',
                margin: [0, 2, 0, 0]
              },
              {
                text: 'PROGRAMA GARANTIA DE BENEFÍCIOS - PGBEN',
                style: 'texto',
                fontSize: 10,
                alignment: 'center',
                margin: [0, 2, 0, 0]
              }
            ],
            width: '*'
          },
          {
            // Data e protocolo
            stack: [
              {
                text: new Date().toLocaleDateString('pt-BR'),
                style: 'texto',
                fontSize: 9,
                alignment: 'right'
              },
              {
                text: `Protocolo: ${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                style: 'texto',
                fontSize: 8,
                alignment: 'right',
                margin: [0, 2, 0, 0]
              }
            ],
            width: 80
          }
        ],
        margin: [40, 20, 40, 20]
      };
    };
  }

  /**
   * Cria o rodapé fixo padrão do sistema
   * @returns Definição do rodapé fixo
   */
  private criarRodapeFixo(): any {
    return function(currentPage: number, pageCount: number) {
      return {
        columns: [
          {
            text: 'Documento gerado automaticamente pelo Sistema PGBEN',
            style: 'rodapeTexto',
            fontSize: 8
          },
          {
            text: `${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
            style: 'rodapeTexto',
            fontSize: 8,
            alignment: 'center'
          },
          {
            text: `Página ${currentPage} de ${pageCount}`,
            style: 'rodapeTexto',
            fontSize: 8,
            alignment: 'right'
          }
        ],
        margin: [40, 10, 40, 10]
      };
    };
  }

  /**
   * Converte array de IPdfConteudo para formato compatível com pdfmake
   * @param conteudo Array de conteúdo
   * @returns Array convertido
   */
  protected converterConteudoArray(conteudo: IPdfConteudo[]): any[] {
    return conteudo.map(item => this.converterConteudo(item));
  }

  /**
   * Converte IPdfConteudo para formato compatível com pdfmake
   * @param item Item de conteúdo
   * @returns Conteúdo convertido
   */
  protected converterConteudo(item: IPdfConteudo): any {
    switch (item.tipo) {
      case PdfTipoConteudo.TEXTO:
        return {
          text: item.dados,
          style: item.estilo || 'texto',
          margin: [0, 5, 0, 5]
        };
      case PdfTipoConteudo.TABELA:
        return {
          table: {
            headerRows: 1,
            widths: item.configuracao?.widths || ['*'],
            body: item.dados
          },
          style: item.estilo || 'tabela',
          layout: 'lightHorizontalLines',
          margin: [0, 10, 0, 10]
        };
      case PdfTipoConteudo.LISTA:
        return {
          ul: item.dados,
          style: item.estilo || 'lista',
          margin: [0, 5, 0, 5]
        };
      case PdfTipoConteudo.IMAGEM:
        return {
          image: item.dados,
          width: item.configuracao?.width || 100,
          height: item.configuracao?.height || 100,
          style: item.estilo,
          alignment: 'center',
          margin: [0, 10, 0, 10]
        };
      // Casos especiais removidos para compatibilidade de tipos
      default:
        return { text: '' };
    }
  }

  /**
   * Cria a seção de assinaturas
   * @param assinaturas Array de assinaturas
   * @returns Array com elementos de assinatura
   */
  protected criarSecaoAssinaturas(assinaturas: any[]): any[] {
    const elementos: any[] = [
      { text: '', margin: [0, 30, 0, 0] } // Espaçamento antes das assinaturas
    ];

    assinaturas.forEach((assinatura, index) => {
      elementos.push({
        columns: [
          {
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
                    lineColor: '#000000'
                  }
                ]
              },
              {
                text: assinatura.nome || 'Nome do Responsável',
                style: 'assinaturaNome'
              },
              {
                text: assinatura.cargo || 'Cargo/Função',
                style: 'assinaturaCargo'
              }
            ],
            width: 200,
            alignment: 'center'
          }
        ],
        columnGap: 50,
        margin: [0, 20, 0, 0]
      });
    });

    return elementos;
  }

  /**
   * Validação padrão dos dados
   * @param dados Dados a serem validados
   * @returns True se os dados são válidos
   */
  validarDados(dados: IPdfDados): boolean {
    return !!(dados.titulo && dados.conteudo && dados.conteudo.length > 0);
  }

  /**
   * Método abstrato para conteúdo específico do template
   * Deve ser implementado pelas classes filhas
   * @param dados Dados específicos do documento
   * @returns Array de elementos específicos
   */
  abstract criarConteudoEspecifico(dados: any): any[];
}