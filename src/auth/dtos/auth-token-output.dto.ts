import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsString } from 'class-validator';
import { RoleType } from '../../shared/constants/roles.constants';

/**
 * DTO para solicitação de refresh token
 */
export class RefreshTokenInput {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class AuthTokenOutput {
  @Expose()
  @ApiProperty()
  accessToken: string;

  @Expose()
  @ApiProperty()
  refreshToken: string;
}

export interface UserAccessTokenClaims {
  id: string | number;
  username: string;
  roles: RoleType[];
  permissions?: string[];
  permissionScopes?: Record<string, string>;
  unidade_id?: string;
  escopo?: string;
}

export class UserRefreshTokenClaims {
  id: string | number;
}
