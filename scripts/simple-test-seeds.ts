/**
 * Script de teste simples para validar as seeds de permissão
 * 
 * Este script verifica apenas se os arquivos existem e podem ser importados
 */

import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Função principal de teste
 */
async function testPermissionSeeds() {
  console.log('🧪 Iniciando teste simples das seeds de permissão...');
  
  let successCount = 0;
  let errorCount = 0;
  
  // Lista de arquivos de seed que devem existir
  const seedFiles = [
    'permission-notificacao.seed.ts',
    'permission-metricas.seed.ts',
    'permission-integrador.seed.ts',
    'permission-judicial.seed.ts',
    'permission-ocorrencia.seed.ts',
    'permission-pagamento.seed.ts',
    'permission-recurso.seed.ts',
    'permission-relatorios-unificado.seed.ts'
  ];
  
  const seedsDir = join(__dirname, '..', 'src', 'database', 'seeds', 'core');
  
  // Teste 1: Verificar se os arquivos existem
  console.log('\n🔧 Teste 1: Verificando existência dos arquivos...');
  
  for (const seedFile of seedFiles) {
    const filePath = join(seedsDir, seedFile);
    if (existsSync(filePath)) {
      console.log(`✅ ${seedFile}: Arquivo existe`);
      successCount++;
    } else {
      console.log(`❌ ${seedFile}: Arquivo não encontrado`);
      errorCount++;
    }
  }
  
  // Teste 2: Verificar se o arquivo principal foi atualizado
  console.log('\n🔧 Teste 2: Verificando arquivo principal...');
  
  const mainSeedPath = join(seedsDir, 'permission.seed.ts');
  if (existsSync(mainSeedPath)) {
    console.log('✅ permission.seed.ts: Arquivo existe');
    successCount++;
  } else {
    console.log('❌ permission.seed.ts: Arquivo não encontrado');
    errorCount++;
  }
  
  // Teste 3: Verificar se o arquivo de mapeamento foi atualizado
  console.log('\n🔧 Teste 3: Verificando arquivo de mapeamento...');
  
  const mappingPath = join(seedsDir, 'permission-role-mapping.seed.ts');
  if (existsSync(mappingPath)) {
    console.log('✅ permission-role-mapping.seed.ts: Arquivo existe');
    successCount++;
  } else {
    console.log('❌ permission-role-mapping.seed.ts: Arquivo não encontrado');
    errorCount++;
  }
  
  // Teste 4: Verificar conteúdo dos arquivos principais
  console.log('\n🔧 Teste 4: Verificando imports nos arquivos principais...');
  
  try {
    const fs = require('fs');
    
    // Verificar permission.seed.ts
    const mainContent = fs.readFileSync(mainSeedPath, 'utf8');
    const hasNewImports = seedFiles.every(file => {
      const className = file.replace('.seed.ts', '').split('-').map(part => 
        part.charAt(0).toUpperCase() + part.slice(1)
      ).join('') + 'Seed';
      return mainContent.includes(className);
    });
    
    if (hasNewImports) {
      console.log('✅ permission.seed.ts: Novos imports encontrados');
      successCount++;
    } else {
      console.log('❌ permission.seed.ts: Alguns imports podem estar faltando');
      errorCount++;
    }
    
    // Verificar permission-role-mapping.seed.ts
    const mappingContent = fs.readFileSync(mappingPath, 'utf8');
    const hasNewPermissions = ['notificacao', 'metricas', 'integrador', 'judicial'].every(module => 
      mappingContent.includes(module)
    );
    
    if (hasNewPermissions) {
      console.log('✅ permission-role-mapping.seed.ts: Novas permissões encontradas');
      successCount++;
    } else {
      console.log('❌ permission-role-mapping.seed.ts: Algumas permissões podem estar faltando');
      errorCount++;
    }
    
  } catch (error) {
    console.log(`❌ Erro ao verificar conteúdo dos arquivos: ${error.message}`);
    errorCount++;
  }
  
  // Resumo final
  console.log('\n📊 Resumo dos Testes:');
  console.log(`✅ Sucessos: ${successCount}`);
  console.log(`❌ Erros: ${errorCount}`);
  console.log(`📈 Taxa de Sucesso: ${((successCount / (successCount + errorCount)) * 100).toFixed(1)}%`);
  
  if (errorCount === 0) {
    console.log('\n🎉 Todos os testes passaram! As seeds de permissão foram criadas com sucesso.');
  } else {
    console.log('\n⚠️  Alguns testes falharam. Verifique os erros acima.');
  }
  
  return errorCount === 0;
}

// Executar o teste
testPermissionSeeds()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Erro fatal durante o teste:', error);
    process.exit(1);
  });