/**
 * Script para verificar os valores válidos dos enums no banco de dados
 */
import { AppDataSource } from './seed-source';

async function checkEnumValues() {
  try {
    console.log('Iniciando conexão com o banco de dados...');
    await AppDataSource.initialize();
    console.log('Conexão estabelecida com sucesso!');

    // Verificar valores do enum tipo_unidade
    try {
      console.log('\n===== VALORES DO ENUM tipo_unidade =====');
      const tipoUnidadeEnum = await AppDataSource.query(
        `SELECT e.enumlabel 
         FROM pg_enum e
         JOIN pg_type t ON e.enumtypid = t.oid
         WHERE t.typname = 'tipo_unidade'
         ORDER BY e.enumsortorder`
      );
      
      if (tipoUnidadeEnum.length === 0) {
        console.log('Nenhum valor encontrado para o enum tipo_unidade');
      } else {
        console.log('Valores válidos para tipo_unidade:');
        tipoUnidadeEnum.forEach((v: any) => console.log(`- ${v.enumlabel}`));
      }
    } catch (error) {
      console.error('Erro ao verificar valores do enum tipo_unidade:', error.message);
    }

    // Verificar valores do enum status_unidade
    try {
      console.log('\n===== VALORES DO ENUM status_unidade =====');
      const statusUnidadeEnum = await AppDataSource.query(
        `SELECT e.enumlabel 
         FROM pg_enum e
         JOIN pg_type t ON e.enumtypid = t.oid
         WHERE t.typname = 'status_unidade'
         ORDER BY e.enumsortorder`
      );
      
      if (statusUnidadeEnum.length === 0) {
        console.log('Nenhum valor encontrado para o enum status_unidade');
      } else {
        console.log('Valores válidos para status_unidade:');
        statusUnidadeEnum.forEach((v: any) => console.log(`- ${v.enumlabel}`));
      }
    } catch (error) {
      console.error('Erro ao verificar valores do enum status_unidade:', error.message);
    }

    // Verificar valores do enum periodicidade_enum
    try {
      console.log('\n===== VALORES DO ENUM periodicidade_enum =====');
      const periodicidadeEnum = await AppDataSource.query(
        `SELECT e.enumlabel 
         FROM pg_enum e
         JOIN pg_type t ON e.enumtypid = t.oid
         WHERE t.typname = 'periodicidade_enum'
         ORDER BY e.enumsortorder`
      );
      
      if (periodicidadeEnum.length === 0) {
        console.log('Nenhum valor encontrado para o enum periodicidade_enum');
      } else {
        console.log('Valores válidos para periodicidade_enum:');
        periodicidadeEnum.forEach((v: any) => console.log(`- ${v.enumlabel}`));
      }
    } catch (error) {
      console.error('Erro ao verificar valores do enum periodicidade_enum:', error.message);
    }

    // Verificar estrutura da tabela usuario
    try {
      console.log('\n===== ESTRUTURA DA TABELA usuario =====');
      const usuarioColumns = await AppDataSource.query(
        `SELECT column_name, data_type, is_nullable 
         FROM information_schema.columns 
         WHERE table_name = 'usuario'
         ORDER BY ordinal_position`
      );
      
      if (usuarioColumns.length === 0) {
        console.log('Nenhuma coluna encontrada para a tabela usuario');
      } else {
        console.log('Colunas da tabela usuario:');
        usuarioColumns.forEach((c: any) => {
          console.log(`- ${c.column_name} (${c.data_type}, ${c.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });
      }
    } catch (error) {
      console.error('Erro ao verificar estrutura da tabela usuario:', error.message);
    }

    // Verificar se a tabela role existe
    try {
      console.log('\n===== VERIFICANDO TABELA role =====');
      const roleExists = await AppDataSource.query(
        `SELECT EXISTS (
           SELECT FROM information_schema.tables 
           WHERE table_schema = 'public' 
           AND table_name = 'role'
         ) as exists`
      );
      
      if (roleExists[0].exists) {
        console.log('Tabela role existe');
        
        // Verificar estrutura da tabela role
        const roleColumns = await AppDataSource.query(
          `SELECT column_name, data_type, is_nullable 
           FROM information_schema.columns 
           WHERE table_name = 'role'
           ORDER BY ordinal_position`
        );
        
        console.log('Colunas da tabela role:');
        roleColumns.forEach((c: any) => {
          console.log(`- ${c.column_name} (${c.data_type}, ${c.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });
      } else {
        console.log('Tabela role NÃO existe');
      }
    } catch (error) {
      console.error('Erro ao verificar tabela role:', error.message);
    }

    // Verificar se a tabela role existe
    try {
      console.log('\n===== VERIFICANDO TABELA role =====');
      const roleExists = await AppDataSource.query(
        `SELECT EXISTS (
           SELECT FROM information_schema.tables 
           WHERE table_schema = 'public' 
           AND table_name = 'role'
         ) as exists`
      );
      
      if (roleExists[0].exists) {
        console.log('Tabela role existe');
        
        // Verificar estrutura da tabela role
        const roleColumns = await AppDataSource.query(
          `SELECT column_name, data_type, is_nullable 
           FROM information_schema.columns 
           WHERE table_name = 'role'
           ORDER BY ordinal_position`
        );
        
        console.log('Colunas da tabela role:');
        roleColumns.forEach((c: any) => {
          console.log(`- ${c.column_name} (${c.data_type}, ${c.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });
      } else {
        console.log('Tabela role NÃO existe');
      }
    } catch (error) {
      console.error('Erro ao verificar tabela role:', error.message);
    }
    
  } catch (error) {
    console.error('Erro durante a verificação dos valores dos enums:', error);
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
checkEnumValues()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Erro não tratado:', error);
    process.exit(1);
  });
