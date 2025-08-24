import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para criar o schema do módulo EasyUpload
 *
 * Esta migration cria as tabelas e estruturas necessárias para o sistema
 * de upload via QR Code e tokens, incluindo:
 * - Tabela de tokens de upload
 * - Tabela de sessões de upload
 * - Enums para status
 * - Índices para performance
 * - Triggers para auditoria
 *
 * @author Sistema PGBEN
 * @date 15/01/2024
 */
export class CreateEasyUploadSchema1750600000000 implements MigrationInterface {
  name = 'CreateEasyUploadSchema1750600000000';

  /**
   * Cria as estruturas do módulo EasyUpload
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Iniciando migration CreateEasyUploadSchema...');

    // Criar enums para status
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "upload_token_status_enum" AS ENUM (
          'ativo',
          'usado',
          'expirado',
          'cancelado'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "upload_session_status_enum" AS ENUM (
          'iniciada',
          'ativa',
          'completada',
          'expirada',
          'cancelada',
          'erro'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    console.log('Enums criados com sucesso.');

    // Tabela de tokens de upload
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "upload_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "usuario_id" uuid NOT NULL,
        "solicitacao_id" uuid,
        "cidadao_id" uuid,
        "token" character varying(500) NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "status" "upload_token_status_enum" NOT NULL DEFAULT 'ativo',
        "max_files" integer NOT NULL DEFAULT 10,
        "required_documents" jsonb,
        "metadata" jsonb,
        "used_at" TIMESTAMP WITH TIME ZONE,
        "cancelled_at" TIMESTAMP WITH TIME ZONE,
        "cancelled_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_upload_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_upload_tokens_token" UNIQUE ("token")
      );
    `);

    console.log('Tabela upload_tokens criada com sucesso.');

    // Tabela de sessões de upload
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "upload_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "token_id" uuid NOT NULL,
        "ip_address" character varying(45),
        "user_agent" text,
        "device_fingerprint" character varying(255),
        "files_uploaded" integer NOT NULL DEFAULT 0,
        "total_size_bytes" bigint NOT NULL DEFAULT 0,
        "started_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "last_activity_at" TIMESTAMP WITH TIME ZONE,
        "completed_at" TIMESTAMP WITH TIME ZONE,
        "status" "upload_session_status_enum" NOT NULL DEFAULT 'iniciada',
        "error_message" text,
        "session_metadata" jsonb,
        "upload_progress" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_upload_sessions" PRIMARY KEY ("id")
      );
    `);

    console.log('Tabela upload_sessions criada com sucesso.');

    // Índices para performance - upload_tokens
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_UPLOAD_TOKENS_USUARIO" ON "upload_tokens" ("usuario_id");
      CREATE INDEX IF NOT EXISTS "IDX_UPLOAD_TOKENS_SOLICITACAO" ON "upload_tokens" ("solicitacao_id");
      CREATE INDEX IF NOT EXISTS "IDX_UPLOAD_TOKENS_CIDADAO" ON "upload_tokens" ("cidadao_id");
      CREATE INDEX IF NOT EXISTS "IDX_UPLOAD_TOKENS_STATUS" ON "upload_tokens" ("status");
      CREATE INDEX IF NOT EXISTS "IDX_UPLOAD_TOKENS_EXPIRES_AT" ON "upload_tokens" ("expires_at");
      CREATE INDEX IF NOT EXISTS "IDX_UPLOAD_TOKENS_CREATED_AT" ON "upload_tokens" ("created_at");
      CREATE INDEX IF NOT EXISTS "IDX_UPLOAD_TOKENS_TOKEN_HASH" ON "upload_tokens" USING HASH ("token");
      CREATE INDEX IF NOT EXISTS "IDX_UPLOAD_TOKENS_STATUS_EXPIRES" ON "upload_tokens" ("status", "expires_at");
      CREATE INDEX IF NOT EXISTS "IDX_UPLOAD_TOKENS_USUARIO_STATUS" ON "upload_tokens" ("usuario_id", "status");
      CREATE INDEX IF NOT EXISTS "IDX_UPLOAD_TOKENS_METADATA" ON "upload_tokens" USING GIN ("metadata");
    `);

    // Índices para performance - upload_sessions
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_UPLOAD_SESSIONS_TOKEN" ON "upload_sessions" ("token_id");
      CREATE INDEX IF NOT EXISTS "IDX_UPLOAD_SESSIONS_STATUS" ON "upload_sessions" ("status");
      CREATE INDEX IF NOT EXISTS "IDX_UPLOAD_SESSIONS_IP" ON "upload_sessions" ("ip_address");
      CREATE INDEX IF NOT EXISTS "IDX_UPLOAD_SESSIONS_STARTED_AT" ON "upload_sessions" ("started_at");
      CREATE INDEX IF NOT EXISTS "IDX_UPLOAD_SESSIONS_LAST_ACTIVITY" ON "upload_sessions" ("last_activity_at");
      CREATE INDEX IF NOT EXISTS "IDX_UPLOAD_SESSIONS_COMPLETED_AT" ON "upload_sessions" ("completed_at");
      CREATE INDEX IF NOT EXISTS "IDX_UPLOAD_SESSIONS_TOKEN_STATUS" ON "upload_sessions" ("token_id", "status");
      CREATE INDEX IF NOT EXISTS "IDX_UPLOAD_SESSIONS_IP_STARTED" ON "upload_sessions" ("ip_address", "started_at");
      CREATE INDEX IF NOT EXISTS "IDX_UPLOAD_SESSIONS_PROGRESS" ON "upload_sessions" USING GIN ("upload_progress");
      CREATE INDEX IF NOT EXISTS "IDX_UPLOAD_SESSIONS_METADATA" ON "upload_sessions" USING GIN ("session_metadata");
    `);

    console.log('Índices criados com sucesso.');

    // Foreign Keys
    await queryRunner.query(`
      ALTER TABLE "upload_tokens"
      ADD CONSTRAINT "FK_upload_tokens_usuario"
      FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE "upload_tokens"
      ADD CONSTRAINT "FK_upload_tokens_solicitacao"
      FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacoes"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE "upload_tokens"
      ADD CONSTRAINT "FK_upload_tokens_cidadao"
      FOREIGN KEY ("cidadao_id") REFERENCES "cidadaos"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE "upload_tokens"
      ADD CONSTRAINT "FK_upload_tokens_cancelled_by"
      FOREIGN KEY ("cancelled_by") REFERENCES "usuarios"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE "upload_sessions"
      ADD CONSTRAINT "FK_upload_sessions_token"
      FOREIGN KEY ("token_id") REFERENCES "upload_tokens"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
    `);

    console.log('Foreign keys criadas com sucesso.');

    // Triggers para atualização automática de timestamp
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_upload_tokens_update_timestamp ON "upload_tokens";
      CREATE TRIGGER trigger_upload_tokens_update_timestamp
        BEFORE UPDATE ON "upload_tokens"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_upload_sessions_update_timestamp ON "upload_sessions";
      CREATE TRIGGER trigger_upload_sessions_update_timestamp
        BEFORE UPDATE ON "upload_sessions"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
    `);

    console.log('Triggers criados com sucesso.');

    // Adicionar coluna upload_session_id na tabela documentos (se não existir)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "documentos"
        ADD COLUMN "upload_session_id" uuid;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    // Índice e foreign key para upload_session_id em documentos
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_DOCUMENTOS_UPLOAD_SESSION" ON "documentos" ("upload_session_id");
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "documentos"
        ADD CONSTRAINT "FK_documentos_upload_session"
        FOREIGN KEY ("upload_session_id") REFERENCES "upload_sessions"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    console.log('Coluna upload_session_id adicionada à tabela documentos.');

    // Comentários nas tabelas para documentação
    await queryRunner.query(`
      COMMENT ON TABLE "upload_tokens" IS 'Tokens de upload para sistema EasyUpload via QR Code';
      COMMENT ON TABLE "upload_sessions" IS 'Sessões ativas de upload de documentos';
      
      COMMENT ON COLUMN "upload_tokens"."token" IS 'Token JWT para autenticação do upload';
      COMMENT ON COLUMN "upload_tokens"."expires_at" IS 'Data de expiração do token';
      COMMENT ON COLUMN "upload_tokens"."max_files" IS 'Número máximo de arquivos permitidos';
      COMMENT ON COLUMN "upload_tokens"."required_documents" IS 'Lista de documentos obrigatórios em formato JSON';
      COMMENT ON COLUMN "upload_tokens"."metadata" IS 'Metadados adicionais do token';
      
      COMMENT ON COLUMN "upload_sessions"."device_fingerprint" IS 'Hash único do dispositivo para identificação';
      COMMENT ON COLUMN "upload_sessions"."upload_progress" IS 'Progresso detalhado do upload em formato JSON';
      COMMENT ON COLUMN "upload_sessions"."session_metadata" IS 'Metadados da sessão de upload';
    `);

    console.log('Migration CreateEasyUploadSchema concluída com sucesso!');
  }

  /**
   * Reverte as alterações da migration
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Iniciando rollback da migration CreateEasyUploadSchema...');

    // Remover foreign key e coluna da tabela documentos
    await queryRunner.query(`
      ALTER TABLE "documentos" DROP CONSTRAINT IF EXISTS "FK_documentos_upload_session";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_DOCUMENTOS_UPLOAD_SESSION";
    `);

    await queryRunner.query(`
      ALTER TABLE "documentos" DROP COLUMN IF EXISTS "upload_session_id";
    `);

    // Remover triggers
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_upload_tokens_update_timestamp ON "upload_tokens";
      DROP TRIGGER IF EXISTS trigger_upload_sessions_update_timestamp ON "upload_sessions";
    `);

    // Remover foreign keys
    await queryRunner.query(`
      ALTER TABLE "upload_sessions" DROP CONSTRAINT IF EXISTS "FK_upload_sessions_token";
      ALTER TABLE "upload_tokens" DROP CONSTRAINT IF EXISTS "FK_upload_tokens_cancelled_by";
      ALTER TABLE "upload_tokens" DROP CONSTRAINT IF EXISTS "FK_upload_tokens_cidadao";
      ALTER TABLE "upload_tokens" DROP CONSTRAINT IF EXISTS "FK_upload_tokens_solicitacao";
      ALTER TABLE "upload_tokens" DROP CONSTRAINT IF EXISTS "FK_upload_tokens_usuario";
    `);

    // Remover índices
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_UPLOAD_SESSIONS_METADATA";
      DROP INDEX IF EXISTS "IDX_UPLOAD_SESSIONS_PROGRESS";
      DROP INDEX IF EXISTS "IDX_UPLOAD_SESSIONS_IP_STARTED";
      DROP INDEX IF EXISTS "IDX_UPLOAD_SESSIONS_TOKEN_STATUS";
      DROP INDEX IF EXISTS "IDX_UPLOAD_SESSIONS_COMPLETED_AT";
      DROP INDEX IF EXISTS "IDX_UPLOAD_SESSIONS_LAST_ACTIVITY";
      DROP INDEX IF EXISTS "IDX_UPLOAD_SESSIONS_STARTED_AT";
      DROP INDEX IF EXISTS "IDX_UPLOAD_SESSIONS_IP";
      DROP INDEX IF EXISTS "IDX_UPLOAD_SESSIONS_STATUS";
      DROP INDEX IF EXISTS "IDX_UPLOAD_SESSIONS_TOKEN";
      
      DROP INDEX IF EXISTS "IDX_UPLOAD_TOKENS_METADATA";
      DROP INDEX IF EXISTS "IDX_UPLOAD_TOKENS_USUARIO_STATUS";
      DROP INDEX IF EXISTS "IDX_UPLOAD_TOKENS_STATUS_EXPIRES";
      DROP INDEX IF EXISTS "IDX_UPLOAD_TOKENS_TOKEN_HASH";
      DROP INDEX IF EXISTS "IDX_UPLOAD_TOKENS_CREATED_AT";
      DROP INDEX IF EXISTS "IDX_UPLOAD_TOKENS_EXPIRES_AT";
      DROP INDEX IF EXISTS "IDX_UPLOAD_TOKENS_STATUS";
      DROP INDEX IF EXISTS "IDX_UPLOAD_TOKENS_CIDADAO";
      DROP INDEX IF EXISTS "IDX_UPLOAD_TOKENS_SOLICITACAO";
      DROP INDEX IF EXISTS "IDX_UPLOAD_TOKENS_USUARIO";
    `);

    // Remover tabelas
    await queryRunner.query(`DROP TABLE IF EXISTS "upload_sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "upload_tokens"`);

    // Remover enums
    await queryRunner.query(`DROP TYPE IF EXISTS "upload_session_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "upload_token_status_enum"`);

    console.log('Rollback da migration CreateEasyUploadSchema concluído!');
  }
}
