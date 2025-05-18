import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migração para adicionar políticas de Row-Level Security (RLS) à tabela de confirmação de recebimento
 * 
 * Implementa políticas de segurança para garantir que usuários só possam acessar
 * confirmações de recebimento de suas próprias unidades, exceto para administradores.
 * 
 * @author Equipe PGBen
 */
export class AddRLSToConfirmacaoRecebimento1621436789123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Habilitar RLS na tabela
    await queryRunner.query(`
      ALTER TABLE confirmacao_recebimento ENABLE ROW LEVEL SECURITY;
    `);

    // Criar política para usuários regulares (acesso apenas à própria unidade)
    await queryRunner.query(`
      CREATE POLICY confirmacao_recebimento_unidade_policy ON confirmacao_recebimento
      USING (
        EXISTS (
          SELECT 1 FROM pagamento p
          JOIN solicitacao s ON p.solicitacao_id = s.id
          WHERE 
            confirmacao_recebimento.pagamento_id = p.id AND
            s.unidade_id = current_setting('app.current_unidade_id')::uuid
        )
      );
    `);

    // Criar política para administradores (acesso completo)
    await queryRunner.query(`
      CREATE POLICY confirmacao_recebimento_admin_policy ON confirmacao_recebimento
      USING (
        current_setting('app.current_perfil')::text = 'admin' OR
        current_setting('app.current_perfil')::text = 'super_admin'
      );
    `);

    // Criar política para auditores (acesso somente leitura)
    await queryRunner.query(`
      CREATE POLICY confirmacao_recebimento_auditor_policy ON confirmacao_recebimento
      FOR SELECT
      USING (
        current_setting('app.current_perfil')::text = 'auditor'
      );
    `);

    // Criar índice para melhorar performance das consultas com RLS
    await queryRunner.query(`
      CREATE INDEX idx_confirmacao_recebimento_pagamento_id ON confirmacao_recebimento(pagamento_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover políticas
    await queryRunner.query(`
      DROP POLICY IF EXISTS confirmacao_recebimento_unidade_policy ON confirmacao_recebimento;
    `);

    await queryRunner.query(`
      DROP POLICY IF EXISTS confirmacao_recebimento_admin_policy ON confirmacao_recebimento;
    `);

    await queryRunner.query(`
      DROP POLICY IF EXISTS confirmacao_recebimento_auditor_policy ON confirmacao_recebimento;
    `);

    // Remover índice
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_confirmacao_recebimento_pagamento_id;
    `);

    // Desabilitar RLS na tabela
    await queryRunner.query(`
      ALTER TABLE confirmacao_recebimento DISABLE ROW LEVEL SECURITY;
    `);
  }
}
