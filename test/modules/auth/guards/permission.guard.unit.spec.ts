import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from '@/auth/guards/permission.guard';
import { PermissionService } from '@/auth/services/permission.service';
import { ScopeType } from '@/auth/entities/user-permission.entity';
import { REQUIRES_PERMISSION_KEY } from '@/auth/decorators/requires-permission.decorator';

/**
 * Testes unitários para o PermissionGuard
 *
 * Estes testes verificam o funcionamento do guarda de permissões,
 * responsável por verificar se um usuário tem as permissões necessárias
 * para acessar uma rota.
 */
describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let reflector: Reflector;
  let permissionService: PermissionService;

  beforeEach(async () => {
    // Mock do PermissionService
    const mockPermissionService = {
      hasPermission: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionGuard,
        Reflector,
        {
          provide: PermissionService,
          useValue: mockPermissionService,
        },
      ],
    }).compile();

    guard = module.get<PermissionGuard>(PermissionGuard);
    reflector = module.get<Reflector>(Reflector);
    permissionService = module.get<PermissionService>(PermissionService);
  });

  it('deve ser definido', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('deve permitir acesso quando não há requisitos de permissão', async () => {
      // Mock do Reflector para retornar undefined (não há requisitos de permissão)
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      // Mock do ExecutionContext
      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { id: 'user-123' },
          }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(mockExecutionContext);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
        REQUIRES_PERMISSION_KEY,
        [mockExecutionContext.getHandler(), mockExecutionContext.getClass()],
      );
      expect(result).toBe(true);
    });

    it('deve negar acesso quando não há usuário autenticado', async () => {
      // Mock do Reflector para retornar requisitos de permissão
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        {
          permissionName: 'solicitacao.listar',
          scopeType: ScopeType.UNIT,
          scopeIdExpression: 'query.unidade_id',
        },
      ]);

      // Mock do ExecutionContext sem usuário
      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            // Sem usuário
            query: { unidade_id: 'unidade-123' },
          }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('deve permitir acesso quando o usuário tem todas as permissões necessárias', async () => {
      // Mock do Reflector para retornar requisitos de permissão
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        {
          permissionName: 'solicitacao.listar',
          scopeType: ScopeType.UNIT,
          scopeIdExpression: 'query.unidade_id',
        },
      ]);

      // Mock do ExecutionContext com usuário
      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { id: 'user-123' },
            query: { unidade_id: 'unidade-123' },
          }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      // O usuário tem a permissão
      jest.spyOn(permissionService, 'hasPermission').mockResolvedValue(true);

      const result = await guard.canActivate(mockExecutionContext);

      expect(permissionService.hasPermission).toHaveBeenCalledWith({
        userId: 'user-123',
        permissionName: 'solicitacao.listar',
        scopeType: ScopeType.UNIT,
        scopeId: 'unidade-123',
      });
      expect(result).toBe(true);
    });

    it('deve negar acesso quando o usuário não tem alguma das permissões necessárias', async () => {
      // Mock do Reflector para retornar requisitos de permissão
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        {
          permissionName: 'solicitacao.listar',
          scopeType: ScopeType.UNIT,
          scopeIdExpression: 'query.unidade_id',
        },
        {
          permissionName: 'solicitacao.visualizar',
          scopeType: ScopeType.UNIT,
          scopeIdExpression: 'query.unidade_id',
        },
      ]);

      // Mock do ExecutionContext com usuário
      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { id: 'user-123' },
            query: { unidade_id: 'unidade-123' },
          }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      // O usuário tem a primeira permissão mas não tem a segunda
      jest
        .spyOn(permissionService, 'hasPermission')
        .mockResolvedValueOnce(true) // solicitacao.listar
        .mockResolvedValueOnce(false); // solicitacao.visualizar

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(permissionService.hasPermission).toHaveBeenCalledTimes(2);
    });

    it('deve avaliar corretamente expressões de escopo com objetos aninhados', async () => {
      // Mock do Reflector para retornar requisitos de permissão com expressão de escopo aninhada
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        {
          permissionName: 'solicitacao.visualizar',
          scopeType: ScopeType.UNIT,
          scopeIdExpression: 'solicitacao.unidade.id',
        },
      ]);

      // Mock do ExecutionContext com usuário e objetos aninhados
      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { id: 'user-123' },
            solicitacao: {
              unidade: {
                id: 'unidade-456',
              },
            },
          }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      // O usuário tem a permissão
      jest.spyOn(permissionService, 'hasPermission').mockResolvedValue(true);

      const result = await guard.canActivate(mockExecutionContext);

      expect(permissionService.hasPermission).toHaveBeenCalledWith({
        userId: 'user-123',
        permissionName: 'solicitacao.visualizar',
        scopeType: ScopeType.UNIT,
        scopeId: 'unidade-456',
      });
      expect(result).toBe(true);
    });

    it('deve lidar corretamente com expressões de escopo usando variáveis previamente definidas', async () => {
      // Mock do Reflector para retornar requisitos de permissão com expressão de escopo usando variáveis
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        {
          permissionName: 'usuario.permissao.atribuir',
          scopeType: ScopeType.GLOBAL,
        },
      ]);

      // Mock do ExecutionContext com usuário
      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: {
              id: 'user-123',
              unidadeId: 'unidade-789', // Unidade do usuário autenticado
            },
            body: {
              unidadeId: 'unidade-456', // Unidade do formulário
            },
          }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      // O usuário tem a permissão
      jest.spyOn(permissionService, 'hasPermission').mockResolvedValue(true);

      const result = await guard.canActivate(mockExecutionContext);

      expect(permissionService.hasPermission).toHaveBeenCalledWith({
        userId: 'user-123',
        permissionName: 'usuario.permissao.atribuir',
        scopeType: ScopeType.GLOBAL,
        scopeId: undefined,
      });
      expect(result).toBe(true);
    });
  });
});
