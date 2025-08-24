import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Migração para adicionar campos de vencimento e regularização na tabela pagamento
 *
 * Adiciona:
 * - data_vencimento: Para marcar quando um pagamento venceu por falta de documentação
 * - data_regularizacao: Para registrar quando um pagamento vencido foi regularizado
 *
 * Específico para o benefício Aluguel Social
 */
export class AddVencimentoRegularizacaoPagamento1750500000000
  implements MigrationInterface
{
  name = 'AddVencimentoRegularizacaoPagamento1750500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adiciona coluna data_vencimento
    await queryRunner.addColumn(
      'pagamento',
      new TableColumn({
        name: 'data_vencimento',
        type: 'date',
        isNullable: true,
        comment:
          'Data de vencimento do pagamento por falta de documentação (Aluguel Social)',
      }),
    );

    // Adiciona coluna data_regularizacao
    await queryRunner.addColumn(
      'pagamento',
      new TableColumn({
        name: 'data_regularizacao',
        type: 'date',
        isNullable: true,
        comment: 'Data de regularização do pagamento vencido',
      }),
    );

    // Adiciona índice para data_vencimento para consultas eficientes
    await queryRunner.query(
      `CREATE INDEX "idx_pagamento_data_vencimento" ON "pagamento" ("data_vencimento") WHERE "data_vencimento" IS NOT NULL`,
    );

    // Adiciona índice composto para status e data_vencimento
    await queryRunner.query(
      `CREATE INDEX "idx_pagamento_status_vencimento" ON "pagamento" ("status", "data_vencimento") WHERE "status" = 'vencido'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove índices
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_pagamento_status_vencimento"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_pagamento_data_vencimento"`,
    );

    // Remove colunas
    await queryRunner.dropColumn('pagamento', 'data_regularizacao');
    await queryRunner.dropColumn('pagamento', 'data_vencimento');
  }
}
