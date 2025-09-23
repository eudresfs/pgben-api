import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para adicionar campos de renovação na tabela concessao
 * Adiciona campo tipo (enum) e referência para concessão renovada
 */
export class AddTipoAndRenovacaoToConcessao1758400300000 implements MigrationInterface {
  name = 'AddTipoAndRenovacaoToConcessao1758400300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adicionar coluna tipo com enum tipo_concessao_enum
    await queryRunner.query(`
      ALTER TABLE "concessao" 
      ADD COLUMN "tipo" "tipo_concessao_enum" NOT NULL DEFAULT 'original';
    `);

    // Adicionar coluna concessao_renovada_id para referência de renovação
    await queryRunner.query(`
      ALTER TABLE "concessao" 
      ADD COLUMN "concessao_renovada_id" uuid;
    `);

    // Adicionar foreign key constraint para concessao_renovada_id
    await queryRunner.query(`
      ALTER TABLE "concessao" 
      ADD CONSTRAINT "FK_concessao_renovada" 
      FOREIGN KEY ("concessao_renovada_id") 
      REFERENCES "concessao"("id") 
      ON DELETE SET NULL;
    `);

    // Criar índice para performance em consultas de renovação
    await queryRunner.query(`
      CREATE INDEX "IDX_concessao_tipo" 
      ON "concessao" ("tipo");
    `);

    // Criar índice para concessao_renovada_id
    await queryRunner.query(`
      CREATE INDEX "IDX_concessao_renovada_id" 
      ON "concessao" ("concessao_renovada_id");
    `);

    // Criar índice composto para consultas de renovação por solicitação
    await queryRunner.query(`
      CREATE INDEX "IDX_concessao_solicitacao_tipo" 
      ON "concessao" ("solicitacao_id", "tipo");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índices
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_concessao_solicitacao_tipo";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_concessao_renovada_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_concessao_tipo";`);

    // Remover foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "concessao" 
      DROP CONSTRAINT IF EXISTS "FK_concessao_renovada";
    `);

    // Remover colunas
    await queryRunner.query(`ALTER TABLE "concessao" DROP COLUMN IF EXISTS "concessao_renovada_id";`);
    await queryRunner.query(`ALTER TABLE "concessao" DROP COLUMN IF EXISTS "tipo";`);
  }
}