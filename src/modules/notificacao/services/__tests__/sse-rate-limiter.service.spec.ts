import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@nestjs-modules/ioredis';
import { SseRateLimiterService } from '../sse-rate-limiter.service';
import { Logger } from '@nestjs/common';

// Mock do Redis
const mockRedis = {
  eval: jest.fn(),
  hgetall: jest.fn(),
  keys: jest.fn(),
  pipeline: jest.fn(() => ({
    hincrby: jest.fn().mockReturnThis(),
    incr: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  })),
  del: jest.fn(),
  sadd: jest.fn(),
  srem: jest.fn(),
  smembers: jest.fn(),
  get: jest.fn(),
};

// Mock do RedisService
const mockRedisService = {
  getOrThrow: jest.fn(() => mockRedis),
};

// Mock do ConfigService
const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: any) => {
    const config = {
      SSE_RATE_LIMIT_DEFAULT: 10,
      SSE_RATE_WINDOW_DEFAULT: 60,
      SSE_RATE_BURST_DEFAULT: 15,
      SSE_RATE_LIMIT_ADMIN: 50,
      SSE_RATE_WINDOW_ADMIN: 60,
      SSE_RATE_BURST_ADMIN: 75,
      SSE_RATE_LIMIT_SYSTEM: 100,
      SSE_RATE_WINDOW_SYSTEM: 60,
      SSE_RATE_BURST_SYSTEM: 150,
      SSE_RATE_LIMIT_PREMIUM: 25,
      SSE_RATE_WINDOW_PREMIUM: 60,
      SSE_RATE_BURST_PREMIUM: 35,
      SSE_RATE_LIMIT_WHITELIST: '127.0.0.1,::1',
    };
    return config[key] || defaultValue;
  }),
};

describe('SseRateLimiterService', () => {
  let service: SseRateLimiterService;
  let configService: ConfigService;
  let redisService: RedisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SseRateLimiterService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SseRateLimiterService>(SseRateLimiterService);
    configService = module.get<ConfigService>(ConfigService);
    redisService = module.get<RedisService>(RedisService);

    // Limpar mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Inicialização', () => {
    it('deve ser definido', () => {
      expect(service).toBeDefined();
    });

    it('deve carregar configurações corretamente', () => {
      expect(configService.get).toHaveBeenCalledWith('SSE_RATE_LIMIT_DEFAULT', 10);
      expect(configService.get).toHaveBeenCalledWith('SSE_RATE_LIMIT_ADMIN', 50);
      expect(configService.get).toHaveBeenCalledWith('SSE_RATE_LIMIT_WHITELIST', '127.0.0.1,::1');
    });
  });

  describe('checkRateLimit', () => {
    it('deve permitir requisição quando dentro do limite', async () => {
      // Mock do script Lua retornando sucesso
      mockRedis.eval.mockResolvedValue([1, 5, 0, 5]); // allowed, remaining, resetTime, currentCount

      const result = await service.checkRateLimit('user:123', 'default');

      expect(result).toEqual({
        allowed: true,
        remaining: 5,
        resetTime: 0,
        limit: 10,
        windowSeconds: 60,
      });
    });

    it('deve bloquear requisição quando limite excedido', async () => {
      // Mock do script Lua retornando bloqueio
      mockRedis.eval.mockResolvedValue([0, 0, 30, 10]); // not allowed, no remaining, reset in 30s

      const result = await service.checkRateLimit('user:123', 'default');

      expect(result).toEqual({
        allowed: false,
        remaining: 0,
        resetTime: 30,
        limit: 10,
        windowSeconds: 60,
      });
    });

    it('deve usar perfil admin corretamente', async () => {
      mockRedis.eval.mockResolvedValue([1, 25, 0, 25]);

      const result = await service.checkRateLimit('admin:456', 'admin');

      expect(result.limit).toBe(50);
      expect(result.allowed).toBe(true);
    });

    it('deve pular rate limiting para IPs na whitelist', async () => {
      const result = await service.checkRateLimit('user:123', 'default', '127.0.0.1');

      expect(result.allowed).toBe(true);
      expect(mockRedis.eval).not.toHaveBeenCalled();
    });

    it('deve retornar permitido em caso de erro (fail-open)', async () => {
      mockRedis.eval.mockRejectedValue(new Error('Redis error'));

      const result = await service.checkRateLimit('user:123', 'default');

      expect(result.allowed).toBe(true);
    });
  });

  describe('getMetrics', () => {
    it('deve retornar métricas corretamente', async () => {
      mockRedis.hgetall.mockResolvedValue({
        total_requests: '100',
        blocked_requests: '10',
        requests_default: '80',
        requests_admin: '20',
      });

      mockRedis.keys.mockResolvedValue([
        'sse:rate_limit:ips:192.168.1.1',
        'sse:rate_limit:ips:192.168.1.2',
      ]);

      const pipeline = {
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, '50'],
          [null, '30'],
        ]),
      };
      mockRedis.pipeline.mockReturnValue(pipeline);

      const metrics = await service.getMetrics(3600);

      expect(metrics).toEqual({
        totalRequests: 100,
        blockedRequests: 10,
        blockRate: 10,
        requestsByProfile: {
          default: 80,
          admin: 20,
          system: 0,
          premium: 0,
        },
        topIPs: [
          { ip: '192.168.1.1', count: 50 },
          { ip: '192.168.1.2', count: 30 },
        ],
      });
    });

    it('deve retornar métricas vazias em caso de erro', async () => {
      mockRedis.hgetall.mockRejectedValue(new Error('Redis error'));

      const metrics = await service.getMetrics();

      expect(metrics).toEqual({
        totalRequests: 0,
        blockedRequests: 0,
        blockRate: 0,
        requestsByProfile: {},
        topIPs: [],
      });
    });
  });

  describe('resetRateLimit', () => {
    it('deve resetar rate limit corretamente', async () => {
      mockRedis.del.mockResolvedValue(1);

      await service.resetRateLimit('user:123', 'default');

      expect(mockRedis.del).toHaveBeenCalledWith('sse:rate_limit:default:user:123');
    });
  });

  describe('Whitelist Management', () => {
    it('deve adicionar IP à whitelist', async () => {
      mockRedis.sadd.mockResolvedValue(1);

      await service.addToWhitelist('192.168.1.100');

      expect(mockRedis.sadd).toHaveBeenCalledWith(
        'sse:rate_limit:whitelist',
        '192.168.1.100',
      );
    });

    it('deve remover IP da whitelist', async () => {
      mockRedis.srem.mockResolvedValue(1);

      await service.removeFromWhitelist('192.168.1.100');

      expect(mockRedis.srem).toHaveBeenCalledWith(
        'sse:rate_limit:whitelist',
        '192.168.1.100',
      );
    });

    it('deve retornar lista de whitelist', async () => {
      const whitelist = await service.getWhitelist();

      expect(whitelist).toContain('127.0.0.1');
      expect(whitelist).toContain('::1');
    });
  });

  describe('Sliding Window Algorithm', () => {
    it('deve usar script Lua para operação atômica', async () => {
      mockRedis.eval.mockResolvedValue([1, 9, 0, 1]);

      await service.checkRateLimit('user:123', 'default');

      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.stringContaining('redis.call'),
        1,
        'sse:rate_limit:default:user:123',
        expect.any(String), // timestamp
        expect.any(String), // window start
        '10', // limit
        '60', // window seconds
        '15', // burst limit
      );
    });

    it('deve calcular janela deslizante corretamente', async () => {
      const now = Date.now();
      const windowSeconds = 60;
      const expectedWindowStart = now - (windowSeconds * 1000);

      mockRedis.eval.mockImplementation((script, numKeys, key, nowStr, windowStartStr) => {
        const actualNow = parseInt(nowStr);
        const actualWindowStart = parseInt(windowStartStr);
        
        expect(actualNow).toBeCloseTo(now, -2); // Tolerância de ~100ms
        expect(actualWindowStart).toBeCloseTo(expectedWindowStart, -2);
        
        return Promise.resolve([1, 9, 0, 1]);
      });

      await service.checkRateLimit('user:123', 'default');
    });
  });

  describe('Perfis de Usuário', () => {
    const profiles = [
      { name: 'default', limit: 10, window: 60, burst: 15 },
      { name: 'admin', limit: 50, window: 60, burst: 75 },
      { name: 'system', limit: 100, window: 60, burst: 150 },
      { name: 'premium', limit: 25, window: 60, burst: 35 },
    ] as const;

    profiles.forEach(({ name, limit, window, burst }) => {
      it(`deve usar configuração correta para perfil ${name}`, async () => {
        mockRedis.eval.mockResolvedValue([1, limit - 1, 0, 1]);

        const result = await service.checkRateLimit('user:123', name);

        expect(result.limit).toBe(limit);
        expect(result.windowSeconds).toBe(window);
        expect(mockRedis.eval).toHaveBeenCalledWith(
          expect.any(String),
          1,
          `sse:rate_limit:${name}:user:123`,
          expect.any(String),
          expect.any(String),
          limit.toString(),
          window.toString(),
          burst.toString(),
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('deve logar erros mas não falhar', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      mockRedis.eval.mockRejectedValue(new Error('Connection failed'));

      const result = await service.checkRateLimit('user:123', 'default');

      expect(result.allowed).toBe(true); // fail-open
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao verificar rate limit'),
      );

      loggerSpy.mockRestore();
    });

    it('deve tratar erro nas métricas graciosamente', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      mockRedis.hgetall.mockRejectedValue(new Error('Redis down'));

      const metrics = await service.getMetrics();

      expect(metrics.totalRequests).toBe(0);
      expect(loggerSpy).toHaveBeenCalled();

      loggerSpy.mockRestore();
    });
  });

  describe('Métricas e Monitoramento', () => {
    it('deve registrar métricas corretamente', async () => {
      mockRedis.eval.mockResolvedValue([1, 9, 0, 1]);
      const pipelineMock = {
        hincrby: jest.fn().mockReturnThis(),
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockRedis.pipeline.mockReturnValue(pipelineMock);

      await service.checkRateLimit('user:123', 'default', '192.168.1.1');

      expect(pipelineMock.hincrby).toHaveBeenCalledWith(
        'sse:rate_limit:metrics',
        'total_requests',
        1,
      );
      expect(pipelineMock.hincrby).toHaveBeenCalledWith(
        'sse:rate_limit:metrics',
        'requests_default',
        1,
      );
      expect(pipelineMock.incr).toHaveBeenCalledWith('sse:rate_limit:ips:192.168.1.1');
    });

    it('deve registrar requisições bloqueadas', async () => {
      mockRedis.eval.mockResolvedValue([0, 0, 30, 10]); // blocked
      const pipelineMock = {
        hincrby: jest.fn().mockReturnThis(),
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockRedis.pipeline.mockReturnValue(pipelineMock);

      await service.checkRateLimit('user:123', 'default');

      expect(pipelineMock.hincrby).toHaveBeenCalledWith(
        'sse:rate_limit:metrics',
        'blocked_requests',
        1,
      );
    });
  });
});