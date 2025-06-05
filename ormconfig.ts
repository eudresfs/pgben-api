// IMPORTANTE: Carregar as variáveis de ambiente ANTES de qualquer outra importação
import './src/config/env';

import { DataSource, DataSourceOptions } from 'typeorm';
import { SeederOptions } from 'typeorm-extension';
import { env } from './src/config/env';

// Configuração base do TypeORM
const options: DataSourceOptions & SeederOptions = {
  type: 'postgres',
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USER,
  password: env.DB_PASS,
  database: env.DB_NAME,
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
  },
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

// Exporta as opções para uso com diferentes ferramentas
export default options;

// Exporta o DataSource para uso com NestJS e CLI do TypeORM
export const AppDataSource = new DataSource(options);
