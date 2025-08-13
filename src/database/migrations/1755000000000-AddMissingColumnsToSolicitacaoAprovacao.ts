import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migração para adicionar colunas faltantes na tabela solicitacoes_aprovacao
 * 
 * Esta migração adiciona as colunas que estão definidas na entidade SolicitacaoAprovacao
 * mas não existem na estrutura atual da tabela no banco de dados.
 */
export class AddMissingColumnsToSolicitacaoAprovacao1755000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adicionar colunas faltantes
    await queryRunner.query(`
      ALTER TABLE "solicitacoes_aprovacao" 
      ADD COLUMN "usuario_solicitante_nome" character varying(200) NOT NULL DEFAULT '',
      ADD COLUMN "usuario_solicitante_email" character varying(200) NOT NULL DEFAULT '',
      ADD COLUMN "data_ultimo_lembrete" timestamp,
      ADD COLUMN "data_ultima_escalacao" timestamp,
      ADD COLUMN "numero_escalacoes" integer NOT NULL DEFAULT 0,
      ADD COLUMN "numero_lembretes" integer NOT NULL DEFAULT 0,
      ADD COLUMN "sessao_id" character varying(100),
      ADD COLUMN "anexos" text,
      ADD COLUMN "tags" text,
      ADD COLUMN "metadados" jsonb,
      ADD COLUMN "observacoes_internas" text,
      ADD COLUMN "processamento_automatico" boolean NOT NULL DEFAULT false,
      ADD COLUMN "tempo_processamento_segundos" integer,
      ADD COLUMN "hash_integridade" character varying(64);
    `);

    // Atualizar registros existentes com valores padrão para campos obrigatórios
    await queryRunner.query(`
      UPDATE "solicitacoes_aprovacao" 
      SET 
        "usuario_solicitante_nome" = COALESCE(
          (SELECT nome FROM usuario WHERE id = "solicitacoes_aprovacao"."usuario_solicitante_id"),
          'Usuário não encontrado'
        ),
        "usuario_solicitante_email" = COALESCE(
          (SELECT email FROM usuario WHERE id = "solicitacoes_aprovacao"."usuario_solicitante_id"),
          'email@naoidentificado.com'
        )
      WHERE "usuario_solicitante_nome" = '' OR "usuario_solicitante_email" = '';
    `);

    // Criar índices para performance
    await queryRunner.query(`
      CREATE INDEX "IDX_solicitacoes_aprovacao_usuario_nome" 
      ON "solicitacoes_aprovacao" ("usuario_solicitante_nome");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_solicitacoes_aprovacao_escalacao_data" 
      ON "solicitacoes_aprovacao" ("data_ultima_escalacao") 
      WHERE "data_ultima_escalacao" IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_solicitacoes_aprovacao_lembrete_data" 
      ON "solicitacoes_aprovacao" ("data_ultimo_lembrete") 
      WHERE "data_ultimo_lembrete" IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_solicitacoes_aprovacao_processamento" 
      ON "solicitacoes_aprovacao" ("processamento_automatico", "created_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índices
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_solicitacoes_aprovacao_processamento";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_solicitacoes_aprovacao_lembrete_data";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_solicitacoes_aprovacao_escalacao_data";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_solicitacoes_aprovacao_usuario_nome";`);

    // Remover colunas
    await queryRunner.query(`
      ALTER TABLE "solicitacoes_aprovacao" 
      DROP COLUMN "hash_integridade",
      DROP COLUMN "tempo_processamento_segundos",
      DROP COLUMN "processamento_automatico",
      DROP COLUMN "observacoes_internas",
      DROP COLUMN "metadados",
      DROP COLUMN "tags",
      DROP COLUMN "anexos",
      DROP COLUMN "sessao_id",
      DROP COLUMN "numero_lembretes",
      DROP COLUMN "numero_escalacoes",
      DROP COLUMN "data_ultima_escalacao",
      DROP COLUMN "data_ultimo_lembrete",
      DROP COLUMN "usuario_solicitante_email",
      DROP COLUMN "usuario_solicitante_nome";
    `);
  }
}