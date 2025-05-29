import { Test, TestingModule } from '@nestjs/testing';
import { PermissionService } from './permission.service';
import { PermissionRepository } from '../repositories/permission.repository';
import { UserPermissionRepository } from '../repositories/user-permission.repository';
import { RolePermissionRepository } from '../repositories/role-permission.repository';
import { PermissionGroupRepository } from '../repositories/permission-group.repository';
import { PermissionGroupMappingRepository } from '../repositories/permission-group-mapping.repository';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Permission } from '../entities/permission.entity';
import { UserPermission } from '../entities/user-permission.entity';
import { ScopeType } from '../entities/user-permission.entity';
import { PermissionGroup } from '../entities/permission-group.entity';
import { PermissionGroupMapping } from '../entities/permission-group-mapping.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { Logger } from '@nestjs/common';

// Mock para o cache manager
const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

// Mock para o repositório de permissões
const mockPermissionRepository = {
  findByName: jest.fn(),
  findByPattern: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

// Mock para o repositório de permissões de usuário
const mockUserPermissionRepository = {
  findByUserIdWithPermissions: jest.fn(),
  findByUserIdAndPermissionName: jest.fn(),
  findByUserAndPermission: jest.fn(),
  createUserPermission: jest.fn(),
  updateUserPermission: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  softDelete: jest.fn(),
};

// Mock para o repositório de permissões de role
const mockRolePermissionRepository = {
  findByRoleIdWithPermissions: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

// Mock para o repositório de grupos de permissões
const mockPermissionGroupRepository = {
  findByName: jest.fn(),
  find: jest.fn(),
};

// Mock para o repositório de mapeamentos de grupos de permissões
const mockPermissionGroupMappingRepository = {
  findByGroupId: jest.fn(),
};

describe('PermissionService', () => {
  let service: PermissionService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionService,
        {
          provide: PermissionRepository,
          useValue: mockPermissionRepository,
        },
        {
          provide: UserPermissionRepository,
          useValue: mockUserPermissionRepository,
        },
        {
          provide: RolePermissionRepository,
          useValue: mockRolePermissionRepository,
        },
        {
          provide: PermissionGroupRepository,
          useValue: mockPermissionGroupRepository,
        },
        {
          provide: PermissionGroupMappingRepository,
          useValue: mockPermissionGroupMappingRepository,
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

    service = module.get<PermissionService>(PermissionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserPermissions', () => {
    it('should return only active and non-expired user permissions by default', async () => {
      // Arrange
      const userId = 'user-123';
      const mockPermissions = [
        { id: 'perm-1', name: 'usuario.visualizar' },
        { id: 'perm-2', name: 'usuario.editar' },
        { id: 'perm-3', name: 'usuario.excluir' },
        { id: 'perm-4', name: 'usuario.criar' },
      ];
      
      const now = new Date();
      const futureDate = new Date(now.getTime() + 10000000); // Data futura
      const pastDate = new Date(now.getTime() - 10000000); // Data passada
      
      const mockUserPermissions = [
        { permission: mockPermissions[0], granted: true, validUntil: null }, // Ativa, sem expiração
        { permission: mockPermissions[1], granted: true, validUntil: futureDate }, // Ativa, não expirada
        { permission: mockPermissions[2], granted: false, validUntil: null }, // Inativa
        { permission: mockPermissions[3], granted: true, validUntil: pastDate }, // Ativa, mas expirada
      ] as UserPermission[];

      mockUserPermissionRepository.findByUserIdWithPermissions.mockResolvedValue(mockUserPermissions);

      // Act
      const result = await service.getUserPermissions(userId);

      // Assert
      expect(mockUserPermissionRepository.findByUserIdWithPermissions).toHaveBeenCalledWith(userId);
      // Deve retornar apenas as permissões ativas e não expiradas
      expect(result).toEqual([mockPermissions[0], mockPermissions[1]]);
    });
    
    it('should return all user permissions when includeInactive is true', async () => {
      // Arrange
      const userId = 'user-123';
      const mockPermissions = [
        { id: 'perm-1', name: 'usuario.visualizar' },
        { id: 'perm-2', name: 'usuario.editar' },
        { id: 'perm-3', name: 'usuario.excluir' },
        { id: 'perm-4', name: 'usuario.criar' },
      ];
      
      const now = new Date();
      const futureDate = new Date(now.getTime() + 10000000); // Data futura
      const pastDate = new Date(now.getTime() - 10000000); // Data passada
      
      const mockUserPermissions = [
        { permission: mockPermissions[0], granted: true, validUntil: null }, // Ativa, sem expiração
        { permission: mockPermissions[1], granted: true, validUntil: futureDate }, // Ativa, não expirada
        { permission: mockPermissions[2], granted: false, validUntil: null }, // Inativa
        { permission: mockPermissions[3], granted: true, validUntil: pastDate }, // Ativa, mas expirada
      ] as UserPermission[];

      mockUserPermissionRepository.findByUserIdWithPermissions.mockResolvedValue(mockUserPermissions);

      // Act
      const result = await service.getUserPermissions(userId, true);

      // Assert
      expect(mockUserPermissionRepository.findByUserIdWithPermissions).toHaveBeenCalledWith(userId);
      // Deve retornar todas as permissões
      expect(result).toEqual(mockPermissions);
    });

    it('should return empty array when user has no permissions', async () => {
      // Arrange
      const userId = 'user-123';
      mockUserPermissionRepository.findByUserIdWithPermissions.mockResolvedValue([]);

      // Act
      const result = await service.getUserPermissions(userId);

      // Assert
      expect(mockUserPermissionRepository.findByUserIdWithPermissions).toHaveBeenCalledWith(userId);
      expect(result).toEqual([]);
    });
    
    it('should return empty array when userId is not provided', async () => {
      // Arrange
      const userId = '';

      // Act
      const result = await service.getUserPermissions(userId);

      // Assert
      expect(mockUserPermissionRepository.findByUserIdWithPermissions).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
    
    it('should handle errors and return empty array', async () => {
      // Arrange
      const userId = 'user-123';
      mockUserPermissionRepository.findByUserIdWithPermissions.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await service.getUserPermissions(userId);

      // Assert
      expect(mockUserPermissionRepository.findByUserIdWithPermissions).toHaveBeenCalledWith(userId);
      expect(result).toEqual([]);
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has exact permission with matching scope', async () => {
      // Arrange
      const options = {
        userId: 'user-123',
        permissionName: 'usuario.visualizar',
        scopeType: ScopeType.GLOBAL,
      };

      const mockPermission = { id: 'perm-1', name: 'usuario.visualizar' } as Permission;
      const mockUserPermission = {
        id: 'up-1',
        userId: 'user-123',
        permission: mockPermission,
        permissionId: 'perm-1',
        scopeType: ScopeType.GLOBAL,
        scopeId: null,
        granted: true,
        validUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin-user',
        updatedBy: null
      } as UserPermission;

      // Configurar o mock para retornar do cache primeiro
      mockCacheManager.get.mockResolvedValue(null); // Não está em cache

      // Configurar o mock para encontrar a permissão
      mockUserPermissionRepository.findByUserIdAndPermissionName.mockResolvedValue([mockUserPermission]);

      // Act
      const result = await service.hasPermission(options);

      // Assert
      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockUserPermissionRepository.findByUserIdAndPermissionName).toHaveBeenCalledWith(
        'user-123',
        'usuario.visualizar',
      );
      expect(mockCacheManager.set).toHaveBeenCalled(); // Deve armazenar em cache
      expect(result).toBe(true);
    });

    it('should return false when user does not have the permission', async () => {
      // Arrange
      const options = {
        userId: 'user-123',
        permissionName: 'usuario.visualizar',
        scopeType: ScopeType.GLOBAL,
      };

      // Configurar o mock para retornar do cache primeiro
      mockCacheManager.get.mockResolvedValue(null); // Não está em cache

      // Configurar o mock para não encontrar a permissão
      mockUserPermissionRepository.findByUserIdAndPermissionName.mockResolvedValue([]);

      // Act
      const result = await service.hasPermission(options);

      // Assert
      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockUserPermissionRepository.findByUserIdAndPermissionName).toHaveBeenCalledWith(
        'user-123',
        'usuario.visualizar',
      );
      expect(mockCacheManager.set).toHaveBeenCalled(); // Deve armazenar em cache
      expect(result).toBe(false);
    });

    it('should check for wildcard permissions when exact permission is not found', async () => {
      // Arrange
      const options = {
        userId: 'user-123',
        permissionName: 'usuario.visualizar.detalhes',
        scopeType: ScopeType.GLOBAL,
      };

      const mockWildcardPermission = { id: 'perm-1', name: 'usuario.visualizar.*' } as Permission;
      const mockUserPermission = {
        id: 'up-1',
        userId: 'user-123',
        permission: mockWildcardPermission,
        permissionId: 'perm-1',
        scopeType: ScopeType.GLOBAL,
        scopeId: null,
        granted: true,
        validUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin-user',
        updatedBy: null
      } as UserPermission;

      // Configurar o mock para retornar do cache primeiro
      mockCacheManager.get.mockResolvedValue(null); // Não está em cache

      // Configurar o mock para não encontrar a permissão exata
      mockUserPermissionRepository.findByUserIdAndPermissionName.mockResolvedValue([]);

      // Configurar o mock para encontrar permissões com wildcard
      mockPermissionRepository.findByPattern.mockResolvedValue([mockWildcardPermission]);
      mockUserPermissionRepository.findByUserIdWithPermissions.mockResolvedValue([mockUserPermission]);

      // Act
      const result = await service.hasPermission(options);

      // Assert
      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockUserPermissionRepository.findByUserIdAndPermissionName).toHaveBeenCalledWith(
        'user-123',
        'usuario.visualizar.detalhes',
      );
      expect(mockPermissionRepository.findByPattern).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalled(); // Deve armazenar em cache
      expect(result).toBe(true);
    });

    it('should return permission from cache when available', async () => {
      // Arrange
      const options = {
        userId: 'user-123',
        permissionName: 'usuario.visualizar',
        scopeType: ScopeType.GLOBAL,
      };

      // Configurar o mock para retornar do cache
      mockCacheManager.get.mockResolvedValue(true); // Está em cache e é true

      // Act
      const result = await service.hasPermission(options);

      // Assert
      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockUserPermissionRepository.findByUserIdAndPermissionName).not.toHaveBeenCalled(); // Não deve chamar o repositório
      expect(result).toBe(true);
    });
  });

  describe('grantPermission', () => {
    it('should grant a new permission to a user', async () => {
      // Arrange
      const userId = 'user-123';
      const permissionName = 'usuario.visualizar';
      const scopeType = ScopeType.GLOBAL;
      const scopeId = undefined;
      const createdBy = 'admin-user';

      const mockPermission = { id: 'perm-1', name: 'usuario.visualizar' } as Permission;

      // Configurar o mock para encontrar a permissão
      mockPermissionRepository.findByName.mockResolvedValue(mockPermission);
      
      // Configurar o mock para não encontrar permissão existente
      mockUserPermissionRepository.findByUserAndPermission.mockResolvedValue(null);

      // Configurar o mock para criar a permissão do usuário
      mockUserPermissionRepository.createUserPermission.mockResolvedValue({
        id: 'up-1',
        userId,
        permissionId: 'perm-1',
        scopeType,
        scopeId,
        granted: true,
        createdBy
      });

      // Act
      const result = await service.grantPermission(
        userId,
        permissionName,
        scopeType,
        scopeId,
        null, // validUntil
        createdBy,
      );

      // Assert
      expect(mockPermissionRepository.findByName).toHaveBeenCalledWith(permissionName);
      expect(mockUserPermissionRepository.findByUserAndPermission).toHaveBeenCalledWith(
        userId,
        mockPermission.id,
        scopeType,
        undefined
      );
      expect(mockUserPermissionRepository.createUserPermission).toHaveBeenCalledWith({
        userId,
        permissionId: mockPermission.id,
        granted: true,
        scopeType,
        scopeId: undefined,
        validUntil: null,
        createdBy,
      });
      expect(mockCacheManager.del).toHaveBeenCalled(); // Deve limpar o cache
      expect(result).toBe(true);
    });
    
    it('should update an existing permission for a user', async () => {
      // Arrange
      const userId = 'user-123';
      const permissionName = 'usuario.visualizar';
      const scopeType = ScopeType.GLOBAL;
      const scopeId = undefined;
      const createdBy = 'admin-user';
      const validUntil = new Date('2026-01-01');

      const mockPermission = { id: 'perm-1', name: 'usuario.visualizar' } as Permission;
      const existingPermission = {
        id: 'up-1',
        userId,
        permissionId: 'perm-1',
        scopeType,
        scopeId: undefined,
        granted: false,
        validUntil: null
      };

      // Configurar o mock para encontrar a permissão
      mockPermissionRepository.findByName.mockResolvedValue(mockPermission);
      
      // Configurar o mock para encontrar permissão existente
      mockUserPermissionRepository.findByUserAndPermission.mockResolvedValue(existingPermission);

      // Configurar o mock para atualizar a permissão do usuário
      mockUserPermissionRepository.updateUserPermission.mockResolvedValue({
        ...existingPermission,
        granted: true,
        validUntil,
        updatedBy: createdBy
      });

      // Act
      const result = await service.grantPermission(
        userId,
        permissionName,
        scopeType,
        scopeId,
        validUntil,
        createdBy,
      );

      // Assert
      expect(mockPermissionRepository.findByName).toHaveBeenCalledWith(permissionName);
      expect(mockUserPermissionRepository.findByUserAndPermission).toHaveBeenCalledWith(
        userId,
        mockPermission.id,
        scopeType,
        undefined
      );
      expect(mockUserPermissionRepository.updateUserPermission).toHaveBeenCalledWith(
        existingPermission.id,
        {
          granted: true,
          validUntil,
          updatedBy: createdBy,
        }
      );
      expect(mockCacheManager.del).toHaveBeenCalled(); // Deve limpar o cache
      expect(result).toBe(true);
    });

    it('should return false when permission does not exist', async () => {
      // Arrange
      const userId = 'user-123';
      const permissionName = 'usuario.visualizar';
      const scopeType = ScopeType.GLOBAL;
      const scopeId = undefined;
      const createdBy = 'admin-user';

      // Configurar o mock para não encontrar a permissão
      mockPermissionRepository.findByName.mockResolvedValue(null);

      // Act
      const result = await service.grantPermission(
        userId,
        permissionName,
        scopeType,
        scopeId,
        null, // validUntil
        createdBy,
      );

      // Assert
      expect(mockPermissionRepository.findByName).toHaveBeenCalledWith(permissionName);
      expect(mockUserPermissionRepository.findByUserAndPermission).not.toHaveBeenCalled();
      expect(mockUserPermissionRepository.createUserPermission).not.toHaveBeenCalled();
      expect(mockUserPermissionRepository.updateUserPermission).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
    
    it('should return false when userId is not provided', async () => {
      // Arrange
      const userId = '';
      const permissionName = 'usuario.visualizar';
      const scopeType = ScopeType.GLOBAL;
      const scopeId = undefined;
      const createdBy = 'admin-user';

      // Act
      const result = await service.grantPermission(
        userId,
        permissionName,
        scopeType,
        scopeId,
        null, // validUntil
        createdBy,
      );

      // Assert
      expect(mockPermissionRepository.findByName).not.toHaveBeenCalled();
      expect(mockUserPermissionRepository.findByUserAndPermission).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
    
    it('should return false when trying to grant permission with UNIT scope but no scopeId', async () => {
      // Arrange
      const userId = 'user-123';
      const permissionName = 'usuario.visualizar';
      const scopeType = ScopeType.UNIT;
      const scopeId = undefined;
      const createdBy = 'admin-user';

      // Act
      const result = await service.grantPermission(
        userId,
        permissionName,
        scopeType,
        scopeId,
        null, // validUntil
        createdBy,
      );

      // Assert
      expect(mockPermissionRepository.findByName).not.toHaveBeenCalled();
      expect(mockUserPermissionRepository.findByUserAndPermission).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
    
    it('should return false when validUntil is in the past', async () => {
      // Arrange
      const userId = 'user-123';
      const permissionName = 'usuario.visualizar';
      const scopeType = ScopeType.GLOBAL;
      const scopeId = undefined;
      const createdBy = 'admin-user';
      const validUntil = new Date('2020-01-01'); // Data no passado

      // Act
      const result = await service.grantPermission(
        userId,
        permissionName,
        scopeType,
        scopeId,
        validUntil,
        createdBy,
      );

      // Assert
      expect(mockPermissionRepository.findByName).not.toHaveBeenCalled();
      expect(mockUserPermissionRepository.findByUserAndPermission).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('revokePermission', () => {
    it('should revoke a permission from a user', async () => {
      // Arrange
      const userId = 'user-123';
      const permissionName = 'usuario.visualizar';
      const scopeType = ScopeType.GLOBAL;
      const scopeId = undefined;
      const revokedBy = 'admin-user';

      const mockPermission = { id: 'perm-1', name: 'usuario.visualizar' } as Permission;
      const mockUserPermission = {
        id: 'up-1',
        userId,
        permissionId: 'perm-1',
        scopeType,
        scopeId: undefined,
        granted: true,
        validUntil: null
      };

      // Configurar o mock para encontrar a permissão
      mockPermissionRepository.findByName.mockResolvedValue(mockPermission);

      // Configurar o mock para encontrar a permissão do usuário
      mockUserPermissionRepository.findByUserAndPermission.mockResolvedValue(mockUserPermission);

      // Configurar o mock para atualizar a permissão do usuário
      mockUserPermissionRepository.updateUserPermission.mockResolvedValue({
        ...mockUserPermission,
        granted: false,
        updatedBy: revokedBy
      });

      // Act
      const result = await service.revokePermission(
        userId,
        permissionName,
        scopeType,
        scopeId,
        revokedBy,
      );

      // Assert
      expect(mockPermissionRepository.findByName).toHaveBeenCalledWith(permissionName);
      expect(mockUserPermissionRepository.findByUserAndPermission).toHaveBeenCalledWith(
        userId,
        mockPermission.id,
        scopeType,
        undefined
      );
      expect(mockUserPermissionRepository.updateUserPermission).toHaveBeenCalledWith(
        mockUserPermission.id,
        {
          granted: false,
          updatedBy: revokedBy,
        }
      );
      expect(mockCacheManager.del).toHaveBeenCalled(); // Deve limpar o cache
      expect(result).toBe(true);
    });
    
    it('should return true when permission is already revoked', async () => {
      // Arrange
      const userId = 'user-123';
      const permissionName = 'usuario.visualizar';
      const scopeType = ScopeType.GLOBAL;
      const scopeId = undefined;
      const revokedBy = 'admin-user';

      const mockPermission = { id: 'perm-1', name: 'usuario.visualizar' } as Permission;
      const mockUserPermission = {
        id: 'up-1',
        userId,
        permissionId: 'perm-1',
        scopeType,
        scopeId: undefined,
        granted: false, // Já está revogada
        validUntil: null
      };

      // Configurar o mock para encontrar a permissão
      mockPermissionRepository.findByName.mockResolvedValue(mockPermission);

      // Configurar o mock para encontrar a permissão do usuário (já revogada)
      mockUserPermissionRepository.findByUserAndPermission.mockResolvedValue(mockUserPermission);

      // Act
      const result = await service.revokePermission(
        userId,
        permissionName,
        scopeType,
        scopeId,
        revokedBy,
      );

      // Assert
      expect(mockPermissionRepository.findByName).toHaveBeenCalledWith(permissionName);
      expect(mockUserPermissionRepository.findByUserAndPermission).toHaveBeenCalledWith(
        userId,
        mockPermission.id,
        scopeType,
        undefined
      );
      expect(mockUserPermissionRepository.updateUserPermission).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when permission does not exist', async () => {
      // Arrange
      const userId = 'user-123';
      const permissionName = 'usuario.visualizar';
      const scopeType = ScopeType.GLOBAL;
      const scopeId = undefined;
      const revokedBy = 'admin-user';

      // Configurar o mock para não encontrar a permissão
      mockPermissionRepository.findByName.mockResolvedValue(null);

      // Act
      const result = await service.revokePermission(
        userId,
        permissionName,
        scopeType,
        scopeId,
        revokedBy,
      );

      // Assert
      expect(mockPermissionRepository.findByName).toHaveBeenCalledWith(permissionName);
      expect(mockUserPermissionRepository.findByUserAndPermission).not.toHaveBeenCalled();
      expect(mockUserPermissionRepository.updateUserPermission).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
    
    it('should return false when user does not have the permission', async () => {
      // Arrange
      const userId = 'user-123';
      const permissionName = 'usuario.visualizar';
      const scopeType = ScopeType.GLOBAL;
      const scopeId = undefined;
      const revokedBy = 'admin-user';

      const mockPermission = { id: 'perm-1', name: 'usuario.visualizar' } as Permission;

      // Configurar o mock para encontrar a permissão
      mockPermissionRepository.findByName.mockResolvedValue(mockPermission);

      // Configurar o mock para não encontrar a permissão do usuário
      mockUserPermissionRepository.findByUserAndPermission.mockResolvedValue(null);

      // Act
      const result = await service.revokePermission(
        userId,
        permissionName,
        scopeType,
        scopeId,
        revokedBy,
      );

      // Assert
      expect(mockPermissionRepository.findByName).toHaveBeenCalledWith(permissionName);
      expect(mockUserPermissionRepository.findByUserAndPermission).toHaveBeenCalledWith(
        userId,
        mockPermission.id,
        scopeType,
        undefined
      );
      expect(mockUserPermissionRepository.updateUserPermission).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
    
    it('should return false when userId is not provided', async () => {
      // Arrange
      const userId = '';
      const permissionName = 'usuario.visualizar';
      const scopeType = ScopeType.GLOBAL;
      const scopeId = undefined;
      const revokedBy = 'admin-user';

      // Act
      const result = await service.revokePermission(
        userId,
        permissionName,
        scopeType,
        scopeId,
        revokedBy,
      );

      // Assert
      expect(mockPermissionRepository.findByName).not.toHaveBeenCalled();
      expect(mockUserPermissionRepository.findByUserAndPermission).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
    
    it('should return false when trying to revoke permission with UNIT scope but no scopeId', async () => {
      // Arrange
      const userId = 'user-123';
      const permissionName = 'usuario.visualizar';
      const scopeType = ScopeType.UNIT;
      const scopeId = undefined;
      const revokedBy = 'admin-user';

      // Act
      const result = await service.revokePermission(
        userId,
        permissionName,
        scopeType,
        scopeId,
        revokedBy,
      );

      // Assert
      expect(mockPermissionRepository.findByName).not.toHaveBeenCalled();
      expect(mockUserPermissionRepository.findByUserAndPermission).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });
  
  describe('createPermission', () => {
    it('should create a new permission', async () => {
      // Arrange
      const permissionName = 'modulo.operacao';
      const description = 'Descrição da permissão';
      const createdBy = 'admin-user';
      
      const mockPermission = {
        id: 'perm-1',
        name: permissionName,
        description,
        createdBy
      } as Permission;
      
      // Configurar o mock para não encontrar a permissão existente
      mockPermissionRepository.findByName.mockResolvedValue(null);
      
      // Configurar o mock para criar a permissão
      mockPermissionRepository.create.mockReturnValue(mockPermission);
      mockPermissionRepository.save.mockResolvedValue({
        ...mockPermission,
        id: 'perm-1'
      });
      
      // Act
      const result = await service.createPermission(permissionName, description, createdBy);
      
      // Assert
      expect(mockPermissionRepository.findByName).toHaveBeenCalledWith(permissionName);
      expect(mockPermissionRepository.create).toHaveBeenCalledWith({
        name: permissionName,
        description,
        createdBy
      });
      expect(mockPermissionRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockPermission);
    });
    
    it('should return existing permission if it already exists', async () => {
      // Arrange
      const permissionName = 'modulo.operacao';
      const description = 'Descrição da permissão';
      const createdBy = 'admin-user';
      
      const existingPermission = {
        id: 'perm-1',
        name: permissionName,
        description: 'Permissão existente',
        createdBy: 'outro-usuario'
      } as Permission;
      
      // Configurar o mock para encontrar a permissão existente
      mockPermissionRepository.findByName.mockResolvedValue(existingPermission);
      
      // Act
      const result = await service.createPermission(permissionName, description, createdBy);
      
      // Assert
      expect(mockPermissionRepository.findByName).toHaveBeenCalledWith(permissionName);
      expect(mockPermissionRepository.create).not.toHaveBeenCalled();
      expect(mockPermissionRepository.save).not.toHaveBeenCalled();
      expect(result).toEqual(existingPermission);
    });
    
    it('should return null when permission name is invalid', async () => {
      // Arrange
      const permissionName = 'permissao-invalida'; // Sem ponto
      const description = 'Descrição da permissão';
      const createdBy = 'admin-user';
      
      // Act
      const result = await service.createPermission(permissionName, description, createdBy);
      
      // Assert
      expect(mockPermissionRepository.findByName).not.toHaveBeenCalled();
      expect(mockPermissionRepository.create).not.toHaveBeenCalled();
      expect(mockPermissionRepository.save).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
    
    it('should handle errors and return null', async () => {
      // Arrange
      const permissionName = 'modulo.operacao';
      const description = 'Descrição da permissão';
      const createdBy = 'admin-user';
      
      // Configurar o mock para lançar um erro
      mockPermissionRepository.findByName.mockRejectedValue(new Error('Database error'));
      
      // Act
      const result = await service.createPermission(permissionName, description, createdBy);
      
      // Assert
      expect(mockPermissionRepository.findByName).toHaveBeenCalledWith(permissionName);
      expect(result).toBeNull();
    });
  });
  
  describe('createPermissionIfNotExists', () => {
    it('should create a new permission if it does not exist', async () => {
      // Arrange
      const permissionName = 'modulo.operacao';
      const description = 'Descrição da permissão';
      const createdBy = 'admin-user';
      
      const mockPermission = {
        id: 'perm-1',
        name: permissionName,
        description,
        createdBy
      } as Permission;
      
      // Configurar o mock para não encontrar a permissão existente
      mockPermissionRepository.findByName.mockResolvedValue(null);
      
      // Configurar o mock para criar a permissão
      mockPermissionRepository.create.mockReturnValue(mockPermission);
      mockPermissionRepository.save.mockResolvedValue({
        ...mockPermission,
        id: 'perm-1'
      });
      
      // Act
      const result = await service.createPermissionIfNotExists(permissionName, description, createdBy);
      
      // Assert
      expect(mockPermissionRepository.findByName).toHaveBeenCalledWith(permissionName);
      expect(mockPermissionRepository.create).toHaveBeenCalledWith({
        name: permissionName,
        description,
        createdBy
      });
      expect(mockPermissionRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockPermission);
    });
    
    it('should return existing permission if it already exists', async () => {
      // Arrange
      const permissionName = 'modulo.operacao';
      const description = 'Descrição da permissão';
      const createdBy = 'admin-user';
      
      const existingPermission = {
        id: 'perm-1',
        name: permissionName,
        description: 'Permissão existente',
        createdBy: 'outro-usuario'
      } as Permission;
      
      // Configurar o mock para encontrar a permissão existente
      mockPermissionRepository.findByName.mockResolvedValue(existingPermission);
      
      // Act
      const result = await service.createPermissionIfNotExists(permissionName, description, createdBy);
      
      // Assert
      expect(mockPermissionRepository.findByName).toHaveBeenCalledWith(permissionName);
      expect(mockPermissionRepository.create).not.toHaveBeenCalled();
      expect(mockPermissionRepository.save).not.toHaveBeenCalled();
      expect(result).toEqual(existingPermission);
    });
  });
  
  describe('checkCompositePermission', () => {
    it('should return true when user has a wildcard module permission', async () => {
      // Arrange
      const userId = 'user-123';
      const permissionName = 'usuario.visualizar.detalhes';
      const scopeType = ScopeType.GLOBAL;
      const scopeId = undefined;
      
      const wildcardPermission = { id: 'perm-wild', name: 'usuario.*' } as Permission;
      const userPermission = {
        id: 'up-wild-1',
        userId: 'user-123',
        permission: wildcardPermission,
        permissionId: 'perm-wild',
        scopeType: ScopeType.GLOBAL,
        scopeId: null,
        granted: true,
        validUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin-user',
        updatedBy: null
      } as UserPermission;
      
      // Mock para o cache
      mockCacheManager.get.mockResolvedValue(null); // Não tem em cache
      
      // Mock para encontrar a permissão wildcard
      mockPermissionRepository.findByName.mockResolvedValue(wildcardPermission);
      
      // Mock para encontrar as permissões do usuário
      mockUserPermissionRepository.findByUserAndPermission.mockResolvedValue(userPermission);
      
      // Act
      const result = await service.checkCompositePermission(userId, permissionName, scopeType, scopeId);
      
      // Assert
      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockPermissionRepository.findByName).toHaveBeenCalledWith('usuario.*');
      expect(mockUserPermissionRepository.findByUserAndPermission).toHaveBeenCalledWith(
        userId,
        wildcardPermission.id,
        ScopeType.GLOBAL,
        undefined
      );
      expect(mockCacheManager.set).toHaveBeenCalled(); // Deve armazenar em cache
      expect(result).toBe(true);
    });
    
    it('should return true when user has a wildcard operation permission', async () => {
      // Arrange
      const userId = 'user-123';
      const permissionName = 'usuario.visualizar.detalhes';
      const scopeType = ScopeType.GLOBAL;
      const scopeId = undefined;
      
      const wildcardPermission = { id: 'perm-wild', name: '*.detalhes' } as Permission;
      const userPermission = {
        id: 'up-wild-1',
        userId: 'user-123',
        permission: wildcardPermission,
        permissionId: 'perm-wild',
        scopeType: ScopeType.GLOBAL,
        scopeId: null,
        granted: true,
        validUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin-user',
        updatedBy: null
      } as UserPermission;
      
      // Mock para o cache
      mockCacheManager.get.mockImplementation((key) => {
        if (key.includes('usuario.*')) {return null;}
        if (key.includes(permissionName)) {return null;}
        return null;
      });
      
      // Mock para encontrar a permissão wildcard
      mockPermissionRepository.findByName.mockImplementation((name) => {
        if (name === 'usuario.*') {return null;}
        if (name === '*.detalhes') {return wildcardPermission;}
        return null;
      });
      
      // Mock para encontrar as permissões do usuário
      mockUserPermissionRepository.findByUserAndPermission.mockImplementation((uid, permId, scopeT, scopeI) => {
        if (permId === wildcardPermission.id) {return userPermission;}
        return null;
      });
      
      // Act
      const result = await service.checkCompositePermission(userId, permissionName, scopeType, scopeId);
      
      // Assert
      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockPermissionRepository.findByName).toHaveBeenCalledWith('*.detalhes');
      expect(mockUserPermissionRepository.findByUserAndPermission).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalled(); // Deve armazenar em cache
      expect(result).toBe(true);
    });
    
    it('should return true when user has a super admin wildcard permission', async () => {
      // Arrange
      const userId = 'user-123';
      const permissionName = 'usuario.visualizar.detalhes';
      const scopeType = ScopeType.GLOBAL;
      const scopeId = undefined;
      
      const wildcardPermission = { id: 'perm-wild', name: '*.*' } as Permission;
      const userPermission = {
        id: 'up-wild-1',
        userId: 'user-123',
        permission: wildcardPermission,
        permissionId: 'perm-wild',
        scopeType: ScopeType.GLOBAL,
        scopeId: null,
        granted: true,
        validUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin-user',
        updatedBy: null
      } as UserPermission;
      
      // Mock para o cache
      mockCacheManager.get.mockImplementation((key) => {
        if (key.includes('usuario.*')) {return null;}
        if (key.includes('*.detalhes')) {return null;}
        if (key.includes(permissionName)) {return null;}
        return null;
      });
      
      // Mock para encontrar a permissão wildcard
      mockPermissionRepository.findByName.mockImplementation((name) => {
        if (name === 'usuario.*') {return null;}
        if (name === '*.detalhes') {return null;}
        if (name === '*.*') {return wildcardPermission;}
        return null;
      });
      
      // Mock para encontrar as permissões do usuário
      mockUserPermissionRepository.findByUserAndPermission.mockImplementation((uid, permId, scopeT, scopeI) => {
        if (permId === wildcardPermission.id) {return userPermission;}
        return null;
      });
      
      // Act
      const result = await service.checkCompositePermission(userId, permissionName, scopeType, scopeId);
      
      // Assert
      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockPermissionRepository.findByName).toHaveBeenCalledWith('*.*');
      expect(mockUserPermissionRepository.findByUserAndPermission).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalled(); // Deve armazenar em cache
      expect(result).toBe(true);
    });
    
    it('should return true when permission is found in cache', async () => {
      // Arrange
      const userId = 'user-123';
      const permissionName = 'usuario.visualizar.detalhes';
      const scopeType = ScopeType.GLOBAL;
      const scopeId = undefined;
      
      // Mock para o cache - já tem em cache
      mockCacheManager.get.mockResolvedValue(true);
      
      // Act
      const result = await service.checkCompositePermission(userId, permissionName, scopeType, scopeId);
      
      // Assert
      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockPermissionRepository.findByName).not.toHaveBeenCalled(); // Não deve chamar o repositório
      expect(result).toBe(true);
    });
    
    it('should return false when user does not have any matching permission', async () => {
      // Arrange
      const userId = 'user-123';
      const permissionName = 'usuario.visualizar.detalhes';
      const scopeType = ScopeType.GLOBAL;
      const scopeId = undefined;
      
      // Mock para o cache
      mockCacheManager.get.mockResolvedValue(null); // Não tem em cache
      
      // Mock para encontrar a permissão wildcard
      mockPermissionRepository.findByName.mockResolvedValue(null); // Nenhuma permissão encontrada
      
      // Act
      const result = await service.checkCompositePermission(userId, permissionName, scopeType, scopeId);
      
      // Assert
      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockPermissionRepository.findByName).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalled(); // Deve armazenar em cache (resultado negativo)
      expect(result).toBe(false);
    });
    
    it('should return false when permission format is invalid', async () => {
      // Arrange
      const userId = 'user-123';
      const permissionName = 'invalidformat'; // Formato inválido, sem ponto
      const scopeType = ScopeType.GLOBAL;
      const scopeId = undefined;
      
      // Act
      const result = await service.checkCompositePermission(userId, permissionName, scopeType, scopeId);
      
      // Assert
      expect(result).toBe(false);
    });
    
    it('should return false when userId is not provided', async () => {
      // Arrange
      const userId = '';
      const permissionName = 'usuario.visualizar';
      const scopeType = ScopeType.GLOBAL;
      const scopeId = undefined;
      
      // Act
      const result = await service.checkCompositePermission(userId, permissionName, scopeType, scopeId);
      
      // Assert
      expect(result).toBe(false);
    });
    
    it('should return false when trying to check permission with UNIT scope but no scopeId', async () => {
      // Arrange
      const userId = 'user-123';
      const permissionName = 'usuario.visualizar';
      const scopeType = ScopeType.UNIT;
      const scopeId = undefined;
      
      // Act
      const result = await service.checkCompositePermission(userId, permissionName, scopeType, scopeId);
      
      // Assert
      expect(result).toBe(false);
    });
    
    it('should return false when user has a matching permission but it is expired', async () => {
      // Arrange
      const userId = 'user-123';
      const permissionName = 'usuario.visualizar.detalhes';
      const scopeType = ScopeType.GLOBAL;
      const scopeId = undefined;
      
      const wildcardPermission = { id: 'perm-wild', name: 'usuario.*' } as Permission;
      const userPermission = {
        id: 'up-wild-expired',
        userId: 'user-123',
        permission: wildcardPermission,
        permissionId: 'perm-wild',
        scopeType: ScopeType.GLOBAL,
        scopeId: null,
        granted: true,
        validUntil: new Date('2020-01-01'), // Data no passado
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin-user',
        updatedBy: null
      } as UserPermission;
      
      // Mock para o cache
      mockCacheManager.get.mockResolvedValue(null); // Não tem em cache
      
      // Mock para encontrar a permissão wildcard
      mockPermissionRepository.findByName.mockResolvedValue(wildcardPermission);
      
      // Mock para encontrar as permissões do usuário
      mockUserPermissionRepository.findByUserAndPermission.mockResolvedValue(userPermission);
      
      // Act
      const result = await service.checkCompositePermission(userId, permissionName, scopeType, scopeId);
      
      // Assert
      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockPermissionRepository.findByName).toHaveBeenCalledWith('usuario.*');
      expect(mockUserPermissionRepository.findByUserAndPermission).toHaveBeenCalledWith(
        userId,
        wildcardPermission.id,
        ScopeType.GLOBAL,
        undefined
      );
      expect(result).toBe(false);
    });
  });
});
