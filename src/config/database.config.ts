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
};
