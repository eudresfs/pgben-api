/**
 * Grupos de validação
 * 
 * Define grupos para validação condicional de DTOs em diferentes contextos
 */

// Definição de interface para grupos de validação
export interface ValidationGroups {}

/**
 * Grupo para validação na criação de recursos
 */
export const CREATE = 'create';

/**
 * Grupo para validação na atualização de recursos
 */
export const UPDATE = 'update';

/**
 * Grupo para validação em operações de leitura
 */
export const READ = 'read';

/**
 * Grupo para validação em operações de exclusão
 */
export const DELETE = 'delete';

/**
 * Grupo para validação em operações administrativas
 */
export const ADMIN = 'admin';

/**
 * Grupo para validação em operações relacionadas à LGPD
 */
export const LGPD = 'lgpd';

/**
 * Grupo para validação em operações relacionadas à segurança
 */
export const SECURITY = 'security';
