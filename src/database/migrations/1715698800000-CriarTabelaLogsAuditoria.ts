import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migração para criar a tabela de logs de auditoria
 * 
 * Esta migração cria a estrutura necessária para armazenar os logs
 * de auditoria do sistema, essenciais para compliance com LGPD.
 */
export class CriarTabelaLogsAuditoria1715698800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar se a tabela de usuários existe
    const usuarioTableExists = await queryRunner.hasTable('usuarios');
    
    if (!usuarioTableExists) {
      await queryRunner.query(`
        CREATE TABLE usuarios (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          nome VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          senha_hash VARCHAR(255) NOT NULL,
          cpf VARCHAR(14) UNIQUE,
          telefone VARCHAR(20),
          matricula VARCHAR(50) UNIQUE,
          role VARCHAR(50) NOT NULL DEFAULT 'TECNICO_UNIDADE',
          unidade_id UUID,
          setor_id UUID,
          status VARCHAR(20) NOT NULL DEFAULT 'ativo',
          primeiro_acesso BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          removed_at TIMESTAMPTZ
        );
      `);
    }

    // Criar a tabela sem os comentários
    await queryRunner.query(`
      CREATE TABLE logs_auditoria (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tipo_operacao CHAR(1) NOT NULL,
        entidade_afetada VARCHAR(100) NOT NULL,
        entidade_id VARCHAR(36),
        dados_anteriores JSONB,
        dados_novos JSONB,
        usuario_id UUID,
        ip_usuario VARCHAR(45),
        user_agent TEXT,
        endpoint VARCHAR(255),
        metodo_http VARCHAR(10),
        dados_sensiveis_acessados JSONB,
        motivo TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Adicionar comentários nas colunas
    await queryRunner.query(`
      COMMENT ON COLUMN logs_auditoria.tipo_operacao IS 'Tipo de operação: C=Create, R=Read, U=Update, D=Delete';
      COMMENT ON COLUMN logs_auditoria.entidade_afetada IS 'Nome da entidade afetada pela operação';
      COMMENT ON COLUMN logs_auditoria.entidade_id IS 'ID da entidade afetada pela operação';
      COMMENT ON COLUMN logs_auditoria.dados_anteriores IS 'Dados anteriores à operação (em caso de update ou delete)';
      COMMENT ON COLUMN logs_auditoria.dados_novos IS 'Dados após a operação (em caso de create ou update)';
      COMMENT ON COLUMN logs_auditoria.usuario_id IS 'ID do usuário que realizou a operação';
      COMMENT ON COLUMN logs_auditoria.ip_usuario IS 'IP do usuário que realizou a operação';
      COMMENT ON COLUMN logs_auditoria.user_agent IS 'User-Agent do navegador do usuário';
      COMMENT ON COLUMN logs_auditoria.endpoint IS 'Endpoint acessado';
      COMMENT ON COLUMN logs_auditoria.metodo_http IS 'Método HTTP utilizado';
      COMMENT ON COLUMN logs_auditoria.dados_sensiveis_acessados IS 'Dados sensíveis acessados (para compliance com LGPD)';
      COMMENT ON COLUMN logs_auditoria.motivo IS 'Motivo da operação (útil para operações administrativas)';
      COMMENT ON COLUMN logs_auditoria.created_at IS 'Data e hora da operação';
    `);

    // Criar índices
    await queryRunner.query(`
      CREATE INDEX idx_logs_auditoria_usuario_id_created_at ON logs_auditoria(usuario_id, created_at);
      CREATE INDEX idx_logs_auditoria_entidade_created_at ON logs_auditoria(entidade_afetada, created_at);
      CREATE INDEX idx_logs_auditoria_operacao_created_at ON logs_auditoria(tipo_operacao, created_at);
      CREATE INDEX idx_logs_auditoria_created_at ON logs_auditoria(created_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_logs_auditoria_usuario_id_created_at;
      DROP INDEX IF EXISTS idx_logs_auditoria_entidade_created_at;
      DROP INDEX IF EXISTS idx_logs_auditoria_operacao_created_at;
      DROP INDEX IF EXISTS idx_logs_auditoria_created_at;
      DROP TABLE IF EXISTS logs_auditoria;
    `);
  }
}
