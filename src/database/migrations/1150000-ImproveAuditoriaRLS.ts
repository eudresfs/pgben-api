import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para melhorar as políticas de segurança RLS do módulo de auditoria
 * 
 * Esta migration cria registros de acesso a dados sensíveis e aprimora as políticas RLS
 * para o módulo de auditoria, com foco em segurança e compliance com LGPD.
 * 
 * @author Engenheiro de Dados
 * @date 20/05/2025
 */
export class ImproveAuditoriaRLS1685556677889 implements MigrationInterface {
  name = 'ImproveAuditoriaRLS1685556677889';

  /**
   * Aplica políticas de segurança RLS mais robustas para o módulo de auditoria
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Iniciando migration 1150000-ImproveAuditoriaRLS...');
    
    // Verificar se a tabela existe
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'logs_auditoria'
      );
    `);
    
    if (!tableExists[0].exists) {
      console.log('Tabela logs_auditoria não existe, pulando migration.');
      return;
    }
    
    // Remover política existente (muito simples)
    await queryRunner.query(`
      DROP POLICY IF EXISTS logs_auditoria_policy ON logs_auditoria;
    `);
    
    // Criar tabela para registrar acesso a dados sensíveis (se não existir)
    const sensitiveTblExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'logs_acesso_dados_sensiveis'
      );
    `);
    
    if (!sensitiveTblExists[0].exists) {
      console.log('Criando tabela logs_acesso_dados_sensiveis...');
      await queryRunner.query(`
        CREATE TABLE logs_acesso_dados_sensiveis (
          id uuid NOT NULL DEFAULT uuid_generate_v4(),
          usuario character varying(100) NOT NULL,
          log_auditoria_id uuid NOT NULL,
          campos_acessados jsonb NOT NULL,
          ip_origem inet,
          data_acesso timestamp with time zone NOT NULL DEFAULT now(),
          justificativa text,
          CONSTRAINT pk_logs_acesso_dados_sensiveis PRIMARY KEY (id),
          CONSTRAINT fk_logs_acesso_dados_sensiveis_log FOREIGN KEY (log_auditoria_id) REFERENCES logs_auditoria (id) ON DELETE CASCADE
        );
        
        CREATE INDEX idx_logs_acesso_dados_sensiveis_usuario ON logs_acesso_dados_sensiveis (usuario);
        CREATE INDEX idx_logs_acesso_dados_sensiveis_data ON logs_acesso_dados_sensiveis (data_acesso);
      `);
    }
    
    // Criar função para registrar acesso a dados sensíveis
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION registrar_acesso_dados_sensiveis(
        p_log_id uuid, 
        p_campos jsonb, 
        p_justificativa text DEFAULT NULL
      ) 
      RETURNS void AS $$
      BEGIN
          INSERT INTO logs_acesso_dados_sensiveis (
              usuario,
              log_auditoria_id,
              campos_acessados,
              ip_origem,
              data_acesso,
              justificativa
          ) VALUES (
              current_user,
              p_log_id,
              p_campos,
              inet_client_addr(),
              now(),
              p_justificativa
          );
      EXCEPTION
          WHEN OTHERS THEN
              -- Em caso de erro, logar mas não falhar
              RAISE NOTICE 'Erro ao registrar acesso a dados sensíveis: %', SQLERRM;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
    
    // Adicionar políticas RLS simples mas robustas para logs de auditoria
    await queryRunner.query(`
      -- Política para administradores (acesso total)
      CREATE POLICY logs_auditoria_admin_policy ON logs_auditoria
      FOR ALL
      TO PUBLIC
      USING (
        current_user = 'postgres' OR 
        pg_has_role(current_user, 'administrador', 'MEMBER') OR
        pg_has_role(current_user, 'auditor', 'MEMBER')
      );
      
      -- Política para usuários que estão visualizando seus próprios logs
      CREATE POLICY logs_auditoria_self_policy ON logs_auditoria
      FOR SELECT
      TO PUBLIC
      USING (current_user = usuario_id::text);
    `);
    
    // Adicionar política RLS para a tabela de logs de acesso a dados sensíveis
    await queryRunner.query(`
      -- Habilitar RLS para a tabela
      ALTER TABLE logs_acesso_dados_sensiveis ENABLE ROW LEVEL SECURITY;
      
      -- Política para administradores (acesso total)
      CREATE POLICY logs_acesso_dados_sensiveis_admin_policy ON logs_acesso_dados_sensiveis
      FOR ALL
      TO PUBLIC
      USING (
        current_user = 'postgres' OR 
        pg_has_role(current_user, 'administrador', 'MEMBER') OR
        pg_has_role(current_user, 'auditor', 'MEMBER')
      );
      
      -- Política para usuários que estão visualizando seus próprios logs
      CREATE POLICY logs_acesso_dados_sensiveis_self_policy ON logs_acesso_dados_sensiveis
      FOR SELECT
      TO PUBLIC
      USING (current_user = usuario::text);
    `);
    
    console.log('Migration 1150000-ImproveAuditoriaRLS concluída com sucesso!');
  }

  /**
   * Reverte as alterações aplicadas na migration
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Revertendo migration 1150000-ImproveAuditoriaRLS...');
    
    // Remover políticas RLS de logs_acesso_dados_sensiveis
    await queryRunner.query(`
      DROP POLICY IF EXISTS logs_acesso_dados_sensiveis_admin_policy ON logs_acesso_dados_sensiveis;
      DROP POLICY IF EXISTS logs_acesso_dados_sensiveis_self_policy ON logs_acesso_dados_sensiveis;
      ALTER TABLE logs_acesso_dados_sensiveis DISABLE ROW LEVEL SECURITY;
    `);
    
    // Remover políticas RLS de logs_auditoria
    await queryRunner.query(`
      DROP POLICY IF EXISTS logs_auditoria_admin_policy ON logs_auditoria;
      DROP POLICY IF EXISTS logs_auditoria_self_policy ON logs_auditoria;
    `);
    
    // Remover função para registro de acesso a dados sensíveis
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS registrar_acesso_dados_sensiveis CASCADE;
    `);
    
    // Recriar política simples original
    await queryRunner.query(`
      CREATE POLICY logs_auditoria_policy ON logs_auditoria
      FOR ALL
      TO PUBLIC
      USING (true);
    `);
    
    console.log('Reversão da migration 1150000-ImproveAuditoriaRLS concluída com sucesso!');
  }
}