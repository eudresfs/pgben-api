import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { AppDataSource } from '../../data-source';
import { CoreSeedRunner } from '../seeds/core/CoreSeedRunner';
import { ReferenceSeedRunner } from '../seeds/reference/ReferenceSeedRunner';

// Carrega as variáveis de ambiente
config();

/**
 * Script para executar os seeds do sistema
 * 
 * Este script executa todos os runners de seeds configurados
 * para inicializar o banco de dados com dados iniciais
 */
async function main() {
  console.log('======================================================');
  console.log('Iniciando execução dos seeds do sistema');
  console.log('======================================================');

  // Usa o AppDataSource já configurado no projeto

  try {
    // Inicializa a conexão com o banco de dados
    await AppDataSource.initialize();
    console.log('Conexão com o banco de dados estabelecida com sucesso!');

    // Executa os seeds essenciais (core)
    await CoreSeedRunner.run(AppDataSource);

    // Executa os seeds de referência
    await ReferenceSeedRunner.run(AppDataSource);

    console.log('======================================================');
    console.log('Todos os seeds foram executados com sucesso!');
    console.log('======================================================');
  } catch (error) {
    console.error('Erro durante a execução dos seeds:');
    console.error(error);
    process.exit(1);
  } finally {
    // Fecha a conexão com o banco de dados
    if (AppDataSource && AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('Conexão com o banco de dados fechada.');
    }
  }
}

// Executa o script
main().catch(error => {
  console.error('Erro fatal durante a execução dos seeds:');
  console.error(error);
  process.exit(1);
});
