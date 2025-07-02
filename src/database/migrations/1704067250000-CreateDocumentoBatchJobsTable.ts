import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para criar a tabela de jobs de download em lote de documentos
 *
 * Esta migration cria a estrutura necessária para gerenciar jobs de download
 * em lote de documentos, incluindo controle de status, metadados e limpeza automática.
 *
 * @author Arquiteto de Software
 * @date 19/05/2025
 */
export class CreateDocumentoBatchJobsTable1704067250000
  implements MigrationInterface
{
  name = 'CreateDocumentoBatchJobsTable1704067250000';

  /**
   * Cria a tabela de jobs de download em lote
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Iniciando migration CreateDocumentoBatchJobsTable...');

    // Criar enum para status do job de download em lote
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_download_lote_enum') THEN
          CREATE TYPE "status_download_lote_enum" AS ENUM (
            'pendente',
            'processando', 
            'concluido',
            'erro',
            'cancelado',
            'expirado'
          );
        END IF;
      END $$;
    `);

    // Tabela principal de jobs de download em lote
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "documento_batch_jobs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "usuario_id" uuid NOT NULL,
        "unidade_id" uuid NOT NULL,
        "status" "status_download_lote_enum" NOT NULL DEFAULT 'pendente',
        "filtros" jsonb NOT NULL,
        "total_documentos" integer NOT NULL DEFAULT 0,
        "documentos_processados" integer NOT NULL DEFAULT 0,
        "tamanho_estimado" bigint NOT NULL DEFAULT 0,
        "tamanho_real" bigint,
        "nome_arquivo" character varying(255),
        "caminho_arquivo" character varying(500),
        "url_download" character varying(500),
        "data_inicio" TIMESTAMP,
        "data_conclusao" TIMESTAMP,
        "data_expiracao" TIMESTAMP NOT NULL,
        "erro_detalhes" text,
        "metadados" jsonb DEFAULT '{}',
        "progresso_percentual" integer NOT NULL DEFAULT 0,
        "tempo_estimado_restante" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "removed_at" TIMESTAMP,
        CONSTRAINT "PK_documento_batch_jobs" PRIMARY KEY ("id")
      );
    `);

    // Índices para otimização de consultas
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_BATCH_JOBS_USUARIO" ON "documento_batch_jobs" ("usuario_id");
      CREATE INDEX IF NOT EXISTS "IDX_BATCH_JOBS_UNIDADE" ON "documento_batch_jobs" ("unidade_id");
      CREATE INDEX IF NOT EXISTS "IDX_BATCH_JOBS_STATUS" ON "documento_batch_jobs" ("status");
      CREATE INDEX IF NOT EXISTS "IDX_BATCH_JOBS_DATA_EXPIRACAO" ON "documento_batch_jobs" ("data_expiracao");
      CREATE INDEX IF NOT EXISTS "IDX_BATCH_JOBS_CREATED_AT" ON "documento_batch_jobs" ("created_at");
      CREATE INDEX IF NOT EXISTS "IDX_BATCH_JOBS_USUARIO_STATUS" ON "documento_batch_jobs" ("usuario_id", "status");
      CREATE INDEX IF NOT EXISTS "IDX_BATCH_JOBS_FILTROS" ON "documento_batch_jobs" USING GIN ("filtros");
      CREATE INDEX IF NOT EXISTS "IDX_BATCH_JOBS_METADADOS" ON "documento_batch_jobs" USING GIN ("metadados");
    `);

    // Trigger para atualização automática de timestamp
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_documento_batch_jobs_update_timestamp ON "documento_batch_jobs";
      CREATE TRIGGER trigger_documento_batch_jobs_update_timestamp
        BEFORE UPDATE ON "documento_batch_jobs"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
    `);

    // Relacionamentos e chaves estrangeiras
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_batch_jobs_usuario'
        ) THEN
          ALTER TABLE "documento_batch_jobs" ADD CONSTRAINT "FK_batch_jobs_usuario"
          FOREIGN KEY ("usuario_id") REFERENCES "usuario" ("id") ON DELETE CASCADE;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_batch_jobs_unidade'
        ) THEN
          ALTER TABLE "documento_batch_jobs" ADD CONSTRAINT "FK_batch_jobs_unidade"
          FOREIGN KEY ("unidade_id") REFERENCES "unidade" ("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // Função para limpeza automática de jobs expirados
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION limpar_jobs_download_lote_expirados()
      RETURNS INTEGER AS $$
      DECLARE
        jobs_removidos INTEGER;
      BEGIN
        -- Marcar jobs expirados
        UPDATE "documento_batch_jobs" 
        SET 
          "status" = 'expirado',
          "updated_at" = now()
        WHERE 
          "data_expiracao" < now() 
          AND "status" NOT IN ('expirado', 'cancelado');
        
        GET DIAGNOSTICS jobs_removidos = ROW_COUNT;
        
        -- Log da operação
        INSERT INTO "auditoria" (
          "tabela", 
          "operacao", 
          "detalhes", 
          "usuario_id", 
          "data_operacao"
        ) VALUES (
          'documento_batch_jobs',
          'cleanup',
          jsonb_build_object('jobs_expirados', jobs_removidos),
          null,
          now()
        );
        
        RETURN jobs_removidos;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Constraint para validar progresso percentual
    await queryRunner.query(`
      ALTER TABLE "documento_batch_jobs" 
      ADD CONSTRAINT "CHK_progresso_percentual" 
      CHECK ("progresso_percentual" >= 0 AND "progresso_percentual" <= 100);
    `);

    // Constraint para validar documentos processados
    await queryRunner.query(`
      ALTER TABLE "documento_batch_jobs" 
      ADD CONSTRAINT "CHK_documentos_processados" 
      CHECK ("documentos_processados" >= 0 AND "documentos_processados" <= "total_documentos");
    `);

    // Constraint para validar datas
    await queryRunner.query(`
      ALTER TABLE "documento_batch_jobs" 
      ADD CONSTRAINT "CHK_data_expiracao" 
      CHECK ("data_expiracao" > "created_at");
    `);

    console.log('Tabela de jobs de download em lote criada com sucesso.');
    console.log(
      'Migration CreateDocumentoBatchJobsTable executada com sucesso.',
    );
  }

  /**
   * Reverte todas as alterações realizadas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Revertendo migration CreateDocumentoBatchJobsTable...');

    // Remover função de limpeza
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS limpar_jobs_download_lote_expirados();
    `);

    // Remover chaves estrangeiras
    await queryRunner.query(`
      ALTER TABLE "documento_batch_jobs" DROP CONSTRAINT IF EXISTS "FK_batch_jobs_usuario";
      ALTER TABLE "documento_batch_jobs" DROP CONSTRAINT IF EXISTS "FK_batch_jobs_unidade";
    `);

    // Remover constraints
    await queryRunner.query(`
      ALTER TABLE "documento_batch_jobs" DROP CONSTRAINT IF EXISTS "CHK_progresso_percentual";
      ALTER TABLE "documento_batch_jobs" DROP CONSTRAINT IF EXISTS "CHK_documentos_processados";
      ALTER TABLE "documento_batch_jobs" DROP CONSTRAINT IF EXISTS "CHK_data_expiracao";
    `);

    // Remover trigger
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_documento_batch_jobs_update_timestamp ON "documento_batch_jobs";
    `);

    // Remover tabela
    await queryRunner.query(`
      DROP TABLE IF EXISTS "documento_batch_jobs";
    `);

    // Remover enum
    await queryRunner.query(`
      DROP TYPE IF EXISTS "status_download_lote_enum";
    `);

    console.log(
      'Migration CreateDocumentoBatchJobsTable revertida com sucesso.',
    );
  }
}
