/**
 * Script para verificar os valores de enum no banco de dados
 * 
 * Este script consulta o banco de dados para descobrir os valores válidos
 * para os enums utilizados nas tabelas.
 */
import { AppDataSource } from './seed-source';

async function checkEnums() {
  try {
    console.log('Iniciando conexão com o banco de dados...');
    await AppDataSource.initialize();
    console.log('Conexão estabelecida com sucesso!');

    // Verificar enums na tabela unidade
    console.log('\n===== VERIFICANDO ENUMS DA TABELA UNIDADE =====');
    
    // Verificar tipo_unidade
    try {
      const tipoUnidadeEnum = await AppDataSource.query(`
        SELECT enum_range(NULL::tipo_unidade) as valores
      `);
      
      if (tipoUnidadeEnum && tipoUnidadeEnum.length > 0) {
        console.log('Valores válidos para enum tipo_unidade:');
        // Converter a string de array do PostgreSQL para um array JavaScript
        const valores = tipoUnidadeEnum[0].valores
          .replace('{', '')
          .replace('}', '')
          .split(',');
        valores.forEach((valor: string) => {
          console.log(`- "${valor}"`);
        });
      } else {
        console.log('Não foi possível obter os valores de tipo_unidade');
      }
    } catch (error) {
      console.error('Erro ao verificar enum tipo_unidade:', error.message);
    }
    
    // Verificar status_unidade
    try {
      const statusUnidadeEnum = await AppDataSource.query(`
        SELECT enum_range(NULL::status_unidade) as valores
      `);
      
      if (statusUnidadeEnum && statusUnidadeEnum.length > 0) {
        console.log('\nValores válidos para enum status_unidade:');
        // Converter a string de array do PostgreSQL para um array JavaScript
        const valores = statusUnidadeEnum[0].valores
          .replace('{', '')
          .replace('}', '')
          .split(',');
        valores.forEach((valor: string) => {
          console.log(`- "${valor}"`);
        });
      } else {
        console.log('Não foi possível obter os valores de status_unidade');
      }
    } catch (error) {
      console.error('Erro ao verificar enum status_unidade:', error.message);
      
      // Verificar se a coluna status é do tipo boolean
      try {
        const statusInfo = await AppDataSource.query(`
          SELECT data_type 
          FROM information_schema.columns 
          WHERE table_name = 'unidade' AND column_name = 'status'
        `);
        
        if (statusInfo && statusInfo.length > 0) {
          console.log(`\nTipo da coluna 'status' na tabela unidade: ${statusInfo[0].data_type}`);
        }
      } catch (err) {
        console.error('Erro ao verificar tipo da coluna status:', err.message);
      }
    }
    
    // Verificar outros enums
    console.log('\n===== VERIFICANDO ENUMS DA TABELA TIPO_BENEFICIO =====');
    try {
      const periodicidadeEnum = await AppDataSource.query(`
        SELECT enum_range(NULL::periodicidade_beneficio) as valores
      `);
      
      if (periodicidadeEnum && periodicidadeEnum.length > 0) {
        console.log('Valores válidos para enum periodicidade_beneficio:');
        const valores = periodicidadeEnum[0].valores
          .replace('{', '')
          .replace('}', '')
          .split(',');
        valores.forEach((valor: string) => {
          console.log(`- "${valor}"`);
        });
      } else {
        console.log('Não foi possível obter os valores de periodicidade_beneficio');
      }
    } catch (error) {
      console.error('Erro ao verificar enum periodicidade_beneficio:', error.message);
    }
    
    // Verificar estrutura detalhada das tabelas
    console.log('\n===== VERIFICANDO ESTRUTURA DETALHADA DAS TABELAS =====');
    
    const tables = ['unidade', 'setor', 'permissao', 'role', 'usuario', 'tipo_beneficio'];
    
    for (const table of tables) {
      console.log(`\nVerificando tabela ${table}:`);
      
      try {
        // Obter todas as colunas e seus tipos
        const columns = await AppDataSource.query(`
          SELECT column_name, data_type, udt_name, is_nullable
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [table]);
        
        console.log('Colunas:');
        columns.forEach((col: any) => {
          console.log(`- ${col.column_name}: ${col.data_type}${col.udt_name !== col.data_type ? ` (${col.udt_name})` : ''}, nullable=${col.is_nullable}`);
        });
        
        // Verificar constraints
        const constraints = await AppDataSource.query(`
          SELECT c.conname as constraint_name, 
                 c.contype as constraint_type,
                 pg_get_constraintdef(c.oid) as constraint_definition
          FROM pg_constraint c
          JOIN pg_namespace n ON n.oid = c.connamespace
          JOIN pg_class cl ON cl.oid = c.conrelid
          WHERE cl.relname = $1
            AND n.nspname = 'public'
        `, [table]);
        
        if (constraints.length > 0) {
          console.log('\nConstraints:');
          constraints.forEach((con: any) => {
            const type = con.constraint_type === 'p' ? 'PRIMARY KEY' :
                       con.constraint_type === 'f' ? 'FOREIGN KEY' :
                       con.constraint_type === 'u' ? 'UNIQUE' :
                       con.constraint_type === 'c' ? 'CHECK' : con.constraint_type;
            console.log(`- ${con.constraint_name} (${type}): ${con.constraint_definition}`);
          });
        }
      } catch (error) {
        console.error(`Erro ao verificar tabela ${table}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('Erro ao verificar enums:', error);
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
checkEnums()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Erro não tratado:', error);
    process.exit(1);
  });
