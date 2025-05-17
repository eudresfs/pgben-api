import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Carregar variáveis de ambiente
config();

/**
 * Script para testar as políticas RLS (Row Level Security) do banco de dados
 *
 * Este script verifica se as políticas RLS estão funcionando corretamente,
 * simulando diferentes perfis de usuário e verificando as permissões de acesso
 */
async function testarPoliticasRLS() {
  console.log('======================================================');
  console.log('Iniciando teste das políticas RLS');
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

    // Verificar se as tabelas têm RLS habilitado
    console.log('\nVerificando tabelas com RLS habilitado...');
    const tabelasComRLS = await dataSource.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN (
        SELECT relname FROM pg_class
        WHERE relrowsecurity = true
      )
      ORDER BY tablename;
    `);

    console.log(`Total de tabelas com RLS habilitado: ${tabelasComRLS.length}`);
    if (tabelasComRLS.length > 0) {
      console.log('Tabelas com RLS habilitado:');
      tabelasComRLS.forEach((tabela, index) => {
        console.log(`${index + 1}. ${tabela.tablename}`);
      });
    }

    // Verificar políticas RLS definidas
    console.log('\nVerificando políticas RLS definidas...');
    const politicasRLS = await dataSource.query(`
      SELECT 
        schemaname, 
        tablename, 
        policyname, 
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      ORDER BY tablename, policyname;
    `);

    console.log(`Total de políticas RLS definidas: ${politicasRLS.length}`);
    if (politicasRLS.length > 0) {
      console.log('Políticas RLS definidas:');
      politicasRLS.forEach((politica, index) => {
        console.log(
          `${index + 1}. ${politica.policyname} (${politica.tablename})`,
        );
        console.log(`   Comando: ${politica.cmd}`);
        console.log(`   Roles: ${politica.roles}`);
      });
    }

    // Testar políticas RLS para diferentes perfis de usuário
    console.log(
      '\nTestando políticas RLS para diferentes perfis de usuário...',
    );

    // 1. Criar usuários de teste para cada perfil
    const perfisUsuario = [
      'administrador',
      'gestor_semtas',
      'tecnico_semtas',
      'tecnico_unidade',
    ];
    const usuariosIds = {};

    for (const perfil of perfisUsuario) {
      // Buscar o ID do perfil
      const perfilResult = await dataSource.query(
        'SELECT id FROM perfil WHERE nome = $1',
        [perfil],
      );

      if (perfilResult.length === 0) {
        console.log(`Perfil ${perfil} não encontrado, pulando...`);
        continue;
      }

      const perfilId = perfilResult[0].id;

      // Criar usuário de teste para o perfil
      const usuarioResult = await dataSource.query(
        `INSERT INTO usuario (
          nome, 
          email, 
          senha, 
          perfil_id, 
          ativo, 
          ultimo_acesso, 
          falhas_login, 
          bloqueado
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id`,
        [
          `Usuário Teste ${perfil}`,
          `teste.${perfil}@pgben.gov.br`,
          'senha_teste_hash',
          perfilId,
          true,
          new Date(),
          0,
          false,
        ],
      );

      usuariosIds[perfil] = usuarioResult[0].id;
      console.log(
        `Usuário de teste criado para perfil ${perfil}: ${usuariosIds[perfil]}`,
      );
    }

    // 2. Testar acesso para cada perfil
    console.log('\nTestando acesso para cada perfil...');

    // Tabelas a serem testadas
    const tabelasTeste = [
      'cidadao',
      'solicitacao',
      'tipo_beneficio',
      'documento_solicitacao',
      'avaliacao_solicitacao',
    ];

    for (const perfil in usuariosIds) {
      console.log(`\nTestando acesso para perfil: ${perfil}`);

      // Configurar variáveis de sessão para o usuário
      await dataSource.query(`
        SET LOCAL app.current_user_id = '${usuariosIds[perfil]}';
        SET LOCAL app.current_user_role = '${perfil}';
      `);

      for (const tabela of tabelasTeste) {
        try {
          // Tentar acessar a tabela
          const result = await dataSource.query(`
            SELECT COUNT(*) FROM ${tabela}
          `);

          console.log(
            `✅ ${perfil} pode acessar ${tabela}: ${result[0].count} registros`,
          );
        } catch (error) {
          console.log(
            `❌ ${perfil} não pode acessar ${tabela}: ${error.message}`,
          );
        }
      }

      // Limpar variáveis de sessão
      await dataSource.query(`
        RESET app.current_user_id;
        RESET app.current_user_role;
      `);
    }

    // 3. Testar inserção para cada perfil
    console.log('\nTestando inserção para cada perfil...');

    for (const perfil in usuariosIds) {
      console.log(`\nTestando inserção para perfil: ${perfil}`);

      // Configurar variáveis de sessão para o usuário
      await dataSource.query(`
        SET LOCAL app.current_user_id = '${usuariosIds[perfil]}';
        SET LOCAL app.current_user_role = '${perfil}';
      `);

      // Tentar inserir um cidadão
      try {
        await dataSource.query(`
          INSERT INTO cidadao (
            nome, 
            cpf, 
            data_nascimento, 
            genero, 
            estado_civil, 
            unidade_id
          )
          VALUES (
            'Cidadão Teste RLS', 
            '99999999999', 
            '1990-01-01', 
            'masculino', 
            'solteiro', 
            (SELECT id FROM unidade LIMIT 1)
          )
        `);

        console.log(`✅ ${perfil} pode inserir em cidadao`);
      } catch (error) {
        console.log(
          `❌ ${perfil} não pode inserir em cidadao: ${error.message}`,
        );
      }

      // Limpar variáveis de sessão
      await dataSource.query(`
        RESET app.current_user_id;
        RESET app.current_user_role;
      `);
    }

    // Limpar dados de teste
    console.log('\nLimpando dados de teste...');
    for (const perfil in usuariosIds) {
      await dataSource.query('DELETE FROM usuario WHERE id = $1', [
        usuariosIds[perfil],
      ]);
    }

    await dataSource.query("DELETE FROM cidadao WHERE cpf = '99999999999'");

    // Fechar conexão
    await dataSource.destroy();
    console.log(
      `Conexão com banco de dados de teste ${dbConfig.database} fechada`,
    );

    console.log('======================================================');
    console.log('Teste das políticas RLS concluído!');
    console.log('======================================================');

    return true;
  } catch (error) {
    console.error('Erro durante o teste das políticas RLS:');
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
  testarPoliticasRLS()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Erro não tratado:', error);
      process.exit(1);
    });
}

export { testarPoliticasRLS };
