import { Injectable, Logger } from '@nestjs/common';
import { PdfGeneratorUtil } from '../utils/pdf-generator.util';
import { IDadosComprovante, IComprovanteTemplate } from '../interfaces/comprovante-pdf.interface';
import { TipoComprovante } from '../dtos/gerar-comprovante.dto';

/**
 * Adapter para manter compatibilidade com a interface existente do módulo de pagamento
 * Usa o PdfGeneratorUtil que implementa os templates específicos de comprovantes
 */
@Injectable()
export class ComprovantePdfAdapter {
  private readonly logger = new Logger(ComprovantePdfAdapter.name);

  constructor(
    private readonly pdfGeneratorUtil: PdfGeneratorUtil
  ) { }

  /**
   * Gera comprovante individual usando templates específicos
   * @param dados Dados do comprovante no formato original
   * @returns Buffer do PDF gerado
   */
  async gerarComprovante(dados: IDadosComprovante): Promise<Buffer> {
    try {
      this.logger.log(`Comprovante solicitado para beneficiário: ${dados.beneficiario?.nome}`);

      // Determinar o tipo de comprovante baseado nos dados
      const tipoComprovante = this.determinarTipoComprovante(dados);
      this.logger.log(`Tipo de comprovante determinado: ${tipoComprovante}`);

      // Criar configuração do template baseada no tipo
      const templateConfig = this.pdfGeneratorUtil.criarConfiguracao(tipoComprovante);
      this.logger.log(`Template configurado: ${templateConfig.titulo}`);

      // Gerar PDF usando o gerador com templates específicos
      const pdfBuffer = await this.pdfGeneratorUtil.gerarComprovante(dados, templateConfig);

      this.logger.log(`Comprovante gerado com sucesso para beneficiário: ${dados.beneficiario?.nome}`);
      return pdfBuffer;
    } catch (error) {
      this.logger.error(`Erro ao gerar comprovante: ${error.message}`, error.stack);
      throw new Error(`Falha na geração do comprovante: ${error.message}`);
    }
  }

  /**
   * Gera comprovantes em lote mantendo compatibilidade
   * @param dadosComprovantes Array de dados dos comprovantes
   * @returns Array de buffers dos PDFs gerados
   */
  async gerarComprovantesLote(dadosComprovantes: IDadosComprovante[]): Promise<Buffer[]> {
    try {
      this.logger.log(`Gerando lote de ${dadosComprovantes.length} comprovantes`);

      const comprovantesGerados: Buffer[] = [];

      for (const dadosComprovante of dadosComprovantes) {
        const comprovante = await this.gerarComprovante(dadosComprovante);
        comprovantesGerados.push(comprovante);
      }

      this.logger.log(`Lote de ${comprovantesGerados.length} comprovantes gerado com sucesso`);
      return comprovantesGerados;

    } catch (error) {
      this.logger.error(`Erro ao gerar lote de comprovantes: ${error.message}`);
      throw error;
    }
  }

  /**
   * Determina o tipo de comprovante baseado nos dados fornecidos
   * @param dados Dados do comprovante
   * @returns Tipo do comprovante como string
   */
  private determinarTipoComprovante(dados: IDadosComprovante): string {
    // Verificar se tem dados de locador (indica aluguel social)
    if (dados.locador && dados.locador.nome) {
      return 'aluguel-social';
    }

    // Verificar se tem dados de imóvel (também indica aluguel social)
    if (dados.imovel && (dados.imovel.endereco || dados.imovel.valorAluguel)) {
      return 'aluguel-social';
    }

    // Verificar pelo tipo de benefício no pagamento
    if (dados.pagamento?.tipoBeneficio?.nome) {
      const tipoBeneficio = dados.pagamento.tipoBeneficio.nome.toLowerCase();
      
      if (tipoBeneficio.includes('aluguel') || tipoBeneficio.includes('social')) {
        return 'aluguel-social';
      }
      
      if (tipoBeneficio.includes('cesta') || tipoBeneficio.includes('básica')) {
        return 'cesta-basica';
      }
    }

    // Padrão: cesta básica
    return 'cesta-basica';
  }
}