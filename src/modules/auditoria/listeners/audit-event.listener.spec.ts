/**
 * Testes para AuditEventListener
 * 
 * Verifica se os listeners de eventos de auditoria estão funcionando corretamente,
 * especialmente o novo listener para eventos OPERATION_ERROR.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AuditEventListener } from './audit-event.listener';
import { AuditCoreService } from '../core/services/audit-core.service';
import { SystemContextService } from '../../../common/services/system-context.service';
import { AuditEventType, RiskLevel, BaseAuditEvent } from '../events/types/audit-event.types';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';

describe('AuditEventListener', () => {
  let listener: AuditEventListener;
  let auditCoreService: jest.Mocked<AuditCoreService>;
  let systemContextService: jest.Mocked<SystemContextService>;

  beforeEach(async () => {
    const mockAuditCoreService = {
      createAuditLog: jest.fn().mockResolvedValue(undefined),
    };

    const mockSystemContextService = {
      getCurrentUserId: jest.fn().mockReturnValue('test-user-id'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditEventListener,
        {
          provide: AuditCoreService,
          useValue: mockAuditCoreService,
        },
        {
          provide: SystemContextService,
          useValue: mockSystemContextService,
        },
      ],
    }).compile();

    listener = module.get<AuditEventListener>(AuditEventListener);
    auditCoreService = module.get(AuditCoreService);
    systemContextService = module.get(SystemContextService);
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  describe('handleOperationError', () => {
    it('should process OPERATION_ERROR events correctly', async () => {
      // Arrange
      const errorEvent: BaseAuditEvent = {
        eventId: 'test-event-id',
        eventType: AuditEventType.OPERATION_ERROR,
        entityName: 'TestEntity',
        entityId: 'test-entity-id',
        timestamp: new Date(),
        userId: 'test-user-id',
        riskLevel: RiskLevel.HIGH,
        metadata: {
          error: {
            message: 'Test error message',
            status: 500,
            stack: 'Error stack trace',
          },
          controller: 'TestController',
          method: 'testMethod',
          url: '/api/test',
          httpMethod: 'POST',
          duration: 150,
          requestId: 'test-request-id',
          ip: '192.168.1.1',
          userAgent: 'Test User Agent',
        },
      };

      // Act
      await listener.handleOperationError(errorEvent);

      // Assert
      expect(auditCoreService.createAuditLog).toHaveBeenCalledWith({
        tipo_operacao: TipoOperacao.EXECUTION,
        entidade_afetada: 'TestEntity',
        entidade_id: 'test-entity-id',
        usuario_id: 'test-user-id',
        descricao: 'Erro na operação: Test error message',
        data_hora: errorEvent.timestamp,
        ip_origem: '192.168.1.1',
        user_agent: 'Test User Agent',
        endpoint: '/api/test',
        metodo_http: 'POST',
        dados_novos: {
          error: {
            message: 'Test error message',
            status: 500,
            stack: 'Error stack trace',
          },
          controller: 'TestController',
          method: 'testMethod',
          duration: 150,
          requestId: 'test-request-id',
        },
        nivel_risco: RiskLevel.HIGH,
      });
    });

    it('should handle events with minimal data', async () => {
      // Arrange
      const minimalEvent: BaseAuditEvent = {
        eventId: 'test-event-id',
        eventType: AuditEventType.OPERATION_ERROR,
        timestamp: new Date(),
        riskLevel: RiskLevel.HIGH,
        metadata: {},
      };

      // Act
      await listener.handleOperationError(minimalEvent);

      // Assert
      expect(auditCoreService.createAuditLog).toHaveBeenCalledWith({
        tipo_operacao: TipoOperacao.EXECUTION,
        entidade_afetada: 'Sistema',
        entidade_id: undefined,
        usuario_id: undefined,
        descricao: 'Erro na operação: Erro desconhecido',
        data_hora: minimalEvent.timestamp,
        ip_origem: undefined,
        user_agent: undefined,
        endpoint: undefined,
        metodo_http: undefined,
        dados_novos: {
          error: undefined,
          controller: undefined,
          method: undefined,
          duration: undefined,
          requestId: undefined,
        },
        nivel_risco: RiskLevel.HIGH,
      });
    });

    it('should handle errors during audit log creation', async () => {
      // Arrange
      const errorEvent: BaseAuditEvent = {
        eventId: 'test-event-id',
        eventType: AuditEventType.OPERATION_ERROR,
        timestamp: new Date(),
        riskLevel: RiskLevel.HIGH,
        metadata: {},
      };

      auditCoreService.createAuditLog.mockRejectedValue(new Error('Database error'));
      const loggerSpy = jest.spyOn(listener['logger'], 'error').mockImplementation();

      // Act
      await listener.handleOperationError(errorEvent);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        'Erro ao processar evento de erro de operação:',
        {
          error: 'Database error',
          event: errorEvent,
        },
      );
    });
  });

  describe('mapEventTypeToTipoOperacao', () => {
    it('should map OPERATION_ERROR to EXECUTION', () => {
      // Act
      const result = listener['mapEventTypeToTipoOperacao'](AuditEventType.OPERATION_ERROR);

      // Assert
      expect(result).toBe(TipoOperacao.EXECUTION);
    });
  });
});