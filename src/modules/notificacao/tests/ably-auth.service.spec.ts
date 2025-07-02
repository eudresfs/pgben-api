import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AblyAuthService } from '../services/ably-auth.service';
import {
  IAblyTokenDetails,
  IAblyAuthConfig,
} from '../interfaces/ably.interface';
import * as jwt from 'jsonwebtoken';

// Mock do jsonwebtoken
jest.mock('jsonwebtoken');

describe('AblyAuthService', () => {
  let service: AblyAuthService;
  let configService: ConfigService;

  const mockConfig = {
    ABLY_API_KEY: 'test-api-key',
    ABLY_JWT_EXPIRES_IN: '1h',
    ABLY_JWT_CAPABILITIES: JSON.stringify({
      '*': ['*'],
      'notifications:*': ['subscribe', 'publish'],
      'user:*': ['subscribe'],
    }),
    ABLY_CLIENT_ID: 'test-client',
  };

  const mockJwtSign = jwt.sign as jest.MockedFunction<typeof jwt.sign>;
  const mockJwtVerify = jwt.verify as jest.MockedFunction<typeof jwt.verify>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AblyAuthService,
        {
          provide: 'ABLY_CONFIG',
          useValue: {
            validateConfig: jest.fn(),
            getClientOptions: jest.fn().mockReturnValue({
              key: 'test-api-key',
              environment: 'test',
              clientId: 'test-client',
            }),
            getChannelName: jest.fn().mockReturnValue('test-channel'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AblyAuthService>(AblyAuthService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Inicialização', () => {
    it('deve ser definido', () => {
      expect(service).toBeDefined();
    });

    it('deve inicializar com configurações corretas', () => {
      expect(configService.get).toHaveBeenCalledWith('ABLY_API_KEY');
      expect(configService.get).toHaveBeenCalledWith('ABLY_JWT_EXPIRES_IN');
      expect(configService.get).toHaveBeenCalledWith('ABLY_JWT_CAPABILITIES');
    });
  });

  describe('generateToken', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      perfil: 'ADMIN',
    };

    beforeEach(() => {
      mockJwtSign.mockReturnValue('mock-jwt-token' as any);
    });

    it('deve gerar token com sucesso para usuário admin', async () => {
      const result = await service.generateToken(mockUser.id, mockUser.perfil, {
        channels: ['notifications:*', 'system:*'],
        permissions: ['subscribe', 'publish'],
      });

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.token?.token).toBe('mock-jwt-token');
      expect(result.token?.clientId).toBe(mockUser.id);
      expect(result.token?.capability).toEqual({
        'notifications:*': ['subscribe', 'publish'],
        'system:*': ['subscribe', 'publish'],
      });
    });

    it('deve gerar token com capacidades limitadas para usuário comum', async () => {
      const commonUser = { ...mockUser, perfil: 'USUARIO' };

      const result = await service.generateToken(
        commonUser.id,
        commonUser.perfil,
        {
          channels: ['user:notifications'],
          permissions: ['subscribe'],
        },
      );

      expect(result.success).toBe(true);
      expect(result.token?.capability).toEqual({
        'user:notifications': ['subscribe'],
      });
    });

    it('deve aplicar capacidades baseadas no perfil', async () => {
      const result = await service.generateToken(mockUser.id, 'GESTOR');

      expect(result.success).toBe(true);
      expect(result.token?.capability).toEqual({
        'notifications:*': ['subscribe', 'publish'],
        'user:*': ['subscribe'],
        'department:*': ['subscribe', 'publish'],
      });
    });

    it('deve retornar erro para perfil inválido', async () => {
      const result = await service.generateToken(mockUser.id, 'INVALID_ROLE');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Perfil de usuário inválido');
      expect(result.errorCode).toBe('INVALID_USER_ROLE');
    });

    it('deve retornar erro quando geração de JWT falha', async () => {
      mockJwtSign.mockImplementation(() => {
        throw new Error('JWT generation failed');
      });

      const result = await service.generateToken(mockUser.id, mockUser.perfil);

      expect(result.success).toBe(false);
      expect(result.error).toBe('JWT generation failed');
      expect(result.errorCode).toBe('TOKEN_GENERATION_FAILED');
    });

    it('deve usar cache para tokens válidos', async () => {
      // Primeira chamada
      const result1 = await service.generateToken(mockUser.id, mockUser.perfil);

      // Segunda chamada (deve usar cache)
      const result2 = await service.generateToken(mockUser.id, mockUser.perfil);

      expect(result1.token?.token).toBe(result2.token?.token);
      expect(mockJwtSign).toHaveBeenCalledTimes(1); // JWT só deve ser gerado uma vez
    });
  });

  describe('validateToken', () => {
    const mockTokenPayload = {
      sub: 'user-123',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      capability: {
        'notifications:*': ['subscribe', 'publish'],
      },
      clientId: 'user-123',
    };

    beforeEach(() => {
      mockJwtVerify.mockReturnValue(mockTokenPayload as any);
    });

    it('deve validar token válido', async () => {
      const result = await service.validateToken('valid-token');

      expect(result.valid).toBe(true);
      expect(result.payload).toEqual(mockTokenPayload);
      expect(mockJwtVerify).toHaveBeenCalledWith('valid-token', 'test-api-key');
    });

    it('deve rejeitar token inválido', async () => {
      mockJwtVerify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await service.validateToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token');
    });

    it('deve rejeitar token expirado', async () => {
      const expiredPayload = {
        ...mockTokenPayload,
        exp: Math.floor(Date.now() / 1000) - 3600, // Expirado há 1 hora
      };
      mockJwtVerify.mockReturnValue(expiredPayload as any);

      const result = await service.validateToken('expired-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token expirado');
    });

    it('deve validar token sem expiração definida', async () => {
      const noExpPayload = {
        ...mockTokenPayload,
      };
      delete noExpPayload.exp;
      mockJwtVerify.mockReturnValue(noExpPayload as any);

      const result = await service.validateToken('no-exp-token');

      expect(result.valid).toBe(true);
    });
  });

  describe('hasPermission', () => {
    const mockCapability = {
      'notifications:*': ['subscribe', 'publish'],
      'user:123': ['subscribe'],
      'system:alerts': ['subscribe'],
    };

    it('deve permitir acesso com permissão exata', () => {
      const result = service.hasPermission(
        mockCapability,
        'notifications:general',
        'publish',
      );
      expect(result).toBe(true);
    });

    it('deve permitir acesso com wildcard', () => {
      const result = service.hasPermission(
        mockCapability,
        'notifications:alerts',
        'subscribe',
      );
      expect(result).toBe(true);
    });

    it('deve negar acesso sem permissão', () => {
      const result = service.hasPermission(
        mockCapability,
        'admin:users',
        'publish',
      );
      expect(result).toBe(false);
    });

    it('deve negar acesso com canal correto mas permissão incorreta', () => {
      const result = service.hasPermission(
        mockCapability,
        'user:123',
        'publish',
      );
      expect(result).toBe(false);
    });

    it('deve permitir acesso com permissão wildcard (*)', () => {
      const wildcardCapability = {
        '*': ['*'],
      };

      const result = service.hasPermission(
        wildcardCapability,
        'any:channel',
        'any-permission',
      );
      expect(result).toBe(true);
    });
  });

  describe('revokeToken', () => {
    it('deve revogar token do cache', async () => {
      const userId = 'user-123';
      const userRole = 'ADMIN';

      // Gera token primeiro
      mockJwtSign.mockReturnValue('mock-token' as any);
      await service.generateToken(userId, userRole);

      // Revoga token
      const result = await service.revokeToken(userId);

      expect(result.success).toBe(true);

      // Verifica se token foi removido do cache
      const newTokenResult = await service.generateToken(userId, userRole);
      expect(mockJwtSign).toHaveBeenCalledTimes(2); // Deve gerar novo token
    });

    it('deve retornar sucesso mesmo se token não existir no cache', async () => {
      const result = await service.revokeToken('non-existent-user');
      expect(result.success).toBe(true);
    });
  });

  describe('getCapabilitiesForRole', () => {
    it('deve retornar capacidades para ADMIN', () => {
      const capabilities = service.getCapabilitiesForRole('ADMIN');

      expect(capabilities).toEqual({
        '*': ['*'],
      });
    });

    it('deve retornar capacidades para GESTOR', () => {
      const capabilities = service.getCapabilitiesForRole('GESTOR');

      expect(capabilities).toEqual({
        'notifications:*': ['subscribe', 'publish'],
        'user:*': ['subscribe'],
        'department:*': ['subscribe', 'publish'],
      });
    });

    it('deve retornar capacidades para OPERADOR', () => {
      const capabilities = service.getCapabilitiesForRole('OPERADOR');

      expect(capabilities).toEqual({
        'notifications:*': ['subscribe'],
        'user:*': ['subscribe'],
        'benefits:*': ['subscribe', 'publish'],
      });
    });

    it('deve retornar capacidades para USUARIO', () => {
      const capabilities = service.getCapabilitiesForRole('USUARIO');

      expect(capabilities).toEqual({
        'user:notifications': ['subscribe'],
        'public:announcements': ['subscribe'],
      });
    });

    it('deve retornar null para perfil inválido', () => {
      const capabilities = service.getCapabilitiesForRole('INVALID_ROLE');
      expect(capabilities).toBeNull();
    });
  });

  describe('Cache Management', () => {
    beforeEach(() => {
      mockJwtSign.mockReturnValue('mock-token' as any);
    });

    it('deve limpar cache expirado automaticamente', async () => {
      const userId = 'user-123';
      const userRole = 'ADMIN';

      // Mock para token que expira rapidamente
      const shortExpiryConfig = {
        ...mockConfig,
        ABLY_JWT_EXPIRES_IN: '1ms', // 1 milissegundo
      };

      configService.get = jest.fn((key: string) => shortExpiryConfig[key]);

      // Gera token
      await service.generateToken(userId, userRole);

      // Aguarda expiração
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Gera novo token (deve criar novo, não usar cache)
      await service.generateToken(userId, userRole);

      expect(mockJwtSign).toHaveBeenCalledTimes(2);
    });

    it('deve limpar todo o cache', async () => {
      // Gera alguns tokens
      await service.generateToken('user-1', 'ADMIN');
      await service.generateToken('user-2', 'GESTOR');

      // Limpa cache
      service.clearCache();

      // Gera tokens novamente (deve criar novos)
      await service.generateToken('user-1', 'ADMIN');
      await service.generateToken('user-2', 'GESTOR');

      expect(mockJwtSign).toHaveBeenCalledTimes(4);
    });
  });

  describe('Error Handling', () => {
    it('deve tratar erro de configuração ausente', () => {
      configService.get = jest.fn().mockReturnValue(undefined);

      expect(() => {
        new AblyAuthService(configService);
      }).toThrow('Configuração do Ably não encontrada');
    });

    it('deve tratar capacidades JSON inválidas', () => {
      const invalidConfig = {
        ...mockConfig,
        ABLY_JWT_CAPABILITIES: 'invalid-json',
      };

      configService.get = jest.fn((key: string) => invalidConfig[key]);

      expect(() => {
        new AblyAuthService(configService);
      }).toThrow('Configuração de capacidades JWT inválida');
    });
  });

  describe('Token Expiration', () => {
    it('deve calcular expiração corretamente para diferentes formatos', async () => {
      const testCases = [
        { input: '1h', expected: 3600 },
        { input: '30m', expected: 1800 },
        { input: '24h', expected: 86400 },
        { input: '1d', expected: 86400 },
      ];

      for (const testCase of testCases) {
        configService.get = jest.fn((key: string) => {
          if (key === 'ABLY_JWT_EXPIRES_IN') return testCase.input;
          return mockConfig[key];
        });

        const authService = new AblyAuthService(configService);
        mockJwtSign.mockClear();

        await authService.generateToken('user-123', 'ADMIN');

        expect(mockJwtSign).toHaveBeenCalledWith(
          expect.objectContaining({
            exp: expect.any(Number),
          }),
          'test-api-key',
        );

        const call = mockJwtSign.mock.calls[0];
        const payload = call[0] as any;
        const expectedExp = Math.floor(Date.now() / 1000) + testCase.expected;

        // Permite uma diferença de 1 segundo devido ao tempo de execução
        expect(payload.exp).toBeCloseTo(expectedExp, -1);
      }
    });
  });
});
