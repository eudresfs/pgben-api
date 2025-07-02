import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para adicionar índices otimizados para melhorar performance
 * das consultas mais frequentes do sistema.
 */
export class AddPerformanceIndexes1749330812430 implements MigrationInterface {
  name = 'AddPerformanceIndexes1749330812430';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Índices para otimizar consultas de autenticação e permissões
    await queryRunner.query(`
      -- Índice composto para busca de usuário por email (login)
      CREATE INDEX IF NOT EXISTS "idx_usuario_email_status" 
      ON "usuario" ("email", "status") 
      WHERE "status" = 'ativo';
    `);

    await queryRunner.query(`
      -- Índice para role-permission joins
      CREATE INDEX IF NOT EXISTS "idx_role_permission_role_id" 
      ON "role_permissao" ("role_id", "permissao_id");
    `);

    await queryRunner.query(`
      -- Índice para busca de permissões por nome
      CREATE INDEX IF NOT EXISTS "idx_permission_nome" 
      ON "permissao" ("nome") 
      WHERE "nome" IS NOT NULL;
    `);

    // Índices para otimizar consultas de benefícios
    await queryRunner.query(`
      -- Índice composto para solicitações por status e data
      CREATE INDEX IF NOT EXISTS "idx_solicitacao_status_data" 
      ON "solicitacao" ("status", "data_abertura", "beneficiario_id");
    `);

    await queryRunner.query(`
      -- Índice para busca de solicitações por cidadão
      CREATE INDEX IF NOT EXISTS "idx_solicitacao_cidadao_tipo" 
      ON "solicitacao" ("beneficiario_id", "tipo_beneficio_id", "status");
    `);

    // Índices para otimizar consultas de documentos
    await queryRunner.query(`
      -- Índice para documentos por solicitação
      CREATE INDEX IF NOT EXISTS "idx_documento_solicitacao" 
      ON "documentos" ("solicitacao_id", "tipo");
    `);

    await queryRunner.query(`
      -- Índice para documentos por cidadão
      CREATE INDEX IF NOT EXISTS "idx_documento_cidadao" 
      ON "documentos" ("cidadao_id", "tipo") 
      WHERE "cidadao_id" IS NOT NULL;
    `);

    // Índices para otimizar consultas de auditoria
    await queryRunner.query(`
      -- Índice para logs de auditoria por usuário e data
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_usuario_data" 
      ON "audit_logs" ("usuario_id", "created_at", "action");
    `);

    // Índices para otimizar consultas de pagamentos
    await queryRunner.query(`
      -- Índice para pagamentos por beneficiário e status
      CREATE INDEX IF NOT EXISTS "idx_pagamento_beneficiario_status" 
      ON "pagamento" ("solicitacao_id", "status", "data_pagamento");
    `);

    // Índices para refresh tokens
    await queryRunner.query(`
      -- Índice para refresh tokens ativos
      CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_usuario_ativo" 
      ON "refresh_tokens" ("usuario_id", "revoked", "expires_at") 
      WHERE "revoked" = false;
    `);

    // Estatísticas para o otimizador de consultas
    await queryRunner.query(`
      -- Atualizar estatísticas das tabelas principais
      ANALYZE "usuario";
      ANALYZE "permissao";
      ANALYZE "usuario_permissao";
      ANALYZE "role_permissao";
      ANALYZE "solicitacao";
      ANALYZE "documentos";
      ANALYZE "pagamento";
      ANALYZE "audit_logs";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índices criados
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_usuario_email_status";`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_role_permission_role_id";`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_permission_nome";`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_solicitacao_status_data";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_solicitacao_cidadao_tipo";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_documento_solicitacao";`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_documento_cidadao";`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_audit_logs_usuario_data";`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_logs_entidade";`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_pagamento_beneficiario_status";`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_pagamento_vencimento";`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_refresh_tokens_usuario_ativo";`,
    );
  }
}
