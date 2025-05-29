require('dotenv').config();
const { Client } = require('pg');

async function checkMigrations() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'pgben'
  });

  try {
    await client.connect();
    console.log('Conectado ao banco de dados.');
    
    // Verificar se a tabela migrations existe
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migrations'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('Tabela migrations não existe!');
      return;
    }
    
    // Listar migrations aplicadas
    const result = await client.query('SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 5');
    console.log('Migrations aplicadas:');
    result.rows.forEach(row => {
      console.log(`- ${row.name} (${row.timestamp})`);
    });
    
    // Verificar se a tabela permissao existe
    const permissaoExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'permissao'
      );
    `);
    
    console.log('\nTabela permissao existe:', permissaoExists.rows[0].exists);
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await client.end();
  }
}

checkMigrations();