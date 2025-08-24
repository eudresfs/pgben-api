import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnexosToAprovacao1755285200000 implements MigrationInterface {
  name = 'AddAnexosToAprovacao1755285200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adicionar campo anexos na tabela solicitacoes_aprovacao
    await queryRunner.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_name = 'solicitacoes_aprovacao'
                AND column_name = 'anexos'
          ) THEN
              ALTER TABLE "solicitacoes_aprovacao" ADD COLUMN "anexos" jsonb;
          END IF;
      END;
      $$;
    `);

    // Adicionar comentário para o campo anexos
    await queryRunner.query(`
      COMMENT ON COLUMN "solicitacoes_aprovacao"."anexos" IS 'Lista de anexos/documentos da solicitação'
    `);

    // Adicionar campo anexos_decisao na tabela aprovadores
    await queryRunner.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_name = 'aprovadores'
                AND column_name = 'anexos_decisao'
          ) THEN
              ALTER TABLE "aprovadores" 
            ADD COLUMN "anexos_decisao" jsonb;
          END IF;
      END;
      $$;
    `);

    // Adicionar comentário para o campo anexos_decisao
    await queryRunner.query(`
      COMMENT ON COLUMN "aprovadores"."anexos_decisao" IS 'Lista de anexos/documentos da decisão'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover campo anexos_decisao da tabela aprovadores
    await queryRunner.query(`
      DO $$
      BEGIN
          IF EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_name = 'aprovadores'
                AND column_name = 'anexos_decisao'
          ) THEN
              ALTER TABLE "aprovadores" 
            DROP COLUMN "anexos_decisao";
          END IF;
      END;
      $$;
    `);

    // Remover campo anexos da tabela solicitacoes_aprovacao
    await queryRunner.query(`
      DO $$
      BEGIN
          IF EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_name = 'solicitacoes_aprovacao'
                AND column_name = 'anexos'
          ) THEN
              ALTER TABLE "solicitacoes_aprovacao" 
            DROP COLUMN "anexos";
          END IF;
      END;
      $$;
    `);
  }
}