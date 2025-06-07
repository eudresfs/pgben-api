/**
 * Configuração do banco de dados
 *
 * Este arquivo centraliza as configurações de conexão com o banco de dados,
 * utilizando as variáveis de ambiente carregadas de forma consistente.
 */
import { env } from './env';

export const databaseConfig = {
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USER,
  password: env.DB_PASS,
  database: env.DB_NAME,
  logging: env.DB_LOGGING,
  // NOTA: O TypeORM não suporta a propriedade 'timezone' diretamente.
  // Para configurar timezone, use:
  // 1. SET timezone = 'America/Sao_Paulo' no PostgreSQL
  // 2. Ou configure via connection string: ?timezone=America/Sao_Paulo
  // 3. Ou use process.env.TZ = 'America/Sao_Paulo' no Node.js
  timezone: env.DB_TIMEZONE, // Mantido para referência e uso em outras partes do sistema
};

/**
 * Configuração específica para o TypeORM
 * Inclui configurações adicionais necessárias para o ORM
 */
export const typeOrmConfig = {
  ...databaseConfig,
  type: 'postgres' as const,
  entities: [__dirname + '/../**/entities/*.entity{.ts,.js}'],
  synchronize: false,
};
