import { DataSource, DataSourceOptions } from 'typeorm';
import { SeederOptions, SeederFactoryManager, Seeder } from 'typeorm-extension';
import { config } from '../../config';
import { CoreSeedRunner } from './core/CoreSeedRunner';
import { ReferenceSeedRunner } from './reference/ReferenceSeedRunner';
import { DevelopmentSeedRunner } from './development/DevelopmentSeedRunner';

// Adaptadores para os runners de seed para implementar a interface Seeder do typeorm-extension
class CoreSeedRunnerAdapter implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager): Promise<any> {
    return CoreSeedRunner.run(dataSource);
  }
}

class ReferenceSeedRunnerAdapter implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager): Promise<any> {
    return ReferenceSeedRunner.run(dataSource);
  }
}

class DevelopmentSeedRunnerAdapter implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager): Promise<any> {
    return DevelopmentSeedRunner.run(dataSource);
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
  entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  seeds: [
    // Seeds principais para ambiente de produção
    CoreSeedRunnerAdapter,
    ReferenceSeedRunnerAdapter,
    
    // Seed para dados de desenvolvimento (não usar em produção)
    ...(process.env.NODE_ENV !== 'production' ? [DevelopmentSeedRunnerAdapter] : []),
  ],
  factories: [],
};

// Criação do DataSource
export const AppDataSource = new DataSource(options);
