import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HttpHealthIndicator,
  TypeOrmHealthIndicator,
  HealthCheck,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../../auth/decorators/public.decorator';
import { ApiTags } from '@nestjs/swagger';

/**
 * Controlador de Health Check
 *
 * Fornece endpoints para verificar a saúde da aplicação
 * e seus componentes (banco de dados, memória, disco, etc.)
 */
@ApiTags('Métricas')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {
    console.log('🔥 DEBUG: HealthController inicializado');
    console.log('🔥 DEBUG: Caminho do controller:', '/health');
  }

  /**
   * Endpoint principal de health check
   * Verifica todos os componentes da aplicação
   */
  @Get()
  @Public()
  @HealthCheck()
  check() {
    console.log('🔥 HEALTH CONTROLLER: check() foi chamado!');
    return this.health.check([
      // Verificar se o banco de dados está funcionando
      () => this.db.pingCheck('database'),

      // Verificar se o site oficial está acessível
      () => this.http.pingCheck('site_oficial', 'https://www.natal.rn.gov.br/'),

      // Verificar uso de memória
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024), // 300MB

      // Verificar uso de disco
      () =>
        this.disk.checkStorage('disk', {
          path: '/',
          thresholdPercent: 0.9, // 90% de uso máximo
        }),
    ]);
  }

  /**
   * Endpoint simplificado para verificações rápidas
   * Retorna apenas status OK se a aplicação estiver funcionando
   */
  @Get('ping')
  @Public()
  ping() {
    console.log('🔥 HEALTH CONTROLLER: ping() foi chamado!');
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'pgben-api',
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  /**
   * Verifica apenas o banco de dados
   */
  @Get('db')
  @Public()
  @HealthCheck()
  checkDatabase() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }

  /**
   * Verifica uso de recursos do sistema
   */
  @Get('system')
  @Public()
  @HealthCheck()
  checkSystem() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
      () =>
        this.disk.checkStorage('disk', {
          path: '/',
          thresholdPercent: 0.9,
        }),
    ]);
  }
}
