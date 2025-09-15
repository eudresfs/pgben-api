/**
 * Interface para definir assinaturas no PDF
 */
export interface IPdfAssinatura {
  /**
   * Tipo da assinatura
   */
  tipo: 'tecnico' | 'beneficiario' | 'requerente';

  /**
   * Nome da pessoa que assina (opcional)
   */
  nome?: string;

  /**
   * Cargo da pessoa que assina (opcional)
   */
  cargo?: string;

  /**
   * Espaçamento adicional para a assinatura (opcional)
   */
  espacamento?: number;
}