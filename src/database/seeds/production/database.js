/**
 * Configuração de banco de dados para os scripts de seed
 */
const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Carregar variáveis de ambiente
dotenv.config();

// Configuração do cliente PostgreSQL
const getClient = (config = {}) => {
  const client = new Client({
    host: config.host || process.env.DB_HOST || 'localhost',
    port: parseInt(config.port || process.env.DB_PORT || '5432'),
    user: config.user || process.env.DB_USERNAME || 'postgres',
    password: config.password || process.env.DB_PASSWORD || 'postgres',
    database: config.database || process.env.DB_DATABASE || 'pgben',
  });
  
  return client;
};

// Função para conectar ao banco de dados
const connect = async (client) => {
  console.log('Conectando ao banco de dados...');
  await client.connect();
  console.log('Conexão estabelecida com sucesso!');
  
  // Verificar a conexão
  const testResult = await client.query('SELECT 1 as test');
  console.log('Teste de conexão:', testResult.rows[0].test === 1 ? 'OK' : 'Falha');
  
  return client;
};

// Função para fechar a conexão
const disconnect = async (client) => {
  console.log('Fechando conexão com o banco de dados...');
  await client.end();
  console.log('Conexão com o banco de dados encerrada.');
};

// Funções de utilidade para o banco de dados
const dbUtils = {
  // Verifica se uma tabela existe no banco de dados
  tableExists: async (client, tableName) => {
    const result = await client.query(
      `SELECT to_regclass($1) IS NOT NULL AS exists`,
      [`public.${tableName}`]
    );
    return result.rows[0].exists;
  },
  
  // Verifica se um registro existe na tabela
  recordExists: async (client, tableName, field, value) => {
    const result = await client.query(
      `SELECT EXISTS(SELECT 1 FROM ${tableName} WHERE ${field} = $1) AS exists`,
      [value]
    );
    return result.rows[0].exists;
  },
  
  // Insere um registro se não existir
  insertIfNotExists: async (client, tableName, condition, data) => {
    const exists = await client.query(
      `SELECT EXISTS(SELECT 1 FROM ${tableName} WHERE ${condition.field} = $1) AS exists`,
      [condition.value]
    );
    
    if (!exists.rows[0].exists) {
      const fields = Object.keys(data);
      const values = Object.values(data);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      
      const result = await client.query(
        `INSERT INTO ${tableName} (${fields.join(', ')}) 
         VALUES (${placeholders})
         RETURNING *`,
        values
      );
      
      return {
        created: true,
        data: result.rows[0]
      };
    }
    
    return {
      created: false,
      message: `Registro já existe em ${tableName} com ${condition.field} = ${condition.value}`
    };
  }
};

module.exports = {
  getClient,
  connect,
  disconnect,
  dbUtils
};
