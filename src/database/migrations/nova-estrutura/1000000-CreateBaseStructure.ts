import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration: CreateBaseStructure
 * 
 * Descrição: Cria a estrutura base do banco de dados, incluindo extensões PostgreSQL,
 * schemas e tabelas fundamentais para o funcionamento do sistema.
 * 
 * Domínio: Base
 * Dependências: Nenhuma
 * 
 * @author Arquiteto de Dados
 * @date 16/05/2025
 */
export class CreateBaseStructure1000000 implements MigrationInterface {
  name = 'CreateBaseStructure20250516000000';

  /**
   * Cria as estruturas de banco de dados base
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Criar extensões PostgreSQL necessárias
    await queryRunner.query(`
      -- Extensão para geração de UUIDs
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      
      -- Extensão para funções criptográficas
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
      
      -- Extensão para busca textual
      CREATE EXTENSION IF NOT EXISTS "pg_trgm";
      
      -- Extensão para índices GIN e GiST
      CREATE EXTENSION IF NOT EXISTS "btree_gin";
      
      -- Extensão para operações com JSON
      CREATE EXTENSION IF NOT EXISTS "jsonb_plpython3u";
    `);

    // 2. Criar schemas para organização
    await queryRunner.query(`
      -- Schema para autenticação e autorização
      CREATE SCHEMA IF NOT EXISTS "auth";
      
      -- Schema para auditoria
      CREATE SCHEMA IF NOT EXISTS "audit";
      
      -- Schema para relatórios
      CREATE SCHEMA IF NOT EXISTS "reports";
    `);

    // 3. Criar funções utilitárias
    await queryRunner.query(`
      -- Função para atualizar o timestamp de updated_at
      CREATE OR REPLACE FUNCTION update_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Função para validar CPF
      CREATE OR REPLACE FUNCTION validar_cpf(cpf TEXT)
      RETURNS BOOLEAN AS $$
      DECLARE
        soma INTEGER := 0;
        resto INTEGER;
        digito1 INTEGER;
        digito2 INTEGER;
        cpf_limpo TEXT;
      BEGIN
        -- Remover caracteres não numéricos
        cpf_limpo := regexp_replace(cpf, '[^0-9]', '', 'g');
        
        -- Verificar se tem 11 dígitos
        IF length(cpf_limpo) != 11 THEN
          RETURN FALSE;
        END IF;
        
        -- Verificar se todos os dígitos são iguais
        IF cpf_limpo ~ '^(.)\\1+$' THEN
          RETURN FALSE;
        END IF;
        
        -- Cálculo do primeiro dígito verificador
        soma := 0;
        FOR i IN 1..9 LOOP
          soma := soma + (substr(cpf_limpo, i, 1)::INTEGER * (11 - i));
        END LOOP;
        
        resto := soma % 11;
        IF resto < 2 THEN
          digito1 := 0;
        ELSE
          digito1 := 11 - resto;
        END IF;
        
        -- Cálculo do segundo dígito verificador
        soma := 0;
        FOR i IN 1..10 LOOP
          IF i < 10 THEN
            soma := soma + (substr(cpf_limpo, i, 1)::INTEGER * (12 - i));
          ELSE
            soma := soma + (digito1 * 2);
          END IF;
        END LOOP;
        
        resto := soma % 11;
        IF resto < 2 THEN
          digito2 := 0;
        ELSE
          digito2 := 11 - resto;
        END IF;
        
        -- Verificar se os dígitos calculados são iguais aos dígitos informados
        RETURN substr(cpf_limpo, 10, 1)::INTEGER = digito1 AND substr(cpf_limpo, 11, 1)::INTEGER = digito2;
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
      
      -- Função para validar NIS
      CREATE OR REPLACE FUNCTION validar_nis(nis TEXT)
      RETURNS BOOLEAN AS $$
      DECLARE
        soma INTEGER := 0;
        resto INTEGER;
        dv INTEGER;
        nis_limpo TEXT;
        pesos INTEGER[] := ARRAY[3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      BEGIN
        -- Remover caracteres não numéricos
        nis_limpo := regexp_replace(nis, '[^0-9]', '', 'g');
        
        -- Verificar se tem 11 dígitos
        IF length(nis_limpo) != 11 THEN
          RETURN FALSE;
        END IF;
        
        -- Verificar se todos os dígitos são iguais
        IF nis_limpo ~ '^(.)\\1+$' THEN
          RETURN FALSE;
        END IF;
        
        -- Cálculo do dígito verificador
        soma := 0;
        FOR i IN 1..10 LOOP
          soma := soma + (substr(nis_limpo, i, 1)::INTEGER * pesos[i]);
        END LOOP;
        
        resto := soma % 11;
        IF resto = 0 OR resto = 1 THEN
          dv := 0;
        ELSE
          dv := 11 - resto;
        END IF;
        
        -- Verificar se o dígito calculado é igual ao dígito informado
        RETURN substr(nis_limpo, 11, 1)::INTEGER = dv;
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
      
      -- Função para mascarar dados sensíveis (LGPD)
      CREATE OR REPLACE FUNCTION mascarar_dado_sensivel(dado TEXT, tipo TEXT)
      RETURNS TEXT AS $$
      BEGIN
        IF dado IS NULL THEN
          RETURN NULL;
        END IF;
        
        CASE tipo
          WHEN 'cpf' THEN
            RETURN substring(dado, 1, 3) || '.XXX.XXX-' || substring(dado, 10, 2);
          WHEN 'nis' THEN
            RETURN substring(dado, 1, 3) || '.XXXXX.XX-' || substring(dado, 11, 1);
          WHEN 'email' THEN
            RETURN substring(dado, 1, 2) || 'XXXX' || substring(dado from position('@' in dado));
          WHEN 'telefone' THEN
            RETURN '(' || substring(dado, 1, 2) || ') ' || substring(dado, 3, 1) || 'XXX-XXXX';
          WHEN 'nome' THEN
            RETURN split_part(dado, ' ', 1) || ' ' || 'XXXXXXXX';
          ELSE
            RETURN 'XXXXXXXX';
        END CASE;
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
      
      -- Função para criar partições automaticamente para tabelas de auditoria
      CREATE OR REPLACE FUNCTION criar_particao_por_data()
      RETURNS TRIGGER AS $$
      DECLARE
        tabela_base TEXT;
        particao_data TEXT;
        particao_nome TEXT;
        data_inicio DATE;
        data_fim DATE;
      BEGIN
        -- Obter nome da tabela base
        tabela_base := TG_TABLE_NAME;
        
        -- Formatar data para nome da partição (YYYY_MM)
        particao_data := to_char(NEW.created_at, 'YYYY_MM');
        particao_nome := tabela_base || '_' || particao_data;
        
        -- Definir intervalo de datas para a partição
        data_inicio := date_trunc('month', NEW.created_at);
        data_fim := data_inicio + interval '1 month';
        
        -- Verificar se a partição já existe
        IF NOT EXISTS (
          SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE c.relname = particao_nome AND n.nspname = TG_TABLE_SCHEMA
        ) THEN
          -- Criar nova partição
          EXECUTE format('
            CREATE TABLE %I.%I PARTITION OF %I.%I
            FOR VALUES FROM (%L) TO (%L)',
            TG_TABLE_SCHEMA, particao_nome, TG_TABLE_SCHEMA, tabela_base,
            data_inicio, data_fim
          );
          
          -- Criar índices na nova partição
          EXECUTE format('
            CREATE INDEX %I ON %I.%I (created_at)',
            'idx_' || particao_nome || '_created_at', TG_TABLE_SCHEMA, particao_nome
          );
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 4. Configurar variáveis de aplicação
    await queryRunner.query(`
      -- Configurar variáveis de aplicação para RLS
      ALTER DATABASE CURRENT_DATABASE() SET "app.enable_rls" TO 'on';
    `);

    // 5. Criar tabela de configurações do sistema
    await queryRunner.createTable(
      new Table({
        name: 'configuracao_sistema',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'chave',
            type: 'varchar',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'valor',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'descricao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'categoria',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'tipo_valor',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // 6. Criar índices para a tabela de configurações
    await queryRunner.createIndex(
      'configuracao_sistema',
      new TableIndex({
        name: 'IDX_CONFIGURACAO_CHAVE',
        columnNames: ['chave'],
      }),
    );

    await queryRunner.createIndex(
      'configuracao_sistema',
      new TableIndex({
        name: 'IDX_CONFIGURACAO_CATEGORIA',
        columnNames: ['categoria'],
      }),
    );

    // 7. Criar trigger para atualização automática de updated_at
    await queryRunner.query(`
      CREATE TRIGGER update_configuracao_sistema_timestamp
      BEFORE UPDATE ON configuracao_sistema
      FOR EACH ROW EXECUTE FUNCTION update_timestamp();
    `);

    // 8. Inserir configurações iniciais do sistema
    await queryRunner.query(`
      INSERT INTO configuracao_sistema (chave, valor, descricao, categoria, tipo_valor)
      VALUES
        ('sistema.nome', 'PGBen', 'Nome do sistema', 'sistema', 'string'),
        ('sistema.versao', '1.0.0', 'Versão do sistema', 'sistema', 'string'),
        ('sistema.ambiente', 'desenvolvimento', 'Ambiente de execução', 'sistema', 'string'),
        ('auditoria.ativo', 'true', 'Ativa/desativa o sistema de auditoria', 'auditoria', 'boolean'),
        ('auditoria.nivel', 'completo', 'Nível de detalhamento da auditoria', 'auditoria', 'string'),
        ('seguranca.tempo_sessao', '3600', 'Tempo de sessão em segundos', 'seguranca', 'number'),
        ('seguranca.tentativas_login', '5', 'Número máximo de tentativas de login', 'seguranca', 'number'),
        ('seguranca.bloqueio_tempo', '300', 'Tempo de bloqueio após tentativas falhas (segundos)', 'seguranca', 'number'),
        ('email.servidor', 'smtp.semtas.natal.rn.gov.br', 'Servidor SMTP para envio de emails', 'email', 'string'),
        ('email.porta', '587', 'Porta do servidor SMTP', 'email', 'number'),
        ('email.remetente', 'noreply@semtas.natal.rn.gov.br', 'Email remetente', 'email', 'string'),
        ('email.assunto_padrao', 'Comunicado SEMTAS - Sistema PGBen', 'Assunto padrão para emails', 'email', 'string');
    `);
  }

  /**
   * Reverte todas as alterações feitas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Remover trigger
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_configuracao_sistema_timestamp ON configuracao_sistema;
    `);

    // 2. Remover índices
    await queryRunner.dropIndex('configuracao_sistema', 'IDX_CONFIGURACAO_CATEGORIA');
    await queryRunner.dropIndex('configuracao_sistema', 'IDX_CONFIGURACAO_CHAVE');

    // 3. Remover tabela de configurações
    await queryRunner.dropTable('configuracao_sistema');

    // 4. Remover funções utilitárias
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS criar_particao_por_data();
      DROP FUNCTION IF EXISTS mascarar_dado_sensivel(TEXT, TEXT);
      DROP FUNCTION IF EXISTS validar_nis(TEXT);
      DROP FUNCTION IF EXISTS validar_cpf(TEXT);
      DROP FUNCTION IF EXISTS update_timestamp();
    `);

    // 5. Remover schemas
    await queryRunner.query(`
      DROP SCHEMA IF EXISTS "reports" CASCADE;
      DROP SCHEMA IF EXISTS "audit" CASCADE;
      DROP SCHEMA IF EXISTS "auth" CASCADE;
    `);

    // 6. Remover extensões
    // Nota: Geralmente não removemos extensões em down() para evitar afetar outros sistemas
    // que possam estar usando as mesmas extensões. Comentado por segurança.
    /*
    await queryRunner.query(`
      DROP EXTENSION IF EXISTS "jsonb_plpython3u";
      DROP EXTENSION IF EXISTS "btree_gin";
      DROP EXTENSION IF EXISTS "pg_trgm";
      DROP EXTENSION IF EXISTS "pgcrypto";
      DROP EXTENSION IF EXISTS "uuid-ossp";
    `);
    */
  }
}
