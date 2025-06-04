import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para requisição de login no sistema
 */
export class LoginRequestDto {
  @ApiProperty({
    description: 'CPF do usuário no formato XXX.XXX.XXX-XX',
    example: '123.456.789-00',
    pattern: '^\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}$',
    type: 'string',
    minLength: 14,
    maxLength: 14,
  })
  cpf: string;

  @ApiProperty({
    description: 'Senha do usuário (mínimo 8 caracteres)',
    example: 'MinhaSenh@123',
    type: 'string',
    minLength: 8,
    maxLength: 128,
    format: 'password',
  })
  senha: string;
}

/**
 * DTO para resposta de login bem-sucedido
 */
export class LoginResponseDto {
  @ApiProperty({
    description: 'Token de acesso JWT para autenticação nas requisições',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    type: 'string',
    format: 'jwt',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Token de renovação para obter novos access tokens',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    type: 'string',
    format: 'jwt',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Tipo do token de autenticação',
    example: 'Bearer',
    enum: ['Bearer'],
    default: 'Bearer',
    type: 'string',
  })
  tokenType: string;

  @ApiProperty({
    description: 'Tempo de expiração do access token em segundos',
    example: 3600,
    type: 'integer',
    minimum: 1,
  })
  expiresIn: number;

  @ApiProperty({
    description: 'Timestamp de quando o token expira',
    example: '2025-01-18T11:30:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  expiresAt: string;

  @ApiProperty({
    description: 'Informações do usuário autenticado',
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Identificador único do usuário',
        example: '507f1f77bcf86cd799439011',
      },
      cpf: {
        type: 'string',
        description: 'CPF do usuário',
        example: '123.456.789-00',
      },
      nome: {
        type: 'string',
        description: 'Nome completo do usuário',
        example: 'João Silva Santos',
      },
      email: {
        type: 'string',
        format: 'email',
        description: 'Email do usuário',
        example: 'joao.silva@email.com',
      },
      perfil: {
        type: 'string',
        enum: ['CIDADAO', 'SERVIDOR', 'GESTOR', 'ADMIN'],
        description: 'Perfil/papel do usuário no sistema',
        example: 'CIDADAO',
      },
      permissoes: {
        type: 'array',
        items: { type: 'string' },
        description: 'Lista de permissões do usuário',
        example: ['SOLICITACAO_CREATE', 'SOLICITACAO_READ'],
      },
    },
  })
  user: {
    id: string;
    cpf: string;
    nome: string;
    email: string;
    perfil: string;
    permissoes: string[];
  };
}

/**
 * DTO para requisição de renovação de token de acesso
 */
export class RefreshTokenRequestDto {
  @ApiProperty({
    description: 'Token de renovação válido obtido no login',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    type: 'string',
    format: 'jwt',
    minLength: 10,
  })
  refreshToken: string;
}

/**
 * DTO para alteração de senha do usuário
 */
export class AlterarSenhaDto {
  @ApiProperty({
    description: 'Senha atual do usuário para validação',
    example: 'MinhaSenh@Atual123',
    type: 'string',
    format: 'password',
    minLength: 8,
    maxLength: 128,
  })
  senhaAtual: string;

  @ApiProperty({
    description:
      'Nova senha (mínimo 8 caracteres, deve conter letras, números e símbolos)',
    example: 'MinhaNov@Senh@123',
    type: 'string',
    format: 'password',
    minLength: 8,
    maxLength: 128,
    pattern:
      '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]',
  })
  novaSenha: string;

  @ApiProperty({
    description: 'Confirmação da nova senha (deve ser idêntica à nova senha)',
    example: 'MinhaNov@Senh@123',
    type: 'string',
    format: 'password',
    minLength: 8,
    maxLength: 128,
  })
  confirmacaoSenha: string;
}

/**
 * DTO para resposta de renovação de token
 */
export class RefreshTokenResponseDto {
  @ApiProperty({
    description: 'Novo token de acesso JWT',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    type: 'string',
    format: 'jwt',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Tipo do token',
    example: 'Bearer',
    enum: ['Bearer'],
    type: 'string',
  })
  tokenType: string;

  @ApiProperty({
    description: 'Tempo de expiração do novo token em segundos',
    example: 3600,
    type: 'integer',
  })
  expiresIn: number;

  @ApiProperty({
    description: 'Timestamp de quando o novo token expira',
    example: '2025-01-18T11:30:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  expiresAt: string;
}

/**
 * DTO para logout do usuário
 */
export class LogoutRequestDto {
  @ApiProperty({
    description: 'Token de renovação a ser invalidado',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    type: 'string',
    format: 'jwt',
  })
  refreshToken: string;
}
