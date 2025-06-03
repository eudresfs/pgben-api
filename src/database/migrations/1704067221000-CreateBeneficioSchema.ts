import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para criar o schema relacionado ao benefício
 * 
 * Esta migration cria as tabelas e restrições para o módulo de benefício,
 * incluindo estruturas para definir tipos de benefícios, requisitos, fluxos de aprovação,
 * campos dinâmicos relacionados aos benefícios e a tabela de benefícios com suporte a renovação automática.
 * 
 * Os enums necessários são criados na migration CreateAllEnums
 * 
 * @author Engenheiro de Dados
 * @date 19/05/2025
 */
export class CreateBeneficioSchema1704067215000 implements MigrationInterface {
  name = 'CreateBeneficioSchema1704067215000';

  /**
   * Cria as estruturas relacionadas ao benefício
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Iniciando migration CreateBeneficioSchema...');
    
    // Tabela de tipo de benefício
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tipo_beneficio" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "nome" character varying NOT NULL,
        "descricao" character varying NOT NULL,
        "codigo" character varying NOT NULL,
        "status" "status_ativo_enum" NOT NULL DEFAULT 'ativo',
        "periodicidade" "periodicidade_enum" NOT NULL DEFAULT 'UNICA',
        "valor" decimal(10,2),
        "legislacao" character varying,
        "criterios_elegibilidade" jsonb NOT NULL DEFAULT '{}',
        "parametros" jsonb NOT NULL DEFAULT '{}',
        "especificacoes" jsonb,
        "metadados" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "removed_at" TIMESTAMP,
        CONSTRAINT "PK_tipo_beneficio" PRIMARY KEY ("id"),
        CONSTRAINT "UK_tipo_beneficio_codigo" UNIQUE ("codigo")
      );
    `);
    
    // Índices para otimização de consultas
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tipo_beneficio_nome_ativo" ON "tipo_beneficio" ("nome", "status");
      CREATE INDEX IF NOT EXISTS "IDX_tipo_beneficio_codigo" ON "tipo_beneficio" ("codigo");
      CREATE INDEX IF NOT EXISTS "IDX_tipo_beneficio_periodicidade" ON "tipo_beneficio" ("periodicidade");
      CREATE INDEX IF NOT EXISTS "IDX_tipo_beneficio_criterios" ON "tipo_beneficio" USING GIN ("criterios_elegibilidade");
    `);
    
    // Trigger para atualização automática de timestamp
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_tipo_beneficio_update_timestamp ON "tipo_beneficio";
      CREATE TRIGGER trigger_tipo_beneficio_update_timestamp
        BEFORE UPDATE ON "tipo_beneficio"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
    `);
    
    // Tabela de requisitos de documentos
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "requisito_documento" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tipo_beneficio_id" uuid NOT NULL,
        "tipo_documento" "tipo_documento_enum" NOT NULL,
        "nome" character varying(255) NOT NULL,
        "obrigatorio" boolean NOT NULL DEFAULT true,
        "descricao" text,
        "validacoes" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "removed_at" TIMESTAMP,
        CONSTRAINT "PK_requisito_documento" PRIMARY KEY ("id"),
        CONSTRAINT "UK_requisito_documento_tipo_beneficio_tipo_documento" UNIQUE ("tipo_beneficio_id", "tipo_documento")
      );
    `);
    
    // Índices para otimização de consultas
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_requisito_documento_tipo_beneficio" ON "requisito_documento" ("tipo_beneficio_id");
      CREATE INDEX IF NOT EXISTS "IDX_requisito_documento_tipo_documento" ON "requisito_documento" ("tipo_documento");
      CREATE INDEX IF NOT EXISTS "IDX_requisito_documento_nome" ON "requisito_documento" ("nome");
      CREATE INDEX IF NOT EXISTS "IDX_requisito_documento_obrigatorio" ON "requisito_documento" ("obrigatorio");
      CREATE INDEX IF NOT EXISTS "IDX_requisito_documento_validacoes" ON "requisito_documento" USING GIN ("validacoes");
    `);
    
    // Trigger para atualização automática de timestamp
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_requisito_documento_update_timestamp ON "requisito_documento";
      CREATE TRIGGER trigger_requisito_documento_update_timestamp
        BEFORE UPDATE ON "requisito_documento"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
    `);
    
    // Tabela de fluxo de benefício
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "fluxo_beneficio" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tipo_beneficio_id" uuid NOT NULL,
        "setor_id" uuid NOT NULL,
        "ordem" integer NOT NULL,
        "descricao" character varying NOT NULL,
        "requer_aprovacao" boolean NOT NULL DEFAULT true,
        "requer_parecer" boolean NOT NULL DEFAULT false,
        "ativo" boolean NOT NULL DEFAULT true,
        "prazo_dias" integer,
        "acoes_disponiveis" jsonb NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "removed_at" TIMESTAMP,
        CONSTRAINT "PK_fluxo_beneficio" PRIMARY KEY ("id"),
        CONSTRAINT "UK_fluxo_beneficio_tipo_setor_ordem" UNIQUE ("tipo_beneficio_id", "setor_id", "ordem")
      );
    `);
    
    // Índices para otimização de consultas
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_fluxo_beneficio_tipo" ON "fluxo_beneficio" ("tipo_beneficio_id");
      CREATE INDEX IF NOT EXISTS "IDX_fluxo_beneficio_setor" ON "fluxo_beneficio" ("setor_id");
      CREATE INDEX IF NOT EXISTS "IDX_fluxo_beneficio_ordem" ON "fluxo_beneficio" ("ordem");
      CREATE INDEX IF NOT EXISTS "IDX_fluxo_beneficio_ativo" ON "fluxo_beneficio" ("ativo");
    `);
    
    // Trigger para atualização automática de timestamp
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_fluxo_beneficio_update_timestamp ON "fluxo_beneficio";
      CREATE TRIGGER trigger_fluxo_beneficio_update_timestamp
        BEFORE UPDATE ON "fluxo_beneficio"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
    `);
    
    // Tabela de campos dinâmicos
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "campo_dinamico_beneficio" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tipo_beneficio_id" uuid NOT NULL,
        "nome" character varying NOT NULL,
        "descricao" character varying NOT NULL,
        "tipo_campo" "tipo_campo_enum" NOT NULL,
        "obrigatorio" boolean NOT NULL DEFAULT false,
        "ordem" integer NOT NULL,
        "opcoes" jsonb,
        "valor_padrao" jsonb,
        "regras_validacao" jsonb,
        "metadados" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "removed_at" TIMESTAMP,
        CONSTRAINT "PK_campo_dinamico_beneficio" PRIMARY KEY ("id"),
        CONSTRAINT "UK_campo_dinamico_tipo_nome" UNIQUE ("tipo_beneficio_id", "nome")
      );
    `);
    
    // Índices para otimização de consultas
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_campo_dinamico_tipo" ON "campo_dinamico_beneficio" ("tipo_beneficio_id");
      CREATE INDEX IF NOT EXISTS "IDX_campo_dinamico_tipo_campo" ON "campo_dinamico_beneficio" ("tipo_campo");
      CREATE INDEX IF NOT EXISTS "IDX_campo_dinamico_regras" ON "campo_dinamico_beneficio" USING GIN ("regras_validacao");
    `);
    
    // Trigger para atualização automática de timestamp
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_campo_dinamico_update_timestamp ON "campo_dinamico_beneficio";
      CREATE TRIGGER trigger_campo_dinamico_update_timestamp
        BEFORE UPDATE ON "campo_dinamico_beneficio"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
    `);
    
    // Tabela de versão de schema de benefício
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "versao_schema_beneficio" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tipo_beneficio_id" uuid NOT NULL,
        "versao" character varying NOT NULL,
        "schema" jsonb NOT NULL,
        "ativo" boolean NOT NULL DEFAULT true,
        "data_inicio_vigencia" TIMESTAMP NOT NULL,
        "data_fim_vigencia" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "removed_at" TIMESTAMP,
        CONSTRAINT "PK_versao_schema_beneficio" PRIMARY KEY ("id"),
        CONSTRAINT "UK_versao_schema_tipo_versao" UNIQUE ("tipo_beneficio_id", "versao")
      );
    `);
    
    /// Índices para otimização de consultas
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_versao_schema_tipo" ON "versao_schema_beneficio" ("tipo_beneficio_id");
      CREATE INDEX IF NOT EXISTS "IDX_versao_schema_versao" ON "versao_schema_beneficio" ("versao");
      CREATE INDEX IF NOT EXISTS "IDX_versao_schema_ativo" ON "versao_schema_beneficio" ("ativo");
      CREATE INDEX IF NOT EXISTS "IDX_versao_schema_schema" ON "versao_schema_beneficio" USING GIN ("schema");
    `);
    
    // Trigger para atualização automática de timestamp
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_versao_schema_update_timestamp ON "versao_schema_beneficio";
      CREATE TRIGGER trigger_versao_schema_update_timestamp
        BEFORE UPDATE ON "versao_schema_beneficio"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
    `);
    
    // Tabela de beneficio
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "beneficio" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tipo_beneficio_id" uuid NOT NULL,
        "nome" character varying NOT NULL,
        "descricao" text,
        "ativo" boolean NOT NULL DEFAULT true,
        "permite_renovacao_automatica" boolean NOT NULL DEFAULT false,
        "max_renovacoes" integer NOT NULL DEFAULT 0,
        "intervalo_renovacao_dias" integer NOT NULL DEFAULT 30,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "removed_at" TIMESTAMP,
        CONSTRAINT "PK_beneficio" PRIMARY KEY ("id")
      );
    `);
    
    // Índices para otimização de consultas da tabela beneficio
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_beneficio_tipo_beneficio" ON "beneficio" ("tipo_beneficio_id");
      CREATE INDEX IF NOT EXISTS "IDX_beneficio_ativo" ON "beneficio" ("ativo");
      CREATE INDEX IF NOT EXISTS "IDX_beneficio_permite_renovacao" ON "beneficio" ("permite_renovacao_automatica") WHERE permite_renovacao_automatica = true;
    `);
    
    // Trigger para atualização automática de timestamp
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_beneficio_update_timestamp ON "beneficio";
      CREATE TRIGGER trigger_beneficio_update_timestamp
        BEFORE UPDATE ON "beneficio"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
    `);
    
    // Adicionar as chaves estrangeiras
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_requisito_documento_tipo_beneficio'
        ) THEN
          ALTER TABLE "requisito_documento" ADD CONSTRAINT "FK_requisito_documento_tipo_beneficio"
          FOREIGN KEY ("tipo_beneficio_id") REFERENCES "tipo_beneficio" ("id") ON DELETE CASCADE;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_fluxo_beneficio_tipo_beneficio'
        ) THEN
          ALTER TABLE "fluxo_beneficio" ADD CONSTRAINT "FK_fluxo_beneficio_tipo_beneficio"
          FOREIGN KEY ("tipo_beneficio_id") REFERENCES "tipo_beneficio" ("id") ON DELETE CASCADE;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_fluxo_beneficio_setor'
        ) THEN
          ALTER TABLE "fluxo_beneficio" ADD CONSTRAINT "FK_fluxo_beneficio_setor"
          FOREIGN KEY ("setor_id") REFERENCES "setor" ("id") ON DELETE CASCADE;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_campo_dinamico_tipo_beneficio'
        ) THEN
          ALTER TABLE "campo_dinamico_beneficio" ADD CONSTRAINT "FK_campo_dinamico_tipo_beneficio"
          FOREIGN KEY ("tipo_beneficio_id") REFERENCES "tipo_beneficio" ("id") ON DELETE CASCADE;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_versao_schema_tipo_beneficio'
        ) THEN
          ALTER TABLE "versao_schema_beneficio" ADD CONSTRAINT "FK_versao_schema_tipo_beneficio"
          FOREIGN KEY ("tipo_beneficio_id") REFERENCES "tipo_beneficio" ("id") ON DELETE CASCADE;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_beneficio_tipo_beneficio'
        ) THEN
          ALTER TABLE "beneficio" ADD CONSTRAINT "FK_beneficio_tipo_beneficio"
          FOREIGN KEY ("tipo_beneficio_id") REFERENCES "tipo_beneficio" ("id") ON DELETE RESTRICT;
        END IF;
      END $$;
    `);
    
    console.log('Migration CreateBeneficioSchema executada com sucesso.');
  }

  /**
   * Reverte todas as alterações realizadas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Revertendo migration CreateBeneficioSchema...');
    
    // Remover chaves estrangeiras
    await queryRunner.query(`
      ALTER TABLE "requisito_documento" DROP CONSTRAINT IF EXISTS "FK_requisito_documento_tipo_beneficio";
      ALTER TABLE "fluxo_beneficio" DROP CONSTRAINT IF EXISTS "FK_fluxo_beneficio_tipo_beneficio";
      ALTER TABLE "fluxo_beneficio" DROP CONSTRAINT IF EXISTS "FK_fluxo_beneficio_setor";
      ALTER TABLE "campo_dinamico_beneficio" DROP CONSTRAINT IF EXISTS "FK_campo_dinamico_tipo_beneficio";
      ALTER TABLE "versao_schema_beneficio" DROP CONSTRAINT IF EXISTS "FK_versao_schema_tipo_beneficio";
      ALTER TABLE "beneficio" DROP CONSTRAINT IF EXISTS "FK_beneficio_tipo_beneficio";
    `);
    
    // Remover índices da tabela beneficio
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_beneficio_permite_renovacao";
      DROP INDEX IF EXISTS "IDX_beneficio_ativo";
      DROP INDEX IF EXISTS "IDX_beneficio_tipo_beneficio";
    `);
    
    // Remover triggers de atualização automática de timestamp
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_tipo_beneficio_update_timestamp ON "tipo_beneficio";
      DROP TRIGGER IF EXISTS trigger_requisito_documento_update_timestamp ON "requisito_documento";
      DROP TRIGGER IF EXISTS trigger_fluxo_beneficio_update_timestamp ON "fluxo_beneficio";
      DROP TRIGGER IF EXISTS trigger_campo_dinamico_update_timestamp ON "campo_dinamico_beneficio";
      DROP TRIGGER IF EXISTS trigger_versao_schema_update_timestamp ON "versao_schema_beneficio";
      DROP TRIGGER IF EXISTS trigger_beneficio_update_timestamp ON "beneficio";
    `);
    
    // Remover tabelas
    await queryRunner.query(`
      DROP TABLE IF EXISTS "versao_schema_beneficio";
      DROP TABLE IF EXISTS "campo_dinamico_beneficio";
      DROP TABLE IF EXISTS "fluxo_beneficio";
      DROP TABLE IF EXISTS "requisito_documento";
      DROP TABLE IF EXISTS "beneficio";
      DROP TABLE IF EXISTS "tipo_beneficio";
    `);
    
    console.log('Migration CreateBeneficioSchema revertida com sucesso.');
  }
}