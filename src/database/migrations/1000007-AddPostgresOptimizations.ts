import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPostgresOptimizations1000007 implements MigrationInterface {
  name = 'AddPostgresOptimizations20250512122600';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Habilitar extensões úteis do PostgreSQL
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
      CREATE EXTENSION IF NOT EXISTS pg_trgm;
      CREATE EXTENSION IF NOT EXISTS btree_gin;
    `);

    // Criar índices GIN para busca textual em campos relevantes
    await queryRunner.query(`
      CREATE INDEX idx_cidadao_nome_gin ON cidadao USING gin (nome gin_trgm_ops);
      CREATE INDEX idx_cidadao_endereco_gin ON cidadao USING gin (endereco gin_trgm_ops);
    `);

    // Configurações de autovacuum para tabelas grandes
    await queryRunner.query(`
      ALTER TABLE cidadao SET (
        autovacuum_vacuum_scale_factor = 0.01,
        autovacuum_analyze_scale_factor = 0.005
      );

      ALTER TABLE solicitacao SET (
        autovacuum_vacuum_scale_factor = 0.01,
        autovacuum_analyze_scale_factor = 0.005
      );
    `);

    // Criar índices BRIN para campos de data em tabelas grandes
    await queryRunner.query(`
      CREATE INDEX idx_cidadao_created_at_brin ON cidadao
        USING brin (created_at);

      CREATE INDEX idx_solicitacao_created_at_brin ON solicitacao
        USING brin (created_at);
    `);

    // Configurar estatísticas estendidas para melhor planejamento de queries
    await queryRunner.query(`
      CREATE STATISTICS cidadao_stats (dependencies) ON
        bairro, cidade, uf FROM cidadao;

      CREATE STATISTICS solicitacao_stats (dependencies) ON
        status, unidade_id FROM solicitacao;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover estatísticas estendidas
    await queryRunner.query(`
      DROP STATISTICS IF EXISTS solicitacao_stats;
      DROP STATISTICS IF EXISTS cidadao_stats;
    `);

    // Remover índices BRIN
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_solicitacao_created_at_brin;
      DROP INDEX IF EXISTS idx_cidadao_created_at_brin;
    `);

    // Remover configurações de autovacuum
    await queryRunner.query(`
      ALTER TABLE solicitacao RESET (autovacuum_vacuum_scale_factor);
      ALTER TABLE solicitacao RESET (autovacuum_analyze_scale_factor);
      ALTER TABLE cidadao RESET (autovacuum_vacuum_scale_factor);
      ALTER TABLE cidadao RESET (autovacuum_analyze_scale_factor);
    `);

    // Remover índices GIN
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_cidadao_endereco_gin;
      DROP INDEX IF EXISTS idx_cidadao_nome_gin;
    `);

    // Desabilitar extensões
    await queryRunner.query(`
      DROP EXTENSION IF EXISTS btree_gin;
      DROP EXTENSION IF EXISTS pg_trgm;
      DROP EXTENSION IF EXISTS pg_stat_statements;
    `);
  }
}