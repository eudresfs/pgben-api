import { ApiProperty } from '@nestjs/swagger';

/**
 * Documentação de segurança da API
 * 
 * Este arquivo contém informações sobre os mecanismos de segurança
 * implementados na API, incluindo autenticação, autorização,
 * CORS, rate limiting e outras considerações.
 */

export class SecurityInfo {
  @ApiProperty({
    description: 'Informações sobre autenticação',
    example: {
      type: 'JWT',
      expiresIn: '1h',
      refreshToken: true,
      refreshExpiresIn: '7d',
    },
  })
  authentication: Record<string, any>;

  @ApiProperty({
    description: 'Informações sobre CORS',
    example: {
      allowedOrigins: ['https://pgben.natal.rn.gov.br', 'http://localhost:4200'],
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
      maxAge: 3600,
    },
  })
  cors: Record<string, any>;

  @ApiProperty({
    description: 'Informações sobre rate limiting',
    example: {
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100, // limite de 100 requisições por janela
      message: 'Muitas requisições, tente novamente mais tarde',
      headers: true,
    },
  })
  rateLimit: Record<string, any>;

  @ApiProperty({
    description: 'Informações sobre políticas de segurança',
    example: {
      contentSecurityPolicy: true,
      xssProtection: true,
      noSniff: true,
      frameguard: {
        action: 'deny',
      },
    },
  })
  securityPolicies: Record<string, any>;
}
