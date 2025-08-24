/**
 * Enum que define os tipos de escopo disponíveis no sistema
 *
 * @description
 * - GLOBAL: Acesso a todos os dados do sistema (admins, super users)
 * - UNIDADE: Acesso apenas aos dados da própria unidade
 * - PROPRIO: Acesso apenas aos próprios dados criados
 */
export enum ScopeType {
  /** Acesso global a todos os dados */
  GLOBAL = 'GLOBAL',

  /** Acesso limitado à própria unidade */
  UNIDADE = 'UNIDADE',

  /** Acesso limitado aos próprios dados */
  PROPRIO = 'PROPRIO',
}
