import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migração para corrigir problemas identificados:
 * 1. Campo liberado_por na tabela pagamento deve ser nullable
 * 2. Remover campos de renovação da tabela solicitacao (devem estar apenas em configuracao_renovacao)
 * 3. Garantir consistência na estrutura de dados
 */
export class FixPagamentoAndSolicitacaoIssues1750400000000
  implements MigrationInterface
{
  name = 'FixPagamentoAndSolicitacaoIssues1750400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Corrigir campo liberado_por para ser nullable na tabela pagamento
    await queryRunner.query(`
      ALTER TABLE "pagamento" 
      ALTER COLUMN "liberado_por" DROP NOT NULL;
    `);

    // 2. Remover campos de renovação da tabela solicitacao
    // Estes campos devem existir apenas na tabela configuracao_renovacao
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_solicitacao_renovacao_automatica";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_solicitacao_data_proxima_renovacao";
    `);

    await queryRunner.query(`
      ALTER TABLE "solicitacao" 
      DROP COLUMN IF EXISTS "renovacao_automatica";
    `);

    await queryRunner.query(`
      ALTER TABLE "solicitacao" 
      DROP COLUMN IF EXISTS "contador_renovacoes";
    `);

    await queryRunner.query(`
      ALTER TABLE "solicitacao" 
      DROP COLUMN IF EXISTS "data_proxima_renovacao";
    `);

    // 3. Adicionar campo criado_por na tabela pagamento se não existir
    await queryRunner.query(`
      ALTER TABLE "pagamento" 
      ADD COLUMN IF NOT EXISTS "criado_por" uuid;
    `);

    // 4. Criar índice para criado_por
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pagamento_criado_por" 
      ON "pagamento" ("criado_por");
    `);

    // 5. Adicionar constraint de foreign key para criado_por se não existir
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_pagamento_criado_por' 
          AND table_name = 'pagamento'
        ) THEN
          ALTER TABLE "pagamento" 
          ADD CONSTRAINT "FK_pagamento_criado_por" 
          FOREIGN KEY ("criado_por") REFERENCES "usuario"("id") 
          ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverter as alterações

    // 1. Tornar liberado_por NOT NULL novamente (cuidado: pode falhar se houver dados)
    await queryRunner.query(`
      UPDATE "pagamento" SET "liberado_por" = '00000000-0000-0000-0000-000000000000' 
      WHERE "liberado_por" IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "pagamento" 
      ALTER COLUMN "liberado_por" SET NOT NULL;
    `);

    // 2. Recriar campos de renovação na tabela solicitacao
    await queryRunner.query(`
      ALTER TABLE "solicitacao" 
      ADD COLUMN "renovacao_automatica" boolean NOT NULL DEFAULT false;
    `);

    await queryRunner.query(`
      ALTER TABLE "solicitacao" 
      ADD COLUMN "contador_renovacoes" integer NOT NULL DEFAULT 0;
    `);

    await queryRunner.query(`
      ALTER TABLE "solicitacao" 
      ADD COLUMN "data_proxima_renovacao" timestamp with time zone;
    `);

    // 3. Recriar índices
    await queryRunner.query(`
      CREATE INDEX "IDX_solicitacao_renovacao_automatica" 
      ON "solicitacao" ("renovacao_automatica") 
      WHERE renovacao_automatica = true;
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_solicitacao_data_proxima_renovacao" 
      ON "solicitacao" ("data_proxima_renovacao");
    `);

    // 4. Remover constraint e índice de criado_por
    await queryRunner.query(`
      ALTER TABLE "pagamento" 
      DROP CONSTRAINT IF EXISTS "FK_pagamento_criado_por";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_pagamento_criado_por";
    `);

    await queryRunner.query(`
      ALTER TABLE "pagamento" 
      DROP COLUMN IF EXISTS "criado_por";
    `);
  }
}
