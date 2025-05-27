import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para criar o schema relacionado ao pagamento
 * 
 * Esta migration cria as tabelas e restrições para o módulo de pagamento,
 * incluindo estruturas para gerenciar pagamentos, comprovantes e confirmações de recebimento.
 * 
 * Os enums necessários são criados na migration CreateAllEnums
 * 
 * @author Engenheiro de Dados
 * @date 19/05/2025
 */
export class CreatePagamentoSchema1747961017152 implements MigrationInterface {
  name = 'CreatePagamentoSchema1747961017152';

  /**
   * Cria as estruturas relacionadas ao pagamento
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Iniciando migration CreatePagamentoSchema...');
    
    // Tabela principal de pagamento
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pagamento" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "solicitacao_id" uuid NOT NULL,
        "info_bancaria_id" uuid,
        "valor" decimal(10,2) NOT NULL,
        "data_liberacao" TIMESTAMP NOT NULL,
        "status" "status_pagamento_enum" NOT NULL DEFAULT 'PENDENTE',
        "metodo_pagamento" "metodo_pagamento_enum" NOT NULL,
        "liberado_por" uuid NOT NULL,
        "observacoes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "removed_at" TIMESTAMP,
        CONSTRAINT "PK_pagamento" PRIMARY KEY ("id")
      );
    `);
    
    // Índices para otimização de consultas
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pagamento_solicitacao" ON "pagamento" ("solicitacao_id");
      CREATE INDEX IF NOT EXISTS "IDX_pagamento_info_bancaria" ON "pagamento" ("info_bancaria_id");
      CREATE INDEX IF NOT EXISTS "IDX_pagamento_liberado_por" ON "pagamento" ("liberado_por");
      CREATE INDEX IF NOT EXISTS "IDX_pagamento_status" ON "pagamento" ("status");
      CREATE INDEX IF NOT EXISTS "IDX_pagamento_data_liberacao" ON "pagamento" ("data_liberacao");
      CREATE INDEX IF NOT EXISTS "IDX_pagamento_metodo" ON "pagamento" ("metodo_pagamento");
    `);
    
    // Trigger para atualização automática de timestamp
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_pagamento_update_timestamp ON "pagamento";
      CREATE TRIGGER trigger_pagamento_update_timestamp
        BEFORE UPDATE ON "pagamento"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
    `);
    
    console.log('Tabela de pagamento criada com sucesso.');
    
    // Tabela de comprovante de pagamento
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "comprovante_pagamento" (
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
    `);
    
    // Índices para otimização de consultas
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_comprovante_pagamento" ON "comprovante_pagamento" ("pagamento_id");
      CREATE INDEX IF NOT EXISTS "IDX_comprovante_uploaded_por" ON "comprovante_pagamento" ("uploaded_por");
      CREATE INDEX IF NOT EXISTS "IDX_comprovante_tipo" ON "comprovante_pagamento" ("tipo_documento");
    `);
    
    // Trigger para atualização automática de timestamp
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_comprovante_update_timestamp ON "comprovante_pagamento";
      CREATE TRIGGER trigger_comprovante_update_timestamp
        BEFORE UPDATE ON "comprovante_pagamento"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
    `);
    
    console.log('Tabela de comprovante de pagamento criada com sucesso.');
    
    // Tabela de confirmação de recebimento
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "confirmacao_recebimento" (
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
    `);
    
    // Índices para otimização de consultas
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_confirmacao_pagamento" ON "confirmacao_recebimento" ("pagamento_id");
      CREATE INDEX IF NOT EXISTS "IDX_confirmacao_confirmado_por" ON "confirmacao_recebimento" ("confirmado_por");
      CREATE INDEX IF NOT EXISTS "IDX_confirmacao_destinatario" ON "confirmacao_recebimento" ("destinatario_id");
      CREATE INDEX IF NOT EXISTS "IDX_confirmacao_metodo" ON "confirmacao_recebimento" ("metodo_confirmacao");
      CREATE INDEX IF NOT EXISTS "IDX_confirmacao_data" ON "confirmacao_recebimento" ("data_confirmacao");
    `);
    
    // Trigger para atualização automática de timestamp
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_confirmacao_update_timestamp ON "confirmacao_recebimento";
      CREATE TRIGGER trigger_confirmacao_update_timestamp
        BEFORE UPDATE ON "confirmacao_recebimento"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
    `);
    
    console.log('Tabela de confirmação de recebimento criada com sucesso.');
    
    // Adicionar as chaves estrangeiras
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_pagamento_solicitacao'
        ) THEN
          ALTER TABLE "pagamento" ADD CONSTRAINT "FK_pagamento_solicitacao"
          FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacao" ("id") ON DELETE RESTRICT;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_pagamento_liberado_por'
        ) THEN
          ALTER TABLE "pagamento" ADD CONSTRAINT "FK_pagamento_liberado_por"
          FOREIGN KEY ("liberado_por") REFERENCES "usuario" ("id") ON DELETE RESTRICT;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_comprovante_pagamento'
        ) THEN
          ALTER TABLE "comprovante_pagamento" ADD CONSTRAINT "FK_comprovante_pagamento"
          FOREIGN KEY ("pagamento_id") REFERENCES "pagamento" ("id") ON DELETE CASCADE;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_comprovante_uploaded_por'
        ) THEN
          ALTER TABLE "comprovante_pagamento" ADD CONSTRAINT "FK_comprovante_uploaded_por"
          FOREIGN KEY ("uploaded_por") REFERENCES "usuario" ("id") ON DELETE RESTRICT;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_confirmacao_pagamento'
        ) THEN
          ALTER TABLE "confirmacao_recebimento" ADD CONSTRAINT "FK_confirmacao_pagamento"
          FOREIGN KEY ("pagamento_id") REFERENCES "pagamento" ("id") ON DELETE CASCADE;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_confirmacao_confirmado_por'
        ) THEN
          ALTER TABLE "confirmacao_recebimento" ADD CONSTRAINT "FK_confirmacao_confirmado_por"
          FOREIGN KEY ("confirmado_por") REFERENCES "usuario" ("id") ON DELETE RESTRICT;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_confirmacao_destinatario'
        ) THEN
          ALTER TABLE "confirmacao_recebimento" ADD CONSTRAINT "FK_confirmacao_destinatario"
          FOREIGN KEY ("destinatario_id") REFERENCES "cidadao" ("id") ON DELETE RESTRICT;
        END IF;
      END $$;
    `);
    
    console.log('Migration CreatePagamentoSchema executada com sucesso.');
  }

  /**
   * Reverte todas as alterações realizadas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Revertendo migration CreatePagamentoSchema...');
    
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
    
    console.log('Migration CreatePagamentoSchema revertida com sucesso.');
  }
}