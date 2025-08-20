import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeparateAprovadoresTable1755625000000 implements MigrationInterface {
  name = 'SeparateAprovadoresTable1755625000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar tabela configuracao_aprovadores
    await queryRunner.query(`
      CREATE TABLE "configuracao_aprovadores" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "usuario_id" uuid NOT NULL,
        "ordem_aprovacao" integer NOT NULL DEFAULT 1,
        "ativo" boolean NOT NULL DEFAULT true,
        "observacoes" text,
        "acao_aprovacao_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_configuracao_aprovadores" PRIMARY KEY ("id")
      )
    `);

    // Criar índice único para evitar duplicação
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_configuracao_aprovadores_usuario_acao" 
      ON "configuracao_aprovadores" ("usuario_id", "acao_aprovacao_id")
    `);

    // Adicionar comentários na tabela configuracao_aprovadores
    await queryRunner.query(`
      COMMENT ON TABLE "configuracao_aprovadores" IS 'Configuração de aprovadores por ação';
      COMMENT ON COLUMN "configuracao_aprovadores"."usuario_id" IS 'ID do usuário aprovador';
      COMMENT ON COLUMN "configuracao_aprovadores"."ordem_aprovacao" IS 'Ordem de aprovação (1 = primeiro aprovador)';
      COMMENT ON COLUMN "configuracao_aprovadores"."ativo" IS 'Indica se o aprovador está ativo na configuração';
      COMMENT ON COLUMN "configuracao_aprovadores"."observacoes" IS 'Observações sobre a configuração do aprovador';
      COMMENT ON COLUMN "configuracao_aprovadores"."acao_aprovacao_id" IS 'ID da ação de aprovação';
      COMMENT ON COLUMN "configuracao_aprovadores"."created_at" IS 'Data de criação do registro';
      COMMENT ON COLUMN "configuracao_aprovadores"."updated_at" IS 'Data da última atualização';
    `);

    // Criar tabela solicitacao_aprovadores
    await queryRunner.query(`
      CREATE TABLE "solicitacao_aprovadores" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "usuario_id" uuid NOT NULL,
        "aprovado" boolean,
        "justificativa_decisao" text,
        "anexos_decisao" jsonb,
        "decidido_em" TIMESTAMP,
        "ordem_aprovacao" integer NOT NULL DEFAULT 1,
        "ativo" boolean NOT NULL DEFAULT true,
        "observacoes" text,
        "solicitacao_aprovacao_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_solicitacao_aprovadores" PRIMARY KEY ("id")
      )
    `);

    // Criar índice único para evitar duplicação
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_solicitacao_aprovadores_usuario_solicitacao" 
      ON "solicitacao_aprovadores" ("usuario_id", "solicitacao_aprovacao_id")
    `);

    // Adicionar comentários na tabela solicitacao_aprovadores
    await queryRunner.query(`
      COMMENT ON TABLE "solicitacao_aprovadores" IS 'Aprovadores específicos de uma solicitação';
      COMMENT ON COLUMN "solicitacao_aprovadores"."usuario_id" IS 'ID do usuário aprovador';
      COMMENT ON COLUMN "solicitacao_aprovadores"."aprovado" IS 'Decisão do aprovador: true=aprovado, false=rejeitado, null=pendente';
      COMMENT ON COLUMN "solicitacao_aprovadores"."justificativa_decisao" IS 'Justificativa da decisão';
      COMMENT ON COLUMN "solicitacao_aprovadores"."anexos_decisao" IS 'Lista de anexos/documentos da decisão';
      COMMENT ON COLUMN "solicitacao_aprovadores"."decidido_em" IS 'Data da decisão';
      COMMENT ON COLUMN "solicitacao_aprovadores"."ordem_aprovacao" IS 'Ordem de aprovação (1 = primeiro aprovador)';
      COMMENT ON COLUMN "solicitacao_aprovadores"."ativo" IS 'Indica se o aprovador está ativo para esta solicitação';
      COMMENT ON COLUMN "solicitacao_aprovadores"."observacoes" IS 'Observações sobre a aprovação';
      COMMENT ON COLUMN "solicitacao_aprovadores"."solicitacao_aprovacao_id" IS 'ID da solicitação de aprovação';
      COMMENT ON COLUMN "solicitacao_aprovadores"."created_at" IS 'Data de criação do registro';
      COMMENT ON COLUMN "solicitacao_aprovadores"."updated_at" IS 'Data da última atualização';
    `);

    // Criar foreign keys
    await queryRunner.query(`
      ALTER TABLE "configuracao_aprovadores" 
      ADD CONSTRAINT "FK_configuracao_aprovadores_acao_aprovacao" 
      FOREIGN KEY ("acao_aprovacao_id") REFERENCES "acoes_aprovacao"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "solicitacao_aprovadores" 
      ADD CONSTRAINT "FK_solicitacao_aprovadores_solicitacao_aprovacao" 
      FOREIGN KEY ("solicitacao_aprovacao_id") REFERENCES "solicitacoes_aprovacao"("id") ON DELETE CASCADE
    `);

    // Migrar dados existentes da tabela aprovadores
    // 1. Migrar registros que são configuração (têm acao_aprovacao_id mas não têm solicitacao_aprovacao_id)
    await queryRunner.query(`
      INSERT INTO "configuracao_aprovadores" (
        "usuario_id", 
        "ordem_aprovacao", 
        "ativo", 
        "acao_aprovacao_id", 
        "created_at", 
        "updated_at"
      )
      SELECT DISTINCT
        "usuario_id",
        1 as "ordem_aprovacao",
        "ativo",
        "acao_aprovacao_id",
        "criado_em",
        "atualizado_em"
      FROM "aprovadores" 
      WHERE "acao_aprovacao_id" IS NOT NULL 
        AND "solicitacao_aprovacao_id" IS NULL
        AND "ativo" = true
    `);

    // 2. Migrar registros que são aprovadores de solicitação (têm solicitacao_aprovacao_id)
    await queryRunner.query(`
      INSERT INTO "solicitacao_aprovadores" (
        "usuario_id", 
        "aprovado", 
        "justificativa_decisao", 
        "anexos_decisao", 
        "decidido_em", 
        "ordem_aprovacao", 
        "ativo", 
        "solicitacao_aprovacao_id", 
        "created_at", 
        "updated_at"
      )
      SELECT 
        "usuario_id",
        "aprovado",
        "justificativa_decisao",
        "anexos_decisao",
        "decidido_em",
        1 as "ordem_aprovacao",
        "ativo",
        "solicitacao_aprovacao_id",
        "criado_em",
        "atualizado_em"
      FROM "aprovadores" 
      WHERE "solicitacao_aprovacao_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover foreign keys
    await queryRunner.query(`
      ALTER TABLE "solicitacao_aprovadores" 
      DROP CONSTRAINT "FK_solicitacao_aprovadores_solicitacao_aprovacao"
    `);

    await queryRunner.query(`
      ALTER TABLE "configuracao_aprovadores" 
      DROP CONSTRAINT "FK_configuracao_aprovadores_acao_aprovacao"
    `);

    // Remover índices
    await queryRunner.query(`
      DROP INDEX "IDX_solicitacao_aprovadores_usuario_solicitacao"
    `);

    await queryRunner.query(`
      DROP INDEX "IDX_configuracao_aprovadores_usuario_acao"
    `);

    // Remover tabelas
    await queryRunner.query(`DROP TABLE "solicitacao_aprovadores"`);
    await queryRunner.query(`DROP TABLE "configuracao_aprovadores"`);
  }
}