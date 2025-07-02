import { SetMetadata } from '@nestjs/common';
import { TipoEscopo } from '../../entities/user-permission.entity';

/**
 * Interface para definição de requisitos de permissão.
 */
export interface PermissionRequirement {
  /**
   * Nome da permissão no formato `modulo.recurso.operacao`
   */
  permissionName: string;

  /**
   * Tipo de escopo (opcional, padrão é GLOBAL)
   */
  scopeType?: TipoEscopo;

  /**
   * Expressão para obter o ID do escopo a partir dos parâmetros da requisição
   * (opcional, não necessário quando o escopo é UNIDADE e o usuário logado já possui unidade_id)
   *
   * Usado apenas como fallback se o usuário não tiver unidade_id definido.
   *
   * Exemplo: 'params.unidadeId' para obter o ID da unidade dos parâmetros da rota
   */
  scopeIdExpression?: string;

  /**
   * Roles que podem ignorar as restrições de escopo e acessar dados globalmente
   * (opcional, se não informado, assume os valores padrão: ['super_admin', 'admin', 'gestor'])
   */
  bypassRoles?: string[];
}

/**
 * Chave de metadados para requisitos de permissão.
 */
export const PERMISSION_REQUIREMENTS_KEY = 'permission_requirements';

/**
 * Decorador para definir requisitos de permissão em controladores e métodos.
 *
 * Este decorador permite proteger endpoints com permissões granulares,
 * definindo quais permissões são necessárias para acessar o endpoint.
 *
 * @param requirements Requisitos de permissão
 * @returns Decorador de metadados
 *
 * @example
 * // Requer permissão global para listar cidadãos
 * @RequiresPermission({ permissionName: 'cidadao.listar' })
 *
 * @example
 * // Requer permissão para visualizar um cidadão específico na unidade
 * @RequiresPermission({
 *   permissionName: 'cidadao.visualizar',
 *   scopeType: TipoEscopo.UNIDADE, (GLOBAL, UNIDADE, PROPRIO)
 *   scopeIdExpression: 'params.unidadeId'
 * })
 *
 * @example
 * // Requer permissão de unidade, mas permite bypass de escopo para admins e gestores
 * @RequiresPermission({
 *   permissionName: 'solicitacao.listar',
 *   scopeType: TipoEscopo.UNIDADE,
 *   scopeIdExpression: 'params.unidadeId',
 *   bypassRoles: ['admin', 'gestor', 'super_admin'] // Estas roles terão acesso global
 * })
 */
export const RequiresPermission = (...requirements: PermissionRequirement[]) =>
  SetMetadata(PERMISSION_REQUIREMENTS_KEY, requirements);
