import { DataSource, DataSourceOptions } from 'typeorm';
import { SeederOptions } from 'typeorm-extension';
import { config } from 'dotenv';

// Carrega as variáveis de ambiente
config();

// Configuração base do TypeORM
const options: DataSourceOptions & SeederOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'pgben',
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/database/migrations/**/*{.ts,.js}'],
  seeds: [
    'src/database/seeds/initial/*.seed.{ts,js}',
    'src/database/seeds/initial/*Seed.{ts,js}',
    'src/database/seeds/test/*.seed.{ts,js}',
    'src/database/seeds/test/*Seed.{ts,js}'
  ],
  factories: ['src/database/factories/**/*.factory.{ts,js}'],
  synchronize: false,
  logging: ['error', 'schema', 'warn', 'migration'],
  maxQueryExecutionTime: 500,
  extra: {
    max: 30,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  }
};

// Exporta as opções para uso com diferentes ferramentas
export default options;

// Exporta o DataSource para uso com NestJS e CLI do TypeORM
export const AppDataSource = new DataSource(options);