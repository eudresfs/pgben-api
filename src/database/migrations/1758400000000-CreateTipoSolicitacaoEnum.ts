import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para criar o enum tipo_solicitacao_enum
 * Adiciona suporte para diferenciação entre solicitações originais e renovações
 */
export class CreateTipoSolicitacaoEnum1758400000000 implements MigrationInterface {
  name = 'CreateTipoSolicitacaoEnum1758400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar enum para tipo de solicitação
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "tipo_solicitacao_enum" AS ENUM (
          'original', 'renovacao'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover o enum tipo_solicitacao_enum
    await queryRunner.query(`DROP TYPE IF EXISTS "tipo_solicitacao_enum";`);
  }
}