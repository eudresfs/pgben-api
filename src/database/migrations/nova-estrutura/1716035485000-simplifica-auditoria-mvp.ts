import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migração para simplificar a estrutura de auditoria para o MVP
 * 
 * Esta migração remove campos não essenciais da tabela de logs de auditoria,
 * mantendo apenas os necessários para o MVP. Os campos podem ser readicionados
 * em versões futuras quando necessário.
 */
export class SimplificaAuditoriaMvp1716035485000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Lista de colunas não essenciais para o MVP que serão removidas
    await queryRunner.query(`
      ALTER TABLE logs_auditoria
      DROP COLUMN IF EXISTS dados_anteriores,
      DROP COLUMN IF EXISTS dados_novos,
      DROP COLUMN IF EXISTS ip_origem,
      DROP COLUMN IF EXISTS user_agent,
      DROP COLUMN IF EXISTS dados_sensiveis_acessados,
      DROP COLUMN IF EXISTS motivo,
      DROP COLUMN IF EXISTS descricao,
      DROP COLUMN IF EXISTS data_hora;
    `);

    // Adicionando comentário na tabela para indicar que é a versão MVP
    await queryRunner.query(`
      COMMENT ON TABLE logs_auditoria IS 'Tabela simplificada de logs de auditoria para o MVP';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restaurar as colunas removidas caso seja necessário reverter
    await queryRunner.query(`
      ALTER TABLE logs_auditoria
      ADD COLUMN IF NOT EXISTS dados_anteriores JSONB,
      ADD COLUMN IF NOT EXISTS dados_novos JSONB,
      ADD COLUMN IF NOT EXISTS ip_origem VARCHAR(45),
      ADD COLUMN IF NOT EXISTS user_agent TEXT,
      ADD COLUMN IF NOT EXISTS dados_sensiveis_acessados JSONB,
      ADD COLUMN IF NOT EXISTS motivo TEXT,
      ADD COLUMN IF NOT EXISTS descricao TEXT,
      ADD COLUMN IF NOT EXISTS data_hora TIMESTAMPTZ;
      
      COMMENT ON COLUMN logs_auditoria.dados_anteriores IS 'Dados anteriores à operação (em caso de update ou delete)';
      COMMENT ON COLUMN logs_auditoria.dados_novos IS 'Dados após a operação (em caso de create ou update)';
      COMMENT ON COLUMN logs_auditoria.ip_origem IS 'IP do usuário que realizou a operação';
      COMMENT ON COLUMN logs_auditoria.user_agent IS 'User-Agent do navegador do usuário';
      COMMENT ON COLUMN logs_auditoria.dados_sensiveis_acessados IS 'Dados sensíveis acessados (para compliance com LGPD)';
      COMMENT ON COLUMN logs_auditoria.motivo IS 'Motivo da operação (útil para operações administrativas)';
      COMMENT ON COLUMN logs_auditoria.descricao IS 'Descrição detalhada da operação realizada';
      COMMENT ON COLUMN logs_auditoria.data_hora IS 'Data e hora da operação (definida manualmente)';
    `);

    // Restaurar o comentário original da tabela
    await queryRunner.query(`
      COMMENT ON TABLE logs_auditoria IS 'Tabela de logs de auditoria do sistema';
    `);
  }
}
