/**
 * Constantes do sistema para operações internas
 * 
 * Este arquivo define constantes utilizadas em operações do sistema,
 * incluindo UUIDs especiais para representar operações automatizadas.
 * 
 * @author Sistema SEMTAS
 * @date 20/01/2025
 */

/**
 * UUID especial para representar operações do sistema
 * Este UUID é usado quando uma operação é executada pelo sistema
 * automaticamente, sem um usuário específico associado.
 */
export const SYSTEM_USER_UUID = '00000000-0000-0000-0000-000000000001';

/**
 * Nome padrão para operações do sistema
 */
export const SYSTEM_USER_NAME = 'Sistema';

/**
 * Identificadores de contexto do sistema
 */
export const SYSTEM_CONTEXT = {
  USER_ID: SYSTEM_USER_UUID,
  USER_NAME: SYSTEM_USER_NAME,
  ROLE: 'SISTEMA',
  IP: '127.0.0.1',
  USER_AGENT: 'Sistema Interno SEMTAS'
} as const;

/**
 * Tipos de operações do sistema
 */
export enum SystemOperationType {
  AUTOMATED_PROCESS = 'processo_automatizado',
  SCHEDULED_TASK = 'tarefa_agendada',
  SYSTEM_MAINTENANCE = 'manutencao_sistema',
  DATA_MIGRATION = 'migracao_dados',
  AUDIT_CLEANUP = 'limpeza_auditoria'
}