import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from '../metrics.controller';
import { MetricsService } from '../metrics.service';
import { Response } from 'express';

/**
 * Testes unitários para o controlador de métricas
 * 
 * Verifica o funcionamento do endpoint que expõe as métricas
 * da aplicação para o Prometheus
 */
describe('MetricsController', () => {
  let controller: MetricsController;
  let metricsService: MetricsService;
  
  // Mock do serviço de métricas
  const mockMetricsService = {
    getMetrics: jest.fn().mockResolvedValue('metrics_data'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
    metricsService = module.get<MetricsService>(MetricsService);
  });

  it('deve ser definido', () => {
    expect(controller).toBeDefined();
  });

  describe('getMetrics', () => {
    it('deve retornar as métricas no formato correto', async () => {
      // Mock da resposta
      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;
      
      await controller.getMetrics(mockResponse);
      
      expect(metricsService.getMetrics).toHaveBeenCalled();
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
      expect(mockResponse.send).toHaveBeenCalledWith('metrics_data');
    });
  });
});
