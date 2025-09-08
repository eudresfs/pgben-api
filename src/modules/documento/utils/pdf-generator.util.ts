import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PdfPrinter from 'pdfmake';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { readFileSync } from 'fs';
import {
  IDadosDocumento,
  IDocumentoTemplate,
  IDocumentoPdfService,
} from '../interfaces/documento-pdf.interface';
import { TipoDocumentoEnum } from '../../../enums/tipo-documento.enum';
import { AutorizacaoAtaudeTemplate } from '../templates/autorizacao-ataude.template';

/**
 * Configuração para geração de PDFs de documentos
 */
interface IConfiguracaoDocumentoPdf {
  fontes: any;
  margens: [number, number, number, number];
  tamanhoFolha: string;
  orientacao: 'portrait' | 'landscape';
}

/**
 * Utilitário para geração de documentos PDF
 * Segue os mesmos padrões do módulo de pagamento
 */
@Injectable()
export class DocumentoPdfGeneratorUtil implements IDocumentoPdfService {
  private readonly logger = new Logger(DocumentoPdfGeneratorUtil.name);
  private readonly printer: PdfPrinter;
  private readonly configuracao: IConfiguracaoDocumentoPdf;

  constructor(private readonly configService: ConfigService) {
    this.configuracao = this.criarConfiguracao();
    this.printer = new PdfPrinter(this.configuracao.fontes);
  }

  /**
   * Gera um documento PDF baseado nos dados e template fornecidos
   * @param dados Dados para preenchimento do documento
   * @param template Configuração do template
   * @returns Buffer do PDF gerado
   */
  async gerarDocumento(
    dados: IDadosDocumento,
    template: IDocumentoTemplate,
  ): Promise<Buffer> {
    try {
      this.logger.log(
        `Iniciando geração de documento: ${template.tipo} para solicitação ${dados.solicitacao.id}`,
      );

      // Validar dados obrigatórios
      this.validarDados(dados, template);

      // Criar definição do documento
      const definicaoDocumento = this.criarDefinicaoDocumento(dados, template);

      // Gerar PDF
      const pdfDoc = this.printer.createPdfKitDocument(definicaoDocumento);
      const chunks: Buffer[] = [];

      return new Promise((resolve, reject) => {
        pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
        pdfDoc.on('end', () => {
          const buffer = Buffer.concat(chunks);
          this.logger.log(
            `Documento gerado com sucesso: ${buffer.length} bytes`,
          );
          resolve(buffer);
        });
        pdfDoc.on('error', (error) => {
          this.logger.error('Erro ao gerar documento PDF', error.stack);
          reject(error);
        });
        pdfDoc.end();
      });
    } catch (error) {
      this.logger.error(
        `Erro ao gerar documento ${template.tipo}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Cria a definição do documento PDF para o pdfmake
   * @param dados Dados para preenchimento
   * @param template Configuração do template
   * @returns Definição do documento
   */
  criarDefinicaoDocumento(
    dados: IDadosDocumento,
    template: IDocumentoTemplate,
  ): TDocumentDefinitions {
    const templateInstance = this.obterInstanciaTemplate(template.tipo);
    return templateInstance.criarDefinicaoDocumento(dados, template);
  }

  /**
   * Obtém a instância do template baseado no tipo
   * @param tipo Tipo do documento
   * @returns Instância do template
   */
  private obterInstanciaTemplate(tipo: TipoDocumentoEnum): any {
    // Implementação será feita quando criarmos os templates específicos
    switch (tipo) {
      case TipoDocumentoEnum.AUTORIZACAO_ATAUDE:
        return new AutorizacaoAtaudeTemplate();
      case TipoDocumentoEnum.COMPROVANTE_BENEFICIO:
        // return new ComprovanteBeneficioTemplate();
        throw new Error('Template de Comprovante Benefício não implementado');
      case TipoDocumentoEnum.DECLARACAO_COMPARECIMENTO:
        // return new DeclaracaoComparecimentoTemplate();
        throw new Error('Template de Declaração Comparecimento não implementado');
      default:
        throw new Error(`Tipo de documento não suportado: ${tipo}`);
    }
  }

  /**
   * Cria a configuração base para geração de PDFs
   * @returns Configuração do PDF
   */
  private criarConfiguracao(): IConfiguracaoDocumentoPdf {
    const fontes = {
      Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
      },
    };

    return {
      fontes,
      margens: [40, 60, 40, 60], // [esquerda, topo, direita, rodapé]
      tamanhoFolha: 'A4',
      orientacao: 'portrait',
    };
  }

  /**
   * Gera nome único para o arquivo baseado no tipo e data
   * @param tipo Tipo do documento
   * @param dados Dados do documento
   * @returns Nome do arquivo
   */
  gerarNomeArquivo(tipo: TipoDocumentoEnum, dados: IDadosDocumento): string {
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '')
      .slice(0, 15);
    const protocolo = dados.solicitacao.protocolo.replace(/[^a-zA-Z0-9]/g, '');
    return `${tipo}_${protocolo}_${timestamp}.pdf`;
  }

  /**
   * Converte buffer para base64
   * @param buffer Buffer do PDF
   * @returns String em base64
   */
  converterParaBase64(buffer: Buffer): string {
    return buffer.toString('base64');
  }

  /**
   * Valida se os dados obrigatórios estão presentes
   * @param dados Dados do documento
   * @param template Template do documento
   */
  private validarDados(
    dados: IDadosDocumento,
    template: IDocumentoTemplate,
  ): void {
    // Validações básicas obrigatórias
    if (!dados.solicitacao?.protocolo) {
      throw new Error('Protocolo da solicitação é obrigatório');
    }

    if (!dados.unidade?.nome) {
      throw new Error('Nome da unidade é obrigatório');
    }

    // Validações específicas por tipo de documento
    switch (template.tipo) {
      case TipoDocumentoEnum.AUTORIZACAO_ATAUDE:
        if (!dados.dados_ataude) {
          throw new Error(
            'Dados do benefício ataúde são obrigatórios para este tipo de documento',
          );
        }
        break;
      case TipoDocumentoEnum.COMPROVANTE_BENEFICIO:
        if (!dados.solicitacao.tipoBeneficio?.nome) {
          throw new Error(
            'Tipo de benefício é obrigatório para comprovante',
          );
        }
        break;
      case TipoDocumentoEnum.DECLARACAO_COMPARECIMENTO:
        if (!dados.tecnico?.nome) {
          throw new Error(
            'Nome do técnico é obrigatório para declaração de comparecimento',
          );
        }
        break;
      default:
        // Para outros tipos de documento, beneficiário é obrigatório
        if (!dados.beneficiario?.nome) {
          throw new Error('Nome do beneficiário é obrigatório');
        }
        if (!dados.beneficiario?.cpf) {
          throw new Error('CPF do beneficiário é obrigatório');
        }
        break;
    }

    this.logger.log('Validação de dados concluída com sucesso');
  }

  /**
   * Carrega imagem e converte para base64
   * @param caminhoImagem Caminho para a imagem
   * @returns String base64 da imagem
   */
  protected carregarImagemBase64(caminhoImagem: string): string {
    try {
      const buffer = readFileSync(caminhoImagem);
      return `data:image/png;base64,${buffer.toString('base64')}`;
    } catch (error) {
      this.logger.warn(`Não foi possível carregar imagem: ${caminhoImagem}`);
      return '';
    }
  }

  /**
   * Formata data para exibição no documento
   * @param data Data a ser formatada
   * @returns String formatada
   */
  protected formatarData(data: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(data));
  }

  /**
   * Formata CPF para exibição
   * @param cpf CPF a ser formatado
   * @returns CPF formatado
   */
  protected formatarCpf(cpf: string): string {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
}