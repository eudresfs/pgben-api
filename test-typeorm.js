require('dotenv').config();
// Teste de conexão TypeORM
require('ts-node/register');
require('tsconfig-paths/register');
const { DataSource } = require('typeorm');
const { databaseConfig } = require('./src/config/database.config');
const { Permission } = require('./src/auth/entities/permission.entity');

async function testTypeORM() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: databaseConfig.host,
    port: databaseConfig.port,
    username: databaseConfig.username,
    password: databaseConfig.password,
    database: databaseConfig.database,
    logging: true,
    entities: [Permission],
    synchronize: false
  });

  try {
    console.log('Inicializando DataSource...');
    await dataSource.initialize();
    console.log('DataSource inicializado com sucesso!');
    
    // Testar query simples
    const result = await dataSource.query('SELECT COUNT(*) FROM permissao');
    console.log('Registros na tabela permissao:', result[0].count);
    
    // Testar se consegue encontrar a entidade Permission
    try {
      const permissionRepo = dataSource.getRepository(Permission);
      console.log('Repositório Permission encontrado!');
      
      // Testar contagem via repositório
      const count = await permissionRepo.count();
      console.log('Contagem via repositório Permission:', count);
    } catch (error) {
      console.log('Erro ao obter repositório Permission:', error.message);
    }
    
  } catch (error) {
    console.error('Erro no TypeORM:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('DataSource finalizado.');
    }
  }
}

testTypeORM();