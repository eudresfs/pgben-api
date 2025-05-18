/**
 * Exemplos de requisições e respostas para o módulo de autenticação
 */

export const loginRequestExample = {
  cpf: '12345678900',
  senha: 'Senha@123'
};

export const loginResponseExample = {
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  expiresIn: 3600,
  tokenType: 'Bearer'
};

export const refreshTokenRequestExample = {
  refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
};

export const alterarSenhaRequestExample = {
  senhaAtual: 'SenhaAtual@123',
  novaSenha: 'NovaSenha@123',
  confirmarNovaSenha: 'NovaSenha@123'
};

export const recuperarSenhaRequestExample = {
  cpf: '12345678900',
  email: 'usuario@exemplo.com'
};

export const redefinirSenhaRequestExample = {
  token: 'token-aleatorio-123',
  novaSenha: 'NovaSenha@123',
  confirmarNovaSenha: 'NovaSenha@123'
};

export const errorResponseExample = {
  statusCode: 400,
  message: 'Credenciais inválidas',
  error: 'Bad Request',
  timestamp: '2025-05-17T21:50:07.000Z',
  path: '/v1/auth/login'
};

export const validationErrorExample = {
  statusCode: 400,
  message: 'Erro de validação',
  error: 'Bad Request',
  timestamp: '2025-05-17T21:50:07.000Z',
  path: '/v1/auth/login',
  errors: [
    {
      field: 'email',
      message: 'Deve ser um email válido',
      validation: 'isEmail'
    },
    {
      field: 'senha',
      message: 'A senha deve ter pelo menos 8 caracteres',
      validation: 'minLength'
    }
  ]
};
