import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para remover as tabelas do sistema antigo de aprovação
 * 
 * Esta migration remove completamente as tabelas e enums do sistema antigo de aprovação:
 * - configuracoes_aprovacao
 * - aprovadores
 * - acoes_criticas
 * - solicitacoes_aprovacao
 * - delegacoes_aprovacao
 * - Enums relacionados
 * 
 * ATENÇÃO: Esta operação é irreversível e deve ser executada apenas após
 * confirmação de que o novo sistema aprovacao-v2 está funcionando corretamente.
 */
export class DropOldAprovacaoTables1755280000000 implements MigrationInterface {
  name = 'DropOldAprovacaoTables1755280000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remover tabelas do sistema antigo de aprovação (ordem importante devido às foreign keys)
    
    // 1. Remover tabela de delegações de aprovação
    await queryRunner.query(`
      DROP TABLE IF EXISTS "delegacoes_aprovacao" CASCADE;
    `);

    // 2. Remover tabela de solicitações de aprovação
    await queryRunner.query(`
      DROP TABLE IF EXISTS "solicitacoes_aprovacao" CASCADE;
    `);

    // 3. Remover tabela de aprovadores
    await queryRunner.query(`
      DROP TABLE IF EXISTS "aprovadores" CASCADE;
    `);

    // 4. Remover tabela de configurações de aprovação
    await queryRunner.query(`
      DROP TABLE IF EXISTS "configuracoes_aprovacao" CASCADE;
    `);

    // 5. Remover tabela de ações críticas
    await queryRunner.query(`
      DROP TABLE IF EXISTS "acoes_criticas" CASCADE;
    `);

    // 6. Remover enums do sistema antigo de aprovação
    await queryRunner.query(`
      DROP TYPE IF EXISTS "estrategia_aprovacao_enum" CASCADE;
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "status_aprovacao_enum" CASCADE;
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "status_configuracao_aprovacao_enum" CASCADE;
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "prioridade_aprovacao_enum" CASCADE;
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "tipo_acao_critica_enum" CASCADE;
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "status_delegacao_enum" CASCADE;
    `);

    console.log('✅ Tabelas e enums do sistema antigo de aprovação removidos com sucesso');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Esta migration não possui rollback pois é uma operação de limpeza
    // O rollback seria recriar todo o sistema antigo, o que não faz sentido
    throw new Error(
      'Esta migration não pode ser revertida. ' +
      'Ela remove permanentemente as tabelas do sistema antigo de aprovação. ' +
      'Para restaurar, seria necessário executar novamente as migrations antigas.'
    );
  }
}