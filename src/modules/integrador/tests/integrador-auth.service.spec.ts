import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException, Logger } from '@nestjs/common';
import { Request } from 'express';
import { IntegradorAuthService } from '../services/integrador-auth.service';
import { IntegradorTokenService } from '../services/integrador-token.service';
import { TokenRevogado } from '../entities/token-revogado.entity';

/**
 * Testes unitários para o serviço de autenticação de integradores.
 * Valida extração de tokens, verificação de permissões e validação de requisições.
 */
describe('IntegradorAuthService', () => {
  let service: IntegradorAuthService;
  let tokenService: IntegradorTokenService;
  let tokenRevogadoRepository: any;

  // Mock do serviço de tokens
  const mockTokenService = {
    validateToken: jest.fn(),
    hasRequiredScopes: jest.fn(),
    isIpAllowed: jest.fn(),
  };

  // Mock do repositório de tokens revogados
  const mockTokenRevogadoRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    // Mock do Logger para evitar problemas durante testes
    jest.spyOn(Logger, 'error').mockImplementation(() => {});
    jest.spyOn(Logger, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger, 'log').mockImplementation(() => {});
    jest.spyOn(Logger, 'debug').mockImplementation(() => {});
    jest.spyOn(Logger, 'verbose').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegradorAuthService,
        {
          provide: IntegradorTokenService,
          useValue: mockTokenService,
        },
        {
          provide: getRepositoryToken(TokenRevogado),
          useValue: mockTokenRevogadoRepository,
        },
      ],
    }).compile();

    service = module.get<IntegradorAuthService>(IntegradorAuthService);
    tokenService = module.get<IntegradorTokenService>(IntegradorTokenService);
    tokenRevogadoRepository = module.get(getRepositoryToken(TokenRevogado));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('extractTokenFromHeader', () => {
    it('deve extrair corretamente o token do cabeçalho Authorization', () => {
      // Arrange
      const token = 'jwt-token-string';
      const request = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      } as Request;

      // Act
      const result = service.extractTokenFromHeader(request);

      // Assert
      expect(result).toEqual(token);
    });

    it('deve retornar null quando não há cabeçalho Authorization', () => {
      // Arrange
      const request = {
        headers: {},
      } as Request;

      // Act
      const result = service.extractTokenFromHeader(request);

      // Assert
      expect(result).toBeNull();
    });

    it('deve retornar null quando o formato do cabeçalho Authorization é inválido', () => {
      // Arrange
      const request = {
        headers: {
          authorization: 'InvalidFormat jwt-token-string',
        },
      } as Request;

      // Act
      const result = service.extractTokenFromHeader(request);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getIpFromRequest', () => {
    it('deve extrair IP do cabeçalho X-Forwarded-For', () => {
      // Arrange
      const realIp = '192.168.1.1';
      const request = {
        headers: {
          'x-forwarded-for': `${realIp}, 10.0.0.1, 172.16.0.1`,
        },
        ip: '10.0.0.1',
      } as unknown as Request;

      // Act
      const result = service.getIpFromRequest(request);

      // Assert
      expect(result).toEqual(realIp);
    });

    it('deve usar request.ip quando não há X-Forwarded-For', () => {
      // Arrange
      const requestIp = '10.0.0.1';
      const request = {
        headers: {},
        ip: requestIp,
      } as unknown as Request;

      // Act
      const result = service.getIpFromRequest(request);

      // Assert
      expect(result).toEqual(requestIp);
    });

    it('deve usar request.socket.remoteAddress como fallback', () => {
      // Arrange
      const socketIp = '172.16.0.1';
      const request = {
        headers: {},
        ip: null,
        socket: {
          remoteAddress: socketIp,
        },
      } as unknown as Request;

      // Act
      const result = service.getIpFromRequest(request);

      // Assert
      expect(result).toEqual(socketIp);
    });
  });

  describe('validateRequest', () => {
    it('deve validar uma requisição com sucesso', async () => {
      // Arrange
      const token = 'jwt-token-string';
      const integrador = {
        id: 'integrador-id',
        nome: 'Integrador Teste',
        ativo: true,
      };
      const payload = {
        sub: 'integrador:integrador-id',
        integrador,
      };
      const ipAddress = '192.168.1.1';
      const request = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      } as unknown as Request;

      // Configurar mocks
      service.extractTokenFromHeader = jest.fn().mockReturnValue(token);
      service.getIpFromRequest = jest.fn().mockReturnValue(ipAddress);
      mockTokenService.validateToken.mockResolvedValue(payload);
      mockTokenService.isIpAllowed.mockReturnValue(true);

      // Act
      const result = await service.validateRequest(request);

      // Assert
      expect(service.extractTokenFromHeader).toHaveBeenCalledWith(request);
      expect(mockTokenService.validateToken).toHaveBeenCalledWith(token);
      expect(service.getIpFromRequest).toHaveBeenCalledWith(request);
      expect(mockTokenService.isIpAllowed).toHaveBeenCalledWith(
        integrador,
        ipAddress,
      );
      expect(result).toEqual(payload);
      expect(request['integrador']).toEqual(integrador);
      expect(request['integradorTokenPayload']).toEqual(payload);
    });

    it('deve lançar UnauthorizedException quando não há token', async () => {
      // Arrange
      const request = {
        headers: {},
      } as Request;

      service.extractTokenFromHeader = jest.fn().mockReturnValue(null);

      // Act & Assert
      await expect(service.validateRequest(request)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(service.extractTokenFromHeader).toHaveBeenCalledWith(request);
      expect(mockTokenService.validateToken).not.toHaveBeenCalled();
    });

    it('deve lançar UnauthorizedException quando token é inválido', async () => {
      // Arrange
      const token = 'invalid-token';
      const request = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      } as unknown as Request;

      service.extractTokenFromHeader = jest.fn().mockReturnValue(token);
      mockTokenService.validateToken.mockRejectedValue(
        new UnauthorizedException('Token inválido'),
      );

      // Act & Assert
      await expect(service.validateRequest(request)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(service.extractTokenFromHeader).toHaveBeenCalledWith(request);
      expect(mockTokenService.validateToken).toHaveBeenCalledWith(token);
    });

    it('deve lançar UnauthorizedException quando IP não é permitido', async () => {
      // Arrange
      const token = 'jwt-token-string';
      const integrador = {
        id: 'integrador-id',
        nome: 'Integrador Teste',
        ativo: true,
        ipPermitidos: ['10.0.0.1', '172.16.0.1'],
      };
      const payload = {
        sub: 'integrador:integrador-id',
        integrador,
      };
      const ipAddress = '192.168.1.1'; // IP não permitido
      const request = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      } as unknown as Request;

      service.extractTokenFromHeader = jest.fn().mockReturnValue(token);
      service.getIpFromRequest = jest.fn().mockReturnValue(ipAddress);
      mockTokenService.validateToken.mockResolvedValue(payload);
      mockTokenService.isIpAllowed.mockReturnValue(false);

      // Act & Assert
      await expect(service.validateRequest(request)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(service.extractTokenFromHeader).toHaveBeenCalledWith(request);
      expect(mockTokenService.validateToken).toHaveBeenCalledWith(token);
      expect(service.getIpFromRequest).toHaveBeenCalledWith(request);
      expect(mockTokenService.isIpAllowed).toHaveBeenCalledWith(
        integrador,
        ipAddress,
      );
    });
  });

  describe('checkPermissions', () => {
    it('deve retornar true quando token tem as permissões necessárias', () => {
      // Arrange
      const payload = {
        scopes: ['read:dados_basicos', 'write:solicitacoes'],
      };
      const requiredScopes = ['read:dados_basicos'];
      const request = {
        integradorTokenPayload: payload,
      } as unknown as Request;

      mockTokenService.hasRequiredScopes.mockReturnValue(true);

      // Act
      const result = service.checkPermissions(request, requiredScopes);

      // Assert
      expect(mockTokenService.hasRequiredScopes).toHaveBeenCalledWith(
        payload,
        requiredScopes,
      );
      expect(result).toBe(true);
    });

    it('deve retornar false quando token não tem as permissões necessárias', () => {
      // Arrange
      const payload = {
        scopes: ['read:dados_basicos'],
      };
      const requiredScopes = ['write:solicitacoes'];
      const request = {
        integradorTokenPayload: payload,
      } as unknown as Request;

      mockTokenService.hasRequiredScopes.mockReturnValue(false);

      // Act
      const result = service.checkPermissions(request, requiredScopes);

      // Assert
      expect(mockTokenService.hasRequiredScopes).toHaveBeenCalledWith(
        payload,
        requiredScopes,
      );
      expect(result).toBe(false);
    });

    it('deve retornar false quando não há payload no request', () => {
      // Arrange
      const requiredScopes = ['read:dados_basicos'];
      const request = {} as Request;

      // Act
      const result = service.checkPermissions(request, requiredScopes);

      // Assert
      expect(mockTokenService.hasRequiredScopes).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('isTokenRevogado', () => {
    it('deve retornar true quando token está na lista de revogados', async () => {
      // Arrange
      const tokenHash = 'token-hash';
      mockTokenRevogadoRepository.findOne.mockResolvedValue({
        id: 'revogado-id',
        tokenHash,
      });

      // Act
      const result = await service.isTokenRevogado(tokenHash);

      // Assert
      expect(mockTokenRevogadoRepository.findOne).toHaveBeenCalledWith({
        where: { tokenHash },
      });
      expect(result).toBe(true);
    });

    it('deve retornar false quando token não está na lista de revogados', async () => {
      // Arrange
      const tokenHash = 'token-hash';
      mockTokenRevogadoRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.isTokenRevogado(tokenHash);

      // Assert
      expect(mockTokenRevogadoRepository.findOne).toHaveBeenCalledWith({
        where: { tokenHash },
      });
      expect(result).toBe(false);
    });
  });
});
