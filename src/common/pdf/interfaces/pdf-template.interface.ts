import { IPdfDados } from './pdf-dados.interface';
import { IPdfConfiguracao } from './pdf-configuracao.interface';
import { PdfTipoTemplate } from '../enums';

/**
 * Interface para templates de PDF
 */
export interface IPdfTemplate {
  /**
   * Nome identificador do template
   */
  nome: string;

  /**
   * Tipo do template
   */
  tipo: PdfTipoTemplate;

  /**
   * Configuração padrão do template
   */
  configuracaoPadrao: IPdfConfiguracao;

  /**
   * Método para gerar a definição do documento
   */
  gerarDefinicao(dados: IPdfDados, configuracao?: IPdfConfiguracao): any;

  /**
   * Método para criar cabeçalho
   */
  criarCabecalho?(dados: IPdfDados): any;

  /**
   * Método para criar rodapé
   */
  criarRodape?(dados: IPdfDados): any;

  /**
   * Método para validar dados específicos do template
   */
  validarDados?(dados: IPdfDados): boolean;
}