import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { UserIdentifierService } from './user-identifier.service';
import { UserIdentificationStrategy } from '../interfaces/user-identifier.interface';

describe('UserIdentifierService', () => {
  let service: UserIdentifierService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserIdentifierService],
    }).compile();

    service = module.get<UserIdentifierService>(UserIdentifierService);
  });

  const createMockRequest = (overrides = {}) => ({
    get: jest.fn((header: string) => {
      const headers = overrides['headers'] || {};
      return headers[header.toLowerCase()];
    }),
    headers: {},
    path: '/test',
    connection: {},
    ...overrides,
  });

  describe('identifyUser', () => {
    it('deve identificar usuário autenticado por ID', () => {
      const mockRequest = createMockRequest({
        user: { id: 'user-123' },
        ip: '192.168.1.1',
        headers: { 'user-agent': 'test-agent' },
      });

      const result = service.identifyUser(mockRequest as any);

      expect(result.identifier).toBe('user:user-123');
      expect(result.strategy).toBe(UserIdentificationStrategy.USER_ID);
      expect(result.userId).toBe('user-123');
      expect(result.isAuthenticated).toBe(true);
    });

    it('deve identificar usuário não autenticado por IP', () => {
      const mockRequest = createMockRequest({
        ip: '192.168.1.1',
        headers: { 'user-agent': 'test-agent' },
      });

      const result = service.identifyUser(mockRequest as any);

      expect(result.identifier).toBe('ip:19216811');
      expect(result.strategy).toBe(UserIdentificationStrategy.IP_FALLBACK);
      expect(result.isAuthenticated).toBe(false);
    });

    it('deve usar limite global para rotas públicas', () => {
      const mockRequest = createMockRequest({
        path: '/public/test',
        headers: { 'user-agent': 'test-agent' },
      });

      const result = service.identifyUser(mockRequest as any);

      expect(result.identifier).toBe('global:public');
      expect(result.strategy).toBe(UserIdentificationStrategy.GLOBAL_LIMIT);
      expect(result.isAuthenticated).toBe(false);
    });

    it('deve lidar com usuário inválido', () => {
      const mockRequest = createMockRequest({
        user: { id: null },
        ip: '192.168.1.1',
        headers: { 'user-agent': 'test-agent' },
      });

      const result = service.identifyUser(mockRequest as any);

      expect(result.identifier).toBe('ip:19216811');
      expect(result.strategy).toBe(UserIdentificationStrategy.IP_FALLBACK);
    });
  });

  describe('isValidIdentifier', () => {
    it('deve validar identificador válido', () => {
      expect(service.isValidIdentifier('user:123')).toBe(true);
      expect(service.isValidIdentifier('ip:192.168.1.1')).toBe(true);
      expect(service.isValidIdentifier('global:anonymous')).toBe(true);
    });

    it('deve rejeitar identificador inválido', () => {
      expect(service.isValidIdentifier('')).toBe(false);
      expect(service.isValidIdentifier('ab')).toBe(false); // muito curto
      expect(service.isValidIdentifier('a'.repeat(101))).toBe(false); // muito longo
    });
  });

  describe('sanitizeIdentifier', () => {
    it('deve sanitizar identificador removendo caracteres especiais', () => {
      expect(service.sanitizeIdentifier('user@123')).toBe('user123');
      expect(service.sanitizeIdentifier('user:123')).toBe('user123');
      expect(service.sanitizeIdentifier('user-123')).toBe('user-123');
      expect(service.sanitizeIdentifier('user_123')).toBe('user_123');
    });

    it('deve truncar identificadores muito longos', () => {
      const longId = 'a'.repeat(300);
      const sanitized = service.sanitizeIdentifier(longId);
      expect(sanitized.length).toBeLessThanOrEqual(255);
    });

    it('deve sanitizar identificadores especiais', () => {
      expect(service.sanitizeIdentifier('user@123')).toBe('user123');
      expect(service.sanitizeIdentifier('ip:192.168.1.1')).toBe('ip19216811');
      expect(service.sanitizeIdentifier('global:anonymous')).toBe('globalanonymous');
    });

    it('deve lidar com identificadores vazios', () => {
      expect(service.sanitizeIdentifier('')).toBe('unknown');
      expect(service.sanitizeIdentifier(null as any)).toBe('unknown');
      expect(service.sanitizeIdentifier(undefined as any)).toBe('unknown');
    });
  });

  describe('edge cases', () => {
    it('deve lidar com request sem IP', () => {
      const mockRequest = createMockRequest({
        user: undefined,
        ip: undefined,
        get: jest.fn(() => undefined),
        connection: { remoteAddress: undefined },
      });

      const result = service.identifyUser(mockRequest as any);

      expect(result.identifier).toBe('ip:unknown');
      expect(result.strategy).toBe(UserIdentificationStrategy.IP_FALLBACK);
    });

    it('deve lidar com headers undefined', () => {
      const mockRequest = createMockRequest({
        headers: undefined,
        ip: '127.0.0.1',
        get: jest.fn(() => undefined),
      });

      const result = service.identifyUser(mockRequest as any);

      expect(result.identifier).toContain('ip:');
      expect(result.strategy).toBe(UserIdentificationStrategy.IP_FALLBACK);
    });

    it('deve lidar com user object vazio', () => {
      const mockRequest = createMockRequest({
        user: {},
        ip: '192.168.1.1',
        headers: { 'user-agent': 'test-agent' },
      });

      const result = service.identifyUser(mockRequest as any);

      expect(result.identifier).toBe('ip:19216811');
      expect(result.strategy).toBe(UserIdentificationStrategy.IP_FALLBACK);
    });

    it('deve usar estratégia específica quando fornecida', () => {
      const mockRequest = createMockRequest({
        ip: '192.168.1.1',
        headers: { 'user-agent': 'test-agent' },
      });

      const result = service.identifyUser(
        mockRequest as any,
        UserIdentificationStrategy.GLOBAL_LIMIT
      );

      expect(result.identifier).toBe('global:public');
      expect(result.strategy).toBe(UserIdentificationStrategy.GLOBAL_LIMIT);
    });
  });
});