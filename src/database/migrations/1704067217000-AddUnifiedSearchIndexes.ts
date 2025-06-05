import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migração para adicionar índices específicos para busca unificada de cidadãos
 * Adiciona índices para telefone e melhora a busca por nome
 */
export class AddUnifiedSearchIndexes1704067218000
  implements MigrationInterface
{
  name = 'AddUnifiedSearchIndexes1704067218000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Garantir que a extensão pg_trgm está ativada (necessária para busca textual)
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm";`);

    // Índice GIN para busca textual avançada no nome (suporte a busca parcial e fuzzy)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_cidadao_nome_gin_trgm" 
      ON "cidadao" USING GIN ("nome" gin_trgm_ops) 
      WHERE "removed_at" IS NULL;
    `);

    // Índice composto para busca por nome + unidade_id (otimiza filtros combinados)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_cidadao_nome_unidade" 
      ON "cidadao" ("nome", "unidade_id") 
      WHERE "removed_at" IS NULL;
    `);

    // Índice para busca case-insensitive no nome (fallback para sistemas sem pg_trgm)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_cidadao_nome_lower" 
      ON "cidadao" (LOWER("nome")) 
      WHERE "removed_at" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índices criados (em ordem reversa)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_cidadao_nome_lower";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_cidadao_nome_unidade";`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_cidadao_nome_gin_trgm";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_cidadao_telefone_unique";`,
    );
  }
}
