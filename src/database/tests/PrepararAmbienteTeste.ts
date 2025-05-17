import { DataSource } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';
import { config } from 'dotenv';

// Carregar variáveis de ambiente
config();

/**
 * Script para preparar ambiente de teste limpo
 *
 * Este script cria um banco de dados de teste limpo e configura
 * o ambiente para execução dos testes de migrations e seeds
 */
async function prepararAmbienteTeste() {
  console.log('======================================================');
  console.log('Iniciando preparação do ambiente de teste');
  console.log('======================================================');

  // Configurações para conexão com o banco de dados
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE_TEST || 'pgben_test',
  };

  // Criar conexão com o banco de dados principal (postgres)
  const mainDataSource = new DataSource({
    type: 'postgres',
    host: dbConfig.host,
    port: dbConfig.port,
    username: dbConfig.username,
    password: dbConfig.password,
    database: 'postgres', // Banco padrão para criar/dropar outros bancos
  });

  try {
    // Iniciar conexão
    await mainDataSource.initialize();
    console.log('Conexão com banco de dados principal estabelecida');

    // Verificar se o banco de teste existe e dropá-lo se existir
    try {
      await mainDataSource.query(
        `DROP DATABASE IF EXISTS ${dbConfig.database}`,
      );
      console.log(
        `Banco de dados de teste ${dbConfig.database} removido (se existia)`,
      );
    } catch (error) {
      console.error('Erro ao tentar remover banco de dados de teste:', error);
    }

    // Criar o banco de dados de teste
    try {
      await mainDataSource.query(`CREATE DATABASE ${dbConfig.database}`);
      console.log(
        `Banco de dados de teste ${dbConfig.database} criado com sucesso`,
      );
    } catch (error) {
      console.error('Erro ao criar banco de dados de teste:', error);
      throw error;
    }

    // Fechar conexão com o banco principal
    await mainDataSource.destroy();
    console.log('Conexão com banco de dados principal fechada');

    // Criar conexão com o banco de teste
    const testDataSource = new DataSource({
      type: 'postgres',
      host: dbConfig.host,
      port: dbConfig.port,
      username: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database,
      synchronize: false,
      logging: true,
    });

    // Iniciar conexão com o banco de teste
    await testDataSource.initialize();
    console.log(
      `Conexão com banco de dados de teste ${dbConfig.database} estabelecida`,
    );

    // Criar extensões necessárias
    try {
      await testDataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      await testDataSource.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
      console.log('Extensões necessárias criadas com sucesso');
    } catch (error) {
      console.error('Erro ao criar extensões:', error);
      throw error;
    }

    // Fechar conexão com o banco de teste
    await testDataSource.destroy();
    console.log(
      `Conexão com banco de dados de teste ${dbConfig.database} fechada`,
    );

    console.log('======================================================');
    console.log('Ambiente de teste preparado com sucesso!');
    console.log('======================================================');
    console.log(`Banco de dados de teste: ${dbConfig.database}`);
    console.log('Para executar os testes, use o comando:');
    console.log('npm run test:migrations');
    console.log('======================================================');

    return true;
  } catch (error) {
    console.error('Erro durante a preparação do ambiente de teste:');
    console.error(error);
    return false;
  }
}

// Executar o script se for chamado diretamente
if (require.main === module) {
  prepararAmbienteTeste()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Erro não tratado:', error);
      process.exit(1);
    });
}

export { prepararAmbienteTeste };
