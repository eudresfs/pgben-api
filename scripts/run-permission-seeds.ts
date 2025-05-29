import { AppDataSource } from '../src/database/data-source';
import { PermissionSeeder } from '../src/database/seeds/core/permission.seed';

async function runPermissionSeeds() {
  try {
    console.log('🔄 Inicializando conexão com o banco de dados...');
    await AppDataSource.initialize();
    console.log('✅ Conexão estabelecida com sucesso!');

    console.log('🔄 Executando seeds de permissão...');
    const permissionSeeder = new PermissionSeeder();
    await permissionSeeder.run(AppDataSource);
    console.log('✅ Seeds de permissão executadas com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao executar seeds de permissão:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Conexão com o banco de dados fechada.');
    }
  }
}

runPermissionSeeds();