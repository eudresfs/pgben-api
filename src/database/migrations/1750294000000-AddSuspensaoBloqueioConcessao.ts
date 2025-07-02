import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSuspensaoBloqueioConcessao1750294000000
  implements MigrationInterface
{
  name = 'AddSuspensaoBloqueioConcessao1750294000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adiciona colunas para controle de suspensão
    await queryRunner.query(`
      ALTER TABLE "concessao" 
      ADD COLUMN "motivo_suspensao" TEXT,
      ADD COLUMN "data_revisao_suspensao" DATE;
    `);

    // Adiciona colunas para controle de bloqueio/desbloqueio
    await queryRunner.query(`
      ALTER TABLE "concessao" 
      ADD COLUMN "motivo_bloqueio" TEXT,
      ADD COLUMN "data_bloqueio" TIMESTAMP,
      ADD COLUMN "motivo_desbloqueio" TEXT,
      ADD COLUMN "data_desbloqueio" TIMESTAMP;
    `);

    // Adiciona comentários explicativos
    await queryRunner.query(`
      COMMENT ON COLUMN "concessao"."motivo_suspensao" IS 'Motivo da suspensão da concessão';
      COMMENT ON COLUMN "concessao"."data_revisao_suspensao" IS 'Data prevista para revisão da suspensão';
      COMMENT ON COLUMN "concessao"."motivo_bloqueio" IS 'Motivo do bloqueio da concessão';
      COMMENT ON COLUMN "concessao"."data_bloqueio" IS 'Data em que a concessão foi bloqueada';
      COMMENT ON COLUMN "concessao"."motivo_desbloqueio" IS 'Motivo do desbloqueio da concessão';
      COMMENT ON COLUMN "concessao"."data_desbloqueio" IS 'Data em que a concessão foi desbloqueada';
    `);

    // Adiciona índices para otimização de consultas
    await queryRunner.query(`
      CREATE INDEX "idx_concessao_data_bloqueio" ON "concessao" ("data_bloqueio") WHERE "data_bloqueio" IS NOT NULL;
      CREATE INDEX "idx_concessao_data_revisao_suspensao" ON "concessao" ("data_revisao_suspensao") WHERE "data_revisao_suspensao" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove índices
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_concessao_data_bloqueio";
      DROP INDEX IF EXISTS "idx_concessao_data_revisao_suspensao";
    `);

    // Remove comentários
    await queryRunner.query(`
      COMMENT ON COLUMN "concessao"."motivo_suspensao" IS NULL;
      COMMENT ON COLUMN "concessao"."data_revisao_suspensao" IS NULL;
      COMMENT ON COLUMN "concessao"."motivo_bloqueio" IS NULL;
      COMMENT ON COLUMN "concessao"."data_bloqueio" IS NULL;
      COMMENT ON COLUMN "concessao"."motivo_desbloqueio" IS NULL;
      COMMENT ON COLUMN "concessao"."data_desbloqueio" IS NULL;
    `);

    // Remove colunas
    await queryRunner.query(`
      ALTER TABLE "concessao" 
      DROP COLUMN IF EXISTS "motivo_suspensao",
      DROP COLUMN IF EXISTS "data_revisao_suspensao",
      DROP COLUMN IF EXISTS "motivo_bloqueio",
      DROP COLUMN IF EXISTS "data_bloqueio",
      DROP COLUMN IF EXISTS "motivo_desbloqueio",
      DROP COLUMN IF EXISTS "data_desbloqueio";
    `);
  }
}
