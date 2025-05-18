import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para requisição de login
 */
export class LoginRequestDto {
  @ApiProperty({
    description: 'Nome de usuário ou e-mail',
    example: 'usuario@semtas.natal.rn.gov.br',
  })
  username: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'Senha@123',
  })
  password: string;
}

/**
 * DTO para resposta de login bem-sucedido
 */
export class LoginResponseDto {
  @ApiProperty({
    description: 'Token de acesso JWT',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Token de atualização para renovar o accessToken',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Tempo de expiração do token em segundos',
    example: 3600,
  })
  expiresIn: number;
}

/**
 * DTO para renovação de token
 */
export class RefreshTokenRequestDto {
  @ApiProperty({
    description: 'Token de atualização obtido no login',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;
}

/**
 * DTO para alteração de senha
 */
export class AlterarSenhaDto {
  @ApiProperty({
    description: 'Senha atual do usuário',
    example: 'Senha@123',
  })
  senhaAtual: string;

  @ApiProperty({
    description: 'Nova senha do usuário',
    example: 'NovaSenha@123',
  })
  novaSenha: string;

  @ApiProperty({
    description: 'Confirmação da nova senha',
    example: 'NovaSenha@123',
  })
  confirmacaoSenha: string;
}
