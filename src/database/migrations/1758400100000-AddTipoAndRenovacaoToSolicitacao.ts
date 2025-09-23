import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para adicionar campos de renovação na tabela solicitacao
 * Adiciona campo tipo (enum) e referência para solicitação renovada
 */
export class AddTipoAndRenovacaoToSolicitacao1758400100000 implements MigrationInterface {
  name = 'AddTipoAndRenovacaoToSolicitacao1758400100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar enum tipo_solicitacao_enum para diferenciar original de renovação
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "tipo_solicitacao_enum" AS ENUM ('original', 'renovacao');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Adicionar coluna tipo com enum tipo_solicitacao_enum
    await queryRunner.query(`
      ALTER TABLE "solicitacao" 
      ADD COLUMN "tipo" "tipo_solicitacao_enum" NOT NULL DEFAULT 'original';
    `);

    // Adicionar coluna solicitacao_renovada_id para referência de renovação
    await queryRunner.query(`
      ALTER TABLE "solicitacao" 
      ADD COLUMN "solicitacao_renovada_id" uuid;
    `);

    // Adicionar foreign key constraint para solicitacao_renovada_id
    await queryRunner.query(`
      ALTER TABLE "solicitacao" 
      ADD CONSTRAINT "FK_solicitacao_renovada" 
      FOREIGN KEY ("solicitacao_renovada_id") 
      REFERENCES "solicitacao"("id") 
      ON DELETE SET NULL;
    `);

    // Criar índice para performance em consultas de renovação
    await queryRunner.query(`
      CREATE INDEX "IDX_solicitacao_tipo" 
      ON "solicitacao" ("tipo");
    `);

    // Criar índice para solicitacao_renovada_id
    await queryRunner.query(`
      CREATE INDEX "IDX_solicitacao_renovada_id" 
      ON "solicitacao" ("solicitacao_renovada_id");
    `);

    // Criar índice composto para consultas de renovação por beneficiário
    await queryRunner.query(`
      CREATE INDEX "IDX_solicitacao_beneficiario_tipo" 
      ON "solicitacao" ("beneficiario_id", "tipo");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índices
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_solicitacao_beneficiario_tipo";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_solicitacao_renovada_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_solicitacao_tipo";`);

    // Remover foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "solicitacao" 
      DROP CONSTRAINT IF EXISTS "FK_solicitacao_renovada";
    `);

    // Remover colunas
    await queryRunner.query(`ALTER TABLE "solicitacao" DROP COLUMN IF EXISTS "solicitacao_renovada_id";`);
    await queryRunner.query(`ALTER TABLE "solicitacao" DROP COLUMN IF EXISTS "tipo";`);

    // Remover enum tipo_solicitacao_enum
    await queryRunner.query(`DROP TYPE IF EXISTS "tipo_solicitacao_enum";`);
  }
}