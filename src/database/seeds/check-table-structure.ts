/**
 * Script para verificar a estrutura das tabelas no banco de dados
 * 
 * Este script verifica a estrutura das tabelas no banco de dados
 * e exibe as colunas de cada tabela para ajudar na depuração dos seeds.
 */
import { AppDataSource } from './seed-source';

async function checkTableStructure() {
  try {
    console.log('Iniciando conexão com o banco de dados...');
    await AppDataSource.initialize();
    console.log('Conexão estabelecida com sucesso!');

    // Lista de tabelas para verificar
    const tables = [
      'unidade',
      'setor',
      'tipo_beneficio',
      'role',
      'usuario',
      'permissao',
      'role_permissao'
    ];

    // Verificar a estrutura de cada tabela
    for (const table of tables) {
      console.log(`\n===== ESTRUTURA DA TABELA ${table.toUpperCase()} =====`);
      try {
        const columns = await AppDataSource.query(
          `SELECT column_name, data_type, is_nullable, column_default 
           FROM information_schema.columns 
           WHERE table_name = $1
           ORDER BY ordinal_position`,
          [table]
        );
        
        if (columns.length === 0) {
          console.log(`Tabela ${table} não encontrada no banco de dados.`);
          continue;
        }
        
        console.log(`Total de colunas: ${columns.length}`);
        console.log('Colunas:');
        columns.forEach((col: any) => {
          console.log(`- ${col.column_name}: ${col.data_type}, nullable=${col.is_nullable}, default=${col.column_default || 'NULL'}`);
        });
        
        // Verificar chaves primárias
        const primaryKeys = await AppDataSource.query(
          `SELECT c.column_name
           FROM information_schema.table_constraints tc 
           JOIN information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name) 
           JOIN information_schema.columns AS c ON c.table_schema = tc.constraint_schema
             AND tc.table_name = c.table_name AND ccu.column_name = c.column_name
           WHERE constraint_type = 'PRIMARY KEY' AND tc.table_name = $1`,
          [table]
        );
        
        if (primaryKeys.length > 0) {
          console.log('Chaves primárias:');
          primaryKeys.forEach((pk: any) => {
            console.log(`- ${pk.column_name}`);
          });
        }
        
        // Verificar chaves estrangeiras
        const foreignKeys = await AppDataSource.query(
          `SELECT
             kcu.column_name, 
             ccu.table_name AS foreign_table_name,
             ccu.column_name AS foreign_column_name 
           FROM 
             information_schema.table_constraints AS tc 
             JOIN information_schema.key_column_usage AS kcu
               ON tc.constraint_name = kcu.constraint_name
               AND tc.table_schema = kcu.table_schema
             JOIN information_schema.constraint_column_usage AS ccu 
               ON ccu.constraint_name = tc.constraint_name
               AND ccu.table_schema = tc.table_schema
           WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name=$1`,
          [table]
        );
        
        if (foreignKeys.length > 0) {
          console.log('Chaves estrangeiras:');
          foreignKeys.forEach((fk: any) => {
            console.log(`- ${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
          });
        }
        
      } catch (error) {
        console.error(`Erro ao verificar a estrutura da tabela ${table}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('Erro durante a verificação da estrutura das tabelas:');
    console.error(error);
    process.exit(1);
  } finally {
    // Fechar a conexão com o banco de dados
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('\nConexão com o banco de dados encerrada.');
    }
  }
}

// Executar o script
checkTableStructure()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Erro não tratado:', error);
    process.exit(1);
  });
