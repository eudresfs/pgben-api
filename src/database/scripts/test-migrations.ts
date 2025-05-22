import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Logger } from '@nestjs/common';

/**
 * Script para testar a execução e rollback das migrações
 * 
 * Este script testa a execução das migrações e o rollback das mesmas,
 * garantindo que as migrações estão funcionando corretamente.
 */
async function testMigrations() {
  // Carrega as variáveis de ambiente
  dotenv.config();
  
  const logger = new Logger('TestMigrations');
  logger.log('Iniciando teste de migrações...');

  // Configuração da conexão com o banco de dados
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'postgres',
    database: process.env.DB_NAME || 'pgben_test',
    entities: [path.join(__dirname, '../../**/*.entity{.ts,.js}')],
    migrations: [path.join(__dirname, '../migrations/*{.ts,.js}')],
    logging: true,
  });

  try {
    // Inicializa a conexão com o banco de dados
    logger.log('Conectando ao banco de dados...');
    await dataSource.initialize();
    logger.log('Conexão estabelecida com sucesso!');

    // Testa a execução das migrações
    logger.log('Executando migrações...');
    await dataSource.runMigrations();
    logger.log('Migrações executadas com sucesso!');

    // Verifica se as tabelas foram criadas
    logger.log('Verificando se as tabelas foram criadas...');
    const tables = await dataSource.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN (
        'permission',
        'permission_group',
        'permission_group_mapping',
        'role_permission',
        'user_permission',
        'permission_scope'
      )
    `);

    if (tables.length === 6) {
      logger.log('Todas as tabelas foram criadas com sucesso!');
    } else {
      logger.error(`Apenas ${tables.length} de 6 tabelas foram criadas!`);
      logger.error('Tabelas encontradas:');
      tables.forEach((table: any) => {
        logger.error(`- ${table.table_name}`);
      });
    }

    // Testa o rollback das migrações
    logger.log('Testando rollback das migrações...');
    await dataSource.undoLastMigration();
    logger.log('Rollback da última migração executado com sucesso!');

    // Verifica se as tabelas foram removidas
    logger.log('Verificando se as tabelas foram removidas...');
    const tablesAfterRollback = await dataSource.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN (
        'permission',
        'permission_group',
        'permission_group_mapping',
        'role_permission',
        'user_permission',
        'permission_scope'
      )
    `);

    if (tablesAfterRollback.length === 0) {
      logger.log('Todas as tabelas foram removidas com sucesso!');
    } else {
      logger.error(`${tablesAfterRollback.length} tabelas ainda existem após o rollback!`);
      logger.error('Tabelas encontradas:');
      tablesAfterRollback.forEach((table: any) => {
        logger.error(`- ${table.table_name}`);
      });
    }

    // Executa as migrações novamente para deixar o banco de dados no estado correto
    logger.log('Executando migrações novamente...');
    await dataSource.runMigrations();
    logger.log('Migrações executadas com sucesso!');

    logger.log('Teste de migrações concluído com sucesso!');
  } catch (error) {
    logger.error('Erro ao testar migrações:');
    logger.error(error);
  } finally {
    // Fecha a conexão com o banco de dados
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      logger.log('Conexão com o banco de dados fechada.');
    }
  }
}

// Executa o teste de migrações
testMigrations()
  .then(() => {
    console.log('Script finalizado.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Erro ao executar o script:', error);
    process.exit(1);
  });
