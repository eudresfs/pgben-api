import { Injectable, Logger } from '@nestjs/common';
import { IPdfDados, IPdfConfiguracao, IPdfTemplate, IPdfConteudo } from '../interfaces';
import { PdfTipoTemplate, PdfTipoConteudo } from '../enums';
import { ESTILOS_PADRAO, CONFIGURACAO_PADRAO, MENSAGENS_ERRO, MENSAGENS_LOG } from '../constants';
// import { ComprovanteCestaBasicaTemplate, ComprovanteAluguelSocialTemplate } from '../templates';
import { TDocumentDefinitions } from 'pdfmake/interfaces';

/**
 * Implementação base para templates de PDF
 */
abstract class BaseTemplate implements IPdfTemplate {
  abstract nome: string;
  abstract tipo: PdfTipoTemplate;
  abstract configuracaoPadrao: IPdfConfiguracao;

  abstract gerarDefinicao(dados: IPdfDados): TDocumentDefinitions;
  abstract criarCabecalho(dados: IPdfDados): any;
  abstract criarRodape(dados: IPdfDados): any;
  abstract validarDados(dados: IPdfDados): boolean;

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
          style: item.estilo || 'texto'
        };
      case PdfTipoConteudo.TABELA:
        return {
          table: {
            body: item.dados
          },
          style: item.estilo || 'tabela'
        };
      case PdfTipoConteudo.LISTA:
        return {
          ul: item.dados,
          style: item.estilo || 'lista'
        };
      case PdfTipoConteudo.IMAGEM:
        return {
          image: item.dados,
          width: item.configuracao?.width || 100,
          height: item.configuracao?.height || 100,
          style: item.estilo
        };
      default:
        return { text: '' };
    }
  }
}

/**
 * Template padrão do sistema
 */
class TemplatePadrao extends BaseTemplate {
  nome = 'Template Padrão';
  tipo = PdfTipoTemplate.PADRAO;
  configuracaoPadrao = CONFIGURACAO_PADRAO;

  gerarDefinicao(dados: IPdfDados): TDocumentDefinitions {
    return {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [40, 60, 40, 60],
      info: {
        title: dados.titulo,
        author: dados.metadados?.autor || 'Sistema PGBEN'
      },
      defaultStyle: ESTILOS_PADRAO.texto,
      styles: ESTILOS_PADRAO,
      content: [
        { text: dados.titulo, style: 'header' },
        { text: '', margin: [0, 20, 0, 0] },
        ...this.converterConteudoArray(dados.conteudo)
      ]
    };
  }

  criarCabecalho(dados: IPdfDados): any {
    return {
      text: dados.titulo,
      style: 'header',
      alignment: 'center',
      margin: [0, 20, 0, 20]
    };
  }

  criarRodape(dados: IPdfDados): any {
    return function(currentPage: number, pageCount: number) {
      return {
        text: `Página ${currentPage} de ${pageCount}`,
        style: 'rodapeTexto',
        alignment: 'center',
        margin: [0, 10, 0, 10]
      };
    };
  }

  validarDados(dados: IPdfDados): boolean {
    return !!(dados.titulo && dados.conteudo && dados.conteudo.length > 0);
  }
}

/**
 * Template para relatórios
 */
class TemplateRelatorio extends BaseTemplate {
  nome = 'Template Relatório';
  tipo = PdfTipoTemplate.RELATORIO;
  configuracaoPadrao = {
    ...CONFIGURACAO_PADRAO,
    margens: [50, 80, 50, 80] as [number, number, number, number]
  };

  gerarDefinicao(dados: IPdfDados): TDocumentDefinitions {
    return {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [50, 80, 50, 80],
      info: {
        title: dados.titulo,
        author: dados.metadados?.autor || 'Sistema PGBEN',
        subject: 'Relatório do Sistema PGBEN'
      },
      defaultStyle: ESTILOS_PADRAO.texto,
      styles: ESTILOS_PADRAO,
      content: [
        { text: 'RELATÓRIO', style: 'header', alignment: 'center' },
        { text: dados.titulo, style: 'subheader', alignment: 'center' },
        { text: '', margin: [0, 30, 0, 0] },
        ...this.converterConteudoArray(dados.conteudo)
      ]
    };
  }

  criarCabecalho(dados: IPdfDados): any {
    return {
      columns: [
        {
          text: 'Sistema PGBEN',
          style: 'textoDestaque',
          fontSize: 10
        },
        {
          text: `Data: ${new Date().toLocaleDateString('pt-BR')}`,
          style: 'texto',
          fontSize: 10,
          alignment: 'right'
        }
      ],
      margin: [50, 20, 50, 20]
    };
  }

  criarRodape(dados: IPdfDados): any {
    return function(currentPage: number, pageCount: number) {
      return {
        columns: [
          {
            text: 'Documento gerado automaticamente',
            style: 'rodapeTexto',
            fontSize: 8
          },
          {
            text: `${currentPage}/${pageCount}`,
            style: 'rodapeTexto',
            fontSize: 8,
            alignment: 'right'
          }
        ],
        margin: [50, 10, 50, 10]
      };
    };
  }

  validarDados(dados: IPdfDados): boolean {
    return !!(dados.titulo && dados.conteudo && dados.conteudo.length > 0);
  }
}

/**
 * Template para documentos oficiais
 */
class TemplateDocumento extends BaseTemplate {
  nome = 'Template Documento';
  tipo = PdfTipoTemplate.DOCUMENTO;
  configuracaoPadrao = {
    ...CONFIGURACAO_PADRAO,
    margens: [40, 60, 40, 60] as [number, number, number, number]
  };

  gerarDefinicao(dados: IPdfDados): TDocumentDefinitions {
    return {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [40, 60, 40, 60],
      info: {
        title: dados.titulo,
        author: dados.metadados?.autor || 'Sistema PGBEN',
        subject: 'Documento Oficial'
      },
      defaultStyle: ESTILOS_PADRAO.texto,
      styles: ESTILOS_PADRAO,
      content: [
        { text: 'PREFEITURA MUNICIPAL', style: 'header', alignment: 'center' },
        { text: 'PROGRAMA GARANTIA DE BENEFÍCIOS', style: 'subheader', alignment: 'center' },
        { text: '', margin: [0, 20, 0, 0] },
        { text: dados.titulo, style: 'titulo', alignment: 'center' },
        { text: '', margin: [0, 20, 0, 0] },
        ...this.converterConteudoArray(dados.conteudo)
      ]
    };
  }

  criarCabecalho(dados: IPdfDados): any {
    return {
      columns: [
        {
          image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          width: 50,
          height: 50
        },
        {
          text: [
            { text: 'PREFEITURA MUNICIPAL\n', style: 'textoDestaque', fontSize: 12 },
            { text: 'Secretaria de Assistência Social', style: 'texto', fontSize: 10 }
          ],
          alignment: 'center',
          margin: [0, 10, 50, 0]
        }
      ],
      margin: [40, 20, 40, 20]
    };
  }

  criarRodape(dados: IPdfDados): any {
    return function(currentPage: number, pageCount: number) {
      return {
        text: `Documento emitido em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} - Página ${currentPage} de ${pageCount}`,
        style: 'rodapeTexto',
        alignment: 'center',
        margin: [40, 10, 40, 10]
      };
    };
  }

  validarDados(dados: IPdfDados): boolean {
    return !!(dados.titulo && dados.conteudo && dados.conteudo.length > 0);
  }
}

/**
 * Template para comprovantes
 */
class TemplateComprovante extends BaseTemplate {
  nome = 'Template Comprovante';
  tipo = PdfTipoTemplate.COMPROVANTE;
  configuracaoPadrao = {
    ...CONFIGURACAO_PADRAO,
    margens: [30, 40, 30, 40] as [number, number, number, number]
  };

  gerarDefinicao(dados: IPdfDados): TDocumentDefinitions {
    return {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [30, 40, 30, 40],
      info: {
        title: dados.titulo,
        author: dados.metadados?.autor || 'Sistema PGBEN',
        subject: 'Comprovante'
      },
      defaultStyle: ESTILOS_PADRAO.texto,
      styles: ESTILOS_PADRAO,
      content: [
        { text: 'COMPROVANTE', style: 'header', alignment: 'center' },
        { text: dados.titulo, style: 'subheader', alignment: 'center' },
        { text: '', margin: [0, 15, 0, 0] },
        ...this.converterConteudoArray(dados.conteudo)
      ]
    };
  }

  criarCabecalho(dados: IPdfDados): any {
    return {
      text: `Protocolo: ${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      style: 'texto',
      alignment: 'right',
      margin: [30, 10, 30, 10]
    };
  }

  criarRodape(dados: IPdfDados): any {
    return function(currentPage: number, pageCount: number) {
      return {
        text: `Este documento foi gerado automaticamente em ${new Date().toLocaleString('pt-BR')}`,
        style: 'rodapeTexto',
        alignment: 'center',
        margin: [30, 10, 30, 10]
      };
    };
  }

  validarDados(dados: IPdfDados): boolean {
    return !!(dados.titulo && dados.conteudo && dados.conteudo.length > 0);
  }
}

/**
 * Serviço para gerenciamento de templates de PDF
 */
@Injectable()
export class PdfTemplateService {
  private readonly logger = new Logger(PdfTemplateService.name);
  private templates: Map<PdfTipoTemplate, IPdfTemplate> = new Map();

  constructor() {
    this.inicializarTemplates();
  }

  /**
   * Inicializa os templates disponíveis
   */
  private inicializarTemplates(): void {
    this.templates.set(PdfTipoTemplate.PADRAO, new TemplatePadrao());
    this.templates.set(PdfTipoTemplate.RELATORIO, new TemplateRelatorio());
    this.templates.set(PdfTipoTemplate.DOCUMENTO, new TemplateDocumento());
    this.templates.set(PdfTipoTemplate.COMPROVANTE, new TemplateComprovante());
    
    // Templates específicos para comprovantes
    // this.templates.set(PdfTipoTemplate.CESTA_BASICA, new ComprovanteCestaBasicaTemplate());
    // this.templates.set(PdfTipoTemplate.ALUGUEL_SOCIAL, new ComprovanteAluguelSocialTemplate());
    // TODO: Implementar templates quando estiverem disponíveis

    this.logger.log(`${this.templates.size} templates inicializados`);
  }

  /**
   * Obtém um template pelo tipo
   * @param tipo Tipo do template
   * @returns Template encontrado
   */
  obterTemplate(tipo: PdfTipoTemplate): IPdfTemplate {
    const template = this.templates.get(tipo);
    if (!template) {
      this.logger.error(`Template não encontrado: ${tipo}`);
      throw new Error(MENSAGENS_ERRO.TEMPLATE_NAO_ENCONTRADO);
    }

    this.logger.log(MENSAGENS_LOG.CARREGANDO_TEMPLATE);
    return template;
  }

  /**
   * Lista todos os templates disponíveis
   * @returns Array com informações dos templates
   */
  listarTemplates(): Array<{ tipo: PdfTipoTemplate; nome: string }> {
    return Array.from(this.templates.entries()).map(([tipo, template]) => ({
      tipo,
      nome: template.nome
    }));
  }

  /**
   * Valida se um template pode processar os dados fornecidos
   * @param tipo Tipo do template
   * @param dados Dados a serem validados
   * @returns True se os dados são válidos
   */
  validarDadosParaTemplate(tipo: PdfTipoTemplate, dados: IPdfDados): boolean {
    const template = this.obterTemplate(tipo);
    return template.validarDados(dados);
  }

  /**
   * Registra um novo template customizado
   * @param tipo Tipo do template
   * @param template Implementação do template
   */
  registrarTemplate(tipo: PdfTipoTemplate, template: IPdfTemplate): void {
    this.templates.set(tipo, template);
    this.logger.log(`Template customizado registrado: ${tipo}`);
  }

  /**
   * Gera a definição do documento usando um template específico
   * @param tipo Tipo do template
   * @param dados Dados do documento
   * @returns Definição do documento
   */
  gerarDefinicaoComTemplate(tipo: PdfTipoTemplate, dados: IPdfDados): TDocumentDefinitions {
    this.logger.log(MENSAGENS_LOG.APLICANDO_TEMPLATE);
    
    const template = this.obterTemplate(tipo);
    
    if (!template.validarDados(dados)) {
      throw new Error(MENSAGENS_ERRO.DADOS_INVALIDOS);
    }

    return template.gerarDefinicao(dados);
  }
}