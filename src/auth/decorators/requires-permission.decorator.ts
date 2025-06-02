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
   * (opcional, necessário apenas para scopeType UNIT)
   * 
   * Exemplo: 'params.unidadeId' para obter o ID da unidade dos parâmetros da rota
   */
  scopeIdExpression?: string;
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
 */
export const RequiresPermission = (...requirements: PermissionRequirement[]) =>
  SetMetadata(PERMISSION_REQUIREMENTS_KEY, requirements);
