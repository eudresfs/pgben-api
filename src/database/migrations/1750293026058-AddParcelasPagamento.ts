import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para adicionar colunas de controle de parcelas à tabela de pagamento
 *
 * Esta migration adiciona as colunas necessárias para suportar:
 * - numeroParcela: número da parcela atual (para pagamentos com múltiplas parcelas)
 * - totalParcelas: total de parcelas previstas para o benefício
 *
 * Ambas as colunas têm valor padrão 1 para manter compatibilidade com registros existentes
 * que representam pagamentos únicos (sem parcelamento).
 *
 * @author Sistema SEMTAS
 * @date 2025-01-28
 */
export class AddParcelasPagamento1750293026058 implements MigrationInterface {
  name = 'AddParcelasPagamento1750293026058';

  /**
   * Adiciona as colunas de controle de parcelas à tabela de pagamento
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Iniciando migration AddParcelasPagamento...');

    // Verificar se as colunas já existem antes de adicionar
    const tableExists = await queryRunner.hasTable('pagamento');
    if (!tableExists) {
      throw new Error('Tabela pagamento não encontrada. Execute as migrations anteriores primeiro.');
    }

    // Adicionar as novas colunas à tabela pagamento
    await queryRunner.query(`
      ALTER TABLE "pagamento" 
      ADD COLUMN IF NOT EXISTS "numero_parcela" INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS "total_parcelas" INTEGER NOT NULL DEFAULT 1;
    `);

    // Adicionar constraints para garantir valores válidos
    await queryRunner.query(`
      DO $$
      BEGIN
        -- Constraint para numero_parcela >= 1
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'CHK_pagamento_numero_parcela_positivo'
        ) THEN
          ALTER TABLE "pagamento" ADD CONSTRAINT "CHK_pagamento_numero_parcela_positivo"
          CHECK ("numero_parcela" >= 1);
        END IF;
        
        -- Constraint para total_parcelas >= 1
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'CHK_pagamento_total_parcelas_positivo'
        ) THEN
          ALTER TABLE "pagamento" ADD CONSTRAINT "CHK_pagamento_total_parcelas_positivo"
          CHECK ("total_parcelas" >= 1);
        END IF;
        
        -- Constraint para numero_parcela <= total_parcelas
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'CHK_pagamento_parcela_valida'
        ) THEN
          ALTER TABLE "pagamento" ADD CONSTRAINT "CHK_pagamento_parcela_valida"
          CHECK ("numero_parcela" <= "total_parcelas");
        END IF;
      END $$;
    `);

    // Adicionar índices para otimização de consultas
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pagamento_numero_parcela" ON "pagamento" ("numero_parcela");
      CREATE INDEX IF NOT EXISTS "IDX_pagamento_total_parcelas" ON "pagamento" ("total_parcelas");
      CREATE INDEX IF NOT EXISTS "IDX_pagamento_parcelas_composite" ON "pagamento" ("numero_parcela", "total_parcelas");
    `);

    // Adicionar comentários nas colunas para documentação
    await queryRunner.query(`
      COMMENT ON COLUMN "pagamento"."numero_parcela" IS 'Número da parcela atual (para pagamentos com múltiplas parcelas)';
      COMMENT ON COLUMN "pagamento"."total_parcelas" IS 'Total de parcelas previstas para o benefício';
    `);

    console.log('Migration AddParcelasPagamento executada com sucesso.');
  }

  /**
   * Reverte as alterações realizadas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Revertendo migration AddParcelasPagamento...');

    // Remover constraints
    await queryRunner.query(`
      ALTER TABLE "pagamento" DROP CONSTRAINT IF EXISTS "CHK_pagamento_numero_parcela_positivo";
      ALTER TABLE "pagamento" DROP CONSTRAINT IF EXISTS "CHK_pagamento_total_parcelas_positivo";
      ALTER TABLE "pagamento" DROP CONSTRAINT IF EXISTS "CHK_pagamento_parcela_valida";
    `);

    // Remover índices
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_pagamento_numero_parcela";
      DROP INDEX IF EXISTS "IDX_pagamento_total_parcelas";
      DROP INDEX IF EXISTS "IDX_pagamento_parcelas_composite";
    `);

    // Remover colunas
    await queryRunner.query(`
      ALTER TABLE "pagamento" 
      DROP COLUMN IF EXISTS "numero_parcela",
      DROP COLUMN IF EXISTS "total_parcelas";
    `);

    console.log('Migration AddParcelasPagamento revertida com sucesso.');
  }
}