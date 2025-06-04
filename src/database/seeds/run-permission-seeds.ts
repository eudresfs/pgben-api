import { AppDataSource } from '../data-source';
import { PermissionSeeder } from './core/permission.seed';

async function runPermissionSeeds() {
  try {
    console.log('Inicializando conexão com o banco de dados...');
    await AppDataSource.initialize();
    console.log('Conexão estabelecida com sucesso!');

    console.log('Executando seeds de permissão...');
    const seeder = new PermissionSeeder();
    await seeder.run(AppDataSource);
    console.log('Seeds de permissão executadas com sucesso!');
  } catch (error) {
    console.error('Erro ao executar seeds de permissão:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('Conexão com o banco de dados fechada.');
    }
  }
}

runPermissionSeeds();
