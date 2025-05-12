import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRLSPolicies1000011 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Função auxiliar para verificar o contexto do usuário
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION check_user_access()
      RETURNS boolean AS $$
      DECLARE
        current_user_id uuid;
        current_user_role text;
        current_user_unidade_id uuid;
      BEGIN
        -- Obter informações do contexto da sessão
        current_user_id := current_setting('app.current_user_id', true)::uuid;
        current_user_role := current_setting('app.current_user_role', true);
        current_user_unidade_id := current_setting('app.current_user_unidade_id', true)::uuid;
        
        -- Administradores têm acesso total
        IF current_user_role = 'ADMIN' THEN
          RETURN true;
        END IF;
        
        RETURN true; -- Valor base, será customizado por política
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    // Ativar RLS nas tabelas principais
    await queryRunner.query(`
      -- Tabela de usuários
      ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
      
      -- Política para usuários
      CREATE POLICY user_access_policy ON "user"
        USING (
          check_user_access() AND (
            id = current_setting('app.current_user_id', true)::uuid OR
            current_setting('app.current_user_role', true) IN ('ADMIN', 'GESTOR')
          )
        );

      -- Tabela de cidadãos
      ALTER TABLE "cidadao" ENABLE ROW LEVEL SECURITY;
      
      -- Política para cidadãos
      CREATE POLICY cidadao_access_policy ON "cidadao"
        USING (
          check_user_access() AND (
            unidade_id = current_setting('app.current_user_unidade_id', true)::uuid OR
            current_setting('app.current_user_role', true) IN ('ADMIN', 'GESTOR')
          )
        );

      -- Tabela de solicitações
      ALTER TABLE "solicitacao" ENABLE ROW LEVEL SECURITY;
      
      -- Política para solicitações
      CREATE POLICY solicitacao_access_policy ON "solicitacao"
        USING (
          check_user_access() AND (
            unidade_id = current_setting('app.current_user_unidade_id', true)::uuid OR
            current_setting('app.current_user_role', true) IN ('ADMIN', 'GESTOR')
          )
        );

      -- Trigger para auditoria
      CREATE OR REPLACE FUNCTION audit_changes()
      RETURNS trigger AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          NEW.created_by := current_setting('app.current_user_id', true)::uuid;
          NEW.created_at := CURRENT_TIMESTAMP;
        ELSIF TG_OP = 'UPDATE' THEN
          NEW.updated_by := current_setting('app.current_user_id', true)::uuid;
          NEW.updated_at := CURRENT_TIMESTAMP;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      -- Aplicar trigger de auditoria nas tabelas principais
      CREATE TRIGGER audit_cidadao_changes
        BEFORE INSERT OR UPDATE ON "cidadao"
        FOR EACH ROW EXECUTE FUNCTION audit_changes();

      CREATE TRIGGER audit_solicitacao_changes
        BEFORE INSERT OR UPDATE ON "solicitacao"
        FOR EACH ROW EXECUTE FUNCTION audit_changes();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover triggers
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS audit_cidadao_changes ON "cidadao";
      DROP TRIGGER IF EXISTS audit_solicitacao_changes ON "solicitacao";
      
      -- Remover funções
      DROP FUNCTION IF EXISTS audit_changes();
      DROP FUNCTION IF EXISTS check_user_access();
      
      -- Remover políticas
      DROP POLICY IF EXISTS user_access_policy ON "user";
      DROP POLICY IF EXISTS cidadao_access_policy ON "cidadao";
      DROP POLICY IF EXISTS solicitacao_access_policy ON "solicitacao";
      
      -- Desativar RLS
      ALTER TABLE "user" DISABLE ROW LEVEL SECURITY;
      ALTER TABLE "cidadao" DISABLE ROW LEVEL SECURITY;
      ALTER TABLE "solicitacao" DISABLE ROW LEVEL SECURITY;
    `);
  }
}