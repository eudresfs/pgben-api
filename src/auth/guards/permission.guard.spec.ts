import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from './permission.guard';
import { PermissionService } from '../services/permission.service';
import { TipoEscopo } from '../../entities/user-permission.entity';
import { PERMISSION_REQUIREMENTS_KEY } from '../decorators/requires-permission.decorator';
// Removido createMock - usando mocks manuais do Jest
import { Logger } from '@nestjs/common';
import { PermissionDeniedException } from '../exceptions/permission-denied.exception';

// Mock para o serviço de permissões
const mockPermissionService = {
  hasPermission: jest.fn(),
};

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionGuard,
        {
          provide: PermissionService,
          useValue: mockPermissionService,
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
            getAllAndOverride: jest.fn(),
          },
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

    guard = module.get<PermissionGuard>(PermissionGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow access when no permission is required', async () => {
      // Arrange
      const context = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({ user: { id: 1 } })
        }),
        getHandler: jest.fn(),
        getClass: jest.fn()
      } as any;
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(reflector.get).toHaveBeenCalledWith(
        PERMISSION_REQUIREMENTS_KEY,
        context.getHandler(),
      );
      expect(reflector.get).toHaveBeenCalledWith(
        PERMISSION_REQUIREMENTS_KEY,
        context.getClass(),
      );
      expect(result).toBe(true);
    });

    it('should allow access when user has required permission', async () => {
      // Arrange
      const permissionOptions = {
        permissionName: 'usuario.visualizar',
        scopeType: TipoEscopo.GLOBAL,
      };

      const context = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { id: 'user-123', permissions: [] },
            params: {},
            query: {},
          }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn()
       } as any;

      jest
           .spyOn(reflector, 'get')
           .mockReturnValueOnce([permissionOptions]) // Para o método
           .mockReturnValueOnce([]); // Para a classe
        mockPermissionService.hasPermission
          .mockResolvedValueOnce(false) // Para verificação de super admin
          .mockResolvedValueOnce(true); // Para a permissão específica

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(reflector.get).toHaveBeenCalledWith(
          PERMISSION_REQUIREMENTS_KEY,
          context.getHandler(),
        );
        expect(reflector.get).toHaveBeenCalledWith(
          PERMISSION_REQUIREMENTS_KEY,
          context.getClass(),
        );
      expect(mockPermissionService.hasPermission).toHaveBeenCalledWith({
        userId: 'user-123',
        permissionName: 'usuario.visualizar',
        scopeType: TipoEscopo.GLOBAL,
        scopeId: undefined,
      });
      expect(result).toBe(true);
    });

    it('should deny access when user does not have required permission', async () => {
      // Arrange
      const permissionOptions = {
        permissionName: 'usuario.visualizar',
        scopeType: TipoEscopo.GLOBAL,
      };

      const context = {
          switchToHttp: jest.fn().mockReturnValue({
            getRequest: jest.fn().mockReturnValue({
              user: { id: 'user-123', permissions: [], unidade_id: undefined },
              params: {},
              query: {},
            }),
          }),
          getHandler: jest.fn(),
          getClass: jest.fn()
      } as any;

      jest
           .spyOn(reflector, 'get')
           .mockReturnValueOnce([permissionOptions]) // Para o método
           .mockReturnValueOnce([]); // Para a classe
        mockPermissionService.hasPermission
          .mockResolvedValueOnce(false) // Para verificação de super admin
          .mockResolvedValueOnce(false); // Para a permissão específica

      // Act & Assert
         await expect(guard.canActivate(context)).rejects.toThrow(
           PermissionDeniedException,
         );
      expect(reflector.get).toHaveBeenCalledWith(
          PERMISSION_REQUIREMENTS_KEY,
          context.getHandler(),
        );
        expect(reflector.get).toHaveBeenCalledWith(
          PERMISSION_REQUIREMENTS_KEY,
          context.getClass(),
        );
      expect(mockPermissionService.hasPermission).toHaveBeenCalledWith({
        userId: 'user-123',
        permissionName: 'usuario.visualizar',
        scopeType: TipoEscopo.GLOBAL,
        scopeId: undefined,
      });
    });

    it('should extract scopeId from request params when scopeType is UNIT', async () => {
      // Arrange
      const permissionOptions = {
        permissionName: 'usuario.visualizar',
        scopeType: TipoEscopo.UNIDADE,
        scopeIdParam: 'userId',
      };

      const context = {
          switchToHttp: jest.fn().mockReturnValue({
            getRequest: jest.fn().mockReturnValue({
              user: { id: 'user-123', permissions: [] },
              params: { targetUserId: 'target-user-456' },
              query: {},
            }),
          }),
          getHandler: jest.fn(),
          getClass: jest.fn()
      } as any;

      jest
            .spyOn(reflector, 'get')
            .mockReturnValueOnce([permissionOptions]) // Para o método
            .mockReturnValueOnce([]); // Para a classe
        mockPermissionService.hasPermission
          .mockResolvedValueOnce(false) // Para verificação de super admin
          .mockResolvedValueOnce(true); // Para a permissão específica

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(reflector.get).toHaveBeenCalledWith(
          PERMISSION_REQUIREMENTS_KEY,
          context.getHandler(),
        );
        expect(reflector.get).toHaveBeenCalledWith(
          PERMISSION_REQUIREMENTS_KEY,
          context.getClass(),
        );
      expect(mockPermissionService.hasPermission).toHaveBeenCalledWith({
        userId: 'user-123',
        permissionName: 'usuario.visualizar',
        scopeType: TipoEscopo.UNIDADE,
        scopeId: undefined,
      });
      expect(result).toBe(true);
    });

    it('should extract scopeId from request query when scopeType is UNIT and param not found', async () => {
      // Arrange
      const permissionOptions = {
        permissionName: 'usuario.visualizar',
        scopeType: TipoEscopo.UNIDADE,
        scopeIdExpression: 'query.targetUserId',
      };

      const context = {
          switchToHttp: jest.fn().mockReturnValue({
            getRequest: jest.fn().mockReturnValue({
              user: { id: 'user-123', permissions: [] },
              params: {},
              query: { targetUserId: 'target-user-456' },
            }),
          }),
          getHandler: jest.fn(),
          getClass: jest.fn()
      } as any;

      jest
            .spyOn(reflector, 'get')
            .mockReturnValueOnce([permissionOptions]) // Para o método
            .mockReturnValueOnce([]); // Para a classe
        mockPermissionService.hasPermission
          .mockResolvedValueOnce(false) // Para verificação de super admin
          .mockResolvedValueOnce(true); // Para a permissão específica

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(reflector.get).toHaveBeenCalledWith(
          PERMISSION_REQUIREMENTS_KEY,
          context.getHandler(),
        );
        expect(reflector.get).toHaveBeenCalledWith(
          PERMISSION_REQUIREMENTS_KEY,
          context.getClass(),
        );
      expect(mockPermissionService.hasPermission).toHaveBeenCalledWith({
        userId: 'user-123',
        permissionName: 'usuario.visualizar',
        scopeType: TipoEscopo.UNIDADE,
        scopeId: 'target-user-456',
      });
      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException when user is not authenticated', async () => {
      // Arrange
      const permissionOptions = {
        permissionName: 'usuario.visualizar',
        scopeType: TipoEscopo.GLOBAL,
      };

      const context = {
         switchToHttp: jest.fn().mockReturnValue({
           getRequest: jest.fn().mockReturnValue({
             user: {
               id: 'user-123',
               permissions: []
             },
             params: {},
             query: {},
           }),
         }),
         getHandler: jest.fn(),
         getClass: jest.fn()
       } as any;

      jest
            .spyOn(reflector, 'get')
            .mockReturnValueOnce([permissionOptions]) // Para o método
            .mockReturnValueOnce([]); // Para a classe
        mockPermissionService.hasPermission
          .mockResolvedValueOnce(false) // Para verificação de super admin
          .mockResolvedValueOnce(false); // Para a permissão específica

        // Act & Assert
        await expect(guard.canActivate(context)).rejects.toThrow(
          PermissionDeniedException,
        );
      expect(reflector.get).toHaveBeenCalledWith(
        PERMISSION_REQUIREMENTS_KEY,
        context.getHandler(),
      );
      expect(reflector.get).toHaveBeenCalledWith(
        PERMISSION_REQUIREMENTS_KEY,
        context.getClass(),
      );
    });

    it('should throw PermissionDeniedException when scopeId is required but not found', async () => {
      // Arrange
      const permissionOptions = {
        permissionName: 'usuario.visualizar',
        scopeType: TipoEscopo.UNIDADE,
        scopeIdParam: 'userId',
      };

      const context = {
          switchToHttp: jest.fn().mockReturnValue({
            getRequest: jest.fn().mockReturnValue({
              user: { id: 'user-123', permissions: [] },
              params: {},
              query: {},
            }),
          }),
          getHandler: jest.fn(),
          getClass: jest.fn()
      } as any;

      jest
           .spyOn(reflector, 'get')
           .mockReturnValueOnce([permissionOptions]) // Para o método
           .mockReturnValueOnce([]); // Para a classe

        // Act & Assert
        await expect(guard.canActivate(context)).rejects.toThrow(
          PermissionDeniedException,
        );
      expect(reflector.get).toHaveBeenCalledWith(
        PERMISSION_REQUIREMENTS_KEY,
        context.getHandler(),
      );
      expect(reflector.get).toHaveBeenCalledWith(
        PERMISSION_REQUIREMENTS_KEY,
        context.getClass(),
      );
    });
  });
});
