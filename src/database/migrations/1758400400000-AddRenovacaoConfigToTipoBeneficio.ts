import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para adicionar campos de configuração de renovação na tabela tipo_beneficio
 * Adiciona campos permite_renovacao e periodo_minimo_renovacao
 */
export class AddRenovacaoConfigToTipoBeneficio1758400400000 implements MigrationInterface {
  name = 'AddRenovacaoConfigToTipoBeneficio1758400400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adicionar coluna permite_renovacao (boolean, default false)
    await queryRunner.query(`
      ALTER TABLE "tipo_beneficio" 
      ADD COLUMN "permite_renovacao" boolean NOT NULL DEFAULT false;
    `);

    // Adicionar coluna periodo_minimo_renovacao (integer, nullable)
    // Representa o período mínimo em dias entre renovações
    await queryRunner.query(`
      ALTER TABLE "tipo_beneficio" 
      ADD COLUMN "periodo_minimo_renovacao" integer;
    `);

    // Adicionar comentários para documentar os campos
    await queryRunner.query(`
      COMMENT ON COLUMN "tipo_beneficio"."permite_renovacao" IS 
      'Indica se este tipo de benefício permite renovação';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "tipo_beneficio"."periodo_minimo_renovacao" IS 
      'Período mínimo em dias que deve transcorrer entre renovações. NULL significa sem restrição de período';
    `);

    // Criar índice para consultas de tipos que permitem renovação
    await queryRunner.query(`
      CREATE INDEX "IDX_tipo_beneficio_permite_renovacao" 
      ON "tipo_beneficio" ("permite_renovacao");
    `);

    // Adicionar constraint para garantir que periodo_minimo_renovacao seja positivo quando definido
    await queryRunner.query(`
      ALTER TABLE "tipo_beneficio" 
      ADD CONSTRAINT "CHK_periodo_minimo_renovacao_positivo" 
      CHECK ("periodo_minimo_renovacao" IS NULL OR "periodo_minimo_renovacao" > 0);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover constraint
    await queryRunner.query(`
      ALTER TABLE "tipo_beneficio" 
      DROP CONSTRAINT IF EXISTS "CHK_periodo_minimo_renovacao_positivo";
    `);

    // Remover índice
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tipo_beneficio_permite_renovacao";`);

    // Remover colunas
    await queryRunner.query(`ALTER TABLE "tipo_beneficio" DROP COLUMN IF EXISTS "periodo_minimo_renovacao";`);
    await queryRunner.query(`ALTER TABLE "tipo_beneficio" DROP COLUMN IF EXISTS "permite_renovacao";`);
  }
}