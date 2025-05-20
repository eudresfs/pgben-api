import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para criar o schema relacionado ao pagamento
 * 
 * Esta migration cria as tabelas, enumerações e restrições para o módulo de pagamento,
 * incluindo estruturas para gerenciar pagamentos, comprovantes e confirmações de recebimento.
 * 
 * @author Engenheiro de Dados
 * @date 19/05/2025
 */
export class CreatePagamentoSchema1685468879186 implements MigrationInterface {
  name = 'CreatePagamentoSchema1685468879186';

  /**
   * Cria as estruturas relacionadas ao pagamento
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Iniciando migration 1050000-CreatePagamentoSchema...');
    
    // Criação dos tipos enumerados
    await queryRunner.query(`
      CREATE TYPE "status_pagamento_enum" AS ENUM (
        'agendado',
        'liberado',
        'confirmado',
        'cancelado'
      );
      
      CREATE TYPE "metodo_pagamento_enum" AS ENUM (
        'pix',
        'deposito',
        'presencial',
        'doc'
      );
      
      CREATE TYPE "metodo_confirmacao_enum" AS ENUM (
        'assinatura',
        'digital',
        'terceirizado'
      );
    `);
    
    console.log('Tipos enumerados criados com sucesso.');
    
    // Tabela principal de pagamento
    await queryRunner.query(`
      CREATE TABLE "pagamento" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "solicitacao_id" uuid NOT NULL,
        "info_bancaria_id" uuid,
        "valor" decimal(10,2) NOT NULL,
        "data_liberacao" TIMESTAMP NOT NULL,
        "status" "status_pagamento_enum" NOT NULL DEFAULT 'agendado',
        "metodo_pagamento" "metodo_pagamento_enum" NOT NULL,
        "liberado_por" uuid NOT NULL,
        "observacoes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "removed_at" TIMESTAMP,
        CONSTRAINT "PK_pagamento" PRIMARY KEY ("id")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX "IDX_pagamento_solicitacao" ON "pagamento" ("solicitacao_id");
      CREATE INDEX "IDX_pagamento_info_bancaria" ON "pagamento" ("info_bancaria_id");
      CREATE INDEX "IDX_pagamento_liberado_por" ON "pagamento" ("liberado_por");
      CREATE INDEX "IDX_pagamento_status" ON "pagamento" ("status");
      CREATE INDEX "IDX_pagamento_data_liberacao" ON "pagamento" ("data_liberacao");
      CREATE INDEX "IDX_pagamento_metodo" ON "pagamento" ("metodo_pagamento");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_pagamento_update_timestamp
      BEFORE UPDATE ON "pagamento"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
    `);
    
    console.log('Tabela de pagamento criada com sucesso.');
    
    // Tabela de comprovante de pagamento
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
        CONSTRAINT "PK_comprovante_pagamento" PRIMARY KEY ("id")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX "IDX_comprovante_pagamento" ON "comprovante_pagamento" ("pagamento_id");
      CREATE INDEX "IDX_comprovante_uploaded_por" ON "comprovante_pagamento" ("uploaded_por");
      CREATE INDEX "IDX_comprovante_tipo" ON "comprovante_pagamento" ("tipo_documento");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_comprovante_update_timestamp
      BEFORE UPDATE ON "comprovante_pagamento"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
    `);
    
    console.log('Tabela de comprovante de pagamento criada com sucesso.');
    
    // Tabela de confirmação de recebimento
    await queryRunner.query(`
      CREATE TABLE "confirmacao_recebimento" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "pagamento_id" uuid NOT NULL,
        "data_confirmacao" TIMESTAMP NOT NULL,
        "metodo_confirmacao" "metodo_confirmacao_enum" NOT NULL,
        "confirmado_por" uuid NOT NULL,
        "destinatario_id" uuid,
        "observacoes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_confirmacao_recebimento" PRIMARY KEY ("id")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX "IDX_confirmacao_pagamento" ON "confirmacao_recebimento" ("pagamento_id");
      CREATE INDEX "IDX_confirmacao_confirmado_por" ON "confirmacao_recebimento" ("confirmado_por");
      CREATE INDEX "IDX_confirmacao_destinatario" ON "confirmacao_recebimento" ("destinatario_id");
      CREATE INDEX "IDX_confirmacao_metodo" ON "confirmacao_recebimento" ("metodo_confirmacao");
      CREATE INDEX "IDX_confirmacao_data" ON "confirmacao_recebimento" ("data_confirmacao");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_confirmacao_update_timestamp
      BEFORE UPDATE ON "confirmacao_recebimento"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
    `);
    
    console.log('Tabela de confirmação de recebimento criada com sucesso.');
    
    // Adicionar as chaves estrangeiras
    await queryRunner.query(`
      ALTER TABLE "pagamento" ADD CONSTRAINT "FK_pagamento_solicitacao"
      FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacao" ("id") ON DELETE RESTRICT;
      
      ALTER TABLE "pagamento" ADD CONSTRAINT "FK_pagamento_liberado_por"
      FOREIGN KEY ("liberado_por") REFERENCES "usuario" ("id") ON DELETE RESTRICT;
      
      ALTER TABLE "comprovante_pagamento" ADD CONSTRAINT "FK_comprovante_pagamento"
      FOREIGN KEY ("pagamento_id") REFERENCES "pagamento" ("id") ON DELETE CASCADE;
      
      ALTER TABLE "comprovante_pagamento" ADD CONSTRAINT "FK_comprovante_uploaded_por"
      FOREIGN KEY ("uploaded_por") REFERENCES "usuario" ("id") ON DELETE RESTRICT;
      
      ALTER TABLE "confirmacao_recebimento" ADD CONSTRAINT "FK_confirmacao_pagamento"
      FOREIGN KEY ("pagamento_id") REFERENCES "pagamento" ("id") ON DELETE CASCADE;
      
      ALTER TABLE "confirmacao_recebimento" ADD CONSTRAINT "FK_confirmacao_confirmado_por"
      FOREIGN KEY ("confirmado_por") REFERENCES "usuario" ("id") ON DELETE RESTRICT;
      
      ALTER TABLE "confirmacao_recebimento" ADD CONSTRAINT "FK_confirmacao_destinatario"
      FOREIGN KEY ("destinatario_id") REFERENCES "cidadao" ("id") ON DELETE RESTRICT;
    `);
    
    // Adicionar políticas RLS (Row-Level Security)
    await queryRunner.query(`
      ALTER TABLE "pagamento" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "comprovante_pagamento" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "confirmacao_recebimento" ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY pagamento_policy ON "pagamento" 
        USING (TRUE) 
        WITH CHECK (TRUE);
      
      CREATE POLICY comprovante_pagamento_policy ON "comprovante_pagamento" 
        USING (TRUE) 
        WITH CHECK (TRUE);
      
      CREATE POLICY confirmacao_recebimento_policy ON "confirmacao_recebimento" 
        USING (TRUE) 
        WITH CHECK (TRUE);
    `);
    
    // Criar log de auditoria para tabelas importantes
    // Nota: A função create_audit_log_trigger foi definida na migration base
    // Isso fica comentado até termos certeza que a função existe
    /*
    await queryRunner.query(`
      SELECT create_audit_log_trigger('pagamento');
      SELECT create_audit_log_trigger('comprovante_pagamento');
      SELECT create_audit_log_trigger('confirmacao_recebimento');
    `);
    */
    
    console.log('Migration 1050000-CreatePagamentoSchema executada com sucesso.');
  }

  /**
   * Reverte todas as alterações realizadas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Revertendo migration 1050000-CreatePagamentoSchema...');
    
    // Remover políticas RLS
    await queryRunner.query(`
      DROP POLICY IF EXISTS pagamento_policy ON "pagamento";
      DROP POLICY IF EXISTS comprovante_pagamento_policy ON "comprovante_pagamento";
      DROP POLICY IF EXISTS confirmacao_recebimento_policy ON "confirmacao_recebimento";
    `);
    
    // Remover chaves estrangeiras
    await queryRunner.query(`
      ALTER TABLE "pagamento" DROP CONSTRAINT IF EXISTS "FK_pagamento_solicitacao";
      ALTER TABLE "pagamento" DROP CONSTRAINT IF EXISTS "FK_pagamento_liberado_por";
      ALTER TABLE "comprovante_pagamento" DROP CONSTRAINT IF EXISTS "FK_comprovante_pagamento";
      ALTER TABLE "comprovante_pagamento" DROP CONSTRAINT IF EXISTS "FK_comprovante_uploaded_por";
      ALTER TABLE "confirmacao_recebimento" DROP CONSTRAINT IF EXISTS "FK_confirmacao_pagamento";
      ALTER TABLE "confirmacao_recebimento" DROP CONSTRAINT IF EXISTS "FK_confirmacao_confirmado_por";
      ALTER TABLE "confirmacao_recebimento" DROP CONSTRAINT IF EXISTS "FK_confirmacao_destinatario";
    `);
    
    // Remover triggers de atualização automática de timestamp
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_pagamento_update_timestamp ON "pagamento";
      DROP TRIGGER IF EXISTS trigger_comprovante_update_timestamp ON "comprovante_pagamento";
      DROP TRIGGER IF EXISTS trigger_confirmacao_update_timestamp ON "confirmacao_recebimento";
    `);
    
    // Remover tabelas
    await queryRunner.query(`
      DROP TABLE IF EXISTS "confirmacao_recebimento";
      DROP TABLE IF EXISTS "comprovante_pagamento";
      DROP TABLE IF EXISTS "pagamento";
    `);
    
    // Remover tipos enumerados
    await queryRunner.query(`
      DROP TYPE IF EXISTS "metodo_confirmacao_enum";
      DROP TYPE IF EXISTS "metodo_pagamento_enum";
      DROP TYPE IF EXISTS "status_pagamento_enum";
    `);
    
    console.log('Migration 1050000-CreatePagamentoSchema revertida com sucesso.');
  }
}
