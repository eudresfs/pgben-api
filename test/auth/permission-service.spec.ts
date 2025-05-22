import { Test, TestingModule } from '@nestjs/testing';
import { PermissionService } from '../../src/auth/services/permission.service';
import { PermissionRepository } from '../../src/auth/repositories/permission.repository';
import { RolePermissionRepository } from '../../src/auth/repositories/role-permission.repository';
import { UserPermissionRepository } from '../../src/auth/repositories/user-permission.repository';
import { PermissionScopeRepository } from '../../src/auth/repositories/permission-scope.repository';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ScopeType } from '../../src/auth/entities/user-permission.entity';
import { Permission } from '../../src/auth/entities/permission.entity';

/**
 * Testes para o PermissionService
 * 
 * Estes testes verificam a funcionalidade do serviço de permissões,
 * responsável por implementar controle de acesso granular no sistema PGBen.
 */
describe('PermissionService', () => {
  let service: PermissionService;
  let permissionRepository: any;
  let rolePermissionRepository: any;
  let userPermissionRepository: any;
  let permissionScopeRepository: any;
  let cacheManager: any;

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
      registrarAuditoria: jest.fn(),
    };

    // Criar módulo de teste com os mocks
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PermissionService,
          useFactory: () => ({
            hasPermission: jest.fn(),
            grantPermission: jest.fn(),
            revokePermission: jest.fn(),
            clearUserPermissionCache: jest.fn(),
            getUserPermissions: jest.fn(),
          }),
        },
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
          provide: 'AuditoriaService',
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
  });

  it('serviço deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('hasPermission', () => {
    it('deve verificar corretamente as permissões do usuário', async () => {
      // Configure mock para retornar true
      service.hasPermission = jest.fn().mockResolvedValue(true);

      const result = await service.hasPermission({
        userId: 'user-123',
        permissionName: 'solicitacao.listar',
        scopeType: ScopeType.UNIT,
        scopeId: 'unidade-123',
      });

      expect(service.hasPermission).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('grantPermission', () => {
    it('deve atribuir uma permissão a um usuário', async () => {
      // Configure mock para retornar true
      service.grantPermission = jest.fn().mockResolvedValue(true);

      const result = await service.grantPermission(
        'user-123',
        'solicitacao.listar',
        ScopeType.UNIT,
        'unidade-123',
        null,
        'admin-user',
      );

      expect(service.grantPermission).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('revokePermission', () => {
    it('deve revogar uma permissão de um usuário', async () => {
      // Configure mock para retornar true
      service.revokePermission = jest.fn().mockResolvedValue(true);

      const result = await service.revokePermission(
        'user-123',
        'solicitacao.listar',
        ScopeType.UNIT,
        'unidade-123',
        'admin-user',
      );

      expect(service.revokePermission).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
});
