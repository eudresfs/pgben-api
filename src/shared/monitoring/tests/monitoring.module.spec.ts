import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringModule } from '../monitoring.module';
import { HealthController } from '../health.controller';
import { MetricsController } from '../metrics.controller';
import { EnhancedMetricsController } from '../enhanced-metrics.controller';
import { MetricsService } from '../metrics.service';
import { EnhancedMetricsService } from '../enhanced-metrics.service';
import { MetricsInterceptor } from '../metrics.interceptor';
import { EnhancedMetricsInterceptor } from '../enhanced-metrics.interceptor';
import { TerminusModule } from '@nestjs/terminus';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

/**
 * Testes para o MonitoringModule
 * 
 * Verifica se o módulo está configurado corretamente com todos os providers,
 * controladores e exportações necessárias.
 */
describe('MonitoringModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        MonitoringModule,
      ],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  it('deve ser definido', () => {
    expect(module).toBeDefined();
  });

  it('deve fornecer o HealthController', () => {
    const controller = module.get<HealthController>(HealthController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(HealthController);
  });

  it('deve fornecer o MetricsController', () => {
    const controller = module.get<MetricsController>(MetricsController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(MetricsController);
  });

  it('deve fornecer o EnhancedMetricsController', () => {
    const controller = module.get<EnhancedMetricsController>(EnhancedMetricsController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(EnhancedMetricsController);
  });

  it('deve fornecer o MetricsService', () => {
    const service = module.get<MetricsService>(MetricsService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(MetricsService);
  });

  it('deve fornecer o EnhancedMetricsService', () => {
    const service = module.get<EnhancedMetricsService>(EnhancedMetricsService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(EnhancedMetricsService);
  });

  it('deve exportar os serviços de métricas', () => {
    const exportedProviders = module.get('METRICS_SERVICES');
    expect(exportedProviders).toBeDefined();
    expect(Array.isArray(exportedProviders)).toBe(true);
    expect(exportedProviders.length).toBeGreaterThan(0);
  });

  it('deve importar o TerminusModule', () => {
    const terminusModule = module.get(TerminusModule);
    expect(terminusModule).toBeDefined();
  });

  it('deve importar o HttpModule', () => {
    const httpModule = module.get(HttpModule);
    expect(httpModule).toBeDefined();
  });

  it('deve configurar corretamente o ConfigModule', () => {
    const configService = module.get(ConfigService);
    expect(configService).toBeDefined();
    expect(configService).toBeInstanceOf(ConfigService);
  });

  it('deve fornecer o MetricsInterceptor', () => {
    const interceptor = module.get(MetricsInterceptor);
    expect(interceptor).toBeDefined();
    expect(interceptor).toBeInstanceOf(MetricsInterceptor);
  });

  it('deve fornecer o EnhancedMetricsInterceptor', () => {
    const interceptor = module.get(EnhancedMetricsInterceptor);
    expect(interceptor).toBeDefined();
    expect(interceptor).toBeInstanceOf(EnhancedMetricsInterceptor);
  });
});
