import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para criar o schema relacionado a documentos
 *
 * Esta migration cria as tabelas e restrições para o módulo de documentos,
 * incluindo estruturas para armazenar metadados, histórico e verificação de documentos.
 *
 * Os enums necessários são criados na migration CreateAllEnums
 *
 * @author Engenheiro de Dados
 * @date 19/05/2025
 */
export class CreateDocumentoSchema1704067231000 implements MigrationInterface {
  name = 'CreateDocumentoSchema1704067231000';

  /**
   * Cria as estruturas relacionadas a documentos
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Iniciando migration CreateDocumentoSchema...');

    // Tabela principal de documentos
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "documentos" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "solicitacao_id" uuid NOT NULL,
        "tipo" "tipo_documento_enum" NOT NULL,
        "nome_arquivo" character varying(255) NOT NULL,
        "nome_original" character varying(255) NOT NULL,
        "caminho" character varying(500) NOT NULL,
        "thumbnail" character varying(500),
        "descricao" text,
        "tamanho" integer NOT NULL,
        "mimetype" character varying(100) NOT NULL,
        "data_upload" TIMESTAMP NOT NULL,
        "usuario_upload" uuid NOT NULL,
        "verificado" boolean NOT NULL DEFAULT false,
        "data_verificacao" TIMESTAMP,
        "usuario_verificacao" uuid,
        "observacoes_verificacao" text,
        "metadados" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "removed_at" TIMESTAMP,
        CONSTRAINT "PK_documentos" PRIMARY KEY ("id")
      );
    `);

    // Índices para otimização de consultas
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_DOCUMENTOS_SOLICITACAO_TIPO" ON "documentos" ("solicitacao_id", "tipo");
      CREATE INDEX IF NOT EXISTS "IDX_DOCUMENTOS_USUARIO_UPLOAD" ON "documentos" ("usuario_upload");
      CREATE INDEX IF NOT EXISTS "IDX_DOCUMENTOS_VERIFICADO" ON "documentos" ("verificado");
      CREATE INDEX IF NOT EXISTS "IDX_DOCUMENTOS_DATA_UPLOAD" ON "documentos" ("data_upload");
      CREATE INDEX IF NOT EXISTS "IDX_DOCUMENTOS_METADATA" ON "documentos" USING GIN ("metadados");
    `);

    // Trigger para atualização automática de timestamp
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_documentos_update_timestamp ON "documentos";
      CREATE TRIGGER trigger_documentos_update_timestamp
        BEFORE UPDATE ON "documentos"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
    `);

    console.log('Tabela de documentos criada com sucesso.');

    // Tabela de documentos enviados
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "documentos_enviados" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "documento_id" uuid,
        "nome_arquivo" character varying(255) NOT NULL,
        "caminho_arquivo" character varying(500) NOT NULL,
        "tamanho" integer NOT NULL,
        "mime_type" character varying(100) NOT NULL,
        "data_envio" TIMESTAMP NOT NULL,
        "enviado_por_id" uuid NOT NULL,
        "verificado" boolean NOT NULL DEFAULT false,
        "verificado_por_id" uuid,
        "data_verificacao" TIMESTAMP,
        "observacoes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "removed_at" TIMESTAMP,
        CONSTRAINT "PK_documentos_enviados" PRIMARY KEY ("id")
      );
    `);

    // Índices para otimização de consultas
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_DOCUMENTOS_ENVIADOS_DOCUMENTO" ON "documentos_enviados" ("documento_id");
      CREATE INDEX IF NOT EXISTS "IDX_DOCUMENTOS_ENVIADOS_USUARIO" ON "documentos_enviados" ("enviado_por_id");
      CREATE INDEX IF NOT EXISTS "IDX_DOCUMENTOS_ENVIADOS_DATA" ON "documentos_enviados" ("data_envio");
    `);

    // Trigger para atualização automática de timestamp
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_documentos_enviados_update_timestamp ON "documentos_enviados";
      CREATE TRIGGER trigger_documentos_enviados_update_timestamp
        BEFORE UPDATE ON "documentos_enviados"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
    `);

    console.log('Tabela de documentos enviados criada com sucesso.');

    // Tabela para histórico de verificação de documentos
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "verificacao_documento" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "documento_id" uuid NOT NULL,
        "status" "status_verificacao_documento_enum" NOT NULL DEFAULT 'pendente',
        "resultado_verificacao_malware" "resultado_verificacao_malware_enum" NOT NULL DEFAULT 'seguro',
        "data_verificacao" TIMESTAMP NOT NULL DEFAULT now(),
        "usuario_verificacao_id" uuid NOT NULL,
        "observacoes" text,
        "detalhes_verificacao" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_verificacao_documento" PRIMARY KEY ("id")
      );
    `);

    // Índices para otimização de consultas
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_VERIFICACAO_DOCUMENTO_ID" ON "verificacao_documento" ("documento_id");
      CREATE INDEX IF NOT EXISTS "IDX_VERIFICACAO_USUARIO" ON "verificacao_documento" ("usuario_verificacao_id");
      CREATE INDEX IF NOT EXISTS "IDX_VERIFICACAO_STATUS" ON "verificacao_documento" ("status");
      CREATE INDEX IF NOT EXISTS "IDX_VERIFICACAO_MALWARE" ON "verificacao_documento" ("resultado_verificacao_malware");
    `);

    console.log('Tabela de verificação de documentos criada com sucesso.');

    // Tabela para categorização e classificação de documentos
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "classificacao_documento" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "documento_id" uuid NOT NULL,
        "categoria" character varying(100) NOT NULL,
        "subcategoria" character varying(100),
        "tags" jsonb DEFAULT '[]',
        "nivel_confidencialidade" integer NOT NULL DEFAULT 0,
        "metadados_extracao" jsonb,
        "usuario_classificacao_id" uuid NOT NULL,
        "data_classificacao" TIMESTAMP NOT NULL DEFAULT now(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_classificacao_documento" PRIMARY KEY ("id"),
        CONSTRAINT "UK_documento_classificacao" UNIQUE ("documento_id")
      );
    `);

    // Índices para otimização de consultas
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_CLASSIFICACAO_DOCUMENTO" ON "classificacao_documento" ("documento_id");
      CREATE INDEX IF NOT EXISTS "IDX_CLASSIFICACAO_CATEGORIA" ON "classificacao_documento" ("categoria", "subcategoria");
      CREATE INDEX IF NOT EXISTS "IDX_CLASSIFICACAO_TAGS" ON "classificacao_documento" USING GIN ("tags");
      CREATE INDEX IF NOT EXISTS "IDX_CLASSIFICACAO_CONFIDENCIALIDADE" ON "classificacao_documento" ("nivel_confidencialidade");
    `);

    // Trigger para atualização automática de timestamp
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_classificacao_documento_update_timestamp ON "classificacao_documento";
      CREATE TRIGGER trigger_classificacao_documento_update_timestamp
        BEFORE UPDATE ON "classificacao_documento"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
    `);

    console.log('Tabela de classificação de documentos criada com sucesso.');

    // Relacionamentos e chaves estrangeiras
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_documentos_solicitacao'
        ) THEN
          ALTER TABLE "documentos" ADD CONSTRAINT "FK_documentos_solicitacao"
          FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacao" ("id") ON DELETE RESTRICT;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_documentos_usuario_upload'
        ) THEN
          ALTER TABLE "documentos" ADD CONSTRAINT "FK_documentos_usuario_upload"
          FOREIGN KEY ("usuario_upload") REFERENCES "usuario" ("id") ON DELETE RESTRICT;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_documentos_usuario_verificacao'
        ) THEN
          ALTER TABLE "documentos" ADD CONSTRAINT "FK_documentos_usuario_verificacao"
          FOREIGN KEY ("usuario_verificacao") REFERENCES "usuario" ("id") ON DELETE SET NULL;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_documentos_enviados_documento'
        ) THEN
          ALTER TABLE "documentos_enviados" ADD CONSTRAINT "FK_documentos_enviados_documento"
          FOREIGN KEY ("documento_id") REFERENCES "documentos" ("id") ON DELETE CASCADE;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_documentos_enviados_usuario'
        ) THEN
          ALTER TABLE "documentos_enviados" ADD CONSTRAINT "FK_documentos_enviados_usuario"
          FOREIGN KEY ("enviado_por_id") REFERENCES "usuario" ("id") ON DELETE RESTRICT;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_documentos_enviados_verificador'
        ) THEN
          ALTER TABLE "documentos_enviados" ADD CONSTRAINT "FK_documentos_enviados_verificador"
          FOREIGN KEY ("verificado_por_id") REFERENCES "usuario" ("id") ON DELETE SET NULL;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_verificacao_documento'
        ) THEN
          ALTER TABLE "verificacao_documento" ADD CONSTRAINT "FK_verificacao_documento"
          FOREIGN KEY ("documento_id") REFERENCES "documentos" ("id") ON DELETE CASCADE;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_verificacao_usuario'
        ) THEN
          ALTER TABLE "verificacao_documento" ADD CONSTRAINT "FK_verificacao_usuario"
          FOREIGN KEY ("usuario_verificacao_id") REFERENCES "usuario" ("id") ON DELETE RESTRICT;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_classificacao_documento'
        ) THEN
          ALTER TABLE "classificacao_documento" ADD CONSTRAINT "FK_classificacao_documento"
          FOREIGN KEY ("documento_id") REFERENCES "documentos" ("id") ON DELETE CASCADE;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_classificacao_usuario'
        ) THEN
          ALTER TABLE "classificacao_documento" ADD CONSTRAINT "FK_classificacao_usuario"
          FOREIGN KEY ("usuario_classificacao_id") REFERENCES "usuario" ("id") ON DELETE RESTRICT;
        END IF;
      END $$;
    `);

    console.log('Migration CreateDocumentoSchema executada com sucesso.');
  }

  /**
   * Reverte todas as alterações realizadas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Revertendo migration CreateDocumentoSchema...');

    // Remover chaves estrangeiras
    await queryRunner.query(`
      ALTER TABLE "documentos" DROP CONSTRAINT IF EXISTS "FK_documentos_solicitacao";
      ALTER TABLE "documentos" DROP CONSTRAINT IF EXISTS "FK_documentos_usuario_upload";
      ALTER TABLE "documentos" DROP CONSTRAINT IF EXISTS "FK_documentos_usuario_verificacao";
      
      ALTER TABLE "documentos_enviados" DROP CONSTRAINT IF EXISTS "FK_documentos_enviados_documento";
      ALTER TABLE "documentos_enviados" DROP CONSTRAINT IF EXISTS "FK_documentos_enviados_usuario";
      ALTER TABLE "documentos_enviados" DROP CONSTRAINT IF EXISTS "FK_documentos_enviados_verificador";
      
      ALTER TABLE "verificacao_documento" DROP CONSTRAINT IF EXISTS "FK_verificacao_documento";
      ALTER TABLE "verificacao_documento" DROP CONSTRAINT IF EXISTS "FK_verificacao_usuario";
      
      ALTER TABLE "classificacao_documento" DROP CONSTRAINT IF EXISTS "FK_classificacao_documento";
      ALTER TABLE "classificacao_documento" DROP CONSTRAINT IF EXISTS "FK_classificacao_usuario";
    `);

    // Remover triggers
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_documentos_update_timestamp ON "documentos";
      DROP TRIGGER IF EXISTS trigger_documentos_enviados_update_timestamp ON "documentos_enviados";
      DROP TRIGGER IF EXISTS trigger_classificacao_documento_update_timestamp ON "classificacao_documento";
    `);

    // Remover tabelas
    await queryRunner.query(`
      DROP TABLE IF EXISTS "classificacao_documento";
      DROP TABLE IF EXISTS "verificacao_documento";
      DROP TABLE IF EXISTS "documentos_enviados";
      DROP TABLE IF EXISTS "documentos";
    `);

    console.log('Migration CreateDocumentoSchema revertida com sucesso.');
  }
}
