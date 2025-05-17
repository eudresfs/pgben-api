import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Carregar variáveis de ambiente
config();

/**
 * Script para verificar a integridade referencial do banco de dados
 *
 * Este script verifica se todas as chaves estrangeiras estão funcionando corretamente
 * e se a integridade referencial está sendo mantida no banco de dados
 */
async function verificarIntegridadeReferencial() {
  console.log('======================================================');
  console.log('Iniciando verificação de integridade referencial');
  console.log('======================================================');

  // Configurações para conexão com o banco de dados de teste
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE_TEST || 'pgben_test',
  };

  // Criar conexão com o banco de dados de teste
  const dataSource = new DataSource({
    type: 'postgres',
    host: dbConfig.host,
    port: dbConfig.port,
    username: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database,
    synchronize: false,
    logging: false,
  });

  try {
    // Iniciar conexão
    await dataSource.initialize();
    console.log(
      `Conexão com banco de dados de teste ${dbConfig.database} estabelecida`,
    );

    // Consulta para obter todas as chaves estrangeiras do banco
    const foreignKeys = await dataSource.query(`
      SELECT
        tc.table_schema, 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_schema AS foreign_table_schema,
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
      WHERE tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name;
    `);

    console.log(
      `Total de chaves estrangeiras encontradas: ${foreignKeys.length}`,
    );

    // Verificar cada chave estrangeira
    let sucessos = 0;
    let falhas = 0;
    // Definir tipo explícito para o array de falhas
    const falhasDetalhes: Array<{
      constraint: string;
      erro: string;
    }> = [];

    for (const fk of foreignKeys) {
      try {
        // Verificar se a tabela referenciada existe
        const tabelaReferenciadaExiste = await dataSource.query(
          `
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = $1 AND table_name = $2
          );
        `,
          [fk.foreign_table_schema, fk.foreign_table_name],
        );

        if (!tabelaReferenciadaExiste[0].exists) {
          falhas++;
          falhasDetalhes.push({
            constraint: fk.constraint_name,
            erro: `Tabela referenciada não existe: ${fk.foreign_table_schema}.${fk.foreign_table_name}`,
          });
          continue;
        }

        // Verificar se a coluna referenciada existe
        const colunaReferenciadaExiste = await dataSource.query(
          `
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = $1 AND table_name = $2 AND column_name = $3
          );
        `,
          [
            fk.foreign_table_schema,
            fk.foreign_table_name,
            fk.foreign_column_name,
          ],
        );

        if (!colunaReferenciadaExiste[0].exists) {
          falhas++;
          falhasDetalhes.push({
            constraint: fk.constraint_name,
            erro: `Coluna referenciada não existe: ${fk.foreign_table_schema}.${fk.foreign_table_name}.${fk.foreign_column_name}`,
          });
          continue;
        }

        // Verificar se há registros órfãos (que violam a integridade referencial)
        const registrosOrfaos = await dataSource.query(`
          SELECT COUNT(*) FROM ${fk.table_schema}.${fk.table_name} t1
          LEFT JOIN ${fk.foreign_table_schema}.${fk.foreign_table_name} t2
          ON t1.${fk.column_name} = t2.${fk.foreign_column_name}
          WHERE t1.${fk.column_name} IS NOT NULL
          AND t2.${fk.foreign_column_name} IS NULL;
        `);

        if (parseInt(registrosOrfaos[0].count) > 0) {
          falhas++;
          falhasDetalhes.push({
            constraint: fk.constraint_name,
            erro: `Encontrados ${registrosOrfaos[0].count} registros órfãos em ${fk.table_schema}.${fk.table_name}.${fk.column_name}`,
          });
          continue;
        }

        // Se chegou aqui, a chave estrangeira está correta
        sucessos++;
      } catch (error) {
        falhas++;
        falhasDetalhes.push({
          constraint: fk.constraint_name,
          erro: `Erro ao verificar: ${error.message}`,
        });
      }
    }

    console.log(
      `Verificação concluída: ${sucessos} chaves estrangeiras corretas, ${falhas} com problemas`,
    );

    if (falhas > 0) {
      console.log('\nDetalhes das falhas:');
      falhasDetalhes.forEach((falha, index) => {
        console.log(`${index + 1}. Constraint: ${falha.constraint}`);
        console.log(`   Erro: ${falha.erro}`);
      });
    }

    // Fechar conexão
    await dataSource.destroy();
    console.log(
      `Conexão com banco de dados de teste ${dbConfig.database} fechada`,
    );

    console.log('======================================================');
    console.log('Verificação de integridade referencial concluída!');
    console.log('======================================================');

    return falhas === 0;
  } catch (error) {
    console.error('Erro durante a verificação de integridade referencial:');
    console.error(error);

    // Tentar fechar a conexão se estiver aberta
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }

    return false;
  }
}

// Executar o script se for chamado diretamente
if (require.main === module) {
  verificarIntegridadeReferencial()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Erro não tratado:', error);
      process.exit(1);
    });
}

export { verificarIntegridadeReferencial };
