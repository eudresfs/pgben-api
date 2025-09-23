import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para criar o enum tipo_concessao_enum
 * Adiciona suporte para diferenciação entre concessões originais e renovações
 */
export class CreateTipoConcessaoEnum1758400200000 implements MigrationInterface {
  name = 'CreateTipoConcessaoEnum1758400200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar enum para tipo de concessão
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "tipo_concessao_enum" AS ENUM (
          'original', 'renovacao'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover o enum tipo_concessao_enum
    await queryRunner.query(`DROP TYPE IF EXISTS "tipo_concessao_enum";`);
  }
}