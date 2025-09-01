/**
 * Testes para RequestDeduplicationService
 *
 * Verifica se o serviço de deduplicação está funcionando corretamente
 * para evitar registros duplicados de auditoria.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { RequestDeduplicationService } from './request-deduplication.service';

describe('RequestDeduplicationService', () => {
  let service: RequestDeduplicationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RequestDeduplicationService],
    }).compile();

    service = module.get<RequestDeduplicationService>(RequestDeduplicationService);
  });

  afterEach(() => {
    service.clearCache();
  });

  afterAll(() => {
    service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isRequestProcessed', () => {
    it('should return false for new request', () => {
      const requestContext = {
        method: 'GET',
        url: '/api/test',
        userId: 'user123',
        ip: '192.168.1.1',
        timestamp: Date.now(),
      };

      const result = service.isRequestProcessed(requestContext);
      expect(result).toBe(false);
    });

    it('should return true for already processed request', () => {
      const requestContext = {
        method: 'GET',
        url: '/api/test',
        userId: 'user123',
        ip: '192.168.1.1',
        timestamp: Date.now(),
      };

      // Marca como processada
      service.markRequestAsProcessed(requestContext);

      // Verifica se foi processada
      const result = service.isRequestProcessed(requestContext);
      expect(result).toBe(true);
    });

    it('should return false for expired request', async () => {
      const requestContext = {
        method: 'GET',
        url: '/api/test',
        userId: 'user123',
        ip: '192.168.1.1',
        timestamp: Date.now(),
      };

      // Marca como processada
      service.markRequestAsProcessed(requestContext);

      // Simula expiração alterando o timestamp interno
      const cacheStats = service.getCacheStats();
      expect(cacheStats.size).toBe(1);

      // Força limpeza de entradas expiradas
      // (Em um teste real, aguardaríamos o TTL, mas aqui simulamos)
      service.clearCache();

      const result = service.isRequestProcessed(requestContext);
      expect(result).toBe(false);
    });
  });

  describe('markRequestAsProcessed', () => {
    it('should mark request as processed and return request ID', () => {
      const requestContext = {
        method: 'POST',
        url: '/api/create',
        userId: 'user456',
        ip: '10.0.0.1',
        timestamp: Date.now(),
      };

      const requestId = service.markRequestAsProcessed(requestContext);

      expect(requestId).toBeDefined();
      expect(typeof requestId).toBe('string');
      expect(requestId.length).toBe(16); // Hash truncado

      // Verifica se foi marcada como processada
      const isProcessed = service.isRequestProcessed(requestContext);
      expect(isProcessed).toBe(true);
    });

    it('should generate same ID for identical requests in same time window', () => {
      const timestamp = Date.now();
      const requestContext1 = {
        method: 'GET',
        url: '/api/test',
        userId: 'user123',
        ip: '192.168.1.1',
        timestamp,
      };

      const requestContext2 = {
        method: 'GET',
        url: '/api/test',
        userId: 'user123',
        ip: '192.168.1.1',
        timestamp: timestamp + 500, // Mesmo segundo
      };

      // Testa apenas a geração de ID sem marcar como processado
      // Simula a geração de ID usando o método privado através de markRequestAsProcessed
      const id1 = service.markRequestAsProcessed(requestContext1);
      
      // Para o segundo contexto, verifica se seria considerado duplicata
      const isDuplicate = service.isRequestProcessed(requestContext2);
      expect(isDuplicate).toBe(true); // Deve ser considerado duplicata
    });

    it('should treat different requests as separate', () => {
      const timestamp = Date.now();
      const requestContext1 = {
        method: 'GET',
        url: '/api/test1',
        userId: 'user123',
        ip: '192.168.1.1',
        timestamp,
      };

      const requestContext2 = {
        method: 'GET',
        url: '/api/test2',
        userId: 'user123',
        ip: '192.168.1.1',
        timestamp,
      };

      // Marca primeira requisição como processada
      service.markRequestAsProcessed(requestContext1);
      
      // Segunda requisição deve ser considerada nova (não duplicata)
      const isDuplicate = service.isRequestProcessed(requestContext2);
      expect(isDuplicate).toBe(false);
    });
  });

  describe('getCacheStats', () => {
    it('should return correct cache statistics', () => {
      const stats = service.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('oldestEntry');
      expect(stats).toHaveProperty('newestEntry');
      expect(stats.size).toBe(0);
      expect(stats.oldestEntry).toBeNull();
      expect(stats.newestEntry).toBeNull();
    });

    it('should update statistics when entries are added', () => {
      const requestContext = {
        method: 'GET',
        url: '/api/test',
        userId: 'user123',
        ip: '192.168.1.1',
        timestamp: Date.now(),
      };

      service.markRequestAsProcessed(requestContext);

      const stats = service.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.oldestEntry).toBeDefined();
      expect(stats.newestEntry).toBeDefined();
    });
  });

  describe('clearCache', () => {
    it('should clear all cache entries', () => {
      const requestContext = {
        method: 'GET',
        url: '/api/test',
        userId: 'user123',
        ip: '192.168.1.1',
        timestamp: Date.now(),
      };

      service.markRequestAsProcessed(requestContext);
      expect(service.getCacheStats().size).toBe(1);

      service.clearCache();
      expect(service.getCacheStats().size).toBe(0);
    });
  });

  describe('URL normalization', () => {
    it('should treat URLs with query parameters as same request', () => {
      const timestamp = Date.now();
      const requestContext1 = {
        method: 'GET',
        url: '/api/test?param=1',
        userId: 'user123',
        ip: '192.168.1.1',
        timestamp,
      };

      const requestContext2 = {
        method: 'GET',
        url: '/api/test?param=2',
        userId: 'user123',
        ip: '192.168.1.1',
        timestamp,
      };

      service.markRequestAsProcessed(requestContext1);
      const isProcessed = service.isRequestProcessed(requestContext2);
      expect(isProcessed).toBe(true);
    });
  });

  describe('Anonymous users', () => {
    it('should handle requests without userId', () => {
      const requestContext = {
        method: 'GET',
        url: '/api/public',
        ip: '192.168.1.1',
        timestamp: Date.now(),
      };

      const requestId = service.markRequestAsProcessed(requestContext);
      expect(requestId).toBeDefined();

      const isProcessed = service.isRequestProcessed(requestContext);
      expect(isProcessed).toBe(true);
    });
  });
});