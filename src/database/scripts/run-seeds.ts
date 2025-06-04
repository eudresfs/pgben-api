import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Logger } from '@nestjs/common';
import { PermissionUsuarioSeed } from '../seeds/core/permission-usuario.seed';
import { PermissionRoleMappingSeed } from '../seeds/core/permission-role-mapping.seed';

/**
 * Script para executar os scripts de seed
 *
 * Este script coordena a execução dos scripts de seed para popular o banco de dados
 * com os dados iniciais necessários para o funcionamento do sistema.
 */
async function runSeeds() {
  // Carrega as variáveis de ambiente
  dotenv.config();

  const logger = new Logger('RunSeeds');
  logger.log('Iniciando execução dos scripts de seed...');

  // Configuração da conexão com o banco de dados
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'postgres',
    database: process.env.DB_NAME || 'pgben',
    entities: [path.join(__dirname, '../../**/*.entity{.ts,.js}')],
    logging: false,
  });

  try {
    // Inicializa a conexão com o banco de dados
    logger.log('Conectando ao banco de dados...');
    await dataSource.initialize();
    logger.log('Conexão estabelecida com sucesso!');

    // Executa os scripts de seed
    logger.log('Executando scripts de seed...');

    // Executa o seed de permissões de usuário
    logger.log('Executando seed de permissões de usuário...');
    await PermissionUsuarioSeed.run(dataSource);

    // Executa outros seeds de permissões para outros módulos
    // Aqui seriam adicionados os outros seeds conforme forem implementados

    // Executa o seed de mapeamento de roles para permissões
    logger.log('Executando seed de mapeamento de roles para permissões...');
    await PermissionRoleMappingSeed.run(dataSource);

    logger.log('Scripts de seed executados com sucesso!');
  } catch (error) {
    logger.error('Erro ao executar scripts de seed:');
    logger.error(error);
  } finally {
    // Fecha a conexão com o banco de dados
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      logger.log('Conexão com o banco de dados fechada.');
    }
  }
}

// Executa os scripts de seed
runSeeds()
  .then(() => {
    console.log('Script finalizado.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Erro ao executar o script:', error);
    process.exit(1);
  });
