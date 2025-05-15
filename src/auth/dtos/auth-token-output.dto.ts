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

export class UserAccessTokenClaims {
  @Expose()
  id: string | number;
  @Expose()
  username: string;
  @Expose()
  roles: Role[];
}

export class UserRefreshTokenClaims {
  id: string | number;
}
