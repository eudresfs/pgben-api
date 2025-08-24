import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para criação de índices otimizados na tabela de pagamentos
 *
 * Esta migration adiciona índices compostos para melhorar a performance das queries
 * mais frequentes do módulo de pagamento, incluindo:
 * - Listagem por status com ordenação por data
 * - Busca por solicitação
 * - Filtros por data de liberação
 * - Busca por responsável da liberação
 * - Busca por informações bancárias
 *
 * @author Equipe PGBen
 */
export class CreatePagamentoIndexes1749330812426 implements MigrationInterface {
  name = 'CreatePagamentoIndexes1749330812426';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Índice composto para queries de listagem por status com ordenação
    // Otimiza: SELECT * FROM pagamento WHERE status = ? ORDER BY created_at DESC
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pagamento_status_created_at 
      ON pagamento(status, created_at DESC)
    `);

    // Índice para busca por solicitação (query muito frequente)
    // Otimiza: SELECT * FROM pagamento WHERE solicitacao_id = ?
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pagamento_solicitacao_id 
      ON pagamento(solicitacao_id)
    `);

    // Índice para busca por informações bancárias
    // Otimiza: SELECT * FROM pagamento WHERE info_bancaria_id = ?
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pagamento_info_bancaria_id 
      ON pagamento(info_bancaria_id)
    `);

    // Índice para busca por responsável da liberação
    // Otimiza: SELECT * FROM pagamento WHERE liberado_por = ?
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pagamento_liberado_por 
      ON pagamento(liberado_por)
    `);

    // Índice para filtros por data de liberação
    // Otimiza: SELECT * FROM pagamento WHERE data_liberacao BETWEEN ? AND ?
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pagamento_data_liberacao 
      ON pagamento(data_liberacao)
    `);

    // Índice composto para queries complexas com status e data
    // Otimiza: SELECT * FROM pagamento WHERE status = ? AND data_liberacao BETWEEN ? AND ?
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pagamento_status_data_liberacao 
      ON pagamento(status, data_liberacao)
    `);

    // Índice para busca por método de pagamento
    // Otimiza: SELECT * FROM pagamento WHERE metodo_pagamento = ?
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pagamento_metodo_pagamento 
      ON pagamento(metodo_pagamento)
    `);

    // Índice composto para relatórios por valor e status
    // Otimiza queries de relatórios financeiros
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pagamento_valor_status 
      ON pagamento(valor, status)
    `);

    // Índice composto para queries de auditoria
    // Otimiza: SELECT * FROM pagamento WHERE liberado_por = ? ORDER BY created_at DESC
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pagamento_liberado_por_created_at 
      ON pagamento(liberado_por, created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índices na ordem inversa
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_pagamento_liberado_por_created_at`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pagamento_removed_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pagamento_valor_status`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_pagamento_metodo_pagamento`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_pagamento_status_data_liberacao`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_pagamento_data_liberacao`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pagamento_liberado_por`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_pagamento_info_bancaria_id`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_pagamento_solicitacao_id`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_pagamento_status_created_at`,
    );
  }
}
