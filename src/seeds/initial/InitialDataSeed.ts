import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-seeding';

export default class InitialDataSeed implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager
  ): Promise<any> {
    // Aqui será implementada a lógica para popular dados iniciais
    // como usuários administrativos, tipos de benefícios padrão, etc.
    console.log('Executando seed de dados iniciais...');
  }
}