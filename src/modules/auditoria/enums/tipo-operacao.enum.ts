/**
 * Enumeração dos tipos de operação para logs de auditoria
 *
 * Define os tipos de operações que podem ser registradas nos logs de auditoria,
 * seguindo o padrão CRUD com adição de operações específicas para compliance com LGPD.
 */
export enum TipoOperacao {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  ACCESS = 'ACCESS', // Acesso a dados sensíveis (LGPD)
  EXPORT = 'EXPORT', // Exportação de dados (LGPD)
  ANONYMIZE = 'ANONYMIZE', // Anonimização de dados (LGPD)
  LOGIN = 'LOGIN', // Login no sistema
  LOGOUT = 'LOGOUT', // Logout do sistema
  FAILED_LOGIN = 'FAILED_LOGIN', // Tentativa de login falha
}
