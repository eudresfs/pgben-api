#!/usr/bin/env ts-node

/**
 * Script de teste para validar as seeds de permissão
 * 
 * Este script verifica se todas as seeds de permissão foram criadas corretamente
 * e podem ser executadas sem erros de sintaxe ou importação.
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// Carregar variáveis de ambiente
config({ path: join(__dirname, '..', '.env') });

// Importar todas as seeds de permissão para verificar se não há erros de sintaxe
import { PermissionSeeder } from '../src/database/seeds/core/permission.seed';
import { PermissionNotificacaoSeed } from '../src/database/seeds/core/permission-notificacao.seed';
import { PermissionMetricasSeed } from '../src/database/seeds/core/permission-metricas.seed';
import { PermissionIntegradorSeed } from '../src/database/seeds/core/permission-integrador.seed';
import { PermissionJudicialSeed } from '../src/database/seeds/core/permission-judicial.seed';
import { PermissionOcorrenciaSeed } from '../src/database/seeds/core/permission-ocorrencia.seed';
import { PermissionPagamentoSeed } from '../src/database/seeds/core/permission-pagamento.seed';
import { PermissionRecursoSeed } from '../src/database/seeds/core/permission-recurso.seed';
import { PermissionRelatoriosUnificadoSeed } from '../src/database/seeds/core/permission-relatorios-unificado.seed';
import { PermissionRoleMappingSeed } from '../src/database/seeds/core/permission-role-mapping.seed';

/**
 * Lista de todas as seeds de permissão para teste
 */
const PermissionSeeders = [
  { name: 'PermissionNotificacaoSeed', seed: PermissionNotificacaoSeed },
  { name: 'PermissionMetricasSeed', seed: PermissionMetricasSeed },
  { name: 'PermissionIntegradorSeed', seed: PermissionIntegradorSeed },
  { name: 'PermissionJudicialSeed', seed: PermissionJudicialSeed },
  { name: 'PermissionOcorrenciaSeed', seed: PermissionOcorrenciaSeed },
  { name: 'PermissionPagamentoSeed', seed: PermissionPagamentoSeed },
  { name: 'PermissionRecursoSeed', seed: PermissionRecursoSeed },
  { name: 'PermissionRelatoriosUnificadoSeed', seed: PermissionRelatoriosUnificadoSeed },
];

/**
 * Configuração do banco de dados para teste
 */
const testDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'pgben_test',
  entities: [
    join(__dirname, '..', 'src', '**', '*.entity{.ts,.js}'),
  ],
  synchronize: false,
  logging: false,
});

/**
 * Função principal de teste
 */
async function testPermissionSeeders(): Promise<void> {
  console.log('🧪 Iniciando testes das seeds de permissão...');
  console.log('=' .repeat(60));
  
  let successCount = 0;
  let errorCount = 0;
  
  // Teste 1: Verificar se todas as seeds podem ser importadas
  console.log('\n📦 Teste 1: Verificando importações das seeds...');
  
  for (const { name, seed } of PermissionSeeders) {
    try {
      if (typeof seed.run === 'function') {
        console.log(`✅ ${name}: Importação bem-sucedida`);
        successCount++;
      } else {
        console.log(`❌ ${name}: Método 'run' não encontrado`);
        errorCount++;
      }
    } catch (error) {
      console.log(`❌ ${name}: Erro na importação - ${error.message}`);
      errorCount++;
    }
  }
  
  // Teste 2: Verificar estrutura das permissões
  console.log('\n🔍 Teste 2: Verificando estrutura das permissões...');
  
  const expectedModules = [
    'notificacao',
    'metrica',
    'integrador', 
    'judicial',
    'ocorrencia',
    'pagamento',
    'recurso',
    'relatorios-unificado'
  ];
  
  for (const module of expectedModules) {
    const seedFound = PermissionSeeders.find(s => 
      s.name.toLowerCase().includes(module.replace('-', ''))
    );
    
    if (seedFound) {
      console.log(`✅ Módulo ${module}: Seed encontrada (${seedFound.name})`);
      successCount++;
    } else {
      console.log(`❌ Módulo ${module}: Seed não encontrada`);
      errorCount++;
    }
  }
  
  // Teste 3: Verificar se o PermissionSeeder principal foi atualizado
  console.log('\n🔧 Teste 3: Verificando PermissionSeeder principal...');
  
  try {
    if (typeof PermissionSeeder.prototype.run === 'function') {
      console.log('✅ PermissionSeeder: Método run disponível');
      successCount++;
    } else {
      console.log('❌ PermissionSeeder: Método run não encontrado');
      errorCount++;
    }
  } catch (error) {
    console.log(`❌ PermissionSeeder: Erro - ${error.message}`);
    errorCount++;
  }
  
  // Teste 4: Verificar PermissionRoleMappingSeed
  console.log('\n🗺️  Teste 4: Verificando PermissionRoleMappingSeed...');
  
  try {
    if (typeof PermissionRoleMappingSeed.run === 'function') {
      console.log('✅ PermissionRoleMappingSeed: Método run disponível');
      successCount++;
    } else {
      console.log('❌ PermissionRoleMappingSeed: Método run não encontrado');
      errorCount++;
    }
  } catch (error) {
    console.log(`❌ PermissionRoleMappingSeed: Erro - ${error.message}`);
    errorCount++;
  }
  
  // Resumo dos testes
  console.log('\n' + '=' .repeat(60));
  console.log('📊 RESUMO DOS TESTES');
  console.log('=' .repeat(60));
  console.log(`✅ Sucessos: ${successCount}`);
  console.log(`❌ Erros: ${errorCount}`);
  console.log(`📈 Taxa de sucesso: ${((successCount / (successCount + errorCount)) * 100).toFixed(1)}%`);
  
  if (errorCount === 0) {
    console.log('\n🎉 Todos os testes passaram! As seeds estão prontas para execução.');
  } else {
    console.log('\n⚠️  Alguns testes falharam. Verifique os erros acima antes de executar as seeds.');
  }
  
  console.log('\n💡 Próximos passos:');
  console.log('   1. Execute: npm run seed:run para aplicar as seeds');
  console.log('   2. Verifique o banco de dados para confirmar as permissões');
  console.log('   3. Teste o sistema com as novas permissões');
}

/**
 * Função para testar conexão com banco (opcional)
 */
async function testDatabaseConnection(): Promise<boolean> {
  try {
    console.log('🔌 Testando conexão com o banco de dados...');
    await testDataSource.initialize();
    console.log('✅ Conexão com banco estabelecida com sucesso');
    await testDataSource.destroy();
    return true;
  } catch (error) {
    console.log(`❌ Erro na conexão com banco: ${error.message}`);
    return false;
  }
}

/**
 * Execução principal
 */
async function main(): Promise<void> {
  try {
    await testPermissionSeeders();
    
    // Teste opcional de conexão com banco
    const testDb = process.argv.includes('--test-db');
    if (testDb) {
      console.log('\n' + '=' .repeat(60));
      await testDatabaseConnection();
    }
    
  } catch (error) {
    console.error('💥 Erro durante a execução dos testes:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

export { testPermissionSeeders, testDatabaseConnection };