import { SetMetadata, applyDecorators, UseInterceptors } from '@nestjs/common';
import { AuditInterceptor } from '../interceptors/audit.interceptor';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';
import { AuditEvent } from '../interfaces/audit-event.interface';

export const AUDIT_METADATA_KEY = 'audit_metadata';

/**
 * Decorador para auditoria de métodos
 *
 * Este decorador pode ser aplicado a métodos de controladores para
 * registrar automaticamente operações no sistema de auditoria.
 *
 * @param config Configuração para o log de auditoria
 * @returns Decorador configurado
 *
 * @example
 * ```typescript
 * @Audit({
 *   tipo_operacao: TipoOperacao.READ,
 *   entidade_afetada: 'Usuario',
 *   descricao: 'Consulta de usuários sensíveis'
 * })
 * @Get('sensivel')
 * findSensitive() {}
 * ```
 */
export function Audit(config: Partial<AuditEvent>) {
  return applyDecorators(
    SetMetadata(AUDIT_METADATA_KEY, config),
    UseInterceptors(AuditInterceptor),
  );
}

/**
 * Decorador para auditoria de operações de criação
 *
 * @param entidade Nome da entidade afetada
 * @param descricao Descrição opcional da operação
 * @returns Decorador configurado
 */
export function AuditCreate(entidade: string, descricao?: string) {
  return Audit({
    tipo_operacao: TipoOperacao.CREATE,
    entidade_afetada: entidade,
    descricao: descricao || `Criação de ${entidade}`,
  });
}

/**
 * Decorador para auditoria de operações de leitura
 *
 * @param entidade Nome da entidade afetada
 * @param descricao Descrição opcional da operação
 * @returns Decorador configurado
 */
export function AuditRead(entidade: string, descricao?: string) {
  return Audit({
    tipo_operacao: TipoOperacao.READ,
    entidade_afetada: entidade,
    descricao: descricao || `Consulta de ${entidade}`,
  });
}

/**
 * Decorador para auditoria de operações de atualização
 *
 * @param entidade Nome da entidade afetada
 * @param descricao Descrição opcional da operação
 * @returns Decorador configurado
 */
export function AuditUpdate(entidade: string, descricao?: string) {
  return Audit({
    tipo_operacao: TipoOperacao.UPDATE,
    entidade_afetada: entidade,
    descricao: descricao || `Atualização de ${entidade}`,
  });
}

/**
 * Decorador para auditoria de operações de exclusão
 *
 * @param entidade Nome da entidade afetada
 * @param descricao Descrição opcional da operação
 * @returns Decorador configurado
 */
export function AuditDelete(entidade: string, descricao?: string) {
  return Audit({
    tipo_operacao: TipoOperacao.DELETE,
    entidade_afetada: entidade,
    descricao: descricao || `Exclusão de ${entidade}`,
  });
}

/**
 * Decorador para auditoria de acesso a dados sensíveis (LGPD)
 *
 * @param entidade Nome da entidade afetada
 * @param descricao Descrição opcional da operação
 * @returns Decorador configurado
 */
export function AuditSensitiveAccess(entidade: string, descricao?: string) {
  return Audit({
    tipo_operacao: TipoOperacao.ACCESS,
    entidade_afetada: entidade,
    descricao: descricao || `Acesso a dados sensíveis de ${entidade}`,
  });
}

/**
 * Decorador para auditoria de exportação de dados (LGPD)
 *
 * @param entidade Nome da entidade afetada
 * @param descricao Descrição opcional da operação
 * @returns Decorador configurado
 */
export function AuditExport(entidade: string, descricao?: string) {
  return Audit({
    tipo_operacao: TipoOperacao.EXPORT,
    entidade_afetada: entidade,
    descricao: descricao || `Exportação de dados de ${entidade}`,
  });
}

/**
 * Decorador para auditoria de anonimização de dados (LGPD)
 *
 * @param entidade Nome da entidade afetada
 * @param descricao Descrição opcional da operação
 * @returns Decorador configurado
 */
export function AuditAnonymize(entidade: string, descricao?: string) {
  return Audit({
    tipo_operacao: TipoOperacao.ANONYMIZE,
    entidade_afetada: entidade,
    descricao: descricao || `Anonimização de dados de ${entidade}`,
  });
}

/**
 * Decorador para auditoria de login
 *
 * @param descricao Descrição opcional da operação
 * @returns Decorador configurado
 */
export function AuditLogin(descricao?: string) {
  return Audit({
    tipo_operacao: TipoOperacao.LOGIN,
    entidade_afetada: 'Usuario',
    descricao: descricao || 'Login no sistema',
  });
}

/**
 * Decorador para auditoria de logout
 *
 * @param descricao Descrição opcional da operação
 * @returns Decorador configurado
 */
export function AuditLogout(descricao?: string) {
  return Audit({
    tipo_operacao: TipoOperacao.LOGOUT,
    entidade_afetada: 'Usuario',
    descricao: descricao || 'Logout do sistema',
  });
}

/**
 * Decorador para auditoria de tentativa de login falha
 *
 * @param descricao Descrição opcional da operação
 * @returns Decorador configurado
 */
export function AuditFailedLogin(descricao?: string) {
  return Audit({
    tipo_operacao: TipoOperacao.FAILED_LOGIN,
    entidade_afetada: 'Usuario',
    descricao: descricao || 'Tentativa de login falha',
  });
}
