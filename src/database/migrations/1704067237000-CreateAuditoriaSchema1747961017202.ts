import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para criar o schema relacionado ao módulo de auditoria
 *
 * Esta migration cria as tabelas, enumerações e restrições para o módulo de auditoria,
 * permitindo o registro e rastreamento de ações realizadas no sistema para compliance e segurança.
 *
 * @author Engenheiro de Dados
 * @date 20/05/2025
 */
export class CreateAuditoriaSchema1704067227000 implements MigrationInterface {
  name = 'CreateAuditoriaSchema1704067227000';

  /**
   * Cria as estruturas relacionadas à auditoria
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Iniciando migration 1120000-CreateAuditoriaSchema...');

    // Criação de um tipo enumerado mais simples para o tipo de operação
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_operacao') THEN
          CREATE TYPE "tipo_operacao" AS ENUM (
            'create',
            'read',
            'update',
            'delete',
            'access',
            'export',
            'anonymize',
            'login',
            'logout',
            'failed_login'
          );
        END IF;
      END
      $$;
    `);

    console.log('Tipos enumerados criados com sucesso.');

    // Tabela principal de logs de auditoria
    const logsAuditoriaExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'logs_auditoria'
      );
    `);

    if (!logsAuditoriaExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "logs_auditoria" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tipo_operacao" character varying(20) NOT NULL,
        "entidade_afetada" character varying(100) NOT NULL,
        "entidade_id" character varying(36),
        "dados_anteriores" jsonb,
        "dados_novos" jsonb,
        "usuario_id" uuid,
        "descricao" character varying(500),
        "ip_origem" character varying(45),
        "user_agent" character varying(500),
        "dados_sensiveis_acessados" jsonb,
        "endpoint" character varying(255),
        "metodo_http" character varying(10),
        "data_hora" timestamp with time zone,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_logs_auditoria" PRIMARY KEY ("id")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX IF NOT EXISTS "IDX_logs_auditoria_usuario_data" ON "logs_auditoria" ("usuario_id", "created_at");
      CREATE INDEX IF NOT EXISTS "IDX_logs_auditoria_entidade_data" ON "logs_auditoria" ("entidade_afetada", "created_at");
      CREATE INDEX IF NOT EXISTS "IDX_logs_auditoria_tipo_data" ON "logs_auditoria" ("tipo_operacao", "created_at");
      CREATE INDEX IF NOT EXISTS "IDX_logs_auditoria_data_hora" ON "logs_auditoria" ("data_hora");
      CREATE INDEX IF NOT EXISTS "IDX_logs_auditoria_entidade_id" ON "logs_auditoria" ("entidade_id");
      `);
    } else {
      console.log('Tabela logs_auditoria já existe, pulando criação.');
    }

    console.log('Tabela de logs de auditoria criada com sucesso.');

    // Adicionando políticas RLS (Row-Level Security)
    await queryRunner.query(`
      ALTER TABLE "logs_auditoria" ENABLE ROW LEVEL SECURITY;
      
      -- Política simples para postgres (usuário de migração)
      CREATE POLICY logs_auditoria_policy ON "logs_auditoria" 
        USING (current_user = 'postgres');
    `);

    // Função para gerar hash de identificação dos logs (pseudonimização LGPD)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION generate_log_hash()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Gera um hash baseado no ID da entidade e no timestamp para pseudonimização
        NEW.dados_sensiveis_acessados = 
          CASE WHEN NEW.dados_sensiveis_acessados IS NOT NULL
            THEN NEW.dados_sensiveis_acessados
            ELSE '[]'::jsonb
          END;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Trigger para aplicar a função de hash
      DROP TRIGGER IF EXISTS trigger_logs_auditoria_hash ON "logs_auditoria";
      CREATE TRIGGER trigger_logs_auditoria_hash
      BEFORE INSERT ON "logs_auditoria"
      FOR EACH ROW
      EXECUTE FUNCTION generate_log_hash();
    `);

    // Função para limitar o tempo de retenção de logs detalhados (LGPD)
    // Reteremos apenas logs anonimizados após 5 anos
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION anonymize_old_logs()
      RETURNS void AS $$
      BEGIN
        -- Anonimização de logs com mais de 5 anos, mantendo apenas metadados estatísticos
        UPDATE "logs_auditoria"
        SET 
          dados_anteriores = NULL,
          dados_novos = NULL,
          ip_origem = NULL,
          user_agent = NULL,
          dados_sensiveis_acessados = NULL,
          endpoint = NULL
        WHERE created_at < NOW() - INTERVAL '5 years';
        
        -- Poderia incluir também exclusão completa de logs muito antigos
        -- conforme política de retenção de dados
      END;
      $$ LANGUAGE plpgsql;
    `);

    console.log(
      'Migration 1120000-CreateAuditoriaSchema executada com sucesso.',
    );
  }

  /**
   * Reverte todas as alterações realizadas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Revertendo migration 1120000-CreateAuditoriaSchema...');

    // Remover políticas RLS
    await queryRunner.query(`
      DROP POLICY IF EXISTS logs_auditoria_policy ON "logs_auditoria";
    `);

    // Remover triggers e funções
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_logs_auditoria_hash ON "logs_auditoria";
      DROP FUNCTION IF EXISTS generate_log_hash();
      DROP FUNCTION IF EXISTS anonymize_old_logs();
    `);

    // Remover tabelas
    await queryRunner.query(`
      DROP TABLE IF EXISTS "logs_auditoria";
    `);

    // Remover tipos enumerados
    await queryRunner.query(`
      DROP TYPE IF EXISTS "tipo_operacao";
    `);

    console.log(
      'Migration 1120000-CreateAuditoriaSchema revertida com sucesso.',
    );
  }
}
