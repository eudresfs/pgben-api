import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migração para alterar o tipo da coluna tags na tabela acoes_criticas
 * de simple-array para text array do PostgreSQL
 */
export class AlterTagsColumnType1751200100000 implements MigrationInterface {
  name = 'AlterTagsColumnType1751200100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Primeiro, remover a coluna tags existente
    await queryRunner.query(`
      ALTER TABLE "acoes_criticas" DROP COLUMN IF EXISTS "tags"
    `);
    
    // Adicionar a coluna tags como text array
    await queryRunner.query(`
      ALTER TABLE "acoes_criticas" 
      ADD COLUMN "tags" text[]
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverter para o tipo original (text simples)
    await queryRunner.query(`
      ALTER TABLE "acoes_criticas" DROP COLUMN IF EXISTS "tags"
    `);
    
    await queryRunner.query(`
      ALTER TABLE "acoes_criticas" 
      ADD COLUMN "tags" text
    `);
  }
}