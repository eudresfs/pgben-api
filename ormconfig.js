const { DataSource } = require('typeorm');
require('dotenv').config();

// Exportando como objeto simples para compatibilidade com typeorm-seeding
module.exports = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'pgben',
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/database/migrations/**/*{.ts,.js}'],
  seeds: ['src/database/seeds/**/*{.ts,.js}'],
  factories: ['src/database/factories/**/*{.ts,.js}'],
  synchronize: false,
  logging: ['error', 'schema', 'warn', 'migration'],
  maxQueryExecutionTime: 500, // Reduzido para 500ms para identificar queries lentas mais cedo
  extra: {
    max: 30, // Aumentado para suportar mais conexões simultâneas
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000 // Aumentado para evitar timeouts em operações complexas
  }
};

// Exportando DataSource para uso com NestJS
module.exports.dataSource = new DataSource(module.exports);