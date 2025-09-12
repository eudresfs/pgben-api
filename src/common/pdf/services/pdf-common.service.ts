import { Injectable, Logger } from '@nestjs/common';
import { IPdfDados, IPdfConfiguracao, IPdfTemplate, IPdfConteudo } from '../interfaces';
import { PdfTipoConteudo, PdfOrientacao } from '../enums';
import { ESTILOS_PADRAO, CONFIGURACAO_PADRAO, MENSAGENS_ERRO, MENSAGENS_LOG } from '../constants';
import PdfPrinter from 'pdfmake';
import { TDocumentDefinitions, TFontDictionary } from 'pdfmake/interfaces';

/**
 * Serviço principal para geração de PDFs
 * Responsável por coordenar a criação de documentos PDF usando pdfmake
 */
@Injectable()
export class PdfCommonService {
  private readonly logger = new Logger(PdfCommonService.name);
  private printer: PdfPrinter;

  constructor() {
    this.inicializarPrinter();
  }

  /**
   * Inicializa o printer do pdfmake com as fontes configuradas
   */
  private inicializarPrinter(): void {
    // Usar fontes padrão do sistema para testes
    const fonts: TFontDictionary = {
      Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    };

    this.printer = new PdfPrinter(fonts);
  }

  /**
   * Gera um PDF a partir dos dados fornecidos
   * @param dados Dados do PDF
   * @param configuracao Configuração opcional
   * @param template Template opcional
   * @returns Buffer do PDF gerado
   */
  async gerarPdf(
    dados: IPdfDados,
    configuracao?: IPdfConfiguracao,
    template?: IPdfTemplate
  ): Promise<Buffer> {
    try {
      this.logger.log(MENSAGENS_LOG.INICIANDO_GERACAO);

      // Validar dados de entrada
      this.validarDados(dados);

      // Aplicar configuração padrão se não fornecida
      const config = { ...CONFIGURACAO_PADRAO, ...configuracao };

      // Criar definição do documento
      const documentDefinition = await this.criarDefinicaoDocumento(dados, config, template);

      // Gerar PDF
      const pdfDoc = this.printer.createPdfKitDocument(documentDefinition);
      const chunks: Buffer[] = [];

      return new Promise((resolve, reject) => {
        pdfDoc.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        pdfDoc.on('end', () => {
          this.logger.log(MENSAGENS_LOG.FINALIZANDO_GERACAO);
          resolve(Buffer.concat(chunks));
        });

        pdfDoc.on('error', (error) => {
          this.logger.error(`Erro na geração do PDF: ${error.message}`);
          reject(new Error(MENSAGENS_ERRO.ERRO_GERACAO));
        });

        pdfDoc.end();
      });
    } catch (error) {
      this.logger.error(`Erro ao gerar PDF: ${error.message}`);
      throw new Error(MENSAGENS_ERRO.ERRO_GERACAO);
    }
  }

  /**
   * Cria a definição do documento PDF
   */
  private async criarDefinicaoDocumento(
    dados: IPdfDados,
    configuracao: IPdfConfiguracao,
    template?: IPdfTemplate
  ): Promise<TDocumentDefinitions> {
    this.logger.log(MENSAGENS_LOG.PROCESSANDO_CONTEUDO);

    const documentDefinition: TDocumentDefinitions = {
      pageSize: configuracao.tamanho as any,
      pageOrientation: configuracao.orientacao === PdfOrientacao.RETRATO ? 'portrait' : 'landscape',
      pageMargins: configuracao.margens,
      info: {
        author: dados?.metadados?.autor || 'PGBEN - Plataforma de Gestão de Benefícios Eventuais',
        subject: dados?.metadados?.assunto || '',
        keywords: dados?.metadados?.palavrasChave?.join(', ') || '',
        creator: dados?.metadados?.criador || 'PGBEN PDF Module'
      },
      defaultStyle: ESTILOS_PADRAO.texto,
      styles: {
        ...ESTILOS_PADRAO,
        ...configuracao.estilosCustomizados
      },
      content: []
    };

    // Processar conteúdo
    documentDefinition.content = this.processarConteudo(dados.conteudo);

    // Adicionar observações se existirem
    if (dados.observacoes && dados.observacoes.length > 0) {
      documentDefinition.content.push(
        { text: '', pageBreak: 'before' },
        { text: 'Observações:', style: 'titulo' },
        ...dados.observacoes.map(obs => ({ text: obs, style: 'observacoes' }))
      );
    }

    // Adicionar assinaturas se existirem
    if (dados.assinaturas && dados.assinaturas.length > 0) {
      this.logger.log(MENSAGENS_LOG.ADICIONANDO_ASSINATURAS);
      documentDefinition.content.push(
        { text: '', margin: [0, 30, 0, 0] },
        ...this.processarAssinaturas(dados.assinaturas)
      );
    }

    return documentDefinition;
  }

  /**
   * Processa o conteúdo do PDF
   * @param conteudo Array de conteúdo
   * @returns Conteúdo processado
   */
  private processarConteudo(conteudo: IPdfConteudo[]): any[] {
    this.logger.log(MENSAGENS_LOG.PROCESSANDO_CONTEUDO);
    
    return conteudo.map(item => this.converterConteudo(item));
  }

  /**
   * Converte IPdfConteudo para formato compatível com pdfmake
   * @param item Item de conteúdo
   * @returns Conteúdo convertido
   */
  private converterConteudo(item: IPdfConteudo): any {
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

  /**
   * Processa as assinaturas do documento
   */
  private processarAssinaturas(assinaturas: any[]): any[] {
    const assinaturasProcessadas: any[] = [];

    for (const assinatura of assinaturas) {
      assinaturasProcessadas.push(
        {
          text: '_'.repeat(50),
          style: 'assinatura',
          margin: [0, assinatura.espacamento || 30, 0, 5]
        },
        {
          text: assinatura.nome,
          style: 'assinaturaNome'
        },
        {
          text: assinatura.cargo,
          style: 'assinaturaCargo'
        }
      );
    }

    return assinaturasProcessadas;
  }

  /**
   * Valida os dados de entrada
   */
  private validarDados(dados: IPdfDados): void {
    if (!dados.titulo) {
      throw new Error(MENSAGENS_ERRO.DADOS_INVALIDOS);
    }

    if (!dados.conteudo || dados.conteudo.length === 0) {
      throw new Error(MENSAGENS_ERRO.CONTEUDO_VAZIO);
    }
  }
}