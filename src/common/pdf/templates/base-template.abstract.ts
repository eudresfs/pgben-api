import { Injectable } from '@nestjs/common';
import { IPdfTemplate, IPdfDados, IPdfConfiguracao, IPdfAssinatura } from '../interfaces';
import { CONFIGURACAO_PADRAO } from '../constants';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { PdfTipoTemplate } from '../enums';

/**
 * Classe base abstrata para templates de PDF
 * Implementa padrão de cabeçalho/rodapé fixo mantendo variáveis: título, conteúdo, assinaturas
 */
@Injectable()
export abstract class BaseTemplate implements IPdfTemplate {
  abstract nome: string;
  abstract tipo: PdfTipoTemplate;
  
  configuracaoPadrao: IPdfConfiguracao = {
    ...CONFIGURACAO_PADRAO,
    margens: [30, 60, 30, 60] as [number, number, number, number]
  };

  /**
   * Método abstrato para gerar conteúdo específico do template
   */
  abstract gerarConteudoEspecifico(dados: IPdfDados): any[];

  /**
   * Gera a definição completa do documento com padrão fixo
   */
  gerarDefinicao(dados: IPdfDados, configuracao?: IPdfConfiguracao): TDocumentDefinitions {
    const config = { ...this.configuracaoPadrao, ...configuracao };
    
    return {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: config.margens,
      info: {
        title: dados.titulo || this.nome,
        author: 'Sistema PGBEN - SEMTAS',
        subject: 'Comprovante de Benefício',
        creator: 'Sistema PGBEN'
      },
      header: this.criarCabecalho(dados),
      footer: this.criarRodape(dados),
      content: [
        // Título principal (variável)
        {
          text: dados.titulo || this.nome,
          style: 'titulo',
          alignment: 'center',
          margin: [0, 0, 0, 30]
        },
        
        // Conteúdo específico do template (variável)
        ...this.gerarConteudoEspecifico(dados),
        
        // Espaçamento antes das assinaturas
        { text: '', margin: [0, 30, 0, 0] },
        
        // Assinaturas (variável baseada na configuração)
        ...this.gerarAssinaturas(dados)
      ],
      styles: this.obterEstilos()
    };
  }

  /**
   * Cria cabeçalho padrão fixo
   */
  criarCabecalho(dados: IPdfDados): any {
    return function(currentPage: number, pageCount: number) {
      return {
        columns: [
          {
            image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // Logo placeholder
            width: 60,
            height: 40,
            margin: [0, 10, 0, 0]
          },
          {
            stack: [
              {
                text: 'SECRETARIA MUNICIPAL DE TRABALHO E ASSISTÊNCIA SOCIAL',
                style: 'cabecalhoSubtitulo',
                alignment: 'center'
              },
              {
                text: 'SEMTAS',
                style: 'cabecalhoSigla',
                alignment: 'center'
              }
            ],
            width: '*',
            margin: [0, 5, 0, 0]
          },
          {
            stack: [
              {
                text: `Emitido em:`,
                style: 'cabecalhoData',
                alignment: 'right'
              },
              {
                text: new Date().toLocaleDateString('pt-BR'),
                style: 'cabecalhoDataValor',
                alignment: 'right'
              }
            ],
            width: 100,
            margin: [0, 10, 0, 0]
          }
        ],
        margin: [30, 20, 30, 20]
      };
    };
  }

  /**
   * Cria rodapé padrão fixo
   */
  criarRodape(dados: IPdfDados): any {
    return function(currentPage: number, pageCount: number) {
      return {
        columns: [
          {
            text: 'Este documento foi gerado automaticamente pelo Sistema PGBEN',
            style: 'rodapeTexto',
            alignment: 'left'
          },
          {
            text: `Página ${currentPage} de ${pageCount}`,
            style: 'rodapeTexto',
            alignment: 'right'
          }
        ],
        margin: [30, 10, 30, 10]
      };
    };
  }

  /**
   * Cria seção de assinaturas baseada na configuração
   */
  protected criarAssinaturas(configAssinaturas?: IPdfAssinatura[] | { beneficiario: boolean; tecnico: boolean; testemunha: boolean }): any[] {
    if (!configAssinaturas) {
      return [];
    }

    const assinaturas: any[] = [];

    // Verificar se é array de IPdfAssinatura ou objeto de configuração
    if (Array.isArray(configAssinaturas)) {
      // Formato novo: array de IPdfAssinatura
      configAssinaturas.forEach(assinatura => {
        assinaturas.push(
          {
            text: '_________________________________',
            style: 'assinatura',
            margin: [0, 40, 0, 5]
          },
          {
            text: assinatura.nome || this.obterNomeAssinatura(assinatura.tipo),
            style: 'assinatura',
            fontSize: 10
          }
        );
      });
    } else {
      // Formato antigo: objeto com propriedades boolean
      const configObj = configAssinaturas as { beneficiario: boolean; tecnico: boolean; testemunha: boolean };
      
      // Adicionar assinatura do beneficiário
      if (configObj.beneficiario) {
        assinaturas.push(
          {
            text: '_________________________________',
            style: 'assinatura',
            margin: [0, 40, 0, 5]
          },
          {
            text: 'Assinatura do Beneficiário',
            style: 'assinatura',
            fontSize: 10
          }
        );
      }

      // Adicionar assinatura do técnico
      if (configObj.tecnico) {
        assinaturas.push(
          {
            text: '_________________________________',
            style: 'assinatura',
            margin: [0, 40, 0, 5]
          },
          {
            text: 'Assinatura do Técnico Responsável',
            style: 'assinatura',
            fontSize: 10
          }
        );
      }

      // Adicionar assinatura da testemunha
      if (configObj.testemunha) {
        assinaturas.push(
          {
            text: '_________________________________',
            style: 'assinatura',
            margin: [0, 40, 0, 5]
          },
          {
            text: 'Assinatura da Testemunha',
            style: 'assinatura',
            fontSize: 10
          }
        );
      }
    }

    return assinaturas;
  }

  /**
   * Obtém nome padrão para tipo de assinatura
   */
  private obterNomeAssinatura(tipo: string): string {
    switch (tipo) {
      case 'beneficiario':
        return 'Assinatura do Beneficiário';
      case 'tecnico':
        return 'Assinatura do Técnico Responsável';
      case 'requerente':
        return 'Assinatura do Requerente';
      default:
        return 'Assinatura';
    }
  }

  /**
   * Gera seção de assinaturas baseada na configuração (variável)
   */
  protected gerarAssinaturas(dados: IPdfDados): any[] {
    const configAssinaturas = dados.assinaturas || {
      beneficiario: true,
      tecnico: true,
      testemunha: false
    };

    return this.criarAssinaturas(configAssinaturas);
  }

  /**
   * Define estilos padrão para todos os templates
   */
  protected obterEstilos(): any {
    return {
      // Estilos do cabeçalho
      cabecalhoTitulo: {
        fontSize: 14,
        bold: true,
        color: '#1976D2'
      },
      cabecalhoSubtitulo: {
        fontSize: 10,
        color: '#424242'
      },
      cabecalhoSigla: {
        fontSize: 12,
        bold: true,
        color: '#1976D2'
      },
      cabecalhoData: {
        fontSize: 9,
        color: '#666666'
      },
      cabecalhoDataValor: {
        fontSize: 10,
        bold: true,
        color: '#424242'
      },
      
      // Estilos do conteúdo
      titulo: {
        fontSize: 16,
        bold: true,
        color: '#1976D2'
      },
      subtitulo: {
        fontSize: 14,
        bold: true,
        color: '#424242',
        margin: [0, 20, 0, 10]
      },
      texto: {
        fontSize: 11,
        lineHeight: 1.3
      },
      textoDestaque: {
        fontSize: 12,
        bold: true,
        color: '#2E7D32'
      },
      valorDestaque: {
        fontSize: 14,
        bold: true,
        color: '#2E7D32'
      },
      
      // Estilos das assinaturas
      assinatura: {
        fontSize: 10,
        alignment: 'center',
        margin: [0, 0, 0, 10]
      },
      
      // Estilos do rodapé
      rodapeTexto: {
        fontSize: 8,
        color: '#666666'
      }
    };
  }

  /**
   * Validação básica de dados
   */
  validarDados(dados: IPdfDados): boolean {
    return !!(dados && dados.titulo);
  }
}