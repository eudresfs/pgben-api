import { config } from 'dotenv';
import { Client } from 'pg';

// Carrega as variáveis de ambiente
config();

// Configuração da conexão com o banco de dados
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'pgben'
};

/**
 * Verifica se a estrutura do banco está consistente com as migrations aplicadas
 */
async function verificarEstruturaBanco() {
  console.log('🔍 Verificando estrutura do banco de dados...');
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    
    // 1. Verificar enums existentes
    console.log('\n📊 Verificando enums:');
    const enumsResult = await client.query(`
      SELECT n.nspname, t.typname 
      FROM pg_type t 
      JOIN pg_namespace n ON n.oid = t.typnamespace 
      WHERE t.typtype = 'e' AND n.nspname = 'public'
      ORDER BY t.typname;
    `);
    
    console.log(`Total de enums encontrados: ${enumsResult.rows.length}`);
    
    // 2. Verificar tabelas existentes
    console.log('\n📊 Verificando tabelas:');
    const tablasResult = await client.query(`
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);
    
    console.log(`Total de tabelas encontradas: ${tablasResult.rows.length}`);
    
    // 3. Verificar especificamente a estrutura da tabela role_table
    console.log('\n📊 Verificando tabela role_table:');
    try {
      const roleTableResult = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'role_table'
        ORDER BY ordinal_position;
      `);
      
      if (roleTableResult.rows.length > 0) {
        console.log('✅ Tabela role_table encontrada com as seguintes colunas:');
        roleTableResult.rows.forEach(row => {
          console.log(`- ${row.column_name} (${row.data_type})`);
        });
        
        // Verificar os dados na tabela
        const roleDataResult = await client.query(`
          SELECT id, nome, descricao, ativo FROM role_table;
        `);
        
        console.log(`\nDados na tabela role_table (${roleDataResult.rows.length} registros):`);
        roleDataResult.rows.forEach(row => {
          console.log(`- ${row.nome}: ${row.descricao} (${row.ativo ? 'Ativo' : 'Inativo'})`);
        });
      } else {
        console.log('❌ Tabela role_table não encontrada!');
      }
    } catch (error) {
      console.error('❌ Erro ao verificar tabela role_table:', error.message);
    }
    
    // 4. Verificar FK na tabela usuario
    console.log('\n📊 Verificando relação entre usuario e role_table:');
    try {
      const userRoleResult = await client.query(`
        SELECT 
          tc.constraint_name, 
          kcu.column_name, 
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu 
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_name = 'usuario'
          AND ccu.table_name = 'role_table';
      `);
      
      if (userRoleResult.rows.length > 0) {
        console.log('✅ Relação entre usuario e role_table encontrada:');
        userRoleResult.rows.forEach(row => {
          console.log(`- FK ${row.constraint_name}: usuario.${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
        });
      } else {
        console.log('❌ Relação entre usuario e role_table não encontrada!');
      }
    } catch (error) {
      console.error('❌ Erro ao verificar relação entre usuario e role_table:', error.message);
    }
    
    // 5. Verificar se o enum 'role' ainda existe
    console.log('\n📊 Verificando se o enum role ainda existe:');
    const roleEnumResult = await client.query(`
      SELECT 1 FROM pg_type t 
      JOIN pg_namespace n ON n.oid = t.typnamespace 
      WHERE t.typname = 'role' AND n.nspname = 'public';
    `);
    
    if (roleEnumResult.rows.length > 0) {
      console.log('⚠️ Enum role ainda existe no banco!');
      
      // Verificar dependências
      const depResult = await client.query(`
        SELECT pg_namespace.nspname AS schema_name,
               pg_class.relname AS table_name,
               pg_attribute.attname AS column_name
        FROM pg_depend
        JOIN pg_type ON pg_depend.refobjid = pg_type.oid
        JOIN pg_class ON pg_depend.objid = pg_class.oid
        JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
        JOIN pg_attribute ON pg_depend.objid = pg_attribute.attrelid AND pg_depend.objsubid = pg_attribute.attnum
        WHERE pg_type.typname = 'role' AND pg_namespace.nspname = 'public';
      `);
      
      if (depResult.rows.length > 0) {
        console.log('⚠️ Dependências encontradas:');
        depResult.rows.forEach(dep => {
          console.log(`- Tabela: ${dep.table_name}, Coluna: ${dep.column_name}`);
        });
      }
    } else {
      console.log('✅ Enum role foi removido com sucesso!');
    }
    
    console.log('\n✅ Verificação da estrutura do banco concluída!');
    return true;
  } catch (error) {
    console.error('❌ Erro durante a verificação:', error);
    return false;
  } finally {
    await client.end();
    console.log('\n🔌 Conexão fechada.');
  }
}

// Executar a verificação
if (require.main === module) {
  verificarEstruturaBanco()
    .then(resultado => {
      if (resultado) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Erro não tratado:', error);
      process.exit(1);
    });
}
