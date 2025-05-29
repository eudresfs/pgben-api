const axios = require('axios');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

/**
 * Script de Teste de Carga para Validação de Resiliência
 * 
 * Este script testa a resiliência do sistema SEMTAS sob diferentes cenários de carga,
 * incluindo cache, auditoria e fallbacks.
 */

class ResilienceLoadTester {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:3000';
    this.concurrency = config.concurrency || 10;
    this.duration = config.duration || 60000; // 1 minuto
    this.testResults = {
      cache: [],
      auditoria: [],
      api: [],
      errors: [],
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0
      }
    };
    this.isRunning = false;
    this.startTime = null;
  }

  /**
   * Executa teste de carga no cache
   */
  async testCache() {
    const testData = {
      key: `test-key-${Date.now()}-${Math.random()}`,
      value: { data: 'test-data', timestamp: Date.now() },
      ttl: 300
    };

    const start = performance.now();
    
    try {
      // Teste de escrita no cache
      const writeResponse = await axios.post(`${this.baseUrl}/api/resilience/cache`, testData, {
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' }
      });

      // Teste de leitura do cache
      const readResponse = await axios.get(`${this.baseUrl}/api/resilience/cache/${testData.key}`, {
        timeout: 5000
      });

      const duration = performance.now() - start;
      
      this.testResults.cache.push({
        timestamp: Date.now(),
        duration,
        success: true,
        operation: 'write-read',
        cacheHit: readResponse.data?.hit || false
      });

      return { success: true, duration };
    } catch (error) {
      const duration = performance.now() - start;
      
      this.testResults.cache.push({
        timestamp: Date.now(),
        duration,
        success: false,
        operation: 'write-read',
        error: error.message
      });

      this.testResults.errors.push({
        timestamp: Date.now(),
        type: 'cache',
        error: error.message,
        stack: error.stack
      });

      return { success: false, duration, error: error.message };
    }
  }

  /**
   * Executa teste de carga na auditoria
   */
  async testAuditoria() {
    const auditData = {
      acao: 'TESTE_CARGA',
      recurso: 'load-test',
      detalhes: {
        timestamp: Date.now(),
        testId: Math.random().toString(36).substr(2, 9)
      },
      dadosSensiveis: {
        cpf: '123.456.789-00',
        nome: 'Teste de Carga'
      }
    };

    const start = performance.now();
    
    try {
      const response = await axios.post(`${this.baseUrl}/api/resilience/auditoria`, auditData, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });

      const duration = performance.now() - start;
      
      this.testResults.auditoria.push({
        timestamp: Date.now(),
        duration,
        success: true,
        method: response.data?.method || 'unknown'
      });

      return { success: true, duration };
    } catch (error) {
      const duration = performance.now() - start;
      
      this.testResults.auditoria.push({
        timestamp: Date.now(),
        duration,
        success: false,
        error: error.message
      });

      this.testResults.errors.push({
        timestamp: Date.now(),
        type: 'auditoria',
        error: error.message,
        stack: error.stack
      });

      return { success: false, duration, error: error.message };
    }
  }

  /**
   * Executa teste de carga na API principal
   */
  async testApi() {
    const endpoints = [
      '/api/health',
      '/api/resilience/status',
      '/api/resilience/metrics/cache',
      '/api/resilience/metrics/auditoria'
    ];

    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const start = performance.now();
    
    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        timeout: 5000
      });

      const duration = performance.now() - start;
      
      this.testResults.api.push({
        timestamp: Date.now(),
        duration,
        success: true,
        endpoint,
        statusCode: response.status
      });

      return { success: true, duration };
    } catch (error) {
      const duration = performance.now() - start;
      
      this.testResults.api.push({
        timestamp: Date.now(),
        duration,
        success: false,
        endpoint,
        error: error.message,
        statusCode: error.response?.status
      });

      this.testResults.errors.push({
        timestamp: Date.now(),
        type: 'api',
        endpoint,
        error: error.message,
        stack: error.stack
      });

      return { success: false, duration, error: error.message };
    }
  }

  /**
   * Executa um worker de teste
   */
  async runWorker(workerId) {
    console.log(`Worker ${workerId} iniciado`);
    
    while (this.isRunning) {
      const testType = Math.random();
      let result;

      if (testType < 0.4) {
        // 40% cache
        result = await this.testCache();
      } else if (testType < 0.7) {
        // 30% auditoria
        result = await this.testAuditoria();
      } else {
        // 30% API
        result = await this.testApi();
      }

      this.testResults.metrics.totalRequests++;
      
      if (result.success) {
        this.testResults.metrics.successfulRequests++;
      } else {
        this.testResults.metrics.failedRequests++;
      }

      // Pequena pausa para evitar sobrecarga
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    }
    
    console.log(`Worker ${workerId} finalizado`);
  }

  /**
   * Calcula métricas finais
   */
  calculateMetrics() {
    const allDurations = [
      ...this.testResults.cache.map(r => r.duration),
      ...this.testResults.auditoria.map(r => r.duration),
      ...this.testResults.api.map(r => r.duration)
    ].sort((a, b) => a - b);

    if (allDurations.length > 0) {
      this.testResults.metrics.averageResponseTime = 
        allDurations.reduce((sum, duration) => sum + duration, 0) / allDurations.length;
      
      this.testResults.metrics.p95ResponseTime = 
        allDurations[Math.floor(allDurations.length * 0.95)];
      
      this.testResults.metrics.p99ResponseTime = 
        allDurations[Math.floor(allDurations.length * 0.99)];
    }

    // Métricas específicas por tipo
    this.testResults.metrics.cache = {
      total: this.testResults.cache.length,
      successful: this.testResults.cache.filter(r => r.success).length,
      failed: this.testResults.cache.filter(r => !r.success).length,
      hitRate: this.testResults.cache.filter(r => r.cacheHit).length / this.testResults.cache.length
    };

    this.testResults.metrics.auditoria = {
      total: this.testResults.auditoria.length,
      successful: this.testResults.auditoria.filter(r => r.success).length,
      failed: this.testResults.auditoria.filter(r => !r.success).length
    };

    this.testResults.metrics.api = {
      total: this.testResults.api.length,
      successful: this.testResults.api.filter(r => r.success).length,
      failed: this.testResults.api.filter(r => !r.success).length
    };
  }

  /**
   * Gera relatório de teste
   */
  generateReport() {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;
    
    const report = {
      testConfig: {
        baseUrl: this.baseUrl,
        concurrency: this.concurrency,
        duration: this.duration,
        actualDuration: totalDuration
      },
      summary: {
        totalRequests: this.testResults.metrics.totalRequests,
        successfulRequests: this.testResults.metrics.successfulRequests,
        failedRequests: this.testResults.metrics.failedRequests,
        successRate: (this.testResults.metrics.successfulRequests / this.testResults.metrics.totalRequests * 100).toFixed(2) + '%',
        requestsPerSecond: (this.testResults.metrics.totalRequests / (totalDuration / 1000)).toFixed(2),
        averageResponseTime: this.testResults.metrics.averageResponseTime?.toFixed(2) + 'ms',
        p95ResponseTime: this.testResults.metrics.p95ResponseTime?.toFixed(2) + 'ms',
        p99ResponseTime: this.testResults.metrics.p99ResponseTime?.toFixed(2) + 'ms'
      },
      byComponent: {
        cache: this.testResults.metrics.cache,
        auditoria: this.testResults.metrics.auditoria,
        api: this.testResults.metrics.api
      },
      errors: {
        total: this.testResults.errors.length,
        byType: this.testResults.errors.reduce((acc, error) => {
          acc[error.type] = (acc[error.type] || 0) + 1;
          return acc;
        }, {}),
        samples: this.testResults.errors.slice(0, 10) // Primeiros 10 erros
      },
      timestamp: new Date().toISOString()
    };

    return report;
  }

  /**
   * Salva relatório em arquivo
   */
  async saveReport(report) {
    const reportsDir = path.join(__dirname, '..', 'reports');
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filename = `resilience-load-test-${Date.now()}.json`;
    const filepath = path.join(reportsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    
    console.log(`\n📊 Relatório salvo em: ${filepath}`);
    return filepath;
  }

  /**
   * Executa o teste de carga
   */
  async run() {
    console.log('🚀 Iniciando teste de carga de resiliência...');
    console.log(`📊 Configuração:`);
    console.log(`   - URL Base: ${this.baseUrl}`);
    console.log(`   - Concorrência: ${this.concurrency}`);
    console.log(`   - Duração: ${this.duration}ms`);
    console.log('');

    this.isRunning = true;
    this.startTime = Date.now();

    // Inicia workers concorrentes
    const workers = [];
    for (let i = 0; i < this.concurrency; i++) {
      workers.push(this.runWorker(i + 1));
    }

    // Para o teste após a duração especificada
    setTimeout(() => {
      this.isRunning = false;
      console.log('\n⏰ Tempo de teste esgotado, finalizando...');
    }, this.duration);

    // Aguarda todos os workers terminarem
    await Promise.all(workers);

    // Calcula métricas e gera relatório
    this.calculateMetrics();
    const report = this.generateReport();
    
    console.log('\n📈 RESULTADOS DO TESTE DE CARGA:');
    console.log('================================');
    console.log(`Total de Requests: ${report.summary.totalRequests}`);
    console.log(`Taxa de Sucesso: ${report.summary.successRate}`);
    console.log(`Requests/segundo: ${report.summary.requestsPerSecond}`);
    console.log(`Tempo Médio: ${report.summary.averageResponseTime}`);
    console.log(`P95: ${report.summary.p95ResponseTime}`);
    console.log(`P99: ${report.summary.p99ResponseTime}`);
    console.log('');
    console.log('📊 Por Componente:');
    console.log(`Cache: ${report.byComponent.cache.successful}/${report.byComponent.cache.total} (Hit Rate: ${(report.byComponent.cache.hitRate * 100).toFixed(1)}%)`);
    console.log(`Auditoria: ${report.byComponent.auditoria.successful}/${report.byComponent.auditoria.total}`);
    console.log(`API: ${report.byComponent.api.successful}/${report.byComponent.api.total}`);
    
    if (report.errors.total > 0) {
      console.log('');
      console.log('❌ Erros:');
      console.log(`Total: ${report.errors.total}`);
      Object.entries(report.errors.byType).forEach(([type, count]) => {
        console.log(`${type}: ${count}`);
      });
    }

    await this.saveReport(report);
    
    return report;
  }
}

// Execução do script
if (require.main === module) {
  const config = {
    baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
    concurrency: parseInt(process.env.TEST_CONCURRENCY) || 10,
    duration: parseInt(process.env.TEST_DURATION) || 60000
  };

  const tester = new ResilienceLoadTester(config);
  
  tester.run()
    .then(() => {
      console.log('\n✅ Teste de carga concluído com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro durante o teste de carga:', error);
      process.exit(1);
    });
}

module.exports = ResilienceLoadTester;