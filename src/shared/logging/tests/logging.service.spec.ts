import { Test, TestingModule } from '@nestjs/testing';
import { LoggingService } from '../logging.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

/**
 * Testes unitários para o serviço de logging
 * 
 * Verifica o funcionamento dos métodos de log em diferentes níveis
 * e com diferentes tipos de informações
 */
describe('LoggingService', () => {
  let service: LoggingService;
  
  // Mock do logger Winston
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(global, 'Date').mockImplementation(() => {
      return {
        toISOString: () => '2025-05-13T18:00:00.000Z',
      } as unknown as Date;
    });
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggingService,
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<LoggingService>(LoggingService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('info', () => {
    it('deve registrar uma mensagem de nível info', () => {
      const message = 'Mensagem de informação';
      const context = 'TestContext';
      const meta = { key: 'value' };
      
      service.info(message, context, meta);
      
      expect(mockLogger.info).toHaveBeenCalledWith(message, {
        context,
        key: 'value',
        timestamp: '2025-05-13T18:00:00.000Z',
      });
    });

    it('deve lidar com chamadas sem contexto ou meta', () => {
      const message = 'Mensagem de informação';
      
      service.info(message);
      
      expect(mockLogger.info).toHaveBeenCalledWith(message, {
        context: undefined,
        timestamp: '2025-05-13T18:00:00.000Z',
      });
    });
  });

  describe('error', () => {
    it('deve registrar uma mensagem de nível error com trace', () => {
      const message = 'Mensagem de erro';
      const trace = 'Stack trace';
      const context = 'TestContext';
      const meta = { key: 'value' };
      
      service.error(message, trace, context, meta);
      
      expect(mockLogger.error).toHaveBeenCalledWith(message, {
        trace,
        context,
        key: 'value',
        timestamp: '2025-05-13T18:00:00.000Z',
      });
    });

    it('deve lidar com chamadas sem trace, contexto ou meta', () => {
      const message = 'Mensagem de erro';
      
      service.error(message);
      
      expect(mockLogger.error).toHaveBeenCalledWith(message, {
        trace: undefined,
        context: undefined,
        timestamp: '2025-05-13T18:00:00.000Z',
      });
    });
  });

  describe('warn', () => {
    it('deve registrar uma mensagem de nível warn', () => {
      const message = 'Mensagem de aviso';
      const context = 'TestContext';
      const meta = { key: 'value' };
      
      service.warn(message, context, meta);
      
      expect(mockLogger.warn).toHaveBeenCalledWith(message, {
        context,
        key: 'value',
        timestamp: '2025-05-13T18:00:00.000Z',
      });
    });
  });

  describe('debug', () => {
    it('deve registrar uma mensagem de nível debug', () => {
      const message = 'Mensagem de debug';
      const context = 'TestContext';
      const meta = { key: 'value' };
      
      service.debug(message, context, meta);
      
      expect(mockLogger.debug).toHaveBeenCalledWith(message, {
        context,
        key: 'value',
        timestamp: '2025-05-13T18:00:00.000Z',
      });
    });
  });

  describe('verbose', () => {
    it('deve registrar uma mensagem de nível verbose', () => {
      const message = 'Mensagem verbose';
      const context = 'TestContext';
      const meta = { key: 'value' };
      
      service.verbose(message, context, meta);
      
      expect(mockLogger.verbose).toHaveBeenCalledWith(message, {
        context,
        key: 'value',
        timestamp: '2025-05-13T18:00:00.000Z',
      });
    });
  });

  describe('logDatabase', () => {
    it('deve registrar uma operação de banco de dados', () => {
      const operation = 'INSERT';
      const entity = 'Usuario';
      const duration = 150;
      const query = 'INSERT INTO usuarios (nome, email) VALUES (?, ?)';
      
      service.logDatabase(operation, entity, duration, query);
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `DB: ${operation} ${entity} - ${duration}ms`,
        {
          context: 'Database',
          operation,
          entity,
          duration,
          query,
          timestamp: '2025-05-13T18:00:00.000Z',
        }
      );
    });

    it('deve lidar com chamadas sem query', () => {
      const operation = 'SELECT';
      const entity = 'Usuario';
      const duration = 50;
      
      service.logDatabase(operation, entity, duration);
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `DB: ${operation} ${entity} - ${duration}ms`,
        {
          context: 'Database',
          operation,
          entity,
          duration,
          query: undefined,
          timestamp: '2025-05-13T18:00:00.000Z',
        }
      );
    });
  });

  describe('logAuth', () => {
    it('deve registrar uma operação de autenticação bem-sucedida', () => {
      const operation = 'LOGIN';
      const userId = 'user-123';
      const success = true;
      const ip = '192.168.1.1';
      const userAgent = 'Mozilla/5.0';
      
      service.logAuth(operation, userId, success, ip, userAgent);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Auth: ${operation} - Usuário: ${userId} - Sucesso: ${success}`,
        {
          context: 'Authentication',
          operation,
          userId,
          success,
          ip,
          userAgent,
          timestamp: '2025-05-13T18:00:00.000Z',
        }
      );
    });

    it('deve registrar uma operação de autenticação sem sucesso', () => {
      const operation = 'LOGIN';
      const userId = 'user-123';
      const success = false;
      
      service.logAuth(operation, userId, success);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Auth: ${operation} - Usuário: ${userId} - Sucesso: ${success}`,
        {
          context: 'Authentication',
          operation,
          userId,
          success,
          ip: undefined,
          userAgent: undefined,
          timestamp: '2025-05-13T18:00:00.000Z',
        }
      );
    });
  });

  describe('logBusiness', () => {
    it('deve registrar uma operação de negócio com detalhes', () => {
      const operation = 'APROVAR';
      const entity = 'Solicitacao';
      const entityId = 'solicitacao-123';
      const userId = 'user-123';
      const details = { motivo: 'Documentação completa', status: 'APROVADO' };
      
      service.logBusiness(operation, entity, entityId, userId, details);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Business: ${operation} ${entity} ${entityId} - Usuário: ${userId}`,
        {
          context: 'Business',
          operation,
          entity,
          entityId,
          userId,
          details,
          timestamp: '2025-05-13T18:00:00.000Z',
        }
      );
    });

    it('deve registrar uma operação de negócio sem detalhes', () => {
      const operation = 'VISUALIZAR';
      const entity = 'Beneficio';
      const entityId = 'beneficio-123';
      const userId = 'user-123';
      
      service.logBusiness(operation, entity, entityId, userId);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Business: ${operation} ${entity} ${entityId} - Usuário: ${userId}`,
        {
          context: 'Business',
          operation,
          entity,
          entityId,
          userId,
          details: undefined,
          timestamp: '2025-05-13T18:00:00.000Z',
        }
      );
    });
  });
});
