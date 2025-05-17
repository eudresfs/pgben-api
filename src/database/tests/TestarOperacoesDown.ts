import { DataSource } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';
import { config } from 'dotenv';

// Carregar variáveis de ambiente
config();

/**
 * Script para testar as operações down() de cada migration
 *
 * Este script executa todas as migrations e depois reverte cada uma delas,
 * verificando se as operações down() funcionam corretamente
 */
async function testarOperacoesDown() {
  console.log('======================================================');
  console.log('Iniciando teste das operações down() das migrations');
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

    // Executar todas as migrations primeiro
    console.log('Executando todas as migrations...');
    await dataSource.runMigrations({ transaction: 'all' });
    console.log('Todas as migrations executadas com sucesso');

    // Verificar migrations aplicadas
    const appliedMigrations = await dataSource.query(
      'SELECT * FROM migrations ORDER BY id',
    );
    console.log(`Total de migrations aplicadas: ${appliedMigrations.length}`);

    // Reverter as migrations uma a uma, da mais recente para a mais antiga
    console.log('\nIniciando reversão das migrations uma a uma...');
    let sucessos = 0;
    let falhas = 0;
    // Definir tipo explícito para o array de falhas
    const falhasDetalhes: Array<{
      migration: string;
      erro: string;
    }> = [];

    for (let i = appliedMigrations.length - 1; i >= 0; i--) {
      const migration = appliedMigrations[i];
      console.log(`\nRevertendo migration: ${migration.name}`);

      try {
        // Reverter a migration
        await dataSource.undoLastMigration({ transaction: 'all' });

        // Verificar se a migration foi realmente revertida
        const ainda_existe = await dataSource.query(
          'SELECT COUNT(*) FROM migrations WHERE name = $1',
          [migration.name],
        );

        if (parseInt(ainda_existe[0].count) > 0) {
          falhas++;
          falhasDetalhes.push({
            migration: migration.name,
            erro: 'A migration não foi revertida corretamente',
          });
          console.log(`❌ Falha ao reverter migration: ${migration.name}`);
        } else {
          sucessos++;
          console.log(`✅ Migration revertida com sucesso: ${migration.name}`);
        }
      } catch (error) {
        falhas++;
        falhasDetalhes.push({
          migration: migration.name,
          erro: error.message,
        });
        console.log(`❌ Erro ao reverter migration: ${migration.name}`);
        console.error(error);
      }
    }

    console.log('\nReversão de migrations concluída');
    console.log(
      `Resultado: ${sucessos} migrations revertidas com sucesso, ${falhas} falhas`,
    );

    if (falhas > 0) {
      console.log('\nDetalhes das falhas:');
      falhasDetalhes.forEach((falha, index) => {
        console.log(`${index + 1}. Migration: ${falha.migration}`);
        console.log(`   Erro: ${falha.erro}`);
      });
    }

    // Fechar conexão
    await dataSource.destroy();
    console.log(
      `Conexão com banco de dados de teste ${dbConfig.database} fechada`,
    );

    console.log('======================================================');
    console.log('Teste das operações down() das migrations concluído!');
    console.log('======================================================');

    return falhas === 0;
  } catch (error) {
    console.error('Erro durante o teste das operações down():');
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
  testarOperacoesDown()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Erro não tratado:', error);
      process.exit(1);
    });
}

export { testarOperacoesDown };
