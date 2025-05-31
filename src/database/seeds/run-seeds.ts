/**
 * Script para execução manual dos seeds
 * 
 * Este script permite executar os seeds diretamente, sem depender da CLI do typeorm-extension,
 * evitando problemas de resolução de módulos.
 */
import { AppDataSource } from './seed-source';
import { CoreSeedRunner } from './core/CoreSeedRunner';
import { ReferenceSeedRunner } from './reference/ReferenceSeedRunner';

async function runSeeds() {
  try {
    console.log('Iniciando conexão com o banco de dados...');
    await AppDataSource.initialize();
    console.log('Conexão estabelecida com sucesso!');

    console.log('\n===== EXECUTANDO SEEDS ESSENCIAIS =====');
    await CoreSeedRunner.run(AppDataSource);
    
    console.log('\n===== EXECUTANDO SEEDS DE REFERÊNCIA =====');
    await ReferenceSeedRunner.run(AppDataSource);
    
    console.log('\n===== TODOS OS SEEDS FORAM EXECUTADOS COM SUCESSO =====');
  } catch (error) {
    console.error('Erro durante a execução dos seeds:');
    console.error(error);
    process.exit(1);
  } finally {
    // Fechar a conexão com o banco de dados
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('Conexão com o banco de dados encerrada.');
    }
  }
}

// Executar o script
runSeeds()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Erro não tratado:', error);
    process.exit(1);
  });
