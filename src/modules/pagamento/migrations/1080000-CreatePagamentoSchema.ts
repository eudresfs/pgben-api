import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para criar o schema de pagamento no banco de dados.
 * Implementa as tabelas necessárias para o módulo de Pagamento/Liberação.
 * 
 * @author Equipe PGBen
 */
export class CreatePagamentoSchema1080000 implements MigrationInterface {
  
  /**
   * Método que executa a migration (cria o schema)
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar os enums necessários
    await queryRunner.query(`
      CREATE TYPE status_pagamento_enum AS ENUM (
        'agendado',
        'liberado',
        'confirmado',
        'cancelado'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE metodo_pagamento_enum AS ENUM (
        'pix',
        'deposito',
        'presencial',
        'doc'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE metodo_confirmacao_enum AS ENUM (
        'assinatura',
        'digital',
        'terceirizado'
      );
    `);

    // Criar a tabela de pagamento
    await queryRunner.query(`
      CREATE TABLE pagamento (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        solicitacao_id UUID NOT NULL,
        info_bancaria_id UUID,
        valor DECIMAL(10, 2) NOT NULL,
        data_liberacao TIMESTAMP NOT NULL,
        status status_pagamento_enum NOT NULL DEFAULT 'agendado',
        metodo_pagamento metodo_pagamento_enum NOT NULL,
        liberado_por UUID NOT NULL,
        observacoes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        removed_at TIMESTAMP,
        
        CONSTRAINT fk_pagamento_solicitacao
          FOREIGN KEY (solicitacao_id)
          REFERENCES solicitacao (id)
          ON DELETE RESTRICT
          ON UPDATE CASCADE,
          
        CONSTRAINT fk_pagamento_info_bancaria
          FOREIGN KEY (info_bancaria_id)
          REFERENCES info_bancaria (id)
          ON DELETE RESTRICT
          ON UPDATE CASCADE,
          
        CONSTRAINT fk_pagamento_usuario
          FOREIGN KEY (liberado_por)
          REFERENCES usuario (id)
          ON DELETE RESTRICT
          ON UPDATE CASCADE
      );
    `);

    // Criar índices para otimização de consultas
    await queryRunner.query(`
      CREATE INDEX idx_pagamento_solicitacao
        ON pagamento (solicitacao_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_pagamento_status
        ON pagamento (status);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_pagamento_data_liberacao
        ON pagamento (data_liberacao);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_pagamento_liberado_por
        ON pagamento (liberado_por);
    `);

    // Trigger para atualização automática do updated_at
    await queryRunner.query(`
      CREATE TRIGGER update_pagamento_timestamp
      BEFORE UPDATE ON pagamento
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();
    `);

    // Criar a tabela de comprovante_pagamento
    await queryRunner.query(`
      CREATE TABLE comprovante_pagamento (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        pagamento_id UUID NOT NULL,
        tipo_documento VARCHAR(100) NOT NULL,
        nome_arquivo VARCHAR(255) NOT NULL,
        caminho_arquivo VARCHAR(500) NOT NULL,
        tamanho INTEGER NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        data_upload TIMESTAMP NOT NULL,
        uploaded_por UUID NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT fk_comprovante_pagamento
          FOREIGN KEY (pagamento_id)
          REFERENCES pagamento (id)
          ON DELETE CASCADE
          ON UPDATE CASCADE,
          
        CONSTRAINT fk_comprovante_usuario
          FOREIGN KEY (uploaded_por)
          REFERENCES usuario (id)
          ON DELETE RESTRICT
          ON UPDATE CASCADE
      );
    `);

    // Criar índices para tabela de comprovantes
    await queryRunner.query(`
      CREATE INDEX idx_comprovante_pagamento
        ON comprovante_pagamento (pagamento_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_comprovante_uploaded_por
        ON comprovante_pagamento (uploaded_por);
    `);

    // Trigger para atualização automática do updated_at
    await queryRunner.query(`
      CREATE TRIGGER update_comprovante_pagamento_timestamp
      BEFORE UPDATE ON comprovante_pagamento
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();
    `);

    // Criar a tabela de confirmacao_recebimento
    await queryRunner.query(`
      CREATE TABLE confirmacao_recebimento (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        pagamento_id UUID NOT NULL,
        data_confirmacao TIMESTAMP NOT NULL,
        metodo_confirmacao metodo_confirmacao_enum NOT NULL,
        confirmado_por UUID NOT NULL,
        destinatario_id UUID,
        observacoes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT fk_confirmacao_pagamento
          FOREIGN KEY (pagamento_id)
          REFERENCES pagamento (id)
          ON DELETE CASCADE
          ON UPDATE CASCADE,
          
        CONSTRAINT fk_confirmacao_usuario
          FOREIGN KEY (confirmado_por)
          REFERENCES usuario (id)
          ON DELETE RESTRICT
          ON UPDATE CASCADE,
          
        CONSTRAINT fk_confirmacao_destinatario
          FOREIGN KEY (destinatario_id)
          REFERENCES cidadao (id)
          ON DELETE RESTRICT
          ON UPDATE CASCADE
      );
    `);

    // Criar índices para tabela de confirmação
    await queryRunner.query(`
      CREATE INDEX idx_confirmacao_pagamento
        ON confirmacao_recebimento (pagamento_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_confirmacao_confirmado_por
        ON confirmacao_recebimento (confirmado_por);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_confirmacao_destinatario
        ON confirmacao_recebimento (destinatario_id);
    `);

    // Trigger para atualização automática do updated_at
    await queryRunner.query(`
      CREATE TRIGGER update_confirmacao_recebimento_timestamp
      BEFORE UPDATE ON confirmacao_recebimento
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();
    `);

    // Adicionar políticas RLS (Row-Level Security)
    
    // Habilitar RLS nas tabelas
    await queryRunner.query(`
      ALTER TABLE pagamento ENABLE ROW LEVEL SECURITY;
    `);

    await queryRunner.query(`
      ALTER TABLE comprovante_pagamento ENABLE ROW LEVEL SECURITY;
    `);

    await queryRunner.query(`
      ALTER TABLE confirmacao_recebimento ENABLE ROW LEVEL SECURITY;
    `);

    // Política para pagamento
    await queryRunner.query(`
      CREATE POLICY pagamento_policy ON pagamento
      USING (
        (SELECT valor FROM atual_usuario_sessao() WHERE perfil = 'admin') OR
        (SELECT valor FROM atual_usuario_sessao() WHERE perfil = 'gestor_semtas') OR
        (SELECT valor FROM atual_usuario_sessao() WHERE perfil = 'tecnico' AND 
          (
            liberado_por = (SELECT u.id FROM atual_usuario_sessao() a
                          JOIN usuario u ON a.usuario_id = u.id)
            OR
            EXISTS (
              SELECT 1 FROM solicitacao s
              WHERE s.id = pagamento.solicitacao_id
              AND s.unidade_id = (SELECT u.unidade_id FROM atual_usuario_sessao() a
                                JOIN usuario u ON a.usuario_id = u.id)
            )
          )
        )
      );
    `);

    // Política para comprovante_pagamento
    await queryRunner.query(`
      CREATE POLICY comprovante_pagamento_policy ON comprovante_pagamento
      USING (
        (SELECT valor FROM atual_usuario_sessao() WHERE perfil = 'admin') OR
        (SELECT valor FROM atual_usuario_sessao() WHERE perfil = 'gestor_semtas') OR
        (SELECT valor FROM atual_usuario_sessao() WHERE perfil = 'tecnico' AND 
          (
            uploaded_por = (SELECT u.id FROM atual_usuario_sessao() a
                          JOIN usuario u ON a.usuario_id = u.id)
            OR
            EXISTS (
              SELECT 1 FROM pagamento p
              JOIN solicitacao s ON p.solicitacao_id = s.id
              WHERE p.id = comprovante_pagamento.pagamento_id
              AND s.unidade_id = (SELECT u.unidade_id FROM atual_usuario_sessao() a
                                JOIN usuario u ON a.usuario_id = u.id)
            )
          )
        )
      );
    `);

    // Política para confirmacao_recebimento
    await queryRunner.query(`
      CREATE POLICY confirmacao_recebimento_policy ON confirmacao_recebimento
      USING (
        (SELECT valor FROM atual_usuario_sessao() WHERE perfil = 'admin') OR
        (SELECT valor FROM atual_usuario_sessao() WHERE perfil = 'gestor_semtas') OR
        (SELECT valor FROM atual_usuario_sessao() WHERE perfil = 'tecnico' AND 
          (
            confirmado_por = (SELECT u.id FROM atual_usuario_sessao() a
                          JOIN usuario u ON a.usuario_id = u.id)
            OR
            EXISTS (
              SELECT 1 FROM pagamento p
              JOIN solicitacao s ON p.solicitacao_id = s.id
              WHERE p.id = confirmacao_recebimento.pagamento_id
              AND s.unidade_id = (SELECT u.unidade_id FROM atual_usuario_sessao() a
                                JOIN usuario u ON a.usuario_id = u.id)
            )
          )
        )
      );
    `);
  }

  /**
   * Método que reverte a migration (desfaz as alterações)
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover políticas RLS
    await queryRunner.query(`
      DROP POLICY IF EXISTS confirmacao_recebimento_policy ON confirmacao_recebimento;
    `);

    await queryRunner.query(`
      DROP POLICY IF EXISTS comprovante_pagamento_policy ON comprovante_pagamento;
    `);

    await queryRunner.query(`
      DROP POLICY IF EXISTS pagamento_policy ON pagamento;
    `);

    // Desabilitar RLS
    await queryRunner.query(`
      ALTER TABLE confirmacao_recebimento DISABLE ROW LEVEL SECURITY;
    `);

    await queryRunner.query(`
      ALTER TABLE comprovante_pagamento DISABLE ROW LEVEL SECURITY;
    `);

    await queryRunner.query(`
      ALTER TABLE pagamento DISABLE ROW LEVEL SECURITY;
    `);

    // Remover triggers
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_confirmacao_recebimento_timestamp ON confirmacao_recebimento;
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_comprovante_pagamento_timestamp ON comprovante_pagamento;
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_pagamento_timestamp ON pagamento;
    `);

    // Remover tabelas
    await queryRunner.query(`
      DROP TABLE IF EXISTS confirmacao_recebimento;
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS comprovante_pagamento;
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS pagamento;
    `);

    // Remover enums
    await queryRunner.query(`
      DROP TYPE IF EXISTS metodo_confirmacao_enum;
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS metodo_pagamento_enum;
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS status_pagamento_enum;
    `);
  }
}
