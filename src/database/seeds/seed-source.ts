import { DataSource, DataSourceOptions } from 'typeorm';
import { SeederOptions, SeederFactoryManager, Seeder } from 'typeorm-extension';
import { config } from '../../config';
import { CoreSeedRunner } from './core/CoreSeedRunner';
import { ReferenceSeedRunner } from './reference/ReferenceSeedRunner';

// Adaptadores para os runners de seed para implementar a interface Seeder do typeorm-extension
class CoreSeedRunnerAdapter implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager,
  ): Promise<any> {
    return CoreSeedRunner.run(dataSource);
  }
}

class ReferenceSeedRunnerAdapter implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager,
  ): Promise<any> {
    return ReferenceSeedRunner.run(dataSource);
  }
}

// Configuração da conexão com o banco de dados
const options: DataSourceOptions & SeederOptions = {
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  synchronize: false,
  logging: config.database.logging,
  // Desativar construtores de entidades para evitar problemas de validação
  entitySkipConstructor: true,
  entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  seeds: [
    // Seeds principais para ambiente de produção
    CoreSeedRunnerAdapter,
    ReferenceSeedRunnerAdapter,
  ],
  factories: [],
};

// Criação do DataSource
export const AppDataSource = new DataSource(options);
