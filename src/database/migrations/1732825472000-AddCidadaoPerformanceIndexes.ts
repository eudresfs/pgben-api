import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCidadaoPerformanceIndexes1732825472000 implements MigrationInterface {
  name = 'AddCidadaoPerformanceIndexes1732825472000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Índices para melhorar performance de busca por texto
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cidadao_nome_gin" 
      ON "cidadao" USING gin(to_tsvector('portuguese', nome))
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cidadao_cpf_partial" 
      ON "cidadao" (cpf) WHERE cpf IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cidadao_nis_partial" 
      ON "cidadao" (nis) WHERE nis IS NOT NULL
    `);

    // Índice para busca por bairro no JSONB
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cidadao_endereco_bairro" 
      ON "cidadao" USING gin((endereco->>'bairro') gin_trgm_ops)
    `);

    // Índice composto para listagem paginada
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cidadao_ativo_created_at" 
      ON "cidadao" (ativo, created_at DESC)
    `);

    // Índice para busca por unidade
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cidadao_unidade_ativo" 
      ON "cidadao" (unidade_id, ativo) WHERE unidade_id IS NOT NULL
    `);

    // Habilitar extensão pg_trgm se não estiver habilitada
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_cidadao_nome_gin"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_cidadao_cpf_partial"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_cidadao_nis_partial"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_cidadao_endereco_bairro"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_cidadao_ativo_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_cidadao_unidade_ativo"`);
  }
}