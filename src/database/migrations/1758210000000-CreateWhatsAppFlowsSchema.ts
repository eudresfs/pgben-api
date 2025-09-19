import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para criação do schema completo do módulo WhatsApp Flows
 * 
 * @description Esta migration cria todos os enums e tabelas necessários
 * para o funcionamento do sistema de WhatsApp Flows, incluindo:
 * - Enums: ActionType e ScreenType
 * - Tabelas: whatsapp_flow_sessions e whatsapp_flow_logs
 * - Relacionamentos e índices para performance
 * 
 * @author SEMTAS Development Team
 * @since 1.0.0
 */
export class CreateWhatsAppFlowsSchema1758210000000 implements MigrationInterface {
  name = 'CreateWhatsAppFlowsSchema1758210000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================
    // CRIAÇÃO DOS ENUMS
    // ========================================

    // Enum para tipos de ação no WhatsApp Flow
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "action_type_enum" AS ENUM (
          'ping', 'data_exchange', 'init', 'terminate'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Enum para tipos de tela no WhatsApp Flow
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "screen_type_enum" AS ENUM (
          'inicio', 'esqueceu_senha', 'buscar_cidadao', 'cadastro_cidadao'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // ========================================
    // CRIAÇÃO DA TABELA WHATSAPP_FLOW_SESSIONS
    // ========================================

    await queryRunner.query(`
      CREATE TABLE "whatsapp_flow_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "flow_token" character varying(255) NOT NULL,
        "current_screen" screen_type_enum,
        "session_data" jsonb NOT NULL DEFAULT '{}',
        "is_active" boolean NOT NULL DEFAULT true,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "usuario_id" uuid,
        "cidadao_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        
        CONSTRAINT "PK_whatsapp_flow_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_whatsapp_flow_sessions_flow_token" UNIQUE ("flow_token")
      )
    `);

    // ========================================
    // CRIAÇÃO DA TABELA WHATSAPP_FLOW_LOGS
    // ========================================

    await queryRunner.query(`
      CREATE TABLE "whatsapp_flow_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "session_id" uuid,
        "action_type" action_type_enum NOT NULL,
        "screen_type" screen_type_enum,
        "action_description" text,
        "request_data" jsonb DEFAULT '{}',
        "response_data" jsonb DEFAULT '{}',
        "success" boolean,
        "error_message" text,
        "processing_time_ms" integer,
        "client_ip" character varying(45),
        "user_agent" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        
        CONSTRAINT "PK_whatsapp_flow_logs" PRIMARY KEY ("id")
      )
    `);

    // ========================================
    // CRIAÇÃO DOS RELACIONAMENTOS (FOREIGN KEYS)
    // ========================================

    // Relacionamento whatsapp_flow_sessions -> usuario
    await queryRunner.query(`
      ALTER TABLE "whatsapp_flow_sessions" 
      ADD CONSTRAINT "FK_whatsapp_flow_sessions_usuario" 
      FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") 
      ON DELETE SET NULL ON UPDATE CASCADE
    `);

    // Relacionamento whatsapp_flow_sessions -> cidadaos
    await queryRunner.query(`
      ALTER TABLE "whatsapp_flow_sessions" 
      ADD CONSTRAINT "FK_whatsapp_flow_sessions_cidadao" 
      FOREIGN KEY ("cidadao_id") REFERENCES "cidadao"("id") 
      ON DELETE SET NULL ON UPDATE CASCADE
    `);

    // Relacionamento whatsapp_flow_logs -> whatsapp_flow_sessions (permite NULL)
    await queryRunner.query(`
      ALTER TABLE "whatsapp_flow_logs" 
      ADD CONSTRAINT "FK_whatsapp_flow_logs_session" 
      FOREIGN KEY ("session_id") REFERENCES "whatsapp_flow_sessions"("id") 
      ON DELETE SET NULL ON UPDATE CASCADE
    `);

    // ========================================
    // CRIAÇÃO DOS ÍNDICES PARA PERFORMANCE
    // ========================================

    // Índices para whatsapp_flow_sessions
    await queryRunner.query(`
      CREATE INDEX "IDX_whatsapp_flow_sessions_flow_token" 
      ON "whatsapp_flow_sessions" ("flow_token")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_whatsapp_flow_sessions_is_active" 
      ON "whatsapp_flow_sessions" ("is_active")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_whatsapp_flow_sessions_expires_at" 
      ON "whatsapp_flow_sessions" ("expires_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_whatsapp_flow_sessions_usuario_id" 
      ON "whatsapp_flow_sessions" ("usuario_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_whatsapp_flow_sessions_cidadao_id" 
      ON "whatsapp_flow_sessions" ("cidadao_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_whatsapp_flow_sessions_created_at" 
      ON "whatsapp_flow_sessions" ("created_at")
    `);

    // Índices para whatsapp_flow_logs
    await queryRunner.query(`
      CREATE INDEX "IDX_whatsapp_flow_logs_session_id" 
      ON "whatsapp_flow_logs" ("session_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_whatsapp_flow_logs_action_type" 
      ON "whatsapp_flow_logs" ("action_type")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_whatsapp_flow_logs_screen_type" 
      ON "whatsapp_flow_logs" ("screen_type")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_whatsapp_flow_logs_created_at" 
      ON "whatsapp_flow_logs" ("created_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_whatsapp_flow_logs_error_message" 
      ON "whatsapp_flow_logs" ("error_message") 
      WHERE "error_message" IS NOT NULL
    `);

    // Índice composto para consultas de auditoria
    await queryRunner.query(`
      CREATE INDEX "IDX_whatsapp_flow_logs_session_action_created" 
      ON "whatsapp_flow_logs" ("session_id", "action_type", "created_at")
    `);

    // Índice para limpeza de sessões expiradas
    await queryRunner.query(`
      CREATE INDEX "IDX_whatsapp_flow_sessions_cleanup" 
      ON "whatsapp_flow_sessions" ("is_active", "expires_at")
    `);

    // ========================================
    // COMENTÁRIOS PARA DOCUMENTAÇÃO
    // ========================================

    await queryRunner.query(`
      COMMENT ON TABLE "whatsapp_flow_sessions" IS 
      'Tabela para gerenciamento de sessões do WhatsApp Flow. Armazena o estado atual de cada sessão de usuário.'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE "whatsapp_flow_logs" IS 
      'Tabela de logs para auditoria e monitoramento das interações do WhatsApp Flow.'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "whatsapp_flow_sessions"."flow_token" IS 
      'Token único para identificação da sessão do flow'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "whatsapp_flow_sessions"."session_data" IS 
      'Dados da sessão em formato JSON, incluindo estado e variáveis do flow'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "whatsapp_flow_logs"."processing_time_ms" IS 
      'Tempo de processamento da requisição em milissegundos'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ========================================
    // REMOÇÃO DOS ÍNDICES
    // ========================================

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_whatsapp_flow_logs_session_action_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_whatsapp_flow_sessions_cleanup"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_whatsapp_flow_logs_error_message"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_whatsapp_flow_logs_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_whatsapp_flow_logs_screen_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_whatsapp_flow_logs_action_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_whatsapp_flow_logs_session_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_whatsapp_flow_sessions_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_whatsapp_flow_sessions_cidadao_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_whatsapp_flow_sessions_usuario_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_whatsapp_flow_sessions_expires_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_whatsapp_flow_sessions_is_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_whatsapp_flow_sessions_flow_token"`);

    // ========================================
    // REMOÇÃO DAS FOREIGN KEYS
    // ========================================

    await queryRunner.query(`ALTER TABLE "whatsapp_flow_logs" DROP CONSTRAINT IF EXISTS "FK_whatsapp_flow_logs_session"`);
    await queryRunner.query(`ALTER TABLE "whatsapp_flow_sessions" DROP CONSTRAINT IF EXISTS "FK_whatsapp_flow_sessions_cidadao"`);
    await queryRunner.query(`ALTER TABLE "whatsapp_flow_sessions" DROP CONSTRAINT IF EXISTS "FK_whatsapp_flow_sessions_usuario"`);

    // ========================================
    // REMOÇÃO DAS TABELAS
    // ========================================

    await queryRunner.query(`DROP TABLE IF EXISTS "whatsapp_flow_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "whatsapp_flow_sessions"`);

    // ========================================
    // REMOÇÃO DOS ENUMS
    // ========================================

    await queryRunner.query(`DROP TYPE IF EXISTS "screen_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "action_type_enum"`);
  }
}