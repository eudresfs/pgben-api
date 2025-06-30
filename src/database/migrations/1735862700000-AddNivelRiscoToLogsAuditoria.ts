import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para adicionar a coluna nivel_risco à tabela logs_auditoria
 *
 * Esta migration adiciona a coluna nivel_risco que é necessária para
 * classificar o nível de risco das operações auditadas no sistema.
 *
 * @author Sistema de Auditoria
 * @date 02/01/2025
 */
export class AddNivelRiscoToLogsAuditoria1735862700000 implements MigrationInterface {
  name = 'AddNivelRiscoToLogsAuditoria1735862700000';

  /**
   * Adiciona a coluna nivel_risco à tabela logs_auditoria
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Iniciando migration AddNivelRiscoToLogsAuditoria...');

    // Verificar se a tabela logs_auditoria existe
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'logs_auditoria'
      );
    `);

    if (!tableExists[0].exists) {
      console.log('Tabela logs_auditoria não existe, pulando migration.');
      return;
    }

    // Verificar se a coluna nivel_risco já existe
    const columnExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'logs_auditoria' 
        AND column_name = 'nivel_risco'
      );
    `);

    if (columnExists[0].exists) {
      console.log('Coluna nivel_risco já existe na tabela logs_auditoria.');
      return;
    }

    // Adicionar a coluna nivel_risco
    await queryRunner.query(`
      ALTER TABLE "logs_auditoria" 
      ADD COLUMN "nivel_risco" character varying(20);
    `);

    // Adicionar comentário à coluna
    await queryRunner.query(`
      COMMENT ON COLUMN "logs_auditoria"."nivel_risco" IS 'Nível de risco da operação auditada (baixo, médio, alto, crítico)';
    `);

    // Criar índice para otimizar consultas por nível de risco
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_logs_auditoria_nivel_risco" 
      ON "logs_auditoria" ("nivel_risco");
    `);

    console.log('Migration AddNivelRiscoToLogsAuditoria executada com sucesso.');
  }

  /**
   * Remove a coluna nivel_risco da tabela logs_auditoria
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Revertendo migration AddNivelRiscoToLogsAuditoria...');

    // Remover índice
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_logs_auditoria_nivel_risco";
    `);

    // Remover coluna
    await queryRunner.query(`
      ALTER TABLE "logs_auditoria" 
      DROP COLUMN IF EXISTS "nivel_risco";
    `);

    console.log('Migration AddNivelRiscoToLogsAuditoria revertida com sucesso.');
  }
}