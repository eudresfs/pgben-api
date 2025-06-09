import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para adicionar novas colunas à tabela de pagamento
 *
 * Esta migration adiciona as colunas necessárias para suportar:
 * - dataAgendamento: data de agendamento do pagamento
 * - dataPrevistaLiberacao: data prevista para liberação
 * - dataPagamento: data efetiva do pagamento
 * - dataConclusao: data de conclusão do processo
 * - criadoPor: usuário que criou o pagamento
 * - comprovanteId: referência ao comprovante de pagamento
 *
 * @author Sistema SEMTAS
 * @date 2025-01-27
 */
export class AddPagamentoColumns1749330812428 implements MigrationInterface {
  name = 'AddPagamentoColumns1749330812428';

  /**
   * Adiciona as novas colunas à tabela de pagamento
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Iniciando migration AddPagamentoColumns...');

    // Adicionar as novas colunas à tabela pagamento
    await queryRunner.query(`
      ALTER TABLE "pagamento" 
      ADD COLUMN IF NOT EXISTS "data_agendamento" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "data_prevista_liberacao" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "data_pagamento" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "data_conclusao" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "criado_por" uuid,
      ADD COLUMN IF NOT EXISTS "comprovante_id" uuid;
    `);

    // Adicionar índices para otimização de consultas
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pagamento_data_agendamento" ON "pagamento" ("data_agendamento");
      CREATE INDEX IF NOT EXISTS "IDX_pagamento_data_prevista_liberacao" ON "pagamento" ("data_prevista_liberacao");
      CREATE INDEX IF NOT EXISTS "IDX_pagamento_data_pagamento" ON "pagamento" ("data_pagamento");
      CREATE INDEX IF NOT EXISTS "IDX_pagamento_data_conclusao" ON "pagamento" ("data_conclusao");
      CREATE INDEX IF NOT EXISTS "IDX_pagamento_criado_por" ON "pagamento" ("criado_por");
      CREATE INDEX IF NOT EXISTS "IDX_pagamento_comprovante" ON "pagamento" ("comprovante_id");
    `);

    // Adicionar chaves estrangeiras
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_pagamento_criado_por'
        ) THEN
          ALTER TABLE "pagamento" ADD CONSTRAINT "FK_pagamento_criado_por"
          FOREIGN KEY ("criado_por") REFERENCES "usuario" ("id") ON DELETE RESTRICT;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_pagamento_comprovante'
        ) THEN
          ALTER TABLE "pagamento" ADD CONSTRAINT "FK_pagamento_comprovante"
          FOREIGN KEY ("comprovante_id") REFERENCES "comprovante_pagamento" ("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    console.log('Migration AddPagamentoColumns executada com sucesso.');
  }

  /**
   * Reverte as alterações realizadas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Revertendo migration AddPagamentoColumns...');

    // Remover chaves estrangeiras
    await queryRunner.query(`
      ALTER TABLE "pagamento" DROP CONSTRAINT IF EXISTS "FK_pagamento_criado_por";
      ALTER TABLE "pagamento" DROP CONSTRAINT IF EXISTS "FK_pagamento_comprovante";
    `);

    // Remover índices
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_pagamento_data_agendamento";
      DROP INDEX IF EXISTS "IDX_pagamento_data_prevista_liberacao";
      DROP INDEX IF EXISTS "IDX_pagamento_data_pagamento";
      DROP INDEX IF EXISTS "IDX_pagamento_data_conclusao";
      DROP INDEX IF EXISTS "IDX_pagamento_criado_por";
      DROP INDEX IF EXISTS "IDX_pagamento_comprovante";
    `);

    // Remover colunas
    await queryRunner.query(`
      ALTER TABLE "pagamento" 
      DROP COLUMN IF EXISTS "data_agendamento",
      DROP COLUMN IF EXISTS "data_prevista_liberacao",
      DROP COLUMN IF EXISTS "data_pagamento",
      DROP COLUMN IF EXISTS "data_conclusao",
      DROP COLUMN IF EXISTS "criado_por",
      DROP COLUMN IF EXISTS "comprovante_id";
    `);

    console.log('Migration AddPagamentoColumns revertida com sucesso.');
  }
}