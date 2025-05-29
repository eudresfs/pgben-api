require('dotenv').config();
require('ts-node/register');
require('tsconfig-paths/register');

const { AppDataSource } = require('./src/database/seeds/seed-source');
const { Permission } = require('./src/auth/entities/permission.entity');

async function testSeedDataSource() {
  try {
    console.log('Testando DataSource dos seeds...');
    console.log('Configuração do DataSource:');
    console.log('- Host:', AppDataSource.options.host);
    console.log('- Port:', AppDataSource.options.port);
    console.log('- Database:', AppDataSource.options.database);
    console.log('- Username:', AppDataSource.options.username);
    
    console.log('\nInicializando DataSource dos seeds...');
    await AppDataSource.initialize();
    console.log('DataSource dos seeds inicializado com sucesso!');
    
    // Testar query simples
    const result = await AppDataSource.query('SELECT COUNT(*) FROM permissao');
    console.log('Registros na tabela permissao:', result[0].count);
    
    // Testar repositório
    try {
      const permissionRepo = AppDataSource.getRepository(Permission);
      console.log('Repositório Permission encontrado!');
      
      const count = await permissionRepo.count();
      console.log('Contagem via repositório Permission:', count);
    } catch (error) {
      console.log('Erro ao obter repositório Permission:', error.message);
    }
    
  } catch (error) {
    console.error('Erro no DataSource dos seeds:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('DataSource dos seeds finalizado.');
    }
  }
}

testSeedDataSource();