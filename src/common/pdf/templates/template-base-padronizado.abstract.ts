import { Injectable } from '@nestjs/common';
import { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { IPdfTemplateConfig, IPdfTipoConteudoConfig, IPdfAssinaturaConfig } from '../interfaces/pdf-template-config.interface';
import { PdfTipoAssinatura } from '../enums/pdf-tipo-assinatura.enum';
import PdfPrinter from 'pdfmake';
import * as path from 'path';

/**
 * Template base padronizado com header e footer obrigatórios
 * Todos os templates devem herdar desta classe
 */
@Injectable()
export abstract class TemplatePadronizadoBase<T = any> {
  private printer: PdfPrinter;

  constructor() {
    this.inicializarPrinter();
  }

  /**
   * Inicializa o printer do pdfmake
   */
  private inicializarPrinter(): void {
    const fonts = {
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    };
    this.printer = new PdfPrinter(fonts);
  }
  /**
   * Configuração do template (deve ser implementada pelas classes filhas)
   */
  abstract readonly config: IPdfTemplateConfig;

  /**
   * Método abstrato para criar conteúdo específico do template
   */
  abstract criarConteudoEspecifico(dados: T): Content[];

  /**
   * Método abstrato para validar dados específicos do template
   */
  abstract validarDados(dados: T): boolean;

  /**
   * Gera o documento PDF usando pdfmake diretamente
   */
  public async gerarDocumento(dados: T): Promise<Buffer> {
    this.validarDados(dados);
    const definicao = this.criarDefinicaoDocumento(dados);
    
    return new Promise<Buffer>((resolve, reject) => {
      const pdfDoc = this.printer.createPdfKitDocument(definicao);
      const chunks: Buffer[] = [];
      
      pdfDoc.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      
      pdfDoc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      
      pdfDoc.on('error', (error: Error) => {
        reject(error);
      });
      
      pdfDoc.end();
    });
  }

  /**
   * Cria a definição completa do documento PDF com padrão obrigatório
   */
  public criarDefinicaoDocumento(dados: T): TDocumentDefinitions {
    // Validação dos dados
    if (!this.validarDados(dados)) {
      throw new Error('Dados inválidos para o template');
    }

    try {
      // Configurar imagens disponíveis
      const images: any = {};
      try {
        const logoPath = this.obterCaminhoLogo();
        if (logoPath) {
          images.logo = logoPath;
        }
      } catch (error) {
        console.warn('Logo não encontrada para configuração de imagens:', error.message);
      }

      const documentDefinition: TDocumentDefinitions = {
        pageSize: 'A4',
        pageOrientation: 'portrait',

        // Margens da página: [esquerda, superior, direita, inferior]
        pageMargins: [40, 180, 40, 40],

        // Configuração de imagens com tratamento de erro
        images: images,

        // Header padronizado obrigatório
        header: this.criarHeaderPadronizado(),

        // Footer padronizado obrigatório
        footer: this.criarFooterPadronizado(),

        // Conteúdo principal
        content: this.criarConteudoEspecifico(dados),

        // Estilos padrão
        styles: this.obterEstilosPadrao(),

        // Configurações padrão
        defaultStyle: {
          fontSize: 11,
          font: 'Helvetica',
        }
      };

      return documentDefinition;
    } catch (error) {
      throw new Error(`Erro ao criar definição do documento: ${error.message}`);
    }
  }

  /**
   * Cria o header padronizado obrigatório
   */
  private criarHeaderPadronizado(): any {
    return function (currentPage: number, pageCount: number) {
      return {
        stack: [
          { image: "logo", width: 300, alignment: "center", margin: [0, 50, 0, 10] },
          // {
          //   text: 'SECRETARIA MUNICIPAL DO TRABALHO E ASSISTÊNCIA SOCIAL',
          //   fontSize: 13,
          //   bold: true,
          //   alignment: 'center',
          //   margin: [0, 0, 0, 5]
          // },
          {
            text: 'DEPARTAMENTO DE PROTEÇÃO SOCIAL BÁSICA - DPSB',
            fontSize: 13,
            bold: true,
            alignment: 'center',
            margin: [0, 0, 0, 5]
          },
          {
            text: 'SETOR DE GESTÃO DE BENEFÍCIOS',
            fontSize: 13,
            bold: true,
            alignment: 'center',
            margin: [0, 0, 0, 20]
          }
        ]
      }
    };
  };

  /**
   * Cria o footer padronizado obrigatório
   */
  private criarFooterPadronizado(): Content {
    return {
      margin: [50, 10, 50, 10],
      stack: [
        {
          text: 'Gestão de Benefícios Eventuais/ SEMTAS - Av. Nevaldo Rocha, nº 2180 – Dix-Sept Rosado CEP: 59054-000 – Natal/RN',
          style: 'rodapeTexto',
          alignment: 'center',
          margin: [0, 5, 0, 0],
          fontSize: 9
        }
      ]
    };
  }

  /**
   * Cria seção de assinaturas baseada na configuração do template
   */
  protected criarSecaoAssinaturas(dados: T): Content[] {
    const assinaturasConfig = this.config.assinaturas;
    const maxPorLinha = assinaturasConfig.maxPorLinha || 2;
    const assinaturas: any[] = [];

    // Agrupa assinaturas em linhas (máximo 2 por linha)
    const linhasAssinaturas: PdfTipoAssinatura[][] = [];
    let linhaAtual: PdfTipoAssinatura[] = [];

    for (const tipoAssinatura of assinaturasConfig.tipos) {
      if (linhaAtual.length >= maxPorLinha) {
        linhasAssinaturas.push([...linhaAtual]);
        linhaAtual = [];
      }
      linhaAtual.push(tipoAssinatura);
    }

    if (linhaAtual.length > 0) {
      linhasAssinaturas.push(linhaAtual);
    }

    // Cria as linhas de assinatura
    for (const linha of linhasAssinaturas) {
      const colunas = linha.map(tipo => ({
        width: '*',
        stack: [
          {
            text: '_'.repeat(40),
            alignment: 'center',
            margin: [0, 20, 0, 5]
          },
          {
            text: this.obterNomeAssinatura(tipo),
            alignment: 'center',
            fontSize: 9,
            bold: true
          }
        ]
      }));

      // Preenche com colunas vazias se necessário
      while (colunas.length < maxPorLinha) {
        colunas.push({ width: '*', stack: [] });
      }

      assinaturas.push({
        columns: colunas,
        margin: [0, 20, 0, 0]
      });
    }

    return assinaturas;
  }

  /**
   * Obtém o nome da assinatura baseado no tipo
   */
  private obterNomeAssinatura(tipo: PdfTipoAssinatura): string {
    const nomes = {
      [PdfTipoAssinatura.SECRETARIA]: 'SECRETÁRIA',
      [PdfTipoAssinatura.COORDENADOR_BENEFICIOS]: 'COORDENADOR DE BENEFÍCIOS',
      [PdfTipoAssinatura.COORDENADOR_UNIDADE]: 'COORDENADOR DA UNIDADE',
      [PdfTipoAssinatura.TECNICO_RESPONSAVEL]: 'TÉCNICO RESPONSÁVEL',
      [PdfTipoAssinatura.BENEFICIARIO]: 'BENEFICIÁRIO',
      [PdfTipoAssinatura.REQUERENTE]: 'REQUERENTE',
      [PdfTipoAssinatura.TESTEMUNHA]: 'TESTEMUNHA'
    };

    return nomes[tipo] || tipo.toUpperCase();
  }

  /**
   * Obtém o caminho do logo
   */
  private obterCaminhoLogo(): string {
    try {
      // Caminho absoluto mais robusto
      const logoPath = path.resolve(process.cwd(), 'src', 'common', 'pdf', 'assets', 'logo-semtas-natal.png');
      return logoPath;
    } catch (error) {
      // Fallback para um caminho relativo se houver erro
      return path.resolve(__dirname, '../assets/logo-semtas-natal.png');
    }
  }

  /**
   * Método utilitário para criar campos opcionais com preenchimento manual
   */
  protected criarCampoOpcional(valor: string | undefined, tamanhoPreenchimento: number = 30): string {
    return valor || '_'.repeat(tamanhoPreenchimento);
  }

  /**
   * Formata CPF no padrão XXX.XXX.XXX-XX
   */
  protected formatarCpf(cpf: string): string {
    if (!cpf) return '';
    const apenasNumeros = cpf.replace(/\D/g, '');
    if (apenasNumeros.length !== 11) return cpf;
    return apenasNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  /**
   * Formata valor monetário no padrão brasileiro
   */
  protected formatarMoeda(valor: number): string {
    if (typeof valor !== 'number') return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }

  /**
   * Obtém o nome do mês em português
   */
  protected obterNomeMes(mes: number): string {
    const meses = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    return meses[mes] || 'mês inválido';
  }

  /**
   * Estilos padrão para todos os templates
   */
  private obterEstilosPadrao(): any {
    return {
      titulo: {
        fontSize: 14,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 20]
      },
      sectionTitle: {
        fontSize: 13,
        bold: true,
        margin: [0, 10, 0, 10]
      },
      label: {
        fontSize: 11,
        bold: true
      },
      value: {
        fontSize: 11
      },
      headerTitle: {
        fontSize: 14,
        bold: true,
        alignment: 'center',
        margin: [0, 5, 0, 5]
      },
      headerSubtitle: {
        fontSize: 12,
        bold: true,
        alignment: 'center',
        margin: [0, 5, 0, 5]
      },
      headerDepartment: {
        fontSize: 12,
        bold: true,
        alignment: 'center',
        margin: [0, 5, 0, 5]
      },
      headerSetor: {
        fontSize: 11,
        bold: true,
        alignment: 'center',
        margin: [0, 5, 0, 5]
      },
      rodapeTexto: {
        fontSize: 10,
        alignment: 'center'
      },
      tabelaCabecalho: {
        fontSize: 11,
        bold: true,
        fillColor: '#f0f0f0'
      },
      tabelaConteudo: {
        fontSize: 11
      }
    };
  }
}