import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para login de usuário
 */
export class LoginDto {
  @ApiProperty({
    description: 'CPF do usuário (apenas números)',
    example: '12345678900',
  })
  cpf: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'Senha@123',
    minLength: 8,
  })
  senha: string;
}

/**
 * DTO para resposta de login
 */
export class LoginResponseDto {
  @ApiProperty({
    description: 'Token de acesso JWT',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Token de atualização JWT',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Tempo de expiração do token de acesso em segundos',
    example: 3600,
  })
  expiresIn: number;

  @ApiProperty({
    description: 'Tipo do token',
    example: 'Bearer',
  })
  tokenType: string;
}

/**
 * DTO para renovação de token
 */
export class RefreshTokenDto {
  @ApiProperty({
    description: 'Token de atualização',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;
}

/**
 * DTO para alteração de senha
 */
export class AlterarSenhaDto {
  @ApiProperty({
    description: 'Senha atual',
    example: 'SenhaAtual@123',
  })
  senhaAtual: string;

  @ApiProperty({
    description: 'Nova senha',
    example: 'NovaSenha@123',
    minLength: 8,
  })
  novaSenha: string;

  @ApiProperty({
    description: 'Confirmação da nova senha',
    example: 'NovaSenha@123',
    minLength: 8,
  })
  confirmarNovaSenha: string;
}

/**
 * DTO para recuperação de senha
 */
export class RecuperarSenhaDto {
  @ApiProperty({
    description: 'CPF do usuário',
    example: '12345678900',
  })
  cpf: string;

  @ApiProperty({
    description: 'E-mail cadastrado',
    example: 'usuario@exemplo.com',
  })
  email: string;
}

/**
 * DTO para redefinição de senha
 */
export class RedefinirSenhaDto {
  @ApiProperty({
    description: 'Token de redefinição de senha',
    example: 'token-aleatorio-123',
  })
  token: string;

  @ApiProperty({
    description: 'Nova senha',
    example: 'NovaSenha@123',
    minLength: 8,
  })
  novaSenha: string;

  @ApiProperty({
    description: 'Confirmação da nova senha',
    example: 'NovaSenha@123',
    minLength: 8,
  })
  confirmarNovaSenha: string;
}
