import { Test } from '@nestjs/testing';
import { Controller, Get } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequiresPermission, REQUIRES_PERMISSION_KEY } from '@/auth/decorators/requires-permission.decorator';
import { ScopeType } from '@/auth/entities/user-permission.entity';

/**
 * Testes unitários para o decorator RequiresPermission
 * 
 * Estes testes verificam se o decorator armazena corretamente as
 * informações de permissão necessárias para o PermissionGuard.
 */
describe('RequiresPermission', () => {
  let reflector: Reflector;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [Reflector],
    }).compile();

    reflector = moduleRef.get<Reflector>(Reflector);
  });

  it('deve armazenar requisito de permissão com escopo GLOBAL', () => {
    // Definir um controlador de teste com o decorator
    @Controller('test')
    class TestController {
      @RequiresPermission({
        permissionName: 'beneficio.listar',
        scopeType: ScopeType.GLOBAL,
      })
      @Get()
      testMethod() {
        return 'test';
      }
    }

    // Instanciar o controlador
    const controller = new TestController();
    
    // Obter os metadados
    const permissionReqs = reflector.get(REQUIRES_PERMISSION_KEY, controller.testMethod);
    
    // Verificar se os metadados foram armazenados corretamente
    expect(permissionReqs).toBeDefined();
    expect(permissionReqs).toBeInstanceOf(Array);
    expect(permissionReqs.length).toBe(1);
    expect(permissionReqs[0]).toEqual({
      permissionName: 'beneficio.listar',
      scopeType: ScopeType.GLOBAL,
    });
  });

  it('deve armazenar requisito de permissão com escopo UNIT e expressão de escopo', () => {
    // Definir um controlador de teste com o decorator
    @Controller('test')
    class TestController {
      @RequiresPermission({
        permissionName: 'solicitacao.listar',
        scopeType: ScopeType.UNIT,
        scopeIdExpression: 'query.unidade_id',
      })
      @Get()
      testMethod() {
        return 'test';
      }
    }

    // Instanciar o controlador
    const controller = new TestController();
    
    // Obter os metadados
    const permissionReqs = reflector.get(REQUIRES_PERMISSION_KEY, controller.testMethod);
    
    // Verificar se os metadados foram armazenados corretamente
    expect(permissionReqs).toBeDefined();
    expect(permissionReqs).toBeInstanceOf(Array);
    expect(permissionReqs.length).toBe(1);
    expect(permissionReqs[0]).toEqual({
      permissionName: 'solicitacao.listar',
      scopeType: ScopeType.UNIT,
      scopeIdExpression: 'query.unidade_id',
    });
  });

  it('deve armazenar requisito de permissão com escopo SELF', () => {
    // Definir um controlador de teste com o decorator
    @Controller('test')
    class TestController {
      @RequiresPermission({
        permissionName: 'usuario.perfil.editar',
        scopeType: ScopeType.SELF,
      })
      @Get()
      testMethod() {
        return 'test';
      }
    }

    // Instanciar o controlador
    const controller = new TestController();
    
    // Obter os metadados
    const permissionReqs = reflector.get(REQUIRES_PERMISSION_KEY, controller.testMethod);
    
    // Verificar se os metadados foram armazenados corretamente
    expect(permissionReqs).toBeDefined();
    expect(permissionReqs).toBeInstanceOf(Array);
    expect(permissionReqs.length).toBe(1);
    expect(permissionReqs[0]).toEqual({
      permissionName: 'usuario.perfil.editar',
      scopeType: ScopeType.SELF,
    });
  });

  it('deve acumular múltiplos requisitos de permissão', () => {
    // Definir um controlador de teste com múltiplos decorators
    @Controller('test')
    class TestController {
      @RequiresPermission({
        permissionName: 'solicitacao.visualizar',
        scopeType: ScopeType.UNIT,
        scopeIdExpression: 'solicitacao.unidadeId',
      })
      @RequiresPermission({
        permissionName: 'solicitacao.historico.visualizar',
        scopeType: ScopeType.UNIT,
        scopeIdExpression: 'solicitacao.unidadeId',
      })
      @Get()
      testMethod() {
        return 'test';
      }
    }

    // Instanciar o controlador
    const controller = new TestController();
    
    // Obter os metadados
    const permissionReqs = reflector.get(REQUIRES_PERMISSION_KEY, controller.testMethod);
    
    // Verificar se os metadados foram armazenados corretamente
    expect(permissionReqs).toBeDefined();
    expect(permissionReqs).toBeInstanceOf(Array);
    expect(permissionReqs.length).toBe(2);
    expect(permissionReqs[0]).toEqual({
      permissionName: 'solicitacao.visualizar',
      scopeType: ScopeType.UNIT,
      scopeIdExpression: 'solicitacao.unidadeId',
    });
    expect(permissionReqs[1]).toEqual({
      permissionName: 'solicitacao.historico.visualizar',
      scopeType: ScopeType.UNIT,
      scopeIdExpression: 'solicitacao.unidadeId',
    });
  });
});
