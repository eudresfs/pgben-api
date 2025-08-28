import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';

/**
 * Health Check específico para monitorar a performance dos filtros avançados
 * 
 * Funcionalidades:
 * - Verifica performance de queries básicas
 * - Monitora uso de índices
 * - Verifica cache hit ratio
 * - Detecta queries lentas
 * - Monitora bloat das tabelas
 */
@Injectable()
export class FiltrosAvancadosHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(FiltrosAvancadosHealthIndicator.name);
  
  // Thresholds para consideração de saúde
  private readonly THRESHOLDS = {
    maxQueryTime: 500, // ms
    minCacheHitRatio: 95, // %
    maxDeadTuplePercent: 20, // %
    minIndexUsagePercent: 80, // %
    maxUnusedIndexes: 5, // quantidade
  };

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  /**
   * Executa o health check completo dos filtros avançados
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const startTime = Date.now();
      
      // Executar todas as verificações
      const [
        queryPerformance,
        indexUsage,
        cacheHitRatio,
        tableHealth,
        unusedIndexes,
      ] = await Promise.all([
        this.checkQueryPerformance(),
        this.checkIndexUsage(),
        this.checkCacheHitRatio(),
        this.checkTableHealth(),
        this.checkUnusedIndexes(),
      ]);
      
      const totalTime = Date.now() - startTime;
      
      // Determinar status geral
      const issues = [];
      let status = 'up';
      
      if (queryPerformance.avgTime > this.THRESHOLDS.maxQueryTime) {
        issues.push(`Queries lentas detectadas (${queryPerformance.avgTime}ms)`);
        status = 'down';
      }
      
      if (cacheHitRatio.ratio < this.THRESHOLDS.minCacheHitRatio) {
        issues.push(`Cache hit ratio baixo (${cacheHitRatio.ratio}%)`);
        status = 'down';
      }
      
      if (tableHealth.maxDeadTuplePercent > this.THRESHOLDS.maxDeadTuplePercent) {
        issues.push(`Alto percentual de tuplas mortas (${tableHealth.maxDeadTuplePercent}%)`);
        status = 'degraded';
      }
      
      if (indexUsage.avgUsagePercent < this.THRESHOLDS.minIndexUsagePercent) {
        issues.push(`Baixo uso de índices (${indexUsage.avgUsagePercent}%)`);
        status = 'degraded';
      }
      
      if (unusedIndexes.count > this.THRESHOLDS.maxUnusedIndexes) {
        issues.push(`Muitos índices não utilizados (${unusedIndexes.count})`);
        status = 'degraded';
      }
      
      const result = {
        status,
        totalCheckTime: totalTime,
        queryPerformance,
        indexUsage,
        cacheHitRatio,
        tableHealth,
        unusedIndexes,
        issues,
        timestamp: new Date().toISOString(),
        thresholds: this.THRESHOLDS,
      };
      
      if (status === 'down') {
        throw new HealthCheckError(
          'Filtros Avançados Health Check Failed',
          this.getStatus(key, false, result),
        );
      }
      
      if (status === 'degraded') {
        this.logger.warn(
          `Filtros Avançados Health Check - Performance Degradada: ${issues.join(', ')}`,
        );
      }
      
      return this.getStatus(key, true, result);
    } catch (error) {
      this.logger.error(
        `Erro no health check dos filtros avançados: ${error.message}`,
        error.stack,
      );
      
      throw new HealthCheckError(
        'Filtros Avançados Health Check Failed',
        this.getStatus(key, false, {
          error: error.message,
          timestamp: new Date().toISOString(),
        }),
      );
    }
  }

  /**
   * Verifica a performance das queries principais
   */
  private async checkQueryPerformance(): Promise<{
    avgTime: number;
    slowQueries: number;
    totalQueries: number;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total_queries,
        AVG(mean_time) as avg_time,
        COUNT(CASE WHEN mean_time > $1 THEN 1 END) as slow_queries
      FROM pg_stat_statements 
      WHERE query LIKE '%solicitacao%' 
         OR query LIKE '%cidadao%' 
         OR query LIKE '%usuario%' 
         OR query LIKE '%pagamento%'
         OR query LIKE '%beneficio%'
         OR query LIKE '%unidade%'
         OR query LIKE '%auditoria%'
         OR query LIKE '%documento%'
    `;
    
    try {
      const result = await this.dataSource.query(query, [this.THRESHOLDS.maxQueryTime]);
      const row = result[0];
      
      return {
        avgTime: parseFloat(row.avg_time) || 0,
        slowQueries: parseInt(row.slow_queries) || 0,
        totalQueries: parseInt(row.total_queries) || 0,
      };
    } catch (error) {
      // Se pg_stat_statements não estiver disponível, fazer um teste básico
      const startTime = Date.now();
      await this.dataSource.query('SELECT COUNT(*) FROM solicitacao LIMIT 1');
      const testTime = Date.now() - startTime;
      
      return {
        avgTime: testTime,
        slowQueries: testTime > this.THRESHOLDS.maxQueryTime ? 1 : 0,
        totalQueries: 1,
      };
    }
  }

  /**
   * Verifica o uso dos índices
   */
  private async checkIndexUsage(): Promise<{
    avgUsagePercent: number;
    totalIndexes: number;
    activeIndexes: number;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total_indexes,
        COUNT(CASE WHEN idx_scan > 0 THEN 1 END) as active_indexes,
        AVG(
          CASE 
            WHEN seq_scan + idx_scan > 0 THEN 
              (idx_scan::numeric / (seq_scan + idx_scan)::numeric) * 100
            ELSE 0 
          END
        ) as avg_usage_percent
      FROM pg_stat_user_indexes psi
      JOIN pg_stat_user_tables pst ON psi.relid = pst.relid
      WHERE psi.schemaname = 'public'
        AND psi.indexname LIKE 'idx_%'
        AND pst.tablename IN (
          'solicitacao', 'cidadao', 'usuario', 'pagamento',
          'beneficio', 'unidade', 'auditoria', 'documento'
        )
    `;
    
    const result = await this.dataSource.query(query);
    const row = result[0];
    
    return {
      avgUsagePercent: parseFloat(row.avg_usage_percent) || 0,
      totalIndexes: parseInt(row.total_indexes) || 0,
      activeIndexes: parseInt(row.active_indexes) || 0,
    };
  }

  /**
   * Verifica o cache hit ratio
   */
  private async checkCacheHitRatio(): Promise<{
    ratio: number;
    heapHits: number;
    heapReads: number;
  }> {
    const query = `
      SELECT 
        SUM(heap_blks_hit) as heap_hits,
        SUM(heap_blks_read) as heap_reads,
        CASE 
          WHEN SUM(heap_blks_hit + heap_blks_read) > 0 THEN 
            (SUM(heap_blks_hit)::numeric / SUM(heap_blks_hit + heap_blks_read)::numeric) * 100
          ELSE 0 
        END as cache_hit_ratio
      FROM pg_statio_user_tables
      WHERE schemaname = 'public'
        AND tablename IN (
          'solicitacao', 'cidadao', 'usuario', 'pagamento',
          'beneficio', 'unidade', 'auditoria', 'documento'
        )
    `;
    
    const result = await this.dataSource.query(query);
    const row = result[0];
    
    return {
      ratio: parseFloat(row.cache_hit_ratio) || 0,
      heapHits: parseInt(row.heap_hits) || 0,
      heapReads: parseInt(row.heap_reads) || 0,
    };
  }

  /**
   * Verifica a saúde das tabelas (bloat, tuplas mortas)
   */
  private async checkTableHealth(): Promise<{
    maxDeadTuplePercent: number;
    tablesNeedingVacuum: string[];
    totalTables: number;
  }> {
    const query = `
      SELECT 
        tablename,
        n_live_tup,
        n_dead_tup,
        CASE 
          WHEN n_live_tup > 0 THEN 
            (n_dead_tup::numeric / n_live_tup::numeric) * 100
          ELSE 0 
        END as dead_tuple_percent
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
        AND tablename IN (
          'solicitacao', 'cidadao', 'usuario', 'pagamento',
          'beneficio', 'unidade', 'auditoria', 'documento'
        )
    `;
    
    const result = await this.dataSource.query(query);
    
    let maxDeadTuplePercent = 0;
    const tablesNeedingVacuum: string[] = [];
    
    result.forEach((row: any) => {
      const deadPercent = parseFloat(row.dead_tuple_percent) || 0;
      
      if (deadPercent > maxDeadTuplePercent) {
        maxDeadTuplePercent = deadPercent;
      }
      
      if (deadPercent > this.THRESHOLDS.maxDeadTuplePercent) {
        tablesNeedingVacuum.push(row.tablename);
      }
    });
    
    return {
      maxDeadTuplePercent,
      tablesNeedingVacuum,
      totalTables: result.length,
    };
  }

  /**
   * Verifica índices não utilizados
   */
  private async checkUnusedIndexes(): Promise<{
    count: number;
    indexes: string[];
    totalSize: string;
  }> {
    const query = `
      SELECT 
        indexname,
        pg_size_pretty(pg_relation_size(indexname::regclass)) as size
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
        AND indexname LIKE 'idx_%'
        AND idx_scan = 0
        AND tablename IN (
          'solicitacao', 'cidadao', 'usuario', 'pagamento',
          'beneficio', 'unidade', 'auditoria', 'documento'
        )
      ORDER BY pg_relation_size(indexname::regclass) DESC
    `;
    
    const result = await this.dataSource.query(query);
    
    // Calcular tamanho total dos índices não utilizados
    const sizeQuery = `
      SELECT 
        pg_size_pretty(SUM(pg_relation_size(indexname::regclass))) as total_size
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
        AND indexname LIKE 'idx_%'
        AND idx_scan = 0
        AND tablename IN (
          'solicitacao', 'cidadao', 'usuario', 'pagamento',
          'beneficio', 'unidade', 'auditoria', 'documento'
        )
    `;
    
    const sizeResult = await this.dataSource.query(sizeQuery);
    
    return {
      count: result.length,
      indexes: result.map((row: any) => `${row.indexname} (${row.size})`),
      totalSize: sizeResult[0]?.total_size || '0 bytes',
    };
  }

  /**
   * Executa um health check rápido (apenas queries básicas)
   */
  async quickCheck(key: string): Promise<HealthIndicatorResult> {
    try {
      const startTime = Date.now();
      
      // Teste básico de conectividade e performance
      await Promise.all([
        this.dataSource.query('SELECT 1'),
        this.dataSource.query('SELECT COUNT(*) FROM solicitacao LIMIT 1'),
        this.dataSource.query('SELECT COUNT(*) FROM cidadao LIMIT 1'),
        this.dataSource.query('SELECT COUNT(*) FROM usuario LIMIT 1'),
      ]);
      
      const totalTime = Date.now() - startTime;
      
      const result = {
        status: totalTime < this.THRESHOLDS.maxQueryTime ? 'up' : 'down',
        quickCheckTime: totalTime,
        timestamp: new Date().toISOString(),
      };
      
      if (totalTime >= this.THRESHOLDS.maxQueryTime) {
        throw new HealthCheckError(
          'Filtros Avançados Quick Check Failed',
          this.getStatus(key, false, result),
        );
      }
      
      return this.getStatus(key, true, result);
    } catch (error) {
      throw new HealthCheckError(
        'Filtros Avançados Quick Check Failed',
        this.getStatus(key, false, {
          error: error.message,
          timestamp: new Date().toISOString(),
        }),
      );
    }
  }

  /**
   * Obtém métricas detalhadas para dashboard
   */
  async getDetailedMetrics(): Promise<any> {
    try {
      const [queryPerformance, indexUsage, cacheHitRatio, tableHealth] =
        await Promise.all([
          this.checkQueryPerformance(),
          this.checkIndexUsage(),
          this.checkCacheHitRatio(),
          this.checkTableHealth(),
        ]);
      
      // Métricas adicionais
      const tableStatsQuery = `
        SELECT 
          tablename,
          seq_scan,
          idx_scan,
          n_tup_ins + n_tup_upd + n_tup_del as total_writes,
          n_live_tup,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
          AND tablename IN (
            'solicitacao', 'cidadao', 'usuario', 'pagamento',
            'beneficio', 'unidade', 'auditoria', 'documento'
          )
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `;
      
      const tableStats = await this.dataSource.query(tableStatsQuery);
      
      return {
        queryPerformance,
        indexUsage,
        cacheHitRatio,
        tableHealth,
        tableStats,
        timestamp: new Date().toISOString(),
        thresholds: this.THRESHOLDS,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao obter métricas detalhadas: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}

/**
 * Controller para expor métricas de health check
 */
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health/filtros-avancados')
export class FiltrosAvancadosHealthController {
  constructor(
    private readonly healthIndicator: FiltrosAvancadosHealthIndicator,
  ) {}

  @Get('quick')
  @ApiOperation({ summary: 'Health check rápido dos filtros avançados' })
  @ApiResponse({ status: 200, description: 'Sistema saudável' })
  @ApiResponse({ status: 503, description: 'Sistema com problemas' })
  async quickCheck() {
    return this.healthIndicator.quickCheck('filtros-avancados-quick');
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Health check detalhado dos filtros avançados' })
  @ApiResponse({ status: 200, description: 'Métricas detalhadas' })
  async detailedCheck() {
    return this.healthIndicator.isHealthy('filtros-avancados-detailed');
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Métricas detalhadas para dashboard' })
  @ApiResponse({ status: 200, description: 'Métricas coletadas' })
  async getMetrics() {
    return this.healthIndicator.getDetailedMetrics();
  }
}