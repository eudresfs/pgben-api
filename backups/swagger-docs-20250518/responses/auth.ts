import { HttpStatus } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { LoginResponseDto, ErrorResponse } from '@/shared/configs/swagger/schemas';

/*
 * Respostas específicas para o módulo de autenticação
 */

export const LoginSuccessResponse = {
  description: 'Login realizado com sucesso',
  type: LoginResponseDto,
  status: HttpStatus.OK,
  schema: {
    example: {
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      expiresIn: 3600,
      tokenType: 'Bearer'
    },
  },
};

export const InvalidCredentialsResponse = {
  description: 'Credenciais inválidas',
  type: ErrorResponse,
  status: HttpStatus.UNAUTHORIZED,
  schema: {
    example: {
      statusCode: 401,
      message: 'Credenciais inválidas',
      error: 'Unauthorized',
      timestamp: '2025-05-17T21:50:07.000Z',
      path: '/v1/auth/login',
      errorCode: 'AUTH_001'
    },
  },
};

export const AccountBlockedResponse = {
  description: 'Conta bloqueada',
  type: ErrorResponse,
  status: HttpStatus.FORBIDDEN,
  schema: {
    example: {
      statusCode: 403,
      message: 'Sua conta está bloqueada. Entre em contato com o suporte.',
      error: 'Forbidden',
      timestamp: '2025-05-17T21:50:07.000Z',
      path: '/v1/auth/login',
      errorCode: 'AUTH_002'
    },
  },
};

export const TokenRefreshSuccessResponse = {
  description: 'Token atualizado com sucesso',
  type: LoginResponseDto,
  status: HttpStatus.OK,
  schema: {
    example: {
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      expiresIn: 3600,
      tokenType: 'Bearer'
    },
  },
};

export const InvalidTokenResponse = {
  description: 'Token inválido ou expirado',
  type: ErrorResponse,
  status: HttpStatus.UNAUTHORIZED,
  schema: {
    example: {
      statusCode: 401,
      message: 'Token inválido ou expirado',
      error: 'Unauthorized',
      timestamp: '2025-05-17T21:50:07.000Z',
      path: '/v1/auth/refresh-token',
      errorCode: 'AUTH_003'
    },
  },
};

export const PasswordChangedSuccessResponse = {
  description: 'Senha alterada com sucesso',
  status: HttpStatus.NO_CONTENT,
};

export const PasswordRecoveryInitiatedResponse = {
  description: 'Solicitação de recuperação de senha iniciada',
  status: HttpStatus.ACCEPTED,
  schema: {
    example: {
      message: 'Instruções para redefinição de senha foram enviadas para o e-mail cadastrado',
      expiresIn: 3600
    },
  },
};

/**
 * Decorator para documentar respostas comuns de autenticação
 */
export const ApiAuthResponses = () => {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    ApiResponse(InvalidCredentialsResponse)(target, propertyKey, descriptor);
    ApiResponse(AccountBlockedResponse)(target, propertyKey, descriptor);
    ApiResponse(InvalidTokenResponse)(target, propertyKey, descriptor);
  };
};
