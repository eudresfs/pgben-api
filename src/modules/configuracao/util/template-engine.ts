import * as Handlebars from 'handlebars';
import { TemplateInvalidoException } from '../exceptions';

/**
 * Motor de renderização de templates baseado em Handlebars.
 * Fornece funcionalidades para renderizar templates com variáveis,
 * condicionais e loops, além de helpers para formatação.
 */
export class TemplateEngine {
  // Armazena templates compilados em cache para melhor performance
  private static templatesCompilados = new Map<
    string,
    HandlebarsTemplateDelegate
  >();

  constructor() {
    // Garantir que os helpers estejam registrados
    TemplateEngine.inicializar();
  }

  /**
   * Registra os helpers personalizados do Handlebars.
   * Executado uma vez na inicialização.
   */
  /**
   * Compila um template para uso posterior
   *
   * @param templateString - String contendo o template com placeholders
   * @returns Template compilado pronto para renderização
   * @throws Error se a compilação falhar
   */
  compile(templateString: string): any {
    try {
      return Handlebars.compile(templateString, { strict: false });
    } catch (error) {
      throw new Error(`Erro na compilação do template: ${error.message}`);
    }
  }

  /**
   * Renderiza um template com os dados fornecidos
   *
   * @param templateString - String contendo o template com placeholders
   * @param dados - Objeto com dados para substituir os placeholders
   * @param opcoes - Opções adicionais como sanitização
   * @returns String com o template renderizado
   */
  async render(
    templateString: string,
    dados: Record<string, any>,
    opcoes: { sanitize?: boolean } = {},
  ): Promise<string> {
    try {
      // Se solicitado, sanitiza os dados para prevenir XSS
      const dadosFinal = opcoes.sanitize
        ? TemplateEngine.sanitizarDados(dados)
        : dados;

      // Compila o template
      const template = this.compile(templateString);

      // Renderiza com os dados
      return template(dadosFinal);
    } catch (error) {
      throw new Error(`Erro na renderização do template: ${error.message}`);
    }
  }

  static inicializar(): void {
    // Helper para formatação de data
    Handlebars.registerHelper(
      'formatarData',
      function (data: Date | string, formato: string) {
        if (!data) {
          return '';
        }

        const dataObj = data instanceof Date ? data : new Date(data);
        if (isNaN(dataObj.getTime())) {
          return data;
        }

        // Formato padrão DD/MM/YYYY
        if (!formato || formato === 'data') {
          return `${dataObj.getDate().toString().padStart(2, '0')}/${(dataObj.getMonth() + 1).toString().padStart(2, '0')}/${dataObj.getFullYear()}`;
        }

        // Formato data e hora DD/MM/YYYY HH:MM
        if (formato === 'dataHora') {
          return `${dataObj.getDate().toString().padStart(2, '0')}/${(dataObj.getMonth() + 1).toString().padStart(2, '0')}/${dataObj.getFullYear()} ${dataObj.getHours().toString().padStart(2, '0')}:${dataObj.getMinutes().toString().padStart(2, '0')}`;
        }

        return data;
      },
    );

    // Helper para formatação de moeda
    Handlebars.registerHelper('formatarMoeda', function (valor: number) {
      if (valor === undefined || valor === null) {
        return '';
      }

      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(valor);
    });

    // Helper para formatação de CPF: XXX.XXX.XXX-XX
    Handlebars.registerHelper('formatarCpf', function (cpf: string) {
      if (!cpf || typeof cpf !== 'string') {
        return cpf;
      }

      // Remove caracteres não numéricos
      const cpfNumerico = cpf.replace(/\D/g, '');

      // Verifica se tem 11 dígitos
      if (cpfNumerico.length !== 11) {
        return cpf;
      }

      // Formato: XXX.XXX.XXX-XX
      return `${cpfNumerico.substring(0, 3)}.${cpfNumerico.substring(3, 6)}.${cpfNumerico.substring(6, 9)}-${cpfNumerico.substring(9, 11)}`;
    });

    // Helper para formatação de texto maiúsculo
    Handlebars.registerHelper('maiusculo', function (texto: string) {
      if (!texto) {
        return '';
      }
      return texto.toUpperCase();
    });

    // Helper para formatação de texto minúsculo
    Handlebars.registerHelper('minusculo', function (texto: string) {
      if (!texto) {
        return '';
      }
      return texto.toLowerCase();
    });

    // Helper para formatação de primeira letra maiúscula
    Handlebars.registerHelper('capitalizar', function (texto: string) {
      if (!texto) {
        return '';
      }
      return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
    });
  }

  /**
   * Renderiza um template com os dados fornecidos.
   *
   * @param templateString - String contendo o template com placeholders
   * @param dados - Objeto com dados para substituir os placeholders
   * @param templateId - Identificador do template (para cache e mensagens de erro)
   * @returns String com o template renderizado
   * @throws TemplateInvalidoException se a renderização falhar
   */
  static renderizar(
    templateString: string,
    dados: Record<string, any>,
    templateId: string,
  ): string {
    try {
      // Tenta obter o template compilado do cache
      let templateCompilado = this.templatesCompilados.get(templateId);

      // Se não existir no cache, compila e armazena
      if (!templateCompilado) {
        templateCompilado = Handlebars.compile(templateString, {
          strict: false,
        });
        this.templatesCompilados.set(templateId, templateCompilado);
      }

      // Renderiza o template com os dados
      return templateCompilado(dados);
    } catch (error) {
      // Em caso de erro, lança exceção específica
      throw new TemplateInvalidoException(
        templateId,
        `Erro na renderização: ${error.message}`,
      );
    }
  }

  /**
   * Sanitiza dados antes da renderização para prevenir ataques XSS.
   *
   * @param dados - Objeto com dados a serem sanitizados
   * @returns Objeto com dados sanitizados
   */
  static sanitizarDados(dados: Record<string, any>): Record<string, any> {
    const resultado: Record<string, any> = {};

    // Função recursiva para sanitizar strings em objetos aninhados
    const sanitizarValor = (valor: any): any => {
      if (typeof valor === 'string') {
        // Escapa códigos HTML para prevenir XSS
        return Handlebars.escapeExpression(valor);
      } else if (Array.isArray(valor)) {
        return valor.map(sanitizarValor);
      } else if (valor !== null && typeof valor === 'object') {
        const obj: Record<string, any> = {};
        for (const key in valor) {
          if (Object.prototype.hasOwnProperty.call(valor, key)) {
            obj[key] = sanitizarValor(valor[key]);
          }
        }
        return obj;
      }
      return valor;
    };

    // Aplica sanitização a todas as propriedades do objeto
    for (const key in dados) {
      if (Object.prototype.hasOwnProperty.call(dados, key)) {
        resultado[key] = sanitizarValor(dados[key]);
      }
    }

    return resultado;
  }

  /**
   * Valida a existência de variáveis usadas no template.
   *
   * @param templateString - String contendo o template com placeholders
   * @param variaveis - Array de nomes de variáveis disponíveis
   * @returns Array de variáveis não definidas (vazio se todas existirem)
   */
  static validarVariaveis(
    templateString: string,
    variaveis: string[],
  ): string[] {
    // Expressão regular para encontrar variáveis no formato {{variavel}}
    // Ignora helpers, condicionais e loops ({{#if}}, {{#each}}, {{formatarData}})
    const regex = /{{([^#/][^{}]+)}}/g;
    const matches = templateString.matchAll(regex);
    const variaveisEncontradas = new Set<string>();

    // Coleta todas as variáveis encontradas no template
    for (const match of matches) {
      const variavel = match[1].trim().split(' ')[0];
      // Ignora helpers e operadores
      if (
        !variavel.startsWith('formatarData') &&
        !variavel.startsWith('formatarMoeda') &&
        !variavel.startsWith('formatarCpf') &&
        !variavel.startsWith('maiusculo') &&
        !variavel.startsWith('minusculo') &&
        !variavel.startsWith('capitalizar') &&
        !variavel.includes('.')
      ) {
        variaveisEncontradas.add(variavel);
      }
    }

    // Verifica quais variáveis encontradas não estão disponíveis
    const variaveisNaoDefinidas: string[] = [];
    for (const variavel of variaveisEncontradas) {
      if (!variaveis.includes(variavel)) {
        variaveisNaoDefinidas.push(variavel);
      }
    }

    return variaveisNaoDefinidas;
  }
}
