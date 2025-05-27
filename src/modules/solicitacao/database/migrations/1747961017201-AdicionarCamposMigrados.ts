import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para adicionar campos migrados do módulo de benefício para o módulo de solicitação
 * 
 * Esta migration implementa a migração de responsabilidades do módulo de benefício para o módulo
 * de solicitação, seguindo os princípios SOLID, DRY, YAGNI e KISS.
 */
export class AdicionarCamposMigrados1747961017201 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar e adicionar coluna determinacao_judicial_flag
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'solicitacao' AND column_name = 'determinacao_judicial_flag'
        ) THEN
          ALTER TABLE "solicitacao" ADD COLUMN "determinacao_judicial_flag" boolean DEFAULT false;
        END IF;
      END $$;
    `);

    // Verificar e adicionar coluna renovacao_automatica
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'solicitacao' AND column_name = 'renovacao_automatica'
        ) THEN
          ALTER TABLE "solicitacao" ADD COLUMN "renovacao_automatica" boolean DEFAULT false;
        END IF;
      END $$;
    `);

    // Verificar e adicionar coluna contador_renovacoes
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'solicitacao' AND column_name = 'contador_renovacoes'
        ) THEN
          ALTER TABLE "solicitacao" ADD COLUMN "contador_renovacoes" integer DEFAULT 0;
        END IF;
      END $$;
    `);

    // Verificar e adicionar coluna data_proxima_renovacao
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'solicitacao' AND column_name = 'data_proxima_renovacao'
        ) THEN
          ALTER TABLE "solicitacao" ADD COLUMN "data_proxima_renovacao" timestamp NULL;
        END IF;
      END $$;
    `);

    // Verificar e adicionar coluna dados_dinamicos
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'solicitacao' AND column_name = 'dados_dinamicos'
        ) THEN
          ALTER TABLE "solicitacao" ADD COLUMN "dados_dinamicos" jsonb NULL;
        END IF;
      END $$;
    `);

    // Verificar e adicionar coluna versao_schema
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'solicitacao' AND column_name = 'versao_schema'
        ) THEN
          ALTER TABLE "solicitacao" ADD COLUMN "versao_schema" integer DEFAULT 1;
        END IF;
      END $$;
    `);

    // Adicionar novos valores ao enum status_solicitacao
    await queryRunner.query(`
      DO $$
      BEGIN
        -- Verificar se o tipo enum já existe
        IF EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'status_solicitacao'
        ) THEN
          -- Verificar se os novos valores já existem no enum
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'status_solicitacao')
            AND enumlabel = 'em_processamento'
          ) THEN
            -- Adicionar novos valores ao enum
            ALTER TYPE status_solicitacao ADD VALUE IF NOT EXISTS 'em_processamento' AFTER 'cancelada';
            ALTER TYPE status_solicitacao ADD VALUE IF NOT EXISTS 'concluida' AFTER 'em_processamento';
            ALTER TYPE status_solicitacao ADD VALUE IF NOT EXISTS 'arquivada' AFTER 'concluida';
          END IF;
        END IF;
      END $$;
    `);

    // Adicionar índices para os novos campos
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE tablename = 'solicitacao' AND indexname = 'IDX_solicitacao_renovacao_automatica'
        ) THEN
          CREATE INDEX "IDX_solicitacao_renovacao_automatica" ON "solicitacao" ("renovacao_automatica") WHERE renovacao_automatica = true;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE tablename = 'solicitacao' AND indexname = 'IDX_solicitacao_data_proxima_renovacao'
        ) THEN
          CREATE INDEX "IDX_solicitacao_data_proxima_renovacao" ON "solicitacao" ("data_proxima_renovacao") WHERE data_proxima_renovacao IS NOT NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE tablename = 'solicitacao' AND indexname = 'IDX_solicitacao_versao_schema'
        ) THEN
          CREATE INDEX "IDX_solicitacao_versao_schema" ON "solicitacao" ("versao_schema");
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índices
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_solicitacao_renovacao_automatica"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_solicitacao_data_proxima_renovacao"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_solicitacao_versao_schema"`);

    // Remover colunas
    await queryRunner.query(`ALTER TABLE "solicitacao" DROP COLUMN IF EXISTS "determinacao_judicial_flag"`);
    await queryRunner.query(`ALTER TABLE "solicitacao" DROP COLUMN IF EXISTS "renovacao_automatica"`);
    await queryRunner.query(`ALTER TABLE "solicitacao" DROP COLUMN IF EXISTS "contador_renovacoes"`);
    await queryRunner.query(`ALTER TABLE "solicitacao" DROP COLUMN IF EXISTS "data_proxima_renovacao"`);
    await queryRunner.query(`ALTER TABLE "solicitacao" DROP COLUMN IF EXISTS "dados_dinamicos"`);
    await queryRunner.query(`ALTER TABLE "solicitacao" DROP COLUMN IF EXISTS "versao_schema"`);

    // Não é possível remover valores de um enum no PostgreSQL, então não fazemos nada com o enum
  }
}
