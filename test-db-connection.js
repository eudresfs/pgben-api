const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'pgben',
});

async function testConnection() {
  try {
    await client.connect();
    console.log('Conexão com o banco de dados estabelecida com sucesso!');
    
    const res = await client.query('SELECT $1::text as message', ['Conexão bem-sucedida!']);
    console.log('Resultado da consulta:', res.rows[0].message);
    
    await client.end();
    console.log('Conexão encerrada.');
  } catch (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
  }
}

testConnection();
