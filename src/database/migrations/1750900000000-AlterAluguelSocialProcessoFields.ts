import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterAluguelSocialProcessoFields1750900000000
  implements MigrationInterface
{
  name = 'AlterAluguelSocialProcessoFields1750900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove a coluna booleana caso_judicializado_maria_penha
    await queryRunner.query(`
      ALTER TABLE "dados_aluguel_social" 
      DROP COLUMN IF EXISTS "caso_judicializado_maria_penha";
    `);

    // Adiciona as novas colunas string opcionais
    await queryRunner.query(`
      ALTER TABLE "dados_aluguel_social" 
      ADD COLUMN "processo_judicializado" VARCHAR(255),
      ADD COLUMN "numero_processo" VARCHAR(255);
    `);

    // Adiciona comentários explicativos
    await queryRunner.query(`
      COMMENT ON COLUMN "dados_aluguel_social"."processo_judicializado" IS 'Tipo de processo judicializado (ex: Lei Maria da Penha)';
      COMMENT ON COLUMN "dados_aluguel_social"."numero_processo" IS 'Número do processo judicial';
    `);

    // Adiciona índices para otimização de consultas
    await queryRunner.query(`
      CREATE INDEX "idx_dados_aluguel_social_processo_judicializado" ON "dados_aluguel_social" ("processo_judicializado") WHERE "processo_judicializado" IS NOT NULL;
      CREATE INDEX "idx_dados_aluguel_social_numero_processo" ON "dados_aluguel_social" ("numero_processo") WHERE "numero_processo" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove índices
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_dados_aluguel_social_processo_judicializado";
      DROP INDEX IF EXISTS "idx_dados_aluguel_social_numero_processo";
    `);

    // Remove comentários
    await queryRunner.query(`
      COMMENT ON COLUMN "dados_aluguel_social"."processo_judicializado" IS NULL;
      COMMENT ON COLUMN "dados_aluguel_social"."numero_processo" IS NULL;
    `);

    // Remove as novas colunas
    await queryRunner.query(`
      ALTER TABLE "dados_aluguel_social" 
      DROP COLUMN IF EXISTS "processo_judicializado",
      DROP COLUMN IF EXISTS "numero_processo";
    `);

    // Restaura a coluna booleana original
    await queryRunner.query(`
      ALTER TABLE "dados_aluguel_social" 
      ADD COLUMN "caso_judicializado_maria_penha" BOOLEAN NOT NULL DEFAULT false;
    `);

    // Adiciona comentário para a coluna restaurada
    await queryRunner.query(`
      COMMENT ON COLUMN "dados_aluguel_social"."caso_judicializado_maria_penha" IS 'Indica se é caso judicializado pela Lei Maria da Penha';
    `);
  }
}
