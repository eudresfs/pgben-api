import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para criar o schema relacionado ao benefício
 * 
 * Esta migration cria as tabelas, enumerações e restrições para o módulo de benefício,
 * incluindo estruturas para definir tipos de benefícios, requisitos, fluxos de aprovação
 * e campos dinâmicos relacionados aos benefícios.
 * 
 * @author Engenheiro de Dados
 * @date 19/05/2025
 */
export class CreateBeneficioSchema1685468879184 implements MigrationInterface {
  name = 'CreateBeneficioSchema1685468879184';

  /**
   * Cria as estruturas relacionadas ao benefício
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Iniciando migration 1030000-CreateBeneficioSchema...');
    
    // Criação dos tipos enumerados
    await queryRunner.query(`
      CREATE TYPE "periodicidade_enum" AS ENUM (
        'unico',
        'diario', 
        'semanal', 
        'quinzenal', 
        'mensal',
        'bimestral',
        'trimestral',
        'semestral',
        'anual'
      );
      
      CREATE TYPE "fase_requisito_enum" AS ENUM (
        'cadastro',
        'analise_tecnica',
        'analise_social',
        'aprovacao',
        'concessao'
      );
      
      CREATE TYPE "tipo_campo_enum" AS ENUM (
        'texto',
        'numero',
        'data',
        'booleano',
        'lista',
        'arquivo',
        'endereco'
      );
    `);
    
    // Tabela de tipo de benefício
    await queryRunner.query(`
      CREATE TABLE "tipo_beneficio" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "nome" character varying NOT NULL,
        "descricao" character varying NOT NULL,
        "codigo" character varying NOT NULL,
        "ativo" boolean NOT NULL DEFAULT true,
        "periodicidade" "periodicidade_enum" NOT NULL DEFAULT 'unico',
        "valor_referencia" decimal(10,2),
        "legislacao" character varying,
        "criterios_elegibilidade" jsonb NOT NULL DEFAULT '{}',
        "parametros" jsonb NOT NULL DEFAULT '{}',
        "metadados" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "removed_at" TIMESTAMP,
        CONSTRAINT "PK_tipo_beneficio" PRIMARY KEY ("id"),
        CONSTRAINT "UK_tipo_beneficio_codigo" UNIQUE ("codigo")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX "IDX_tipo_beneficio_nome_ativo" ON "tipo_beneficio" ("nome", "ativo");
      CREATE INDEX "IDX_tipo_beneficio_codigo" ON "tipo_beneficio" ("codigo");
      CREATE INDEX "IDX_tipo_beneficio_periodicidade" ON "tipo_beneficio" ("periodicidade");
      CREATE INDEX "IDX_tipo_beneficio_criterios" ON "tipo_beneficio" USING GIN ("criterios_elegibilidade");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_tipo_beneficio_update_timestamp
      BEFORE UPDATE ON "tipo_beneficio"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
    `);
    
    // Tabela de requisitos de documentos
    await queryRunner.query(`
      CREATE TABLE "requisito_documento" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tipo_beneficio_id" uuid NOT NULL,
        "nome" character varying NOT NULL,
        "descricao" character varying NOT NULL,
        "obrigatorio" boolean NOT NULL DEFAULT true,
        "fase" "fase_requisito_enum" NOT NULL DEFAULT 'cadastro',
        "ativo" boolean NOT NULL DEFAULT true,
        "regras_validacao" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "removed_at" TIMESTAMP,
        CONSTRAINT "PK_requisito_documento" PRIMARY KEY ("id"),
        CONSTRAINT "UK_requisito_documento_tipo_beneficio_nome" UNIQUE ("tipo_beneficio_id", "nome")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX "IDX_requisito_documento_tipo_beneficio" ON "requisito_documento" ("tipo_beneficio_id");
      CREATE INDEX "IDX_requisito_documento_fase" ON "requisito_documento" ("fase");
      CREATE INDEX "IDX_requisito_documento_obrigatorio" ON "requisito_documento" ("obrigatorio");
      CREATE INDEX "IDX_requisito_documento_regras" ON "requisito_documento" USING GIN ("regras_validacao");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_requisito_documento_update_timestamp
      BEFORE UPDATE ON "requisito_documento"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
    `);
    
    // Tabela de fluxo de benefício
    await queryRunner.query(`
      CREATE TABLE "fluxo_beneficio" (
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
      
      -- Índices para otimização de consultas
      CREATE INDEX "IDX_fluxo_beneficio_tipo" ON "fluxo_beneficio" ("tipo_beneficio_id");
      CREATE INDEX "IDX_fluxo_beneficio_setor" ON "fluxo_beneficio" ("setor_id");
      CREATE INDEX "IDX_fluxo_beneficio_ordem" ON "fluxo_beneficio" ("ordem");
      CREATE INDEX "IDX_fluxo_beneficio_ativo" ON "fluxo_beneficio" ("ativo");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_fluxo_beneficio_update_timestamp
      BEFORE UPDATE ON "fluxo_beneficio"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
    `);
    
    // Tabela de campos dinâmicos
    await queryRunner.query(`
      CREATE TABLE "campo_dinamico_beneficio" (
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
      
      -- Índices para otimização de consultas
      CREATE INDEX "IDX_campo_dinamico_tipo" ON "campo_dinamico_beneficio" ("tipo_beneficio_id");
      CREATE INDEX "IDX_campo_dinamico_tipo_campo" ON "campo_dinamico_beneficio" ("tipo_campo");
      CREATE INDEX "IDX_campo_dinamico_regras" ON "campo_dinamico_beneficio" USING GIN ("regras_validacao");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_campo_dinamico_update_timestamp
      BEFORE UPDATE ON "campo_dinamico_beneficio"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
    `);
    
    // Tabela de versão de schema de benefício
    await queryRunner.query(`
      CREATE TABLE "versao_schema_beneficio" (
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
      
      -- Índices para otimização de consultas
      CREATE INDEX "IDX_versao_schema_tipo" ON "versao_schema_beneficio" ("tipo_beneficio_id");
      CREATE INDEX "IDX_versao_schema_versao" ON "versao_schema_beneficio" ("versao");
      CREATE INDEX "IDX_versao_schema_ativo" ON "versao_schema_beneficio" ("ativo");
      CREATE INDEX "IDX_versao_schema_schema" ON "versao_schema_beneficio" USING GIN ("schema");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_versao_schema_update_timestamp
      BEFORE UPDATE ON "versao_schema_beneficio"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
    `);
    
    // Adicionar as chaves estrangeiras
    await queryRunner.query(`
      ALTER TABLE "requisito_documento" ADD CONSTRAINT "FK_requisito_documento_tipo_beneficio"
      FOREIGN KEY ("tipo_beneficio_id") REFERENCES "tipo_beneficio" ("id") ON DELETE CASCADE;
      
      ALTER TABLE "fluxo_beneficio" ADD CONSTRAINT "FK_fluxo_beneficio_tipo_beneficio"
      FOREIGN KEY ("tipo_beneficio_id") REFERENCES "tipo_beneficio" ("id") ON DELETE CASCADE;
      
      ALTER TABLE "fluxo_beneficio" ADD CONSTRAINT "FK_fluxo_beneficio_setor"
      FOREIGN KEY ("setor_id") REFERENCES "setor" ("id") ON DELETE CASCADE;
      
      ALTER TABLE "campo_dinamico_beneficio" ADD CONSTRAINT "FK_campo_dinamico_tipo_beneficio"
      FOREIGN KEY ("tipo_beneficio_id") REFERENCES "tipo_beneficio" ("id") ON DELETE CASCADE;
      
      ALTER TABLE "versao_schema_beneficio" ADD CONSTRAINT "FK_versao_schema_tipo_beneficio"
      FOREIGN KEY ("tipo_beneficio_id") REFERENCES "tipo_beneficio" ("id") ON DELETE CASCADE;
    `);
    
    // Adicionar políticas RLS (Row-Level Security)
    await queryRunner.query(`
      ALTER TABLE "tipo_beneficio" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "requisito_documento" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "fluxo_beneficio" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "campo_dinamico_beneficio" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "versao_schema_beneficio" ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY tipo_beneficio_policy ON "tipo_beneficio" 
        USING (TRUE) 
        WITH CHECK (TRUE);
      
      CREATE POLICY requisito_documento_policy ON "requisito_documento" 
        USING (TRUE) 
        WITH CHECK (TRUE);
      
      CREATE POLICY fluxo_beneficio_policy ON "fluxo_beneficio" 
        USING (TRUE) 
        WITH CHECK (TRUE);
      
      CREATE POLICY campo_dinamico_beneficio_policy ON "campo_dinamico_beneficio" 
        USING (TRUE) 
        WITH CHECK (TRUE);
      
      CREATE POLICY versao_schema_beneficio_policy ON "versao_schema_beneficio" 
        USING (TRUE) 
        WITH CHECK (TRUE);
    `);
    
    console.log('Migration 1030000-CreateBeneficioSchema executada com sucesso.');
  }

  /**
   * Reverte todas as alterações realizadas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Revertendo migration 1030000-CreateBeneficioSchema...');
    
    // Remover políticas RLS
    await queryRunner.query(`
      DROP POLICY IF EXISTS tipo_beneficio_policy ON "tipo_beneficio";
      DROP POLICY IF EXISTS requisito_documento_policy ON "requisito_documento";
      DROP POLICY IF EXISTS fluxo_beneficio_policy ON "fluxo_beneficio";
      DROP POLICY IF EXISTS campo_dinamico_beneficio_policy ON "campo_dinamico_beneficio";
      DROP POLICY IF EXISTS versao_schema_beneficio_policy ON "versao_schema_beneficio";
    `);
    
    // Remover chaves estrangeiras
    await queryRunner.query(`
      ALTER TABLE "requisito_documento" DROP CONSTRAINT IF EXISTS "FK_requisito_documento_tipo_beneficio";
      ALTER TABLE "fluxo_beneficio" DROP CONSTRAINT IF EXISTS "FK_fluxo_beneficio_tipo_beneficio";
      ALTER TABLE "fluxo_beneficio" DROP CONSTRAINT IF EXISTS "FK_fluxo_beneficio_setor";
      ALTER TABLE "campo_dinamico_beneficio" DROP CONSTRAINT IF EXISTS "FK_campo_dinamico_tipo_beneficio";
      ALTER TABLE "versao_schema_beneficio" DROP CONSTRAINT IF EXISTS "FK_versao_schema_tipo_beneficio";
    `);
    
    // Remover triggers de log de auditoria
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS audit_log_trigger_tipo_beneficio ON "tipo_beneficio";
      DROP TRIGGER IF EXISTS audit_log_trigger_requisito_documento ON "requisito_documento";
      DROP TRIGGER IF EXISTS audit_log_trigger_fluxo_beneficio ON "fluxo_beneficio";
      DROP TRIGGER IF EXISTS audit_log_trigger_campo_dinamico_beneficio ON "campo_dinamico_beneficio";
      DROP TRIGGER IF EXISTS audit_log_trigger_versao_schema_beneficio ON "versao_schema_beneficio";
    `);
    
    // Remover triggers de atualização automática de timestamp
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_tipo_beneficio_update_timestamp ON "tipo_beneficio";
      DROP TRIGGER IF EXISTS trigger_requisito_documento_update_timestamp ON "requisito_documento";
      DROP TRIGGER IF EXISTS trigger_fluxo_beneficio_update_timestamp ON "fluxo_beneficio";
      DROP TRIGGER IF EXISTS trigger_campo_dinamico_update_timestamp ON "campo_dinamico_beneficio";
      DROP TRIGGER IF EXISTS trigger_versao_schema_update_timestamp ON "versao_schema_beneficio";
    `);
    
    // Remover tabelas
    await queryRunner.query(`
      DROP TABLE IF EXISTS "versao_schema_beneficio";
      DROP TABLE IF EXISTS "campo_dinamico_beneficio";
      DROP TABLE IF EXISTS "fluxo_beneficio";
      DROP TABLE IF EXISTS "requisito_documento";
      DROP TABLE IF EXISTS "tipo_beneficio";
    `);
    
    // Remover tipos enumerados
    await queryRunner.query(`
      DROP TYPE IF EXISTS "tipo_campo_enum";
      DROP TYPE IF EXISTS "fase_requisito_enum";
      DROP TYPE IF EXISTS "periodicidade_enum";
    `);
    
    console.log('Migration 1030000-CreateBeneficioSchema revertida com sucesso.');
  }
}
