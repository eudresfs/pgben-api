/**
 * Script para verificar a estrutura do banco de dados
 * 
 * Este script permite verificar as tabelas e colunas existentes no banco de dados
 * para ajudar a corrigir problemas nos scripts de seed.
 */
import { AppDataSource } from './seed-source';

async function checkDbStructure() {
  try {
    console.log('Iniciando conexão com o banco de dados...');
    await AppDataSource.initialize();
    console.log('Conexão estabelecida com sucesso!');

    // Listar todas as tabelas
    console.log('\n===== TABELAS EXISTENTES =====');
    const tables = await AppDataSource.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    
    if (tables.length === 0) {
      console.log('Nenhuma tabela encontrada no banco de dados.');
    } else {
      console.log(`Encontradas ${tables.length} tabelas:`);
      tables.forEach((t: any) => console.log(`- ${t.table_name}`));
    }

    // Verificar se existe tabela relacionada a perfis/roles
    console.log('\n===== BUSCANDO TABELAS DE PERFIL/ROLE =====');
    const roleTables = await AppDataSource.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%role%' OR table_name LIKE '%role%' OR table_name LIKE '%papel%' ORDER BY table_name"
    );
    
    if (roleTables.length === 0) {
      console.log('Nenhuma tabela relacionada a perfis/roles encontrada.');
    } else {
      console.log(`Encontradas ${roleTables.length} tabelas relacionadas a perfis/roles:`);
      roleTables.forEach((t: any) => console.log(`- ${t.table_name}`));
      
      // Para cada tabela encontrada, listar suas colunas
      for (const table of roleTables) {
        console.log(`\n===== COLUNAS DA TABELA ${table.table_name.toUpperCase()} =====`);
        const columns = await AppDataSource.query(
          `SELECT column_name, data_type, is_nullable 
           FROM information_schema.columns 
           WHERE table_schema = 'public' AND table_name = $1
           ORDER BY ordinal_position`,
          [table.table_name]
        );
        
        columns.forEach((c: any) => {
          console.log(`- ${c.column_name} (${c.data_type}, ${c.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });
      }
    }

    // Verificar tabela de permissões
    console.log('\n===== BUSCANDO TABELAS DE PERMISSÃO =====');
    const permissionTables = await AppDataSource.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%permiss%' ORDER BY table_name"
    );
    
    if (permissionTables.length === 0) {
      console.log('Nenhuma tabela relacionada a permissões encontrada.');
    } else {
      console.log(`Encontradas ${permissionTables.length} tabelas relacionadas a permissões:`);
      permissionTables.forEach((t: any) => console.log(`- ${t.table_name}`));
      
      // Para cada tabela encontrada, listar suas colunas
      for (const table of permissionTables) {
        console.log(`\n===== COLUNAS DA TABELA ${table.table_name.toUpperCase()} =====`);
        const columns = await AppDataSource.query(
          `SELECT column_name, data_type, is_nullable 
           FROM information_schema.columns 
           WHERE table_schema = 'public' AND table_name = $1
           ORDER BY ordinal_position`,
          [table.table_name]
        );
        
        columns.forEach((c: any) => {
          console.log(`- ${c.column_name} (${c.data_type}, ${c.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });
      }
    }
    
  } catch (error) {
    console.error('Erro durante a verificação da estrutura do banco de dados:');
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
checkDbStructure()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Erro não tratado:', error);
    process.exit(1);
  });
