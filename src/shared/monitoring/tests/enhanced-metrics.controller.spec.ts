import { Test, TestingModule } from '@nestjs/testing';
import { EnhancedMetricsController } from '../enhanced-metrics.controller';
import { EnhancedMetricsService } from '../enhanced-metrics.service';
import { Response } from 'express';
import { Public } from '../../../modules/auth/decorators/public.decorator';

/**
 * Testes unitários para o controlador de métricas aprimoradas
 * 
 * Verifica o funcionamento do endpoint que expõe as métricas
 * avançadas da aplicação para o Prometheus, com foco em segurança e compliance LGPD
 */
describe('EnhancedMetricsController', () => {
  let controller: EnhancedMetricsController;
  let metricsService: EnhancedMetricsService;
  
  // Mock do serviço de métricas aprimoradas
  const mockMetricsService = {
    getMetrics: jest.fn().mockResolvedValue('enhanced_metrics_data\nsecurity_metric 1\ndocument_metric 1\nsystem_metric 1'),
    updateMemoryUsage: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnhancedMetricsController],
      providers: [
        {
          provide: EnhancedMetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    controller = module.get<EnhancedMetricsController>(EnhancedMetricsController);
    metricsService = module.get<EnhancedMetricsService>(EnhancedMetricsService);
  });

  it('deve ser definido', () => {
    expect(controller).toBeDefined();
  });

  describe('getMetrics', () => {
    it('deve retornar todas as métricas no formato correto', async () => {
      // Mock da resposta
      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;
      
      await controller.getMetrics(mockResponse);
      
      expect(metricsService.getMetrics).toHaveBeenCalled();
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
      expect(mockResponse.send).toHaveBeenCalledWith('enhanced_metrics_data');
    });
  });

  describe('getSecurityMetrics', () => {
    it('deve retornar as métricas de segurança no formato correto', async () => {
      // Mock da resposta
      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;
      
      // Configurar o mock para retornar métricas de segurança
      mockMetricsService.getMetrics.mockResolvedValueOnce('security_metric 1\nsecurity_metric 2\ndocument_metric 1');
      
      await controller.getSecurityMetrics(mockResponse);
      
      expect(mockMetricsService.getMetrics).toHaveBeenCalled();
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
      expect(mockResponse.send).toHaveBeenCalledWith('security_metric 1\nsecurity_metric 2');
    });
  });

  describe('getDocumentMetrics', () => {
    it('deve retornar as métricas de documentos no formato correto', async () => {
      // Mock da resposta
      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;
      
      // Configurar o mock para retornar métricas de documentos
      mockMetricsService.getMetrics.mockResolvedValueOnce('document_metric 1\ndocument_metric 2\nsecurity_metric 1');
      
      await controller.getDocumentMetrics(mockResponse);
      
      expect(mockMetricsService.getMetrics).toHaveBeenCalled();
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
      expect(mockResponse.send).toHaveBeenCalledWith('document_metric 1\ndocument_metric 2');
    });
  });

  describe('getSystemMetrics', () => {
    it('deve retornar as métricas de sistema no formato correto', async () => {
      // Mock da resposta
      const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;
      
      // Configurar o mock para retornar métricas de sistema
      mockMetricsService.getMetrics.mockResolvedValueOnce('system_metric 1\nsystem_metric 2\nsecurity_metric 1');
      
      await controller.getSystemMetrics(mockResponse);
      
      expect(mockMetricsService.updateMemoryUsage).toHaveBeenCalled();
      expect(mockMetricsService.getMetrics).toHaveBeenCalled();
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
      expect(mockResponse.send).toHaveBeenCalledWith('system_metric 1\nsystem_metric 2');
    });
  });
});
