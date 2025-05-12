import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

// Configuração para TypeORM
const dataSourceOptions = {
  type: 'postgres' as const,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'pgben',
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/database/migrations/**/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  maxQueryExecutionTime: 1000,
  extra: {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  }
};

// Exporta o DataSource para uso com TypeORM
export default new DataSource(dataSourceOptions);

// Adiciona propriedades para typeorm-seeding (não afeta o TypeORM)
(dataSourceOptions as any).seeds = ['src/database/seeds/**/*{.ts,.js}'];
(dataSourceOptions as any).factories = ['src/database/factories/**/*{.ts,.js}'];

// Exporta as opções para uso com typeorm-seeding
export { dataSourceOptions };