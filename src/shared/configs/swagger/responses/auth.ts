import { ApiResponse } from '@nestjs/swagger';
import { LoginResponseDto } from '../schemas/auth';

/**
 * Resposta de sucesso para autenticação (login)
 */
export const ApiLoginResponse = ApiResponse({
  status: 200,
  description: 'Login realizado com sucesso',
  type: LoginResponseDto,
});

/**
 * Resposta de sucesso para atualização de token
 */
export const ApiRefreshTokenResponse = ApiResponse({
  status: 200,
  description: 'Token atualizado com sucesso',
  type: LoginResponseDto,
});

/**
 * Resposta de sucesso para logout
 */
export const ApiLogoutResponse = ApiResponse({
  status: 204,
  description: 'Logout realizado com sucesso',
});

/**
 * Resposta de sucesso para alteração de senha
 */
export const ApiPasswordChangedResponse = ApiResponse({
  status: 200,
  description: 'Senha alterada com sucesso',
  schema: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        example: 'Senha alterada com sucesso',
      },
    },
  },
});
