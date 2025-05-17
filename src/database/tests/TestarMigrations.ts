import { DataSource } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';
import { config } from 'dotenv';

// Carregar variáveis de ambiente
config();

/**
 * Script para testar a execução das migrations em ordem
 *
 * Este script executa todas as migrations na ordem correta
 * e verifica se não há erros durante a execução
 */
async function testarMigrations() {
  console.log('======================================================');
  console.log('Iniciando teste de execução das migrations');
  console.log('======================================================');

  // Configurações para conexão com o banco de dados de teste
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE_TEST || 'pgben_test',
  };

  // Caminho para o diretório de migrations
  const migrationsPath = path.join(
    __dirname,
    '..',
    'migrations',
    'nova-estrutura',
  );

  // Verificar se o diretório de migrations existe
  if (!fs.existsSync(migrationsPath)) {
    console.error(`Diretório de migrations não encontrado: ${migrationsPath}`);
    return false;
  }

  // Listar arquivos de migration
  const migrationFiles = fs
    .readdirSync(migrationsPath)
    .filter((file) => file.endsWith('.ts') && !file.endsWith('.d.ts'))
    .sort((a, b) => {
      // Ordenar pelo número no início do nome do arquivo
      const numA = parseInt(a.split('-')[0]);
      const numB = parseInt(b.split('-')[0]);
      return numA - numB;
    });

  console.log(`Encontradas ${migrationFiles.length} migrations para testar`);

  // Criar conexão com o banco de dados de teste
  const dataSource = new DataSource({
    type: 'postgres',
    host: dbConfig.host,
    port: dbConfig.port,
    username: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database,
    synchronize: false,
    logging: true,
    entities: [],
    migrations: migrationFiles.map((file) => path.join(migrationsPath, file)),
  });

  try {
    // Iniciar conexão
    await dataSource.initialize();
    console.log(
      `Conexão com banco de dados de teste ${dbConfig.database} estabelecida`,
    );

    // Executar as migrations
    console.log('Iniciando execução das migrations...');
    const startTime = Date.now();

    await dataSource.runMigrations({ transaction: 'all' });

    const endTime = Date.now();
    const executionTime = (endTime - startTime) / 1000; // em segundos

    console.log(
      `Todas as migrations executadas com sucesso em ${executionTime.toFixed(2)} segundos`,
    );

    // Verificar se todas as migrations foram aplicadas
    const appliedMigrations = await dataSource.query(
      'SELECT * FROM migrations ORDER BY id',
    );
    console.log(`Total de migrations aplicadas: ${appliedMigrations.length}`);

    // Verificar critério de performance (menos de 2 minutos)
    if (executionTime < 120) {
      console.log(
        '✅ Critério de performance atendido: execução em menos de 2 minutos',
      );
    } else {
      console.log(
        '❌ Critério de performance não atendido: execução levou mais de 2 minutos',
      );
    }

    // Fechar conexão
    await dataSource.destroy();
    console.log(
      `Conexão com banco de dados de teste ${dbConfig.database} fechada`,
    );

    console.log('======================================================');
    console.log('Teste de execução das migrations concluído com sucesso!');
    console.log('======================================================');

    return true;
  } catch (error) {
    console.error('Erro durante o teste de execução das migrations:');
    console.error(error);

    // Tentar fechar a conexão se estiver aberta
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }

    return false;
  }
}

// Executar o script se for chamado diretamente
if (require.main === module) {
  testarMigrations()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Erro não tratado:', error);
      process.exit(1);
    });
}

export { testarMigrations };
