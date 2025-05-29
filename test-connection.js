require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'pgben'
});

async function testConnection() {
  try {
    await client.connect();
    console.log('Conectado ao banco de dados!');
    
    // Verificar se a tabela permissao existe
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'permissao'
    `);
    
    console.log('Tabela permissao existe:', tableCheck.rows.length > 0);
    
    if (tableCheck.rows.length > 0) {
      const count = await client.query('SELECT COUNT(*) FROM permissao');
      console.log('Registros na tabela permissao:', count.rows[0].count);
    }
    
    // Listar algumas tabelas
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name 
      LIMIT 10
    `);
    
    console.log('Primeiras 10 tabelas:');
    tables.rows.forEach(row => console.log(' -', row.table_name));
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await client.end();
  }
}

testConnection();