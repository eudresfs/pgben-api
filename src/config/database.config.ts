/**
 * Configuração do banco de dados
 *
 * Este arquivo centraliza as configurações de conexão com o banco de dados,
 * permitindo fácil configuração através de variáveis de ambiente.
 */
export const databaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'pgben',
  logging: process.env.DB_LOGGING === 'true',
};
