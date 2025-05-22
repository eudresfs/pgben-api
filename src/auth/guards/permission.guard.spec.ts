import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from './permission.guard';
import { PermissionService } from '../services/permission.service';
import { ScopeType } from '../entities/user-permission.entity';
import { PERMISSION_REQUIREMENTS_KEY } from '../decorators/requires-permission.decorator';
import { createMock } from '@golevelup/ts-jest';
import { Logger } from '@nestjs/common';

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
      const context = createMock<ExecutionContext>();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(PERMISSION_REQUIREMENTS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      expect(result).toBe(true);
    });

    it('should allow access when user has required permission', async () => {
      // Arrange
      const permissionOptions = {
        permissionName: 'usuario.visualizar',
        scopeType: ScopeType.GLOBAL,
      };

      const context = createMock<ExecutionContext>({
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'user-123' },
            params: {},
            query: {},
          }),
        }),
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(permissionOptions);
      mockPermissionService.hasPermission.mockResolvedValue(true);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(PERMISSION_REQUIREMENTS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      expect(mockPermissionService.hasPermission).toHaveBeenCalledWith({
        userId: 'user-123',
        permissionName: 'usuario.visualizar',
        scopeType: ScopeType.GLOBAL,
        scopeId: undefined,
      });
      expect(result).toBe(true);
    });

    it('should deny access when user does not have required permission', async () => {
      // Arrange
      const permissionOptions = {
        permissionName: 'usuario.visualizar',
        scopeType: ScopeType.GLOBAL,
      };

      const context = createMock<ExecutionContext>({
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'user-123' },
            params: {},
            query: {},
          }),
        }),
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(permissionOptions);
      mockPermissionService.hasPermission.mockResolvedValue(false);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(PERMISSION_REQUIREMENTS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      expect(mockPermissionService.hasPermission).toHaveBeenCalledWith({
        userId: 'user-123',
        permissionName: 'usuario.visualizar',
        scopeType: ScopeType.GLOBAL,
        scopeId: undefined,
      });
    });

    it('should extract scopeId from request params when scopeType is UNIT', async () => {
      // Arrange
      const permissionOptions = {
        permissionName: 'usuario.visualizar',
        scopeType: ScopeType.UNIT,
        scopeIdParam: 'userId',
      };

      const context = createMock<ExecutionContext>({
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'user-123' },
            params: { userId: 'target-user-456' },
            query: {},
          }),
        }),
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(permissionOptions);
      mockPermissionService.hasPermission.mockResolvedValue(true);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(PERMISSION_REQUIREMENTS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      expect(mockPermissionService.hasPermission).toHaveBeenCalledWith({
        userId: 'user-123',
        permissionName: 'usuario.visualizar',
        scopeType: ScopeType.UNIT,
        scopeId: 'target-user-456',
      });
      expect(result).toBe(true);
    });

    it('should extract scopeId from request query when scopeType is UNIT and param not found', async () => {
      // Arrange
      const permissionOptions = {
        permissionName: 'usuario.visualizar',
        scopeType: ScopeType.UNIT,
        scopeIdParam: 'userId',
      };

      const context = createMock<ExecutionContext>({
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'user-123' },
            params: {},
            query: { userId: 'target-user-456' },
          }),
        }),
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(permissionOptions);
      mockPermissionService.hasPermission.mockResolvedValue(true);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(PERMISSION_REQUIREMENTS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      expect(mockPermissionService.hasPermission).toHaveBeenCalledWith({
        userId: 'user-123',
        permissionName: 'usuario.visualizar',
        scopeType: ScopeType.UNIT,
        scopeId: 'target-user-456',
      });
      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException when user is not authenticated', async () => {
      // Arrange
      const permissionOptions = {
        permissionName: 'usuario.visualizar',
        scopeType: ScopeType.GLOBAL,
      };

      const context = createMock<ExecutionContext>({
        switchToHttp: () => ({
          getRequest: () => ({
            user: undefined,
            params: {},
            query: {},
          }),
        }),
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(permissionOptions);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(PERMISSION_REQUIREMENTS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      expect(mockPermissionService.hasPermission).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when scopeId is required but not found', async () => {
      // Arrange
      const permissionOptions = {
        permissionName: 'usuario.visualizar',
        scopeType: ScopeType.UNIT,
        scopeIdParam: 'userId',
      };

      const context = createMock<ExecutionContext>({
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'user-123' },
            params: {},
            query: {},
          }),
        }),
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(permissionOptions);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(PERMISSION_REQUIREMENTS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      expect(mockPermissionService.hasPermission).not.toHaveBeenCalled();
    });
  });
});
