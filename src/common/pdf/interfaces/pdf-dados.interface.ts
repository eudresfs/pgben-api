import { IPdfConteudo } from './pdf-conteudo.interface';
import { IPdfAssinatura } from './pdf-assinatura.interface';
import { IPdfMetadados } from './pdf-metadados.interface';

/**
 * Interface principal para dados de geração de PDF
 */
export interface IPdfDados {
  /**
   * Título do documento PDF
   */
  titulo?: string;

  /**
   * Array de conteúdos que compõem o documento
   */
  conteudo: IPdfConteudo[];

  /**
   * Observações adicionais
   */
  observacoes?: string[];

  /**
   * Array de assinaturas do documento (opcional)
   */
  assinaturas?: IPdfAssinatura[];

  /**
   * Metadados do documento (opcional)
   */
  metadados?: IPdfMetadados;
}