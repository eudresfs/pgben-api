import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para adicionar campos de invalidação de comprovantes à tabela pagamento
 * 
 * Adiciona:
 * - data_invalidacao: timestamp da invalidação do comprovante
 * - invalidado_por: UUID do usuário responsável pela invalidação
 * - Adiciona status INVALIDO ao enum status_pagamento_enum
 */
export class AddInvalidacaoFieldsToPagamento1758822000000 implements MigrationInterface {
  name = 'AddInvalidacaoFieldsToPagamento1758822000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adicionar novo status INVALIDO ao enum
    await queryRunner.query(`
      ALTER TYPE "status_pagamento_enum" ADD VALUE 'invalido';
    `);

    // Adicionar campo data_invalidacao
    await queryRunner.query(`
      ALTER TABLE "pagamento" 
      ADD COLUMN "data_invalidacao" TIMESTAMP NULL;
    `);

    // Adicionar campo invalidado_por
    await queryRunner.query(`
      ALTER TABLE "pagamento" 
      ADD COLUMN "invalidado_por" UUID NULL;
    `);

    // Adicionar foreign key para invalidado_por
    await queryRunner.query(`
      ALTER TABLE "pagamento" 
      ADD CONSTRAINT "FK_pagamento_invalidado_por" 
      FOREIGN KEY ("invalidado_por") 
      REFERENCES "usuario"("id") 
      ON DELETE SET NULL;
    `);

    // Adicionar comentários para documentação
    await queryRunner.query(`
      COMMENT ON COLUMN "pagamento"."data_invalidacao" IS 'Data de invalidação do comprovante de pagamento';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "pagamento"."invalidado_por" IS 'Usuário responsável pela invalidação do comprovante';
    `);

    // Adicionar índice para melhor performance nas consultas
    await queryRunner.query(`
      CREATE INDEX "IDX_pagamento_invalidado_por" 
      ON "pagamento" ("invalidado_por") 
      WHERE "invalidado_por" IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_pagamento_data_invalidacao" 
      ON "pagamento" ("data_invalidacao") 
      WHERE "data_invalidacao" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índices
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_pagamento_data_invalidacao";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_pagamento_invalidado_por";`);

    // Remover foreign key
    await queryRunner.query(`
      ALTER TABLE "pagamento" 
      DROP CONSTRAINT IF EXISTS "FK_pagamento_invalidado_por";
    `);

    // Remover colunas
    await queryRunner.query(`ALTER TABLE "pagamento" DROP COLUMN IF EXISTS "invalidado_por";`);
    await queryRunner.query(`ALTER TABLE "pagamento" DROP COLUMN IF EXISTS "data_invalidacao";`);

    // Nota: Não é possível remover valores de enum no PostgreSQL de forma simples
    // O valor INVALIDO permanecerá no enum, mas não será utilizado
    console.log('AVISO: O valor INVALIDO permanecerá no enum status_pagamento_enum');
  }
}