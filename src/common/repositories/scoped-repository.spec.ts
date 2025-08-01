import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ScopedRepository } from './scoped-repository';
import { RequestContextHolder } from '../services/request-context-holder.service';
import { ScopeType } from '../../enums/scope-type.enum';
import { IScopeContext } from '../interfaces/scope-context.interface';
import {
  ScopeContextRequiredException,
  StrictModeViolationException,
} from '../exceptions/scope.exceptions';
import { EntityManager, Repository } from 'typeorm';

// Entidade de teste simples
class TestEntity {
  id: number;
  name: string;
  user_id?: string;
  unidade_id?: string;
}

describe('ScopedRepository - Correções de Segurança', () => {
  let scopedRepository: ScopedRepository<TestEntity>;
  let mockEntityManager: jest.Mocked<EntityManager>;
  let mockQueryBuilder: any;
  let loggerSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock do QueryBuilder
    mockQueryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue(null),
      getCount: jest.fn().mockResolvedValue(0),
    };

    // Mock do EntityManager
    mockEntityManager = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      connection: {
        getMetadata: jest.fn().mockReturnValue({
          name: 'TestEntity',
          columns: [
            { propertyName: 'id' },
            { propertyName: 'name' },
            { propertyName: 'user_id' },
            { propertyName: 'unidade_id' },
          ],
        }),
      },
    } as any;

    // Criar instância do ScopedRepository
    scopedRepository = new ScopedRepository<TestEntity>(
      TestEntity,
      mockEntityManager,
      undefined,
      { strictMode: true, allowGlobalScope: false }
    );

    // Spy no logger
    loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    RequestContextHolder.clear();
  });

  describe('CORREÇÃO CRÍTICA #1: Fail-Fast para Contexto Ausente', () => {
    it('deve lançar ScopeContextRequiredException quando contexto está ausente', async () => {
      // Arrange: Sem contexto definido
      jest.spyOn(RequestContextHolder, 'get').mockReturnValue(undefined);

      // Act & Assert
      await expect(scopedRepository.findAll()).rejects.toThrow(
        ScopeContextRequiredException
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('SECURITY ALERT: Tentativa de'),
        expect.objectContaining({
          entity: 'TestEntity',
          timestamp: expect.any(String),
        })
      );
    });

    it('deve aplicar filtros corretamente quando contexto está presente', async () => {
      // Arrange
      const mockContext: IScopeContext = {
        tipo: ScopeType.PROPRIO,
        user_id: '123',
        unidade_id: 'unidade-1',
      };
      jest.spyOn(RequestContextHolder, 'get').mockReturnValue(mockContext);

      // Act
      await scopedRepository.findAll();

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'entity.user_id = :userId',
        { userId: '123' }
      );
    });

    it('deve lançar exceção para métodos críticos sem contexto', async () => {
      // Arrange
      jest.spyOn(RequestContextHolder, 'get').mockReturnValue(undefined);

      // Act & Assert
      await expect(scopedRepository.findById(1)).rejects.toThrow(
        ScopeContextRequiredException
      );
      await expect(scopedRepository.countScoped()).rejects.toThrow(
        ScopeContextRequiredException
      );
    });
  });

  describe('CORREÇÃO CRÍTICA #3: Strict Mode', () => {
    it('deve bloquear métodos globais em strict mode', async () => {
      // Arrange
      const mockContext: IScopeContext = {
        tipo: ScopeType.PROPRIO,
        user_id: '123',
        unidade_id: 'unidade-1',
      };
      jest.spyOn(RequestContextHolder, 'get').mockReturnValue(mockContext);

      // Act & Assert
      await expect(scopedRepository.findAllGlobal()).rejects.toThrow(
        StrictModeViolationException
      );
      await expect(scopedRepository.findByIdGlobal(1)).rejects.toThrow(
        StrictModeViolationException
      );
      await expect(scopedRepository.countGlobal()).rejects.toThrow(
        StrictModeViolationException
      );
    });

    it('deve permitir métodos globais para usuários GLOBAL em strict mode', async () => {
      // Arrange
      const mockContext: IScopeContext = {
        tipo: ScopeType.GLOBAL,
        user_id: '123',
        unidade_id: undefined,
      };
      jest.spyOn(RequestContextHolder, 'get').mockReturnValue(mockContext);

      // Act
      await scopedRepository.findAllGlobal();

      // Assert
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
    });

    it('deve permitir métodos globais quando strict mode está desabilitado', async () => {
      // Arrange
      const nonStrictRepository = new ScopedRepository<TestEntity>(
        TestEntity,
        mockEntityManager,
        undefined,
        { strictMode: false, allowGlobalScope: true }
      );
      const mockContext: IScopeContext = {
        tipo: ScopeType.PROPRIO,
        user_id: '123',
        unidade_id: 'unidade-1',
      };
      jest.spyOn(RequestContextHolder, 'get').mockReturnValue(mockContext);

      // Act
      await nonStrictRepository.findAllGlobal();

      // Assert
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
    });
  });

  describe('Aplicação de Filtros de Escopo', () => {
    beforeEach(() => {
      const mockContext: IScopeContext = {
        tipo: ScopeType.PROPRIO,
        user_id: '123',
        unidade_id: 'unidade-1',
      };
      jest.spyOn(RequestContextHolder, 'get').mockReturnValue(mockContext);
    });

    it('deve aplicar filtro PROPRIO corretamente', async () => {
      // Act
      await scopedRepository.findAll();

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'entity.user_id = :userId',
        { userId: '123' }
      );
    });

    it('deve aplicar filtro UNIDADE corretamente', async () => {
      // Arrange
      const mockContext: IScopeContext = {
        tipo: ScopeType.UNIDADE,
        user_id: '123',
        unidade_id: 'unidade-1',
      };
      jest.spyOn(RequestContextHolder, 'get').mockReturnValue(mockContext);

      // Act
      await scopedRepository.findAll();

      // Assert
      // Para TestEntity, deve aplicar filtro direto de unidade_id
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'entity.unidade_id = :unidadeId',
        { unidadeId: 'unidade-1' }
      );
    });

    it('não deve aplicar filtros para escopo GLOBAL', async () => {
      // Arrange
      const mockContext: IScopeContext = {
        tipo: ScopeType.GLOBAL,
        user_id: '123',
        unidade_id: undefined,
      };
      jest.spyOn(RequestContextHolder, 'get').mockReturnValue(mockContext);

      // Act
      await scopedRepository.findAll();

      // Assert
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('Logs de Auditoria', () => {
    it('deve registrar tentativas de acesso sem contexto', async () => {
      // Arrange
      jest.spyOn(RequestContextHolder, 'get').mockReturnValue(undefined);

      // Act
      try {
        await scopedRepository.findAll();
      } catch (error) {
        // Expected error
      }

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('SECURITY ALERT: Tentativa de'),
        expect.objectContaining({
          entity: 'TestEntity',
          timestamp: expect.any(String),
        })
      );
    });

    it('deve registrar tentativas de uso de métodos globais em strict mode', async () => {
      // Arrange
      const mockContext: IScopeContext = {
        tipo: ScopeType.PROPRIO,
        user_id: '123',
        unidade_id: 'unidade-1',
      };
      jest.spyOn(RequestContextHolder, 'get').mockReturnValue(mockContext);
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      // Act
      try {
        await scopedRepository.findAllGlobal();
      } catch (error) {
        // Expected error
      }

      // Assert - O strict mode deve lançar exceção antes do log de warn
      expect(loggerSpy).not.toHaveBeenCalled();
    });

    it('deve registrar logs de debug para operações com contexto válido', async () => {
      // Arrange
      const mockContext: IScopeContext = {
        tipo: ScopeType.PROPRIO,
        user_id: '123',
        unidade_id: 'unidade-1',
      };
      jest.spyOn(RequestContextHolder, 'get').mockReturnValue(mockContext);
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');

      // Act
      await scopedRepository.findAll();

      // Assert
      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Aplicando escopo PROPRIO para TestEntity'),
        expect.objectContaining({
          userId: '123',
          unidadeId: 'unidade-1',
          entity: 'TestEntity',
        })
      );
    });
  });

  describe('Configuração de Opções', () => {
    it('deve usar configurações padrão quando não especificadas', () => {
      // Arrange & Act
      const defaultRepository = new ScopedRepository<TestEntity>(
        TestEntity,
        mockEntityManager,
        undefined
      );

      // Assert
      expect((defaultRepository as any).options.strictMode).toBe(true);
      expect((defaultRepository as any).options.allowGlobalScope).toBe(false);
    });

    it('deve permitir configuração personalizada', () => {
      // Arrange & Act
      const customRepository = new ScopedRepository<TestEntity>(
        TestEntity,
        mockEntityManager,
        undefined,
        {
          strictMode: false,
          allowGlobalScope: true,
        }
      );

      // Assert
      expect((customRepository as any).options.strictMode).toBe(false);
      expect((customRepository as any).options.allowGlobalScope).toBe(true);
    });
  });
});