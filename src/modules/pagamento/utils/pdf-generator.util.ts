import { Injectable } from '@nestjs/common';
import PdfPrinter from 'pdfmake';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import {
  IDadosComprovante,
  IComprovanteTemplate,
  IComprovantePdfService,
} from '../interfaces/comprovante-pdf.interface';
import {
  CestaBasicaTemplate,
  AluguelSocialTemplate,
} from '../../../common/pdf/templates/comprovantes';
import { TipoComprovante } from '../dtos/gerar-comprovante.dto';
import { CestaBasicaTemplateDto } from '../../../common/pdf/dtos/cesta-basica-template.dto';
import { AluguelSocialTemplateDto } from '../../../common/pdf/dtos/aluguel-social-template.dto';

/**
 * Utilitário para geração de PDFs de comprovantes
 * Implementa a interface IComprovantePdfService
 */
@Injectable()
export class PdfGeneratorUtil implements IComprovantePdfService {
  private readonly printer: any;
  private readonly fonts = {
    Helvetica: {
      normal: 'Helvetica',
      bold: 'Helvetica-Bold',
      italics: 'Helvetica-Oblique',
      bolditalics: 'Helvetica-BoldOblique',
    },
    Roboto: {
      normal: 'Helvetica',
      bold: 'Helvetica-Bold',
      italics: 'Helvetica-Oblique',
      bolditalics: 'Helvetica-BoldOblique',
    },
  };

  constructor() {
    this.printer = new PdfPrinter(this.fonts);
  }

  /**
   * Gera um comprovante em PDF baseado nos dados fornecidos
   * @param dados Dados para preenchimento do comprovante
   * @param template Configuração do template a ser utilizado
   * @returns Promise<Buffer> Buffer do PDF gerado
   */
  async gerarComprovante(
    dados: IDadosComprovante,
    template: IComprovanteTemplate,
  ): Promise<Buffer> {
    try {
      const documentDefinition = this.criarDefinicaoDocumento(dados, template);
      
      return new Promise((resolve, reject) => {
        const pdfDoc = this.printer.createPdfKitDocument(documentDefinition);
        const chunks: Buffer[] = [];
        
        pdfDoc.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
        
        pdfDoc.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve(buffer);
        });
        
        pdfDoc.on('error', (error: Error) => {
          reject(error);
        });
        
        pdfDoc.end();
      });
    } catch (error) {
      throw new Error(`Erro ao gerar PDF: ${error.message}`);
    }
  }

  /**
   * Cria a definição do documento PDF para o pdfmake
   * @param dados Dados para preenchimento
   * @param template Configuração do template
   * @returns TDocumentDefinitions Definição do documento para o pdfmake
   */
  criarDefinicaoDocumento(
    dados: IDadosComprovante,
    template: IComprovanteTemplate,
  ): TDocumentDefinitions {
    const tipo = template.tipo as TipoComprovante;
    const dadosTemplate = this.converterDadosParaTemplate(dados, tipo);
    
    switch (tipo) {
      case TipoComprovante.CESTA_BASICA:
        const cestaBasicaTemplate = new CestaBasicaTemplate();
        return cestaBasicaTemplate.criarDefinicaoDocumento(dadosTemplate as CestaBasicaTemplateDto);
      
      case TipoComprovante.ALUGUEL_SOCIAL:
        const aluguelSocialTemplate = new AluguelSocialTemplate();
        return aluguelSocialTemplate.criarDefinicaoDocumento(dadosTemplate as AluguelSocialTemplateDto);
      
      default:
        throw new Error(`Tipo de comprovante não suportado: ${tipo}`);
    }
  }

  /**
   * Obtém a instância do template baseado no tipo
   * @param tipo Tipo do comprovante
   * @returns Instância do template apropriado
   */
  private obterInstanciaTemplate(tipo: TipoComprovante) {
    switch (tipo) {
      case TipoComprovante.CESTA_BASICA:
        return new CestaBasicaTemplate();
      case TipoComprovante.ALUGUEL_SOCIAL:
        return new AluguelSocialTemplate();
      default:
        throw new Error(`Tipo de comprovante não suportado: ${tipo}`);
    }
  }

  /**
   * Cria a configuração de template baseada no tipo de benefício
   * @param tipoBeneficio Tipo do benefício
   * @returns Configuração do template
   */
  public criarConfiguracao(
    tipoBeneficio: string,
  ): IComprovanteTemplate {
    const tipoBeneficioLower = tipoBeneficio.toLowerCase();
    
    if (tipoBeneficioLower.includes('cesta') || tipoBeneficioLower.includes('básica')) {
      return {
        tipo: TipoComprovante.CESTA_BASICA,
        titulo: 'COMPROVANTE DE RECEBIMENTO - CESTA BÁSICA',
        subtitulo: 'Programa de Segurança Alimentar e Nutricional',
        rodape: 'Este documento comprova o recebimento do benefício de Cesta Básica conforme programa municipal de assistência social.',
        camposAssinatura: {
          beneficiario: true,
          tecnico: true,
          testemunha: false,
        },
      };
    }
    
    if (tipoBeneficioLower.includes('aluguel') || tipoBeneficioLower.includes('social')) {
      return {
        tipo: TipoComprovante.ALUGUEL_SOCIAL,
        titulo: 'COMPROVANTE DE RECEBIMENTO - ALUGUEL SOCIAL',
        subtitulo: 'Programa Habitacional de Interesse Social',
        rodape: 'Este documento comprova o recebimento do benefício de Aluguel Social conforme programa municipal habitacional.',
        camposAssinatura: {
          beneficiario: true,
          tecnico: true,
          testemunha: false,
        },
      };
    }
    
    // Template padrão para outros tipos de benefício
    return {
      tipo: TipoComprovante.CESTA_BASICA, // Usar como padrão
      titulo: `COMPROVANTE DE RECEBIMENTO - ${tipoBeneficio.toUpperCase()}`,
      subtitulo: 'Programa de Assistência Social',
      rodape: 'Este documento comprova o recebimento do benefício conforme programa municipal de assistência social.',
      camposAssinatura: {
        beneficiario: true,
        tecnico: true,
        testemunha: false,
      },
    };
  }

  /**
   * Gera o nome do arquivo PDF baseado nos dados do comprovante
   * @param dados Dados do comprovante
   * @param template Configuração do template
   * @returns Nome do arquivo
   */
  public gerarNomeArquivo(
    dados: IDadosComprovante,
    template: IComprovanteTemplate,
  ): string {
    const dataFormatada = new Intl.DateTimeFormat('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(dados.dataGeracao).replace(/\//g, '-');
    
    const nomeBeneficiario = dados.beneficiario.nome
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    const tipoComprovante = template.tipo.replace('_', '-');
    
    return `comprovante_${tipoComprovante}_${nomeBeneficiario}_${dataFormatada}.pdf`;
  }

  /**
   * Converte buffer PDF para base64
   * @param pdfBuffer Buffer do PDF
   * @returns String em base64
   */
  public converterParaBase64(pdfBuffer: Buffer): string {
    return pdfBuffer.toString('base64');
  }

  /**
   * Valida se todos os dados obrigatórios estão presentes
   * @param dados Dados do comprovante
   */
  public validarDados(dados: IDadosComprovante): void {
    // Validar apenas campos essenciais mínimos
    const camposEssenciais = [
      'beneficiario.nome',
      'beneficiario.cpf',
      'pagamento.valor',
      'unidade.nome',
    ];

    // Validar campos básicos obrigatórios
    for (const campo of camposEssenciais) {
      const valor = this.obterValorPorCaminho(dados, campo);
      if (valor === undefined || valor === null || valor === '') {
        throw new Error(`Campo obrigatório ausente: ${campo}`);
      }
    }

    // Validação específica para aluguel social
    const tipoBeneficio = dados.pagamento?.tipoBeneficio?.nome?.toLowerCase() || '';
    if (tipoBeneficio.includes('aluguel') || tipoBeneficio.includes('moradia')) {
      // Para aluguel social, validar apenas se os dados existem quando fornecidos
      if (dados.locador && (!dados.locador.nome || !dados.locador.cpf)) {
        console.warn('Dados do locador incompletos para aluguel social');
      }
    }
  }

  /**
   * Obtém valor de um objeto usando notação de ponto
   * @param obj Objeto fonte
   * @param caminho Caminho do campo (ex: 'beneficiario.nome')
   * @returns Valor do campo
   */
  private obterValorPorCaminho(obj: any, caminho: string): any {
    return caminho.split('.').reduce((atual, prop) => atual?.[prop], obj);
  }

  /**
   * Calcula o tamanho estimado do PDF em bytes
   * @param dados Dados do comprovante
   * @returns Tamanho estimado em bytes
   */
  public calcularTamanhoEstimado(dados: IDadosComprovante): number {
    // Estimativa baseada no conteúdo
    const baseSize = 50000; // 50KB base
    const contentFactor = JSON.stringify(dados).length * 10;
    return baseSize + contentFactor;
  }

  /**
   * Converte dados do formato antigo para o novo formato de template
   * @param dados Dados no formato antigo
   * @param tipo Tipo do comprovante
   * @returns Dados no formato do novo template
   */
  private converterDadosParaTemplate(dados: IDadosComprovante, tipo: TipoComprovante): CestaBasicaTemplateDto | AluguelSocialTemplateDto {
    // Função auxiliar para converter endereço
    const converterEndereco = (endereco: any) => {
      if (typeof endereco === 'string') {
        return {
          logradouro: endereco,
          numero: '',
          complemento: '',
          bairro: '',
          cidade: '',
          estado: '',
          cep: ''
        };
      }
      return {
        logradouro: endereco?.logradouro || '',
        numero: endereco?.numero || '',
        complemento: endereco?.complemento || '',
        bairro: endereco?.bairro || '',
        cidade: endereco?.cidade || '',
        estado: endereco?.estado || '',
        cep: endereco?.cep || ''
      };
    };

    const dadosBase = {
      beneficiario: {
        nome: dados.beneficiario?.nome || '',
        cpf: dados.beneficiario?.cpf || '',
        rg: dados.beneficiario?.rg || '',
        endereco: converterEndereco(dados.beneficiario?.endereco)
      },
      unidade: {
        nome: dados.unidade?.nome || '',
        endereco: converterEndereco(dados.unidade?.endereco),
        telefone: dados.unidade?.telefone || '',
        email: dados.unidade?.email || ''
      },
      pagamento: {
        id: dados.pagamento?.id || 'PAG-' + Date.now(),
        valor: dados.pagamento?.valor || 0,
        numeroParcela: dados.pagamento?.numeroParcela || 1,
        totalParcelas: dados.pagamento?.totalParcelas || 1,
        dataLiberacao: dados.pagamento?.dataLiberacao || new Date(),
        metodoPagamento: dados.pagamento?.metodoPagamento || 'Depósito',
        solicitacao: {
          protocolo: dados.pagamento?.solicitacao?.protocolo,
          dadosEspecificos: dados.pagamento?.solicitacao?.dadosEspecificos || {}
        }
      },
      observacoes: dados.observacoes || ''
    };

    switch (tipo) {
      case TipoComprovante.CESTA_BASICA:
        return {
          ...dadosBase,
          dadosEspecificos: {
            solicitacao_id: dados.pagamento?.solicitacao?.protocolo || undefined,
            prioridade: dados.pagamento?.solicitacao?.dadosEspecificos?.prioridade || undefined,
            quantidade_cestas_solicitadas: dados.pagamento?.solicitacao?.dadosEspecificos?.quantidade_cestas_solicitadas || 1,
            quantidade_parcelas: dados.pagamento?.totalParcelas || undefined,
            origem_atendimento: dados.pagamento?.solicitacao?.dadosEspecificos?.origem_atendimento || undefined,
            numero_pessoas_familia: dados.pagamento?.solicitacao?.dadosEspecificos?.numero_pessoas_familia || undefined,
            justificativa_quantidade: dados.pagamento?.solicitacao?.dadosEspecificos?.justificativa_quantidade || undefined,
            observacoes: dados.pagamento?.solicitacao?.dadosEspecificos?.observacoes || undefined,
            tecnico_responsavel: dados.pagamento?.solicitacao?.dadosEspecificos?.tecnico_responsavel || undefined,
            unidade_solicitante: dados.pagamento?.solicitacao?.dadosEspecificos?.unidade_solicitante || undefined
          }
        } as CestaBasicaTemplateDto;

      case TipoComprovante.ALUGUEL_SOCIAL:
        return {
          ...dadosBase,
          locador: {
            nome: dados.locador?.nome || '',
            cpf: dados.locador?.cpf || ''
          },
          imovel: {
            endereco: typeof (dados.imovel?.endereco) === 'string' 
              ? dados.imovel.endereco 
              : typeof dados.beneficiario.endereco === 'string'
                ? dados.beneficiario.endereco
                : JSON.stringify(dados.beneficiario.endereco),
            valorAluguel: parseFloat(dados.imovel?.valorAluguel || '0') || dados.pagamento?.valor || 0,
            tipoImovel: 'Residencial',
            descricao: 'Imóvel para moradia'
          },
          dadosEspecificos: {
            motivoSolicitacao: 'Auxílio moradia',
            situacaoVulnerabilidade: 'Vulnerabilidade social',
            periodoMeses: 12,
            observacoesTecnicas: dados.observacoes || ''
          }
        } as AluguelSocialTemplateDto;

      default:
        throw new Error(`Tipo de comprovante não suportado: ${tipo}`);
    }
  }
}