import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateViewsAndTriggers1000006 implements MigrationInterface {
  name = 'CreateViewsAndTriggers20250512122500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // View para relatórios de beneficiários ativos
    await queryRunner.query(`
      CREATE OR REPLACE VIEW vw_beneficiarios_ativos AS
      SELECT 
        c.id,
        c.nome,
        c.cpf,
        c.nis,
        c.data_nascimento,
        c.endereco,
        c.bairro,
        c.cidade,
        c.uf,
        COUNT(s.id) as total_solicitacoes,
        COUNT(CASE WHEN s.status = 'aprovada' THEN 1 END) as solicitacoes_aprovadas
      FROM cidadao c
      LEFT JOIN solicitacao s ON s.beneficiario_id = c.id
      WHERE c.tipo_cidadao = 'beneficiario'
      AND c.removed_at IS NULL
      GROUP BY c.id, c.nome, c.cpf, c.nis, c.data_nascimento, c.endereco, c.bairro, c.cidade, c.uf;
    `);

    // View para relatórios de solicitações por unidade
    await queryRunner.query(`
      CREATE OR REPLACE VIEW vw_solicitacoes_por_unidade AS
      SELECT 
        u.id as unidade_id,
        u.nome as unidade_nome,
        u.codigo as unidade_codigo,
        COUNT(s.id) as total_solicitacoes,
        COUNT(CASE WHEN s.status = 'rascunho' THEN 1 END) as rascunhos,
        COUNT(CASE WHEN s.status = 'pendente' THEN 1 END) as pendentes,
        COUNT(CASE WHEN s.status = 'em_analise' THEN 1 END) as em_analise,
        COUNT(CASE WHEN s.status = 'aprovada' THEN 1 END) as aprovadas,
        COUNT(CASE WHEN s.status = 'indeferida' THEN 1 END) as indeferidas,
        COUNT(CASE WHEN s.status = 'cancelada' THEN 1 END) as canceladas,
        COUNT(CASE WHEN s.status = 'concluida' THEN 1 END) as concluidas,
        COUNT(CASE WHEN s.status = 'liberada' THEN 1 END) as liberadas
      FROM unidade u
      LEFT JOIN solicitacao s ON s.unidade_id = u.id
      WHERE u.removed_at IS NULL
      GROUP BY u.id, u.nome, u.codigo;
    `);

    // Trigger para atualizar data de modificação
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Aplicar trigger em todas as tabelas principais
      CREATE TRIGGER trg_usuario_updated_at
        BEFORE UPDATE ON usuario
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at();

      CREATE TRIGGER trg_cidadao_updated_at
        BEFORE UPDATE ON cidadao
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at();

      CREATE TRIGGER trg_solicitacao_updated_at
        BEFORE UPDATE ON solicitacao
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at();
    `);

    // Trigger para auditoria de alterações em solicitações
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS auditoria_solicitacao (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        solicitacao_id UUID NOT NULL,
        usuario_id UUID NOT NULL,
        acao VARCHAR(50) NOT NULL,
        status_anterior VARCHAR(50),
        status_novo VARCHAR(50),
        observacao TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_auditoria_solicitacao
          FOREIGN KEY (solicitacao_id)
          REFERENCES solicitacao(id)
          ON DELETE CASCADE,
        CONSTRAINT fk_auditoria_usuario
          FOREIGN KEY (usuario_id)
          REFERENCES usuario(id)
          ON DELETE CASCADE
      );

      CREATE OR REPLACE FUNCTION audit_solicitacao_changes()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'UPDATE' THEN
          INSERT INTO auditoria_solicitacao (
            solicitacao_id,
            usuario_id,
            acao,
            status_anterior,
            status_novo,
            observacao
          )
          VALUES (
            NEW.id,
            CURRENT_USER::UUID, -- Requer configuração de session_user
            'UPDATE',
            OLD.status,
            NEW.status,
            'Alteração de status da solicitação'
          );
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER trg_audit_solicitacao_changes
        AFTER UPDATE ON solicitacao
        FOR EACH ROW
        EXECUTE FUNCTION audit_solicitacao_changes();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover triggers de auditoria
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_audit_solicitacao_changes ON solicitacao;
      DROP FUNCTION IF EXISTS audit_solicitacao_changes();
      DROP TABLE IF EXISTS auditoria_solicitacao;
    `);

    // Remover triggers de atualização de data
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_solicitacao_updated_at ON solicitacao;
      DROP TRIGGER IF EXISTS trg_cidadao_updated_at ON cidadao;
      DROP TRIGGER IF EXISTS trg_usuario_updated_at ON usuario;
      DROP FUNCTION IF EXISTS update_updated_at();
    `);

    // Remover views
    await queryRunner.query(`
      DROP VIEW IF EXISTS vw_solicitacoes_por_unidade;
      DROP VIEW IF EXISTS vw_beneficiarios_ativos;
    `);
  }
}