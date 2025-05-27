/**
 * Constantes para os papéis (roles) do sistema
 * 
 * Este arquivo substitui o antigo enum Role, fornecendo constantes
 * que correspondem aos valores na tabela role.
 */
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  GESTOR: 'GESTOR',
  TECNICO: 'TECNICO',
  COORDENADOR: 'COORDENADOR',
  ASSISTENTE_SOCIAL: 'ASSISTENTE_SOCIAL',
  CIDADAO: 'CIDADAO',
  AUDITOR: 'AUDITOR'
} as const;

/**
 * Tipo que representa os valores possíveis de roles
 */
export type RoleType = typeof ROLES[keyof typeof ROLES];

/**
 * Array com todos os valores de roles
 */
export const ALL_ROLES = Object.values(ROLES);
