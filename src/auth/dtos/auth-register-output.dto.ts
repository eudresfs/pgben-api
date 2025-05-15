import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

import { Role } from '../../shared/enums/role.enum';

/**
 * DTO para saída de registro de usuário
 */
export class RegisterOutput {
  @Expose()
  @ApiProperty()
  id: number;

  @Expose()
  @ApiProperty()
  name: string;

  @Expose()
  @ApiProperty()
  username: string;

  @Expose()
  @ApiProperty({ example: [Role.TECNICO_UNIDADE] })
  roles: Role[];

  @Expose()
  @ApiProperty()
  email: string;

  @Expose()
  @ApiProperty()
  isAccountDisabled: boolean;

  @Expose()
  @ApiProperty()
  createdAt: string;

  @Expose()
  @ApiProperty()
  updatedAt: string;
}
