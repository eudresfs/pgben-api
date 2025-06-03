/**
 * Enumeração dos tipos de operação para logs de auditoria
 *
 * Define os tipos de operações que podem ser registradas nos logs de auditoria,
 * seguindo o padrão CRUD com adição de operações específicas para compliance com LGPD.
 */
export enum TipoOperacao {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  ACCESS = 'access', // Acesso a dados sensíveis (LGPD)
  EXPORT = 'export', // Exportação de dados (LGPD)
  ANONYMIZE = 'anonymize', // Anonimização de dados (LGPD)
  LOGIN = 'login', // Login no sistema
  LOGOUT = 'logout', // Logout do sistema
  FAILED_LOGIN = 'failed_login', // Tentativa de login falha
}
