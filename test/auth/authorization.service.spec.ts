import { Test, TestingModule } from '@nestjs/testing';
import { AuthorizationService } from '../../src/auth/services/authorization.service';
import { PermissionService } from '../../src/auth/services/permission.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ScopeType } from '../entities/user-permission.entity';
import { Logger } from '@nestjs/common';

// Mock para o cache manager
const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

// Mock para o serviço de permissões
const mockPermissionService = {
  hasPermission: jest.fn(),
};

describe('AuthorizationService', () => {
  let service: AuthorizationService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationService,
        {
          provide: PermissionService,
          useValue: mockPermissionService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthorizationService>(AuthorizationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isAuthorized', () => {
    it('should return true when user has required permission (AND operator)', async () => {
      // Arrange
      const options = {
        userId: 'user-123',
        permissionName: 'usuario.visualizar',
        scopeType: ScopeType.GLOBAL,
        operator: 'AND' as const,
      };

      // Configurar o mock para retornar do cache primeiro
      mockCacheManager.get.mockResolvedValue(null); // Não está em cache

      // Configurar o mock para verificar permissão
      mockPermissionService.hasPermission.mockResolvedValue(true);

      // Act
      const result = await service.isAuthorized(options);

      // Assert
      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockPermissionService.hasPermission).toHaveBeenCalledWith({
        userId: 'user-123',
        permissionName: 'usuario.visualizar',
        scopeType: ScopeType.GLOBAL,
        scopeId: undefined,
      });
      expect(mockCacheManager.set).toHaveBeenCalled(); // Deve armazenar em cache
      expect(result).toBe(true);
    });

    it('should return false when user does not have required permission (AND operator)', async () => {
      // Arrange
      const options = {
        userId: 'user-123',
        permissionName: 'usuario.visualizar',
        scopeType: ScopeType.GLOBAL,
        operator: 'AND' as const,
      };

      // Configurar o mock para retornar do cache primeiro
      mockCacheManager.get.mockResolvedValue(null); // Não está em cache

      // Configurar o mock para verificar permissão
      mockPermissionService.hasPermission.mockResolvedValue(false);

      // Act
      const result = await service.isAuthorized(options);

      // Assert
      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockPermissionService.hasPermission).toHaveBeenCalledWith({
        userId: 'user-123',
        permissionName: 'usuario.visualizar',
        scopeType: ScopeType.GLOBAL,
        scopeId: undefined,
      });
      expect(mockCacheManager.set).toHaveBeenCalled(); // Deve armazenar em cache
      expect(result).toBe(false);
    });

    it('should return true when user has required role (OR operator)', async () => {
      // Arrange
      const options = {
        userId: 'user-123',
        roles: ['admin'],
        permissionName: 'usuario.visualizar',
        scopeType: ScopeType.GLOBAL,
        operator: 'OR' as const,
      };

      // Configurar o mock para retornar do cache primeiro
      mockCacheManager.get.mockResolvedValue(null); // Não está em cache

      // Configurar o mock para verificar permissão (falha)
      mockPermissionService.hasPermission.mockResolvedValue(false);

      // Monkey patch do método hasRole para retornar true
      jest.spyOn(service as any, 'hasRole').mockResolvedValue(true);

      // Act
      const result = await service.isAuthorized(options);

      // Assert
      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockPermissionService.hasPermission).toHaveBeenCalledWith({
        userId: 'user-123',
        permissionName: 'usuario.visualizar',
        scopeType: ScopeType.GLOBAL,
        scopeId: undefined,
      });
      expect((service as any).hasRole).toHaveBeenCalledWith('user-123', [
        'admin',
      ]);
      expect(mockCacheManager.set).toHaveBeenCalled(); // Deve armazenar em cache
      expect(result).toBe(true);
    });

    it('should return false when user does not have required role or permission (OR operator)', async () => {
      // Arrange
      const options = {
        userId: 'user-123',
        roles: ['admin'],
        permissionName: 'usuario.visualizar',
        scopeType: ScopeType.GLOBAL,
        operator: 'OR' as const,
      };

      // Configurar o mock para retornar do cache primeiro
      mockCacheManager.get.mockResolvedValue(null); // Não está em cache

      // Configurar o mock para verificar permissão (falha)
      mockPermissionService.hasPermission.mockResolvedValue(false);

      // Monkey patch do método hasRole para retornar false
      jest.spyOn(service as any, 'hasRole').mockResolvedValue(false);

      // Act
      const result = await service.isAuthorized(options);

      // Assert
      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockPermissionService.hasPermission).toHaveBeenCalledWith({
        userId: 'user-123',
        permissionName: 'usuario.visualizar',
        scopeType: ScopeType.GLOBAL,
        scopeId: undefined,
      });
      expect((service as any).hasRole).toHaveBeenCalledWith('user-123', [
        'admin',
      ]);
      expect(mockCacheManager.set).toHaveBeenCalled(); // Deve armazenar em cache
      expect(result).toBe(false);
    });

    it('should return true when data check passes', async () => {
      // Arrange
      const options = {
        userId: 'user-123',
        permissionName: 'usuario.visualizar',
        scopeType: ScopeType.GLOBAL,
        dataCheck: jest.fn().mockReturnValue(true),
        data: { id: 'data-123' },
      };

      // Configurar o mock para retornar do cache primeiro
      mockCacheManager.get.mockResolvedValue(null); // Não está em cache

      // Configurar o mock para verificar permissão
      mockPermissionService.hasPermission.mockResolvedValue(true);

      // Act
      const result = await service.isAuthorized(options);

      // Assert
      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockPermissionService.hasPermission).toHaveBeenCalledWith({
        userId: 'user-123',
        permissionName: 'usuario.visualizar',
        scopeType: ScopeType.GLOBAL,
        scopeId: undefined,
      });
      expect(options.dataCheck).toHaveBeenCalledWith({ id: 'data-123' });
      expect(mockCacheManager.set).toHaveBeenCalled(); // Deve armazenar em cache
      expect(result).toBe(true);
    });

    it('should return false when data check fails', async () => {
      // Arrange
      const options = {
        userId: 'user-123',
        permissionName: 'usuario.visualizar',
        scopeType: ScopeType.GLOBAL,
        dataCheck: jest.fn().mockReturnValue(false),
        data: { id: 'data-123' },
      };

      // Configurar o mock para retornar do cache primeiro
      mockCacheManager.get.mockResolvedValue(null); // Não está em cache

      // Configurar o mock para verificar permissão
      mockPermissionService.hasPermission.mockResolvedValue(true);

      // Act
      const result = await service.isAuthorized(options);

      // Assert
      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockPermissionService.hasPermission).toHaveBeenCalledWith({
        userId: 'user-123',
        permissionName: 'usuario.visualizar',
        scopeType: ScopeType.GLOBAL,
        scopeId: undefined,
      });
      expect(options.dataCheck).toHaveBeenCalledWith({ id: 'data-123' });
      expect(mockCacheManager.set).toHaveBeenCalled(); // Deve armazenar em cache
      expect(result).toBe(false);
    });

    it('should return result from cache when available', async () => {
      // Arrange
      const options = {
        userId: 'user-123',
        permissionName: 'usuario.visualizar',
        scopeType: ScopeType.GLOBAL,
      };

      // Configurar o mock para retornar do cache
      mockCacheManager.get.mockResolvedValue(true); // Está em cache e é true

      // Act
      const result = await service.isAuthorized(options);

      // Assert
      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockPermissionService.hasPermission).not.toHaveBeenCalled(); // Não deve chamar o serviço
      expect(result).toBe(true);
    });

    it('should handle async data check function', async () => {
      // Arrange
      const options = {
        userId: 'user-123',
        permissionName: 'usuario.visualizar',
        scopeType: ScopeType.GLOBAL,
        dataCheck: jest.fn().mockResolvedValue(true), // Função assíncrona
        data: { id: 'data-123' },
      };

      // Configurar o mock para retornar do cache primeiro
      mockCacheManager.get.mockResolvedValue(null); // Não está em cache

      // Configurar o mock para verificar permissão
      mockPermissionService.hasPermission.mockResolvedValue(true);

      // Act
      const result = await service.isAuthorized(options);

      // Assert
      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockPermissionService.hasPermission).toHaveBeenCalledWith({
        userId: 'user-123',
        permissionName: 'usuario.visualizar',
        scopeType: ScopeType.GLOBAL,
        scopeId: undefined,
      });
      expect(options.dataCheck).toHaveBeenCalledWith({ id: 'data-123' });
      expect(mockCacheManager.set).toHaveBeenCalled(); // Deve armazenar em cache
      expect(result).toBe(true);
    });

    it('should handle null return from data check function', async () => {
      // Arrange
      const options = {
        userId: 'user-123',
        permissionName: 'usuario.visualizar',
        scopeType: ScopeType.GLOBAL,
        dataCheck: jest.fn().mockReturnValue(null), // Retorna null
        data: { id: 'data-123' },
      };

      // Configurar o mock para retornar do cache primeiro
      mockCacheManager.get.mockResolvedValue(null); // Não está em cache

      // Configurar o mock para verificar permissão
      mockPermissionService.hasPermission.mockResolvedValue(true);

      // Act
      const result = await service.isAuthorized(options);

      // Assert
      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockPermissionService.hasPermission).toHaveBeenCalledWith({
        userId: 'user-123',
        permissionName: 'usuario.visualizar',
        scopeType: ScopeType.GLOBAL,
        scopeId: undefined,
      });
      expect(options.dataCheck).toHaveBeenCalledWith({ id: 'data-123' });
      expect(mockCacheManager.set).toHaveBeenCalled(); // Deve armazenar em cache
      expect(result).toBe(false); // Deve retornar false para null
    });
  });

  describe('clearAuthorizationCache', () => {
    it('should clear cache for a specific user', async () => {
      // Arrange
      const userId = 'user-123';

      // Act
      await service.clearAuthorizationCache(userId);

      // Assert
      expect(mockCacheManager.del).toHaveBeenCalledWith(`auth:${userId}:*`);
    });
  });
});
