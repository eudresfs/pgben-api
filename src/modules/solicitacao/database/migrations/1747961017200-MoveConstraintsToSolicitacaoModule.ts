import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para mover as constraints de foreign key para o módulo de solicitação
 * 
 * Esta migration implementa o princípio de que cada módulo deve ser responsável
 * por suas próprias relações. O módulo de solicitação é o único que deve conhecer
 * e gerenciar suas relações com outros módulos.
 */
export class MoveConstraintsToSolicitacaoModule1747961017200 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Primeiro, verificamos se as constraints existem na tabela global e as removemos
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_solicitacao_processo_judicial'
        ) THEN
          ALTER TABLE "solicitacao" DROP CONSTRAINT "FK_solicitacao_processo_judicial";
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_solicitacao_determinacao_judicial'
        ) THEN
          ALTER TABLE "solicitacao" DROP CONSTRAINT "FK_solicitacao_determinacao_judicial";
        END IF;
      END $$;
    `);

    // Agora adicionamos as constraints no contexto do módulo de solicitação
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_solicitacao_processo_judicial'
        ) THEN
          ALTER TABLE "solicitacao" ADD CONSTRAINT "FK_solicitacao_processo_judicial"
          FOREIGN KEY ("processo_judicial_id") REFERENCES "processo_judicial" ("id") ON DELETE RESTRICT;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_solicitacao_determinacao_judicial'
        ) THEN
          ALTER TABLE "solicitacao" ADD CONSTRAINT "FK_solicitacao_determinacao_judicial"
          FOREIGN KEY ("determinacao_judicial_id") REFERENCES "determinacao_judicial" ("id") ON DELETE RESTRICT;
        END IF;
      END $$;
    `);

    // Verificamos se a coluna processo_judicial_id existe, se não, adicionamos
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'solicitacao' AND column_name = 'processo_judicial_id'
        ) THEN
          ALTER TABLE "solicitacao" ADD COLUMN "processo_judicial_id" uuid NULL;
        END IF;
      END $$;
    `);

    // Verificamos se a coluna determinacao_judicial_id existe, se não, adicionamos
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'solicitacao' AND column_name = 'determinacao_judicial_id'
        ) THEN
          ALTER TABLE "solicitacao" ADD COLUMN "determinacao_judicial_id" uuid NULL;
        END IF;
      END $$;
    `);

    // Adicionamos índices para melhorar a performance das consultas
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE tablename = 'solicitacao' AND indexname = 'IDX_solicitacao_processo_judicial'
        ) THEN
          CREATE INDEX "IDX_solicitacao_processo_judicial" ON "solicitacao" ("processo_judicial_id");
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE tablename = 'solicitacao' AND indexname = 'IDX_solicitacao_determinacao_judicial'
        ) THEN
          CREATE INDEX "IDX_solicitacao_determinacao_judicial" ON "solicitacao" ("determinacao_judicial_id");
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Removemos os índices
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_solicitacao_processo_judicial";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_solicitacao_determinacao_judicial";
    `);

    // Removemos as constraints
    await queryRunner.query(`
      ALTER TABLE "solicitacao" DROP CONSTRAINT IF EXISTS "FK_solicitacao_processo_judicial";
    `);

    await queryRunner.query(`
      ALTER TABLE "solicitacao" DROP CONSTRAINT IF EXISTS "FK_solicitacao_determinacao_judicial";
    `);
  }
}
