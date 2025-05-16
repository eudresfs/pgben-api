import { Expose } from 'class-transformer';
import { Usuario } from '../../modules/usuario/entities/usuario.entity';
import { Role } from '../../shared/enums/role.enum';

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
  roles: Role[];
}

/**
 * Claims do token de acesso do usuário
 */
export class UserAccessTokenClaims {
  id: string | number;
  username: string;
  roles: Role[];
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
    userOutput.created_at = usuario.created_at?.toISOString() || new Date().toISOString();
    userOutput.updated_at = usuario.updated_at?.toISOString() || new Date().toISOString();
    userOutput.roles = [usuario.role as unknown as Role];
    
    return userOutput;
  }

  /**
   * Converte um Usuario para UserAccessTokenClaims
   */
  static toUserAccessTokenClaims(usuario: Usuario): UserAccessTokenClaims {
    return {
      id: usuario.id,
      username: usuario.email, // Usando email como username
      roles: [usuario.role as unknown as Role],
    };
  }
}
