/**
 * Interface para o serviço de validação de renovação
 * Define os métodos necessários para validar elegibilidade de renovação
 */
export interface IRenovacaoValidationService {
  /**
   * Valida se uma concessão é elegível para renovação
   * @param concessaoId ID da concessão
   * @param usuarioId ID do usuário
   * @returns Resultado da validação
   */
  validarElegibilidade(
    concessaoId: string,
    usuarioId: string,
  ): Promise<{ podeRenovar: boolean; motivos?: string[] }>;

  /**
   * Verifica se o usuário já possui uma renovação em andamento para a mesma concessão
   * @param concessaoId - ID da concessão
   * @param usuarioId - ID do usuário
   * @returns Promise<boolean> - true se já existe renovação em andamento
   */
  verificarRenovacaoEmAndamento(concessaoId: string, usuarioId: string): Promise<boolean>;

  /**
   * Verifica se a concessão está no status adequado para renovação
   * @param concessaoId - ID da concessão
   * @returns Promise<boolean> - true se o status permite renovação
   */
  verificarStatusConcessao(concessaoId: string): Promise<boolean>;

  /**
   * Verifica se o tipo de benefício permite renovação
   * @param tipoBeneficioId - ID do tipo de benefício
   * @returns Promise<boolean> - true se permite renovação
   */
  verificarTipoBeneficioPermiteRenovacao(tipoBeneficioId: string): Promise<boolean>;
}