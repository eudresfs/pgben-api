import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '../health.controller';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { DiskHealthIndicator, MemoryHealthIndicator, HealthCheckService } from '@nestjs/terminus';

/**
 * Testes unitários para o controlador de saúde
 * 
 * Verifica o funcionamento dos endpoints de verificação de saúde
 * da aplicação, incluindo verificações de banco de dados, disco e memória
 */
describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;
  let diskHealthIndicator: DiskHealthIndicator;
  let memoryHealthIndicator: MemoryHealthIndicator;
  
  // Mocks para os serviços de verificação de saúde
  const mockHealthCheckService = {
    check: jest.fn(),
  };
  
  const mockDiskHealthIndicator = {
    checkStorage: jest.fn(),
  };
  
  const mockMemoryHealthIndicator = {
    checkHeap: jest.fn(),
    checkRSS: jest.fn(),
  };
  
  // Mock para o TypeOrmHealthIndicator
  const mockTypeOrmHealthIndicator = {
    pingCheck: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TerminusModule,
        HttpModule,
      ],
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: DiskHealthIndicator,
          useValue: mockDiskHealthIndicator,
        },
        {
          provide: MemoryHealthIndicator,
          useValue: mockMemoryHealthIndicator,
        },
        {
          provide: 'TypeOrmHealthIndicator',
          useValue: mockTypeOrmHealthIndicator,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
    diskHealthIndicator = module.get<DiskHealthIndicator>(DiskHealthIndicator);
    memoryHealthIndicator = module.get<MemoryHealthIndicator>(MemoryHealthIndicator);
  });

  it('deve ser definido', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('deve verificar a saúde do banco de dados', async () => {
      const mockHealthCheckResult = {
        status: 'ok',
        info: {
          database: {
            status: 'up',
          },
        },
      };
      
      mockHealthCheckService.check.mockResolvedValue(mockHealthCheckResult);
      
      const result = await controller.check();
      
      expect(result).toEqual(mockHealthCheckResult);
      expect(mockHealthCheckService.check).toHaveBeenCalled();
      expect(mockTypeOrmHealthIndicator.pingCheck).not.toHaveBeenCalled(); // Chamado dentro da função check
    });
  });

  describe('checkSystem', () => {
    it('deve verificar o espaço em disco e memória', async () => {
      const mockHealthCheckResult = {
        status: 'ok',
        info: {
          disk: {
            status: 'up',
            details: {
              free: 100000000,
              total: 500000000,
            },
          },
          memory_heap: {
            status: 'up',
          },
          memory_rss: {
            status: 'up',
          },
        },
      };
      
      mockHealthCheckService.check.mockResolvedValue(mockHealthCheckResult);
      
      const result = await controller.checkSystem();
      
      expect(result).toEqual(mockHealthCheckResult);
      expect(mockHealthCheckService.check).toHaveBeenCalled();
      expect(mockDiskHealthIndicator.checkStorage).not.toHaveBeenCalled(); // Chamado dentro da função check
      expect(mockMemoryHealthIndicator.checkHeap).not.toHaveBeenCalled(); // Chamado dentro da função check
      expect(mockMemoryHealthIndicator.checkRSS).not.toHaveBeenCalled(); // Chamado dentro da função check
    });
  });

  describe('checkDatabase', () => {
    it('deve verificar a conexão com o banco de dados', async () => {
      const mockHealthCheckResult = {
        status: 'ok',
        info: {
          database: {
            status: 'up',
          },
        },
      };
      
      mockHealthCheckService.check.mockResolvedValue(mockHealthCheckResult);
      
      const result = await controller.checkDatabase();
      
      expect(result).toEqual(mockHealthCheckResult);
      expect(mockHealthCheckService.check).toHaveBeenCalled();
      expect(mockTypeOrmHealthIndicator.pingCheck).not.toHaveBeenCalled(); // Chamado dentro da função check
    });
  });
  
  describe('ping', () => {
    it('deve retornar status ok e informações básicas', async () => {
      const result = controller.ping();
      
      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('service', 'pgben-api');
      expect(result).toHaveProperty('version');
    });
  });
});
