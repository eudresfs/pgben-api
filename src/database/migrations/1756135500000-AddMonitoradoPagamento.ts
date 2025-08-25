import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Migration para adicionar coluna 'monitorado' à tabela de pagamento
 *
 * Esta migration adiciona a coluna necessária para controlar se um pagamento
 * já passou por monitoramento através de visitas domiciliares.
 *
 * A coluna 'monitorado' é atualizada para true quando uma visita é concluída
 * com resultado 'conforme'.
 *
 * @author Sistema SEMTAS
 * @date 2025-01-30
 */
export class AddMonitoradoPagamento1756135500000 implements MigrationInterface {
  name = 'AddMonitoradoPagamento1756135500000';

  /**
   * Adiciona a coluna 'monitorado' à tabela de pagamento
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Iniciando migration AddMonitoradoPagamento...');

    // Verificar se a tabela pagamento existe
    const tableExists = await queryRunner.hasTable('pagamento');
    if (!tableExists) {
      throw new Error(
        'Tabela pagamento não encontrada. Execute as migrations anteriores primeiro.',
      );
    }

    // Adicionar a coluna 'monitorado' à tabela pagamento
    await queryRunner.addColumn(
      'pagamento',
      new TableColumn({
        name: 'monitorado',
        type: 'boolean',
        default: false,
        isNullable: false,
        comment: 'Indica se o pagamento já passou por monitoramento através de visita domiciliar',
      }),
    );

    // Adicionar índice para otimização de consultas
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pagamento_monitorado" 
      ON "pagamento" ("monitorado") 
      WHERE "monitorado" = false;
    `);

    // Adicionar índice composto para consultas de pagamentos pendentes de monitoramento
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pagamento_status_monitorado" 
      ON "pagamento" ("status", "monitorado") 
      WHERE "monitorado" = false AND "status" IN ('pago', 'liberado');
    `);

    console.log('Migration AddMonitoradoPagamento executada com sucesso.');
  }

  /**
   * Reverte as alterações realizadas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Revertendo migration AddMonitoradoPagamento...');

    // Remover índices
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_pagamento_monitorado";
      DROP INDEX IF EXISTS "IDX_pagamento_status_monitorado";
    `);

    // Remover coluna
    await queryRunner.dropColumn('pagamento', 'monitorado');

    console.log('Migration AddMonitoradoPagamento revertida com sucesso.');
  }
}