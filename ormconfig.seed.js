// IMPORTANTE: Carregar as variáveis de ambiente ANTES de qualquer outra operação
require('dotenv').config();

// Configuração específica para typeorm-seeding
module.exports = {
  name: 'default',
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'pgben',
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/database/migrations/**/*{.ts,.js}'],
  seeds: ['src/database/seeds/**/*.seed.{ts,js}', 'src/database/seeds/*Seed.{ts,js}'],
  factories: ['src/database/factories/**/*.factory.{ts,js}'],
  synchronize: false,
  logging: true
};
