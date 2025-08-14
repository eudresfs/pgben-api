import { Expose } from 'class-transformer';
import { Usuario } from '../../entities/usuario.entity';
import { RoleType } from '../../shared/constants/roles.constants';
import { Permission } from '../../entities/permission.entity';
import { ScopeType, TipoEscopo } from '../../entities/user-permission.entity';
import { UserAccessTokenClaims } from '../dtos/auth-token-output.dto';

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

  @Expose()
  unidade_id?: string;
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
    userOutput.roles = usuario.role ? [usuario.role.codigo as RoleType] : [];
    // Incluir unidade_id se disponível
    userOutput.unidade_id = usuario.unidade_id;

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
      roles: usuario.role ? [usuario.role.codigo as RoleType] : [],
    };

    // Incluir unidade_id se disponível
    if (usuario.unidade_id) {
      claims.unidade_id = usuario.unidade_id;
    }

    // Incluir escopo da role se disponível
    if (usuario.role && usuario.role.escopo) {
      claims.escopo = usuario.role.escopo;
    }

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
