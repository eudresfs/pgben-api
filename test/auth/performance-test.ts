import * as autocannon from 'autocannon';
import { writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Testes de carga e performance para o sistema de autenticação e autorização
 * 
 * Este script executa testes de carga nos endpoints de autenticação e autorização
 * para analisar o impacto do tamanho do JWT e a eficácia do cache.
 */

// Configuração dos testes
const BASE_URL = 'http://localhost:3000';
const DURATION = 30; // duração em segundos
const CONNECTIONS = 100; // número de conexões simultâneas
const PIPELINING = 10; // número de requisições por conexão

// Token de acesso para os testes (será preenchido durante a execução)
let accessToken = '';

/**
 * Executa um teste de carga em um endpoint específico
 * 
 * @param title Título do teste
 * @param url URL do endpoint
 * @param method Método HTTP
 * @param headers Cabeçalhos HTTP
 * @param body Corpo da requisição
 * @returns Resultado do teste
 */
async function runLoadTest(
  title: string,
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  headers: Record<string, string> = {},
  body?: Record<string, any>,
) {
  console.log(`Iniciando teste: ${title}`);
  
  const instance = autocannon({
    url,
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    connections: CONNECTIONS,
    pipelining: PIPELINING,
    duration: DURATION,
    title,
  });
  
  return new Promise<autocannon.Result>((resolve) => {
    autocannon.track(instance, { renderProgressBar: true });
    
    instance.on('done', (result) => {
      console.log(`Teste concluído: ${title}`);
      console.log(`Latência média: ${result.latency.average} ms`);
      console.log(`Requisições por segundo: ${result.requests.average}`);
      console.log(`Throughput: ${result.throughput.average} bytes/seg`);
      console.log('-----------------------------------');
      
      resolve(result);
    });
  });
}

/**
 * Autenticar e obter um token de acesso
 */
async function authenticate() {
  const response = await fetch(`${BASE_URL}/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: 'test@example.com',
      password: 'password123',
    }),
  });
  
  if (!response.ok) {
    throw new Error('Falha na autenticação');
  }
  
  const data = await response.json();
  accessToken = data.accessToken;
  
  console.log('Autenticação bem-sucedida');
  console.log(`Tamanho do token: ${accessToken.length} caracteres`);
  
  // Analisar o tamanho do payload do token
  const [, payload] = accessToken.split('.');
  const decodedPayload = Buffer.from(payload, 'base64').toString('utf8');
  const payloadSize = Buffer.byteLength(decodedPayload, 'utf8');
  
  console.log(`Tamanho do payload: ${payloadSize} bytes`);
  console.log(`Conteúdo do payload: ${decodedPayload}`);
}

/**
 * Executa todos os testes de carga
 */
async function runAllTests() {
  try {
    // Autenticar primeiro
    await authenticate();
    
    const results: Record<string, autocannon.Result> = {};
    
    // Teste 1: Endpoint de autenticação
    results.auth = await runLoadTest(
      'Autenticação',
      `${BASE_URL}/v1/auth/login`,
      'POST',
      { 'Content-Type': 'application/json' },
      { username: 'test@example.com', password: 'password123' },
    );
    
    // Teste 2: Endpoint protegido com permissão global
    results.protectedGlobal = await runLoadTest(
      'Endpoint protegido (permissão global)',
      `${BASE_URL}/v1/users`,
      'GET',
      { 
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    );
    
    // Teste 3: Endpoint de verificação de permissão (primeira chamada, sem cache)
    results.permissionCheckNoCache = await runLoadTest(
      'Verificação de permissão (sem cache)',
      `${BASE_URL}/v1/permissions/test`,
      'POST',
      { 
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        permissionName: 'usuario.visualizar',
        scopeType: 'GLOBAL',
      },
    );
    
    // Teste 4: Endpoint de verificação de permissão (segunda chamada, com cache)
    results.permissionCheckWithCache = await runLoadTest(
      'Verificação de permissão (com cache)',
      `${BASE_URL}/v1/permissions/test`,
      'POST',
      { 
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        permissionName: 'usuario.visualizar',
        scopeType: 'GLOBAL',
      },
    );
    
    // Salvar os resultados em um arquivo JSON
    const resultsPath = join(__dirname, 'performance-results.json');
    writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`Resultados salvos em: ${resultsPath}`);
    
    // Gerar relatório de análise
    generateReport(results);
    
  } catch (error) {
    console.error('Erro ao executar os testes:', error);
  }
}

/**
 * Gera um relatório de análise dos resultados
 * 
 * @param results Resultados dos testes
 */
function generateReport(results: Record<string, autocannon.Result>) {
  const report = {
    summary: {
      date: new Date().toISOString(),
      environment: 'Desenvolvimento',
      duration: DURATION,
      connections: CONNECTIONS,
    },
    tests: Object.entries(results).map(([name, result]) => ({
      name,
      latencyAvg: result.latency.average,
      latencyP99: result.latency.p99,
      requestsPerSecond: result.requests.average,
      throughput: result.throughput.average,
      errors: result.errors,
      timeouts: result.timeouts,
      non2xx: result.non2xx,
    })),
    analysis: {
      cacheEffectiveness: calculateCacheEffectiveness(
        results.permissionCheckNoCache,
        results.permissionCheckWithCache,
      ),
      jwtImpact: calculateJwtImpact(results.auth, results.protectedGlobal),
    },
    recommendations: [],
  };
  
  // Adicionar recomendações com base na análise
  if (report.analysis.cacheEffectiveness < 30) {
    report.recommendations.push(
      'O cache de permissões não está sendo eficaz. Considere aumentar o TTL ou verificar a implementação.'
    );
  }
  
  if (report.analysis.jwtImpact > 20) {
    report.recommendations.push(
      'O tamanho do JWT está impactando significativamente a performance. Considere reduzir o tamanho do payload.'
    );
  }
  
  // Salvar o relatório em um arquivo
  const reportPath = join(__dirname, 'performance-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Relatório salvo em: ${reportPath}`);
  
  // Exibir recomendações
  console.log('\nRecomendações:');
  report.recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec}`);
  });
}

/**
 * Calcula a efetividade do cache
 * 
 * @param noCacheResult Resultado sem cache
 * @param withCacheResult Resultado com cache
 * @returns Percentual de melhoria
 */
function calculateCacheEffectiveness(
  noCacheResult: autocannon.Result,
  withCacheResult: autocannon.Result,
): number {
  const noCacheLatency = noCacheResult.latency.average;
  const withCacheLatency = withCacheResult.latency.average;
  
  return Math.round(((noCacheLatency - withCacheLatency) / noCacheLatency) * 100);
}

/**
 * Calcula o impacto do tamanho do JWT na performance
 * 
 * @param authResult Resultado da autenticação
 * @param protectedResult Resultado do endpoint protegido
 * @returns Percentual de impacto
 */
function calculateJwtImpact(
  authResult: autocannon.Result,
  protectedResult: autocannon.Result,
): number {
  const authLatency = authResult.latency.average;
  const protectedLatency = protectedResult.latency.average;
  
  return Math.round(((protectedLatency - authLatency) / authLatency) * 100);
}

// Executar os testes
runAllTests();
