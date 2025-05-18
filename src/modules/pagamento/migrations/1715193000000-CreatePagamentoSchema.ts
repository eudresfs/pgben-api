import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migração para criar as tabelas do módulo de pagamento
 * 
 * Esta migração implementa o esquema completo do módulo de pagamento, criando
 * todas as tabelas necessárias, índices, chaves estrangeiras e configurações
 * de segurança.
 * 
 * @author Equipe PGBen
 */
export class CreatePagamentoSchema1715193000000 implements MigrationInterface {
  name = 'CreatePagamentoSchema1715193000000';

  /**
   * Executa a migração - criando tabelas e configurações
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tabela de pagamentos
    await queryRunner.query(`
      CREATE TABLE "pagamento" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "solicitacao_id" uuid NOT NULL,
        "info_bancaria_id" uuid NOT NULL,
        "valor" numeric(10,2) NOT NULL,
        "data_liberacao" TIMESTAMP NOT NULL,
        "status" character varying NOT NULL,
        "metodo_pagamento" character varying NOT NULL,
        "responsavel_liberacao" uuid NOT NULL,
        "dados_bancarios" jsonb,
        "observacoes" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_pagamento" PRIMARY KEY ("id")
      )
    `);

    // Tabela de comprovantes de pagamento
    await queryRunner.query(`
      CREATE TABLE "comprovante_pagamento" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "pagamento_id" uuid NOT NULL,
        "tipo_documento" character varying NOT NULL,
        "nome_arquivo" character varying NOT NULL,
        "caminho_arquivo" character varying NOT NULL,
        "tamanho" integer NOT NULL,
        "mime_type" character varying NOT NULL,
        "data_upload" TIMESTAMP NOT NULL,
        "uploaded_por" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_comprovante_pagamento" PRIMARY KEY ("id")
      )
    `);

    // Tabela de confirmações de recebimento
    await queryRunner.query(`
      CREATE TABLE "confirmacao_recebimento" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "pagamento_id" uuid NOT NULL,
        "data_confirmacao" TIMESTAMP NOT NULL,
        "metodo_confirmacao" character varying NOT NULL,
        "confirmado_por" uuid NOT NULL,
        "destinatario_id" uuid,
        "observacoes" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_confirmacao_recebimento" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_pagamento_id" UNIQUE ("pagamento_id")
      )
    `);

    // Índices para consultas otimizadas
    await queryRunner.query(`
      CREATE INDEX "IDX_pagamento_solicitacao" ON "pagamento" ("solicitacao_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_pagamento_status" ON "pagamento" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_pagamento_data_liberacao" ON "pagamento" ("data_liberacao")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_comprovante_pagamento_id" ON "comprovante_pagamento" ("pagamento_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_comprovante_data_upload" ON "comprovante_pagamento" ("data_upload")
    `);

    // Chaves estrangeiras
    await queryRunner.query(`
      ALTER TABLE "comprovante_pagamento" 
      ADD CONSTRAINT "FK_comprovante_pagamento" 
      FOREIGN KEY ("pagamento_id") REFERENCES "pagamento"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "confirmacao_recebimento" 
      ADD CONSTRAINT "FK_confirmacao_pagamento" 
      FOREIGN KEY ("pagamento_id") REFERENCES "pagamento"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Criação de triggers para atualização de timestamps
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_pagamento_timestamp
      BEFORE UPDATE ON pagamento
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_comprovante_timestamp
      BEFORE UPDATE ON comprovante_pagamento
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_confirmacao_timestamp
      BEFORE UPDATE ON confirmacao_recebimento
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
    `);

    // Configuração de políticas RLS (Row-Level Security) para segurança
    // Estas políticas serão adaptadas de acordo com o modelo de segurança da aplicação
    await queryRunner.query(`
      ALTER TABLE "pagamento" ENABLE ROW LEVEL SECURITY;
    `);

    await queryRunner.query(`
      ALTER TABLE "comprovante_pagamento" ENABLE ROW LEVEL SECURITY;
    `);

    await queryRunner.query(`
      ALTER TABLE "confirmacao_recebimento" ENABLE ROW LEVEL SECURITY;
    `);

    // Política para administradores (acesso total)
    await queryRunner.query(`
      CREATE POLICY admin_pagamento ON pagamento
      FOR ALL
      TO pg_admin_role
      USING (true);
    `);

    await queryRunner.query(`
      CREATE POLICY admin_comprovante ON comprovante_pagamento
      FOR ALL
      TO pg_admin_role
      USING (true);
    `);

    await queryRunner.query(`
      CREATE POLICY admin_confirmacao ON confirmacao_recebimento
      FOR ALL
      TO pg_admin_role
      USING (true);
    `);

    // Políticas para técnicos (acesso limitado)
    await queryRunner.query(`
      CREATE POLICY tecnico_pagamento ON pagamento
      FOR ALL
      TO pg_tecnico_role
      USING (responsavel_liberacao = current_setting('app.current_user_id')::uuid OR 
              EXISTS (SELECT 1 FROM solicitacao s WHERE s.id = pagamento.solicitacao_id AND s.unidade_id IN
                (SELECT unidade_id FROM usuario_unidade WHERE usuario_id = current_setting('app.current_user_id')::uuid)));
    `);

    // Políticas para gestores (acesso por unidade)
    await queryRunner.query(`
      CREATE POLICY gestor_pagamento ON pagamento
      FOR ALL
      TO pg_gestor_role
      USING (EXISTS (SELECT 1 FROM solicitacao s WHERE s.id = pagamento.solicitacao_id AND s.unidade_id IN
              (SELECT unidade_id FROM usuario_unidade WHERE usuario_id = current_setting('app.current_user_id')::uuid)));
    `);
  }

  /**
   * Reverte a migração - removendo tabelas e configurações
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remoção de políticas RLS
    await queryRunner.query(`DROP POLICY IF EXISTS admin_pagamento ON pagamento`);
    await queryRunner.query(`DROP POLICY IF EXISTS admin_comprovante ON comprovante_pagamento`);
    await queryRunner.query(`DROP POLICY IF EXISTS admin_confirmacao ON confirmacao_recebimento`);
    await queryRunner.query(`DROP POLICY IF EXISTS tecnico_pagamento ON pagamento`);
    await queryRunner.query(`DROP POLICY IF EXISTS gestor_pagamento ON pagamento`);

    // Desativação de RLS
    await queryRunner.query(`ALTER TABLE "pagamento" DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "comprovante_pagamento" DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "confirmacao_recebimento" DISABLE ROW LEVEL SECURITY`);

    // Remoção de triggers
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_pagamento_timestamp ON pagamento`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_comprovante_timestamp ON comprovante_pagamento`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_confirmacao_timestamp ON confirmacao_recebimento`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_timestamp()`);

    // Remoção das chaves estrangeiras
    await queryRunner.query(`ALTER TABLE "confirmacao_recebimento" DROP CONSTRAINT "FK_confirmacao_pagamento"`);
    await queryRunner.query(`ALTER TABLE "comprovante_pagamento" DROP CONSTRAINT "FK_comprovante_pagamento"`);

    // Remoção dos índices
    await queryRunner.query(`DROP INDEX "IDX_comprovante_data_upload"`);
    await queryRunner.query(`DROP INDEX "IDX_comprovante_pagamento_id"`);
    await queryRunner.query(`DROP INDEX "IDX_pagamento_data_liberacao"`);
    await queryRunner.query(`DROP INDEX "IDX_pagamento_status"`);
    await queryRunner.query(`DROP INDEX "IDX_pagamento_solicitacao"`);

    // Remoção das tabelas
    await queryRunner.query(`DROP TABLE "confirmacao_recebimento"`);
    await queryRunner.query(`DROP TABLE "comprovante_pagamento"`);
    await queryRunner.query(`DROP TABLE "pagamento"`);
  }
}
