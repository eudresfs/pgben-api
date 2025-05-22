import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsString } from 'class-validator';

import { Role } from '../../shared/enums/role.enum';

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
  roles: string[];
  permissions?: string[];
  permissionScopes?: Record<string, string>;
}

export class UserRefreshTokenClaims {
  id: string | number;
}
