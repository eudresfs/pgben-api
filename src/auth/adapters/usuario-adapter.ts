import { Expose } from 'class-transformer';
import { Usuario } from '../../entities/usuario.entity';
import { RoleType } from '../../shared/constants/roles.constants';
import { Permission } from '../../entities/permission.entity';
import { ScopeType, TipoEscopo } from '../../entities/user-permission.entity';

/**
 * DTO para saída de usuário compatível com o serviço de autenticação
 */
export class UserOutput {
  @Expose()
  id: string | number;

  @Expose()
  name: string;

  @Expose()
  username: string;

  @Expose()
  email: string;

  @Expose()
  isAccountDisabled: boolean;

  @Expose()
  created_at: string;

  @Expose()
  updated_at: string;

  @Expose()
  roles: RoleType[];
}

/**
 * Claims do token de acesso do usuário
 */
export interface UserAccessTokenClaims {
  id: string | number;
  username: string;
  roles: RoleType[];
  permissions?: string[];
  permissionScopes?: Record<string, string>;
}

/**
 * Adaptador para converter a entidade Usuario para o formato esperado pelo serviço de autenticação
 */
export class UsuarioAdapter {
  /**
   * Converte um Usuario para UserOutput
   */
  static toUserOutput(usuario: Usuario): UserOutput {
    const userOutput = new UserOutput();
    userOutput.id = usuario.id;
    userOutput.name = usuario.nome;
    userOutput.username = usuario.email; // Usando email como username
    userOutput.email = usuario.email;
    userOutput.isAccountDisabled = usuario.status === 'inativo';
    userOutput.created_at =
      usuario.created_at?.toISOString() || new Date().toISOString();
    userOutput.updated_at =
      usuario.updated_at?.toISOString() || new Date().toISOString();
    // Obter o nome da role a partir da entidade Role
    userOutput.roles = usuario.role ? [usuario.role.nome as RoleType] : [];

    return userOutput;
  }

  /**
   * Converte um Usuario para UserAccessTokenClaims
   *
   * @param usuario Usuário a ser convertido
   * @param permissions Lista de permissões do usuário (opcional)
   * @param permissionScopes Mapeamento de permissões para escopos (opcional)
   * @returns Claims do token de acesso do usuário
   */
  static toUserAccessTokenClaims(
    usuario: Usuario,
    permissions?: Permission[],
    permissionScopes?: Record<string, TipoEscopo | string>,
  ): UserAccessTokenClaims {
    const claims: UserAccessTokenClaims = {
      id: usuario.id,
      username: usuario.email, // Usando email como username
      roles: usuario.role ? [usuario.role.nome as RoleType] : [],
    };

    // Adiciona permissões se disponíveis
    if (permissions && permissions.length > 0) {
      claims.permissions = permissions.map((p) => p.nome);
    }

    // Adiciona escopos de permissões se disponíveis
    if (permissionScopes && Object.keys(permissionScopes).length > 0) {
      claims.permissionScopes = {};
      for (const [permissionId, scopeType] of Object.entries(
        permissionScopes,
      )) {
        claims.permissionScopes[permissionId] = scopeType.toString();
      }
    }

    return claims;
  }
}
