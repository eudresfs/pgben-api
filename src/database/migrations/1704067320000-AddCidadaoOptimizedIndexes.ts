import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCidadaoOptimizedIndexes1704067320000
  implements MigrationInterface
{
  name = 'AddCidadaoOptimizedIndexes1704067320000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Habilitar extensões necessárias
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS btree_gin`);

    // Índice composto para ordenação por data de criação e unidade
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cidadao_created_unidade" 
      ON "cidadao" ("created_at" DESC, "unidade_id")
    `);

    // Índice para busca rápida por CPF sem formatação
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cidadao_cpf_clean" 
      ON "cidadao" (REPLACE(REPLACE(REPLACE("cpf", '.', ''), '-', ''), '/', '')) 
      WHERE "cpf" IS NOT NULL
    `);

    // Índice GIN para busca full-text em nome com peso
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cidadao_nome_fulltext" 
      ON "cidadao" USING gin(to_tsvector('portuguese', "nome"))
    `);

    // Índice para busca por telefone limpo
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cidadao_telefone_clean" 
      ON "cidadao" (REGEXP_REPLACE("telefone", '[^0-9]', '', 'g')) 
      WHERE "telefone" IS NOT NULL
    `);

    // Índice para busca por data de nascimento (ano)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cidadao_nascimento_ano" 
      ON "cidadao" (EXTRACT(YEAR FROM "data_nascimento")) 
      WHERE "data_nascimento" IS NOT NULL
    `);

    // Índice para campos mais consultados em conjunto
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cidadao_busca_rapida" 
      ON "cidadao" ("nome", "cpf", "unidade_id", "created_at" DESC) 
      WHERE "cpf" IS NOT NULL
    `);

    // Índice para paginação otimizada
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cidadao_paginacao" 
      ON "cidadao" ("id", "created_at" DESC)
    `);

    // Estatísticas para o otimizador
    await queryRunner.query(`ANALYZE "cidadao"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "IDX_cidadao_unidade_status"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "IDX_cidadao_created_unidade"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "IDX_cidadao_cpf_clean"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "IDX_cidadao_nome_fulltext"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "IDX_cidadao_telefone_clean"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "IDX_cidadao_endereco_cidade_bairro"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "IDX_cidadao_nascimento_ano"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "IDX_cidadao_busca_rapida"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "IDX_cidadao_paginacao"`,
    );
  }
}
