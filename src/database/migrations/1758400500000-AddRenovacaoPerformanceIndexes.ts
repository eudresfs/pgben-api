import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para adicionar índices compostos otimizados para queries de elegibilidade de renovação
 * 
 * Esta migration cria índices específicos para melhorar a performance das consultas
 * relacionadas à verificação de elegibilidade para renovação de benefícios.
 * 
 * Índices criados:
 * - Índice composto para solicitações por status e data de criação
 * - Índice composto para concessões por status e data de vencimento
 * - Índice para cidadãos por CPF (otimização de busca)
 * - Índice para histórico de solicitações por data
 */
export class AddRenovacaoPerformanceIndexes1758400500000 implements MigrationInterface {
  name = 'AddRenovacaoPerformanceIndexes1758400500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Índice composto para otimizar queries de solicitações por status e data
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_solicitacao_status_created" 
      ON "solicitacao" ("status", "created_at")
    `);

    // Índice composto para otimizar queries de concessões por status e data de início
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_concessao_status_inicio" 
      ON "concessao" ("status", "data_inicio")
    `);

    // Índice para otimizar busca de cidadãos por CPF
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_cidadao_cpf_performance" 
      ON "cidadao" ("cpf")
    `);

    // Índice para otimizar queries de histórico por data
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_historico_status_solicitacao_data" 
      ON "historico_status_solicitacao" ("created_at")
    `);

    // Índice composto para otimizar queries de elegibilidade por beneficiário e tipo de benefício
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_solicitacao_beneficiario_tipo_beneficio" 
      ON "solicitacao" ("beneficiario_id", "tipo_beneficio_id", "status")
    `);

    // Índice para otimizar queries de concessões por solicitação e status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_concessao_solicitacao_status" 
      ON "concessao" ("solicitacao_id", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove os índices criados na ordem inversa
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_concessao_solicitacao_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_solicitacao_beneficiario_tipo_beneficio"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_historico_status_solicitacao_data"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_cidadao_cpf_performance"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_concessao_status_inicio"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_solicitacao_status_created"`);
  }
}