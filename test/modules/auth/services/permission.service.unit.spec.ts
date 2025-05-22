import { Test, TestingModule } from '@nestjs/testing';
import { PermissionService, PermissionCheckOptions } from '@/auth/services/permission.service';
import { PermissionRepository } from '@/auth/repositories/permission.repository';
import { RolePermissionRepository } from '@/auth/repositories/role-permission.repository';
import { UserPermissionRepository } from '@/auth/repositories/user-permission.repository';
import { PermissionScopeRepository } from '@/auth/repositories/permission-scope.repository';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AuditoriaService } from '@modules/auditoria/services/auditoria.service';
import { ScopeType } from '@/auth/entities/user-permission.entity';
import { Permission } from '@/auth/entities/permission.entity';
import { TipoOperacao } from '@modules/auditoria/enums/tipo-operacao.enum';

/**
 * Testes unitários para o PermissionService
 * 
 * Estes testes verificam o funcionamento do serviço de permissões,
 * responsável por verificar se um usuário tem permissão para acessar
 * determinados recursos e funcionalidades.
 */
describe('PermissionService', () => {
  let service: PermissionService;
  let permissionRepository: PermissionRepository;
  let rolePermissionRepository: RolePermissionRepository;
  let userPermissionRepository: UserPermissionRepository;
  let permissionScopeRepository: PermissionScopeRepository;
  let cacheManager: jest.Mocked<any>;
  let auditoriaService: jest.Mocked<AuditoriaService>;

  beforeEach(async () => {
    // Mocks dos repositórios e dependências
    const mockPermissionRepository = {
      findByName: jest.fn(),
      findById: jest.fn(),
      findByComposite: jest.fn(),
      findComposedPermissions: jest.fn(),
    };

    const mockRolePermissionRepository = {
      findPermissionsByUserRoles: jest.fn(),
    };

    const mockUserPermissionRepository = {
      findByUserAndPermission: jest.fn(),
      findValidPermissions: jest.fn(),
      createUserPermission: jest.fn(),
      updateUserPermission: jest.fn(),
    };

    const mockPermissionScopeRepository = {
      findByPermission: jest.fn(),
    };

    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const mockAuditoriaService = {
      create: jest.fn().mockImplementation(() => Promise.resolve({})),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionService,
        {
          provide: PermissionRepository,
          useValue: mockPermissionRepository,
        },
        {
          provide: RolePermissionRepository,
          useValue: mockRolePermissionRepository,
        },
        {
          provide: UserPermissionRepository,
          useValue: mockUserPermissionRepository,
        },
        {
          provide: PermissionScopeRepository,
          useValue: mockPermissionScopeRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: AuditoriaService,
          useValue: mockAuditoriaService,
        },
      ],
    }).compile();

    service = module.get<PermissionService>(PermissionService);
    permissionRepository = module.get<PermissionRepository>(PermissionRepository);
    rolePermissionRepository = module.get<RolePermissionRepository>(RolePermissionRepository);
    userPermissionRepository = module.get<UserPermissionRepository>(UserPermissionRepository);
    permissionScopeRepository = module.get<PermissionScopeRepository>(PermissionScopeRepository);
    cacheManager = module.get(CACHE_MANAGER);
    auditoriaService = module.get<AuditoriaService>(AuditoriaService);
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('hasPermission', () => {
    const userId = 'user-123';
    const permissionName = 'solicitacao.listar';
    const options: PermissionCheckOptions = {
      userId,
      permissionName,
      scopeType: ScopeType.UNIT,
      scopeId: 'unidade-123',
    };

    it('deve retornar true quando encontrar permissão em cache', async () => {
      // Mock do cache retornando true
      cacheManager.get.mockResolvedValueOnce(true);

      const result = await service.hasPermission(options);

      expect(cacheManager.get).toHaveBeenCalledWith(
        expect.stringContaining(userId),
      );
      expect(result).toBe(true);
    });

    it('deve verificar permissão direta quando não estiver em cache', async () => {
      // Cache não encontrou a permissão
      cacheManager.get.mockResolvedValueOnce(undefined);
      
      // O usuário tem a permissão direta
      const mockPermission = { id: 'perm-123', name: permissionName } as Permission;
      permissionRepository.findByName.mockResolvedValueOnce(mockPermission);
      userPermissionRepository.findValidPermissions.mockResolvedValueOnce([{
        id: 'user-perm-123',
        permissionId: mockPermission.id,
        scopeType: ScopeType.UNIT,
        scopeId: 'unidade-123',
        granted: true,
        validUntil: new Date(Date.now() + 86400000), // Válido por mais 1 dia
      }]);

      const result = await service.hasPermission(options);

      expect(permissionRepository.findByName).toHaveBeenCalledWith(permissionName);
      expect(userPermissionRepository.findValidPermissions).toHaveBeenCalledWith(
        userId,
        mockPermission.id
      );
      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining(userId),
        true,
        expect.any(Number)
      );
      expect(result).toBe(true);
    });

    it('deve verificar permissão de role quando não tiver permissão direta', async () => {
      // Cache não encontrou a permissão
      cacheManager.get.mockResolvedValueOnce(undefined);
      
      // O usuário não tem permissão direta
      const mockPermission = { id: 'perm-123', name: permissionName } as Permission;
      permissionRepository.findByName.mockResolvedValueOnce(mockPermission);
      userPermissionRepository.findValidPermissions.mockResolvedValueOnce([]);
      
      // Mas tem permissão via role
      rolePermissionRepository.findPermissionsByUserRoles.mockResolvedValueOnce([{
        permissionId: mockPermission.id,
        roleName: 'ADMIN'
      }]);

      const result = await service.hasPermission(options);

      expect(rolePermissionRepository.findPermissionsByUserRoles).toHaveBeenCalledWith(
        userId,
        mockPermission.id
      );
      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining(userId),
        true,
        expect.any(Number)
      );
      expect(result).toBe(true);
    });

    it('deve verificar permissão composta quando não tiver permissão direta nem via role', async () => {
      // Cache não encontrou a permissão
      cacheManager.get.mockResolvedValueOnce(undefined);
      
      // O usuário não tem permissão direta nem via role
      const mockPermission = { id: 'perm-123', name: permissionName, isComposite: true } as Permission;
      permissionRepository.findByName.mockResolvedValueOnce(mockPermission);
      userPermissionRepository.findValidPermissions.mockResolvedValueOnce([]);
      rolePermissionRepository.findPermissionsByUserRoles.mockResolvedValueOnce([]);
      
      // É uma permissão composta
      const childPermission = { id: 'child-perm-123', name: 'solicitacao.visualizar' } as Permission;
      permissionRepository.findComposedPermissions.mockResolvedValueOnce([childPermission]);
      
      // E o usuário tem a permissão filha
      userPermissionRepository.findValidPermissions.mockResolvedValueOnce([{
        id: 'user-perm-456',
        permissionId: childPermission.id,
        scopeType: ScopeType.UNIT,
        scopeId: 'unidade-123',
        granted: true,
        validUntil: null,
      }]);

      const result = await service.hasPermission(options);

      expect(permissionRepository.findComposedPermissions).toHaveBeenCalledWith(mockPermission.id);
      expect(userPermissionRepository.findValidPermissions).toHaveBeenCalledWith(
        userId,
        childPermission.id
      );
      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining(userId),
        true,
        expect.any(Number)
      );
      expect(result).toBe(true);
    });

    it('deve retornar false quando o usuário não tem nenhuma permissão', async () => {
      // Cache não encontrou a permissão
      cacheManager.get.mockResolvedValueOnce(undefined);
      
      // O usuário não tem permissão direta, via role ou composta
      const mockPermission = { id: 'perm-123', name: permissionName, isComposite: false } as Permission;
      permissionRepository.findByName.mockResolvedValueOnce(mockPermission);
      userPermissionRepository.findValidPermissions.mockResolvedValueOnce([]);
      rolePermissionRepository.findPermissionsByUserRoles.mockResolvedValueOnce([]);

      const result = await service.hasPermission(options);

      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining(userId),
        false,
        expect.any(Number)
      );
      expect(result).toBe(false);
    });
  });

  describe('grantPermission', () => {
    it('deve atribuir uma nova permissão a um usuário', async () => {
      const userId = 'user-123';
      const permissionName = 'solicitacao.listar';
      const scopeType = ScopeType.UNIT;
      const scopeId = 'unidade-123';
      const createdBy = 'admin-user';

      const mockPermission = { id: 'perm-123', name: permissionName } as Permission;
      permissionRepository.findByName.mockResolvedValueOnce(mockPermission);
      userPermissionRepository.findByUserAndPermission.mockResolvedValueOnce(null);
      userPermissionRepository.createUserPermission.mockResolvedValueOnce({
        id: 'user-perm-123',
        userId,
        permissionId: mockPermission.id,
        scopeType,
        scopeId,
        granted: true,
        createdBy,
      });

      const result = await service.grantPermission(
        userId,
        permissionName,
        scopeType,
        scopeId,
        null,
        createdBy,
      );

      expect(permissionRepository.findByName).toHaveBeenCalledWith(permissionName);
      expect(userPermissionRepository.findByUserAndPermission).toHaveBeenCalledWith(
        userId,
        mockPermission.id,
        scopeType,
        scopeId,
      );
      expect(userPermissionRepository.createUserPermission).toHaveBeenCalledWith({
        userId,
        permissionId: mockPermission.id,
        granted: true,
        scopeType,
        scopeId,
        validUntil: null,
        createdBy,
      });
      expect(auditoriaService.create).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('deve atualizar uma permissão existente', async () => {
      const userId = 'user-123';
      const permissionName = 'solicitacao.listar';
      const scopeType = ScopeType.UNIT;
      const scopeId = 'unidade-123';
      const createdBy = 'admin-user';

      const mockPermission = { id: 'perm-123', name: permissionName } as Permission;
      const existingPermission = {
        id: 'user-perm-123',
        userId,
        permissionId: mockPermission.id,
        scopeType,
        scopeId,
        granted: false,
      };

      permissionRepository.findByName.mockResolvedValueOnce(mockPermission);
      userPermissionRepository.findByUserAndPermission.mockResolvedValueOnce(existingPermission);
      userPermissionRepository.updateUserPermission.mockResolvedValueOnce({
        ...existingPermission,
        granted: true,
        updatedBy: createdBy,
      });

      const result = await service.grantPermission(
        userId,
        permissionName,
        scopeType,
        scopeId,
        null,
        createdBy,
      );

      expect(userPermissionRepository.updateUserPermission).toHaveBeenCalledWith(
        existingPermission.id,
        {
          granted: true,
          validUntil: null,
          updatedBy: createdBy,
        },
      );
      expect(auditoriaService.create).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('revokePermission', () => {
    it('deve revogar uma permissão existente', async () => {
      const userId = 'user-123';
      const permissionName = 'solicitacao.listar';
      const scopeType = ScopeType.UNIT;
      const scopeId = 'unidade-123';
      const createdBy = 'admin-user';

      const mockPermission = { id: 'perm-123', name: permissionName } as Permission;
      const existingPermission = {
        id: 'user-perm-123',
        userId,
        permissionId: mockPermission.id,
        scopeType,
        scopeId,
        granted: true,
      };

      permissionRepository.findByName.mockResolvedValueOnce(mockPermission);
      userPermissionRepository.findByUserAndPermission.mockResolvedValueOnce(existingPermission);
      userPermissionRepository.updateUserPermission.mockResolvedValueOnce({
        ...existingPermission,
        granted: false,
        updatedBy: createdBy,
      });

      const result = await service.revokePermission(
        userId,
        permissionName,
        scopeType,
        scopeId,
        createdBy,
      );

      expect(userPermissionRepository.updateUserPermission).toHaveBeenCalledWith(
        existingPermission.id,
        {
          granted: false,
          updatedBy: createdBy,
        },
      );
      expect(auditoriaService.create).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('deve retornar false quando a permissão não existe', async () => {
      const userId = 'user-123';
      const permissionName = 'solicitacao.listar';
      const scopeType = ScopeType.UNIT;
      const scopeId = 'unidade-123';
      const createdBy = 'admin-user';

      const mockPermission = { id: 'perm-123', name: permissionName } as Permission;

      permissionRepository.findByName.mockResolvedValueOnce(mockPermission);
      userPermissionRepository.findByUserAndPermission.mockResolvedValueOnce(null);

      const result = await service.revokePermission(
        userId,
        permissionName,
        scopeType,
        scopeId,
        createdBy,
      );

      expect(userPermissionRepository.updateUserPermission).not.toHaveBeenCalled();
      expect(auditoriaService.criarLog).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });
});
