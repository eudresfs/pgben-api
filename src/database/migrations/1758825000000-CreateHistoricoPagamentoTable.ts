import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para criar a tabela historico_pagamento e enum tipo_evento_historico_enum
 * 
 * Cria:
 * - Enum tipo_evento_historico_enum com todos os tipos de eventos
 * - Tabela historico_pagamento com todos os campos necessários
 * - Índices para otimização de consultas
 * - Constraints de integridade referencial
 * - Comentários para documentação
 */
export class CreateHistoricoPagamentoTable1758825000000 implements MigrationInterface {
  name = 'CreateHistoricoPagamentoTable1758825000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar enum para tipos de eventos do histórico
    await queryRunner.query(`
      CREATE TYPE "tipo_evento_historico_enum" AS ENUM (
        'criacao',
        'alteracao_status',
        'liberacao',
        'cancelamento',
        'invalidacao',
        'aprovacao',
        'rejeicao',
        'concessao',
        'pagamento_efetuado',
        'confirmacao_recebimento',
        'observacao_adicionada'
      );
    `);

    // Criar tabela historico_pagamento
    await queryRunner.query(`
      CREATE TABLE "historico_pagamento" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "pagamento_id" UUID NOT NULL,
        "data_evento" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "usuario_id" UUID NULL,
        "tipo_evento" "tipo_evento_historico_enum" NOT NULL,
        "status_anterior" "status_pagamento_enum" NULL,
        "status_atual" "status_pagamento_enum" NULL,
        "observacao" TEXT NULL,
        "dados_contexto" JSONB NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_historico_pagamento" PRIMARY KEY ("id")
      );
    `);

    // Adicionar foreign keys
    await queryRunner.query(`
      ALTER TABLE "historico_pagamento" 
      ADD CONSTRAINT "FK_historico_pagamento_pagamento" 
      FOREIGN KEY ("pagamento_id") 
      REFERENCES "pagamento"("id") 
      ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE "historico_pagamento" 
      ADD CONSTRAINT "FK_historico_pagamento_usuario" 
      FOREIGN KEY ("usuario_id") 
      REFERENCES "usuario"("id") 
      ON DELETE SET NULL;
    `);

    // Criar índices para otimização de consultas
    await queryRunner.query(`
      CREATE INDEX "IDX_historico_pagamento_pagamento_id" 
      ON "historico_pagamento" ("pagamento_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_historico_pagamento_data_evento" 
      ON "historico_pagamento" ("data_evento");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_historico_pagamento_tipo_evento" 
      ON "historico_pagamento" ("tipo_evento");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_historico_pagamento_usuario_id" 
      ON "historico_pagamento" ("usuario_id") 
      WHERE "usuario_id" IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_historico_pagamento_pagamento_data" 
      ON "historico_pagamento" ("pagamento_id", "data_evento");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_historico_pagamento_status_anterior" 
      ON "historico_pagamento" ("status_anterior") 
      WHERE "status_anterior" IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_historico_pagamento_status_atual" 
      ON "historico_pagamento" ("status_atual") 
      WHERE "status_atual" IS NOT NULL;
    `);

    // Adicionar comentários para documentação
    await queryRunner.query(`
      COMMENT ON TABLE "historico_pagamento" IS 'Histórico imutável de eventos dos pagamentos para auditoria e rastreabilidade';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "historico_pagamento"."id" IS 'Identificador único do registro de histórico';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "historico_pagamento"."pagamento_id" IS 'Referência ao pagamento que gerou este evento';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "historico_pagamento"."data_evento" IS 'Data e hora em que o evento ocorreu';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "historico_pagamento"."usuario_id" IS 'Usuário responsável pelo evento (nulo para eventos automáticos)';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "historico_pagamento"."tipo_evento" IS 'Tipo do evento que ocorreu no pagamento';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "historico_pagamento"."status_anterior" IS 'Status do pagamento antes do evento';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "historico_pagamento"."status_atual" IS 'Status do pagamento após o evento';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "historico_pagamento"."observacao" IS 'Observações sobre o evento';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "historico_pagamento"."dados_contexto" IS 'Dados contextuais do evento em formato JSON';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "historico_pagamento"."created_at" IS 'Data de criação do registro (imutável)';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índices
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_historico_pagamento_status_atual";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_historico_pagamento_status_anterior";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_historico_pagamento_pagamento_data";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_historico_pagamento_usuario_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_historico_pagamento_tipo_evento";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_historico_pagamento_data_evento";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_historico_pagamento_pagamento_id";`);

    // Remover foreign keys
    await queryRunner.query(`
      ALTER TABLE "historico_pagamento" 
      DROP CONSTRAINT IF EXISTS "FK_historico_pagamento_usuario";
    `);

    await queryRunner.query(`
      ALTER TABLE "historico_pagamento" 
      DROP CONSTRAINT IF EXISTS "FK_historico_pagamento_pagamento";
    `);

    // Remover tabela
    await queryRunner.query(`DROP TABLE IF EXISTS "historico_pagamento";`);

    // Remover enum
    await queryRunner.query(`DROP TYPE IF EXISTS "tipo_evento_historico_enum";`);
  }
}