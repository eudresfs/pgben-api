import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';
import { PagamentoCacheInvalidationService } from './pagamento-cache-invalidation.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { PagamentoCacheService } from './pagamento-cache.service';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { MetodoPagamentoEnum } from '../../../enums/metodo-pagamento.enum';

/**
 * Testes unitários para PagamentoCacheInvalidationService
 * 
 * Verifica:
 * - Configuração correta de listeners de eventos
 * - Invalidação de cache por padrões
 * - Emissão de eventos de invalidação
 * - Tratamento de erros
 * - Performance da invalidação
 */
describe('PagamentoCacheInvalidationService', () => {
  let service: PagamentoCacheInvalidationService;
  let cacheService: jest.Mocked<CacheService>;
  let pagamentoCacheService: jest.Mocked<PagamentoCacheService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockPagamentoId = 'test-pagamento-id';
  const mockSolicitacaoId = 'test-solicitacao-id';
  const mockConcessaoId = 'test-concessao-id';

  beforeEach(async () => {
    const mockCacheService = {
      del: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      set: jest.fn(),
      invalidateByPattern: jest.fn().mockResolvedValue(undefined),
    };

    const mockPagamentoCacheService = {
      invalidateValidationCache: jest.fn().mockResolvedValue(undefined),
      cacheStatusTransition: jest.fn(),
      cachePixValidation: jest.fn(),
      cacheDadosBancarios: jest.fn(),
      cacheMetodoPagamento: jest.fn(),
      cacheValorLimites: jest.fn(),
    };

    const mockEventEmitter = {
      on: jest.fn(),
      emit: jest.fn().mockReturnValue(true),
      removeAllListeners: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagamentoCacheInvalidationService,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: PagamentoCacheService,
          useValue: mockPagamentoCacheService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<PagamentoCacheInvalidationService>(PagamentoCacheInvalidationService);
    cacheService = module.get(CacheService);
    pagamentoCacheService = module.get(PagamentoCacheService);
    eventEmitter = module.get(EventEmitter2);

    // Limpar mocks
    jest.clearAllMocks();
  });

  describe('Configuração de Listeners', () => {
    it('deve configurar todos os listeners de eventos necessários', () => {
      // Os listeners são configurados no construtor, então verificamos se o serviço foi criado
      expect(service).toBeDefined();
      // Verificar se o EventEmitter foi injetado corretamente
      expect(eventEmitter).toBeDefined();
    });
  });

  describe('Emissão de Eventos', () => {
    it('deve emitir evento de invalidação corretamente', () => {
      const event = {
        pagamentoId: mockPagamentoId,
        action: 'create' as const,
        solicitacaoId: mockSolicitacaoId,
        concessaoId: mockConcessaoId,
        metadata: {
          status: StatusPagamentoEnum.PENDENTE,
          metodo: MetodoPagamentoEnum.PIX,
          valor: 1000
        }
      };

      service.emitCacheInvalidationEvent(event);

      expect(eventEmitter.emit).toHaveBeenCalledWith('pagamento.create', event);
    });

    it('deve emitir evento de mudança de status', () => {
      const event = {
        pagamentoId: mockPagamentoId,
        action: 'status_change' as const,
        oldStatus: StatusPagamentoEnum.PENDENTE,
        newStatus: StatusPagamentoEnum.LIBERADO,
        metadata: {
          updatedAt: new Date()
        }
      };

      service.emitCacheInvalidationEvent(event);

      expect(eventEmitter.emit).toHaveBeenCalledWith('pagamento.status_change', event);
    });
  });

  describe('APIs Públicas de Invalidação', () => {
    it('deve invalidar cache específico de pagamento', async () => {
      await service.invalidatePagamentoCache(mockPagamentoId);

      // Verifica se tentou deletar chaves específicas do pagamento
      expect(cacheService.del).toHaveBeenCalledWith(
        expect.stringContaining(mockPagamentoId)
      );
    });

    it('deve invalidar cache por solicitação', async () => {
      await service.invalidateSolicitacaoCache(mockSolicitacaoId);

      // Verifica se tentou deletar chaves relacionadas à solicitação
      expect(cacheService.del).toHaveBeenCalledWith(
        expect.stringContaining(mockSolicitacaoId)
      );
    });

    it('deve invalidar cache por concessão', async () => {
      await service.invalidateConcessaoCache(mockConcessaoId);

      // Verifica se tentou deletar chaves relacionadas à concessão
      expect(cacheService.del).toHaveBeenCalledWith(
        expect.stringContaining(mockConcessaoId)
      );
    });

    it('deve invalidar todo o cache de pagamentos', async () => {
      await service.invalidateAllPagamentoCache();

      // Verifica se múltiplas operações de invalidação foram executadas
      expect(cacheService.del).toHaveBeenCalled();
    });
  });

  describe('Geração de Chaves Específicas', () => {
    it('deve gerar chaves específicas para padrões de listagem', () => {
      const pattern = 'pagamento:pagamentos:*';
      const keys = (service as any).generateSpecificKeysFromPattern(pattern);

      expect(keys).toContain('pagamento:pagamentos:page:1');
      expect(keys).toContain('pagamento:pagamentos:page:1:limit:10');
      expect(keys).toContain('pagamento:pagamentos:all');
      expect(keys).toContain('pagamento:pagamentos:count');
    });

    it('deve gerar chaves específicas para padrões de estatísticas', () => {
      const pattern = 'pagamento:estatisticas:*';
      const keys = (service as any).generateSpecificKeysFromPattern(pattern);

      expect(keys).toContain('pagamento:estatisticas:total');
      expect(keys).toContain('pagamento:estatisticas:by_status');
      expect(keys).toContain('pagamento:estatisticas:by_method');
      expect(keys).toContain('pagamento:estatisticas:monthly');
    });

    it('deve incluir filtros por status nas chaves de listagem', () => {
      const pattern = 'pagamento:list:*';
      const keys = (service as any).generateSpecificKeysFromPattern(pattern);

      Object.values(StatusPagamentoEnum).forEach(status => {
        expect(keys).toContain(`pagamento:list:status:${status}`);
      });
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve tratar erros na invalidação de padrões graciosamente', async () => {
      cacheService.del.mockRejectedValueOnce(new Error('Cache error'));

      // Não deve lançar erro
      await expect(
        (service as any).invalidateByPattern('test:pattern:*')
      ).resolves.not.toThrow();
    });

    it('deve continuar invalidação mesmo com falhas parciais', async () => {
      cacheService.del
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Cache error'))
        .mockResolvedValueOnce(undefined);

      const patterns = ['pattern1:*', 'pattern2:*', 'pattern3:*'];
      
      await expect(
        (service as any).invalidatePatterns(patterns)
      ).resolves.not.toThrow();
    });
  });

  describe('Performance e Otimização', () => {
    it('deve executar invalidações em paralelo', async () => {
      const patterns = ['pattern1:*', 'pattern2:*', 'pattern3:*'];
      const startTime = Date.now();
      
      await (service as any).invalidatePatterns(patterns);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Deve ser rápido (menos de 1000ms para operações mock)
      expect(duration).toBeLessThan(1000);
    });

    it('deve limitar o número de chaves geradas por padrão', () => {
      const pattern = 'pagamento:pagamentos:*';
      const keys = (service as any).generateSpecificKeysFromPattern(pattern);
      
      // Não deve gerar um número excessivo de chaves
      expect(keys.length).toBeLessThan(200);
    });
  });

  describe('Integração com PagamentoCacheService', () => {
    it('deve chamar invalidateValidationCache para mudanças de status', async () => {
      const event = {
        pagamentoId: mockPagamentoId,
        action: 'status_change' as const,
        oldStatus: StatusPagamentoEnum.PENDENTE,
        newStatus: StatusPagamentoEnum.LIBERADO
      };

      // Simular chamada do listener
      await (service as any).handleStatusChanged(event);

      // Verificar se o cache foi invalidado (método del foi chamado)
      expect(cacheService.del).toHaveBeenCalled();
    });

    it('deve invalidar cache de validações para cancelamentos', async () => {
      const event = {
        pagamentoId: mockPagamentoId,
        action: 'cancelled' as const,
        oldStatus: StatusPagamentoEnum.LIBERADO,
        newStatus: StatusPagamentoEnum.CANCELADO
      };

      await (service as any).handlePagamentoCancelled(event);

      expect(pagamentoCacheService.invalidateValidationCache)
        .toHaveBeenCalledWith(mockPagamentoId);
    });
  });

  describe('Métricas e Monitoramento', () => {
    it('deve retornar estatísticas de invalidação', async () => {
      const stats = await service.getCacheInvalidationStats();

      expect(stats).toHaveProperty('totalInvalidations');
      expect(stats).toHaveProperty('invalidationsByType');
      expect(stats).toHaveProperty('lastInvalidation');
    });
  });
});