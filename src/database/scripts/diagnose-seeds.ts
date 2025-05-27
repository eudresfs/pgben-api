import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { AppDataSource } from '../../data-source';

// Carrega as variáveis de ambiente
config();

/**
 * Script para diagnosticar problemas com seeds
 */
async function main() {
  console.time('Diagnóstico');
  console.log('======================================================');
  console.log('Diagnóstico de Problemas com Seeds');
  console.log('======================================================');

  try {
    // Inicializa a conexão com o banco de dados
    await AppDataSource.initialize();
    console.log('Conexão com o banco de dados estabelecida com sucesso!');

    // Verificar a estrutura da tabela setor
    console.log('\nEstrutura da tabela "setor":');
    const colunas = await AppDataSource.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'setor'
    `);

    if (colunas.length === 0) {
      console.log('A tabela "setor" não existe no banco de dados.');
      
      // Verificar quais tabelas existem
      console.log('\nTabelas existentes no banco de dados:');
      const tabelas = await AppDataSource.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      if (tabelas.length === 0) {
        console.log('Não foram encontradas tabelas no banco de dados.');
      } else {
        tabelas.forEach((tabela: any) => {
          console.log(`- ${tabela.table_name}`);
        });
      }
    } else {
      console.log('Colunas encontradas:');
      colunas.forEach((coluna: any) => {
        console.log(`- ${coluna.column_name} (${coluna.data_type}, ${coluna.is_nullable === 'YES' ? 'nullable' : 'not nullable'})`);
      });
    }

    console.log('\nVerificando estrutura das entidades carregadas:');
    const entidades = AppDataSource.entityMetadatas;
    const setorEntity = entidades.find(entity => entity.tableName === 'setor');
    
    if (!setorEntity) {
      console.log('A entidade "Setor" não foi encontrada nas entidades carregadas.');
      console.log('Entidades carregadas:');
      entidades.forEach(entity => {
        console.log(`- ${entity.name} (tabela: ${entity.tableName})`);
      });
    } else {
      console.log(`Entidade: ${setorEntity.name}`);
      console.log(`Tabela: ${setorEntity.tableName}`);
      console.log('Colunas da entidade:');
      setorEntity.columns.forEach(column => {
        console.log(`- ${column.propertyName} -> ${column.databaseName} (${column.type})`);
      });
    }

    console.log('\nDiagnóstico concluído com sucesso!');
  } catch (error) {
    console.error('=== ERRO DURANTE O DIAGNÓSTICO ===');
    console.error('Mensagem de erro:', error.message);
    
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    if (error.code) {
      console.error('\nCódigo de erro:', error.code);
    }
    
    if (error.detail) {
      console.error('Detalhes:', error.detail);
    }
    
    // Tentativa de recuperação para mostrar as tabelas existentes
    try {
      if (AppDataSource && AppDataSource.isInitialized) {
        console.log('\nTentando verificar tabelas existentes...');
        AppDataSource.query(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
          ORDER BY table_name
        `).then(tabelas => {
          console.log('Tabelas encontradas:');
          tabelas.forEach((tabela: any) => {
            console.log(`- ${tabela.table_name}`);
          });
        }).catch(err => {
          console.error('Erro ao listar tabelas:', err.message);
        });
      }
    } catch (e) {
      console.error('Falha na tentativa de recuperação:', e.message);
    }
  } finally {
    // Fecha a conexão com o banco de dados
    if (AppDataSource && AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('Conexão com o banco de dados fechada.');
    }
    console.timeEnd('Diagnóstico');
    console.log('Diagnóstico finalizado.');
  }
}

// Executa o script
main().catch(error => {
  console.error('Erro fatal durante o diagnóstico:');
  console.error(error);
});
