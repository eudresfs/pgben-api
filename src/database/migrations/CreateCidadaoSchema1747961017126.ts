import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para criar o schema relacionado ao cidadão
 * 
 * Esta migration cria as tabelas, enumerações e restrições para o módulo de cidadão,
 * incluindo estruturas para armazenar dados pessoais, composição familiar,
 * situação de moradia e papéis que o cidadão pode assumir.
 * 
 * @author Engenheiro de Dados
 * @date 19/05/2025
 */
export class CreateCidadaoSchema1747961017126 implements MigrationInterface {
  name = 'CreateCidadaoSchema1747961017126';

  /**
   * Cria as estruturas relacionadas ao cidadão
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Iniciando migration 1020000-CreateCidadaoSchema...');
    
    // Criação dos tipos enumerados
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sexo') THEN
          CREATE TYPE "sexo" AS ENUM ('masculino', 'feminino', 'outro');
        END IF;
      END$$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'escolaridade_enum') THEN
          CREATE TYPE "escolaridade_enum" AS ENUM (
            'analfabeto', 
            'fundamental_incompleto', 
            'fundamental_completo', 
            'medio_incompleto', 
            'medio_completo',
            'superior_incompleto',
            'superior_completo',
            'pos_graduacao'
          );
        END IF;
      END$$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'situacao_trabalho_enum') THEN
          CREATE TYPE "situacao_trabalho_enum" AS ENUM (
            'desempregado',
            'empregado_formal',
            'empregado_informal',
            'autonomo',
            'aposentado',
            'pensionista',
            'beneficiario_bpc',
            'outro'
          );
        END IF;
      END$$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_trabalho_enum') THEN
          CREATE TYPE "tipo_trabalho_enum" AS ENUM (
            'formal',
            'informal',
            'autonomo',
            'empregador',
            'nao_trabalha'
          );
        END IF;
      END$$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_moradia_enum') THEN
          CREATE TYPE "tipo_moradia_enum" AS ENUM (
            'propria',
            'alugada',
            'cedida',
            'ocupacao',
            'situacao_rua',
            'abrigo',
            'outro'
          );
        END IF;
      END$$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'parentesco') THEN
          CREATE TYPE "parentesco" AS ENUM (
            'conjuge',
            'filho',
            'pai',
            'mae',
            'irmao',
            'avo',
            'neto',
            'tio',
            'sobrinho',
            'outro'
          );
        END IF;
      END$$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_papel') THEN
          CREATE TYPE "tipo_papel" AS ENUM (
            'beneficiario',
            'requerente',
            'representante_legal'
          );
        END IF;
      END$$;
    `);
    
    // Tabela principal de cidadão
    await queryRunner.query(`
      CREATE TABLE "cidadao" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "nome" character varying NOT NULL,
        "nome_social" character varying,
        "cpf" character varying NOT NULL,
        "rg" character varying NOT NULL,
        "nis" character varying,
        "nome_mae" character varying NOT NULL,
        "naturalidade" character varying NOT NULL,
        "prontuario_suas" character varying NOT NULL,
        "data_nascimento" date NOT NULL,
        "sexo" "sexo" NOT NULL,
        "telefone" character varying NOT NULL,
        "email" character varying,
        "endereco" jsonb NOT NULL,
        "ativo" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "removed_at" TIMESTAMP,
        CONSTRAINT "UQ_cidadao_cpf" UNIQUE ("cpf"),
        CONSTRAINT "UQ_cidadao_nis" UNIQUE ("nis"),
        CONSTRAINT "PK_cidadao" PRIMARY KEY ("id")
      );
      
      -- Índices para otimização de consultas
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_cidadao_nome_ativo') THEN
          CREATE INDEX "IDX_cidadao_nome_ativo" ON "cidadao" ("nome", "ativo");
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_cidadao_cpf') THEN
          CREATE INDEX "IDX_cidadao_cpf" ON "cidadao" ("cpf");
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_cidadao_nis') THEN
          CREATE INDEX "IDX_cidadao_nis" ON "cidadao" ("nis");
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_cidadao_nome_mae') THEN
          CREATE INDEX "IDX_cidadao_nome_mae" ON "cidadao" ("nome_mae");
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_cidadao_created_at_ativo') THEN
          CREATE INDEX "IDX_cidadao_created_at_ativo" ON "cidadao" ("created_at", "ativo");
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_cidadao_endereco') THEN
          CREATE INDEX "IDX_cidadao_endereco" ON "cidadao" USING GIN ("endereco");
        END IF;
      END$$;
      
      -- Trigger para atualização automática de timestamp
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_cidadao_update_timestamp') THEN
          CREATE TRIGGER trigger_cidadao_update_timestamp
          BEFORE UPDATE ON "cidadao"
          FOR EACH ROW
          EXECUTE PROCEDURE update_timestamp();
        END IF;
      END$$;
    `);
    
    // Tabela de papel do cidadão
    await queryRunner.query(`
      CREATE TABLE "papel_cidadao" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "cidadao_id" uuid NOT NULL,
        "composicao_familiar_id" uuid,
        "tipo_papel" "tipo_papel" NOT NULL,
        "metadados" jsonb,
        "ativo" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "removed_at" TIMESTAMP,
        CONSTRAINT "PK_papel_cidadao" PRIMARY KEY ("id"),
        CONSTRAINT "UK_papel_cidadao_cidadao_tipo" UNIQUE ("cidadao_id", "tipo_papel")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX "IDX_papel_cidadao_cidadao" ON "papel_cidadao" ("cidadao_id");
      CREATE INDEX "IDX_papel_cidadao_tipo" ON "papel_cidadao" ("tipo_papel");
      CREATE INDEX "IDX_papel_cidadao_metadados" ON "papel_cidadao" USING GIN ("metadados");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_papel_cidadao_update_timestamp
      BEFORE UPDATE ON "papel_cidadao"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
    `);
    
    // Tabela de composição familiar
    await queryRunner.query(`
      CREATE TABLE "composicao_familiar" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "cidadao_id" uuid NOT NULL,
        "nome" character varying NOT NULL,
        "nis" character varying,
        "idade" integer NOT NULL,
        "ocupacao" character varying NOT NULL,
        "escolaridade" "escolaridade_enum" NOT NULL,
        "parentesco" "parentesco" NOT NULL DEFAULT 'outro',
        "renda" decimal(10,2),
        "observacoes" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "removed_at" TIMESTAMP,
        CONSTRAINT "PK_composicao_familiar" PRIMARY KEY ("id"),
        CONSTRAINT "UK_composicao_familiar_cidadao_nome" UNIQUE ("cidadao_id", "nome")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX "IDX_composicao_familiar_cidadao" ON "composicao_familiar" ("cidadao_id");
      CREATE INDEX "IDX_composicao_familiar_parentesco" ON "composicao_familiar" ("parentesco");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_composicao_familiar_update_timestamp
      BEFORE UPDATE ON "composicao_familiar"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
    `);
    
    // Tabela de dados sociais
    await queryRunner.query(`
      CREATE TABLE "dados_sociais" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "cidadao_id" uuid NOT NULL,
        "escolaridade" "escolaridade_enum" NOT NULL,
        "publico_prioritario" boolean,
        "renda" decimal(10,2),
        "ocupacao" character varying,
        "recebe_pbf" boolean NOT NULL DEFAULT false,
        "valor_pbf" decimal(10,2),
        "recebe_bpc" boolean NOT NULL DEFAULT false,
        "tipo_bpc" character varying,
        "valor_bpc" decimal(10,2),
        "curso_profissionalizante" character varying,
        "interesse_curso_profissionalizante" boolean,
        "situacao_trabalho" "situacao_trabalho_enum",
        "area_trabalho" character varying,
        "familiar_apto_trabalho" boolean,
        "area_interesse_familiar" character varying,
        "observacoes" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "removed_at" TIMESTAMP,
        CONSTRAINT "PK_dados_sociais" PRIMARY KEY ("id"),
        CONSTRAINT "UK_dados_sociais_cidadao" UNIQUE ("cidadao_id")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX "IDX_dados_sociais_cidadao" ON "dados_sociais" ("cidadao_id");
      CREATE INDEX "IDX_dados_sociais_escolaridade" ON "dados_sociais" ("escolaridade");
      CREATE INDEX "IDX_dados_sociais_situacao_trabalho" ON "dados_sociais" ("situacao_trabalho");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_dados_sociais_update_timestamp
      BEFORE UPDATE ON "dados_sociais"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
    `);
    
    // Tabela de situação de moradia
    await queryRunner.query(`
      CREATE TABLE "situacao_moradia" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "cidadao_id" uuid NOT NULL,
        "tipo_moradia" "tipo_moradia_enum",
        "numero_comodos" integer,
        "valor_aluguel" decimal(10,2),
        "tempo_moradia" integer,
        "possui_banheiro" boolean,
        "possui_energia_eletrica" boolean,
        "possui_agua_encanada" boolean,
        "possui_coleta_lixo" boolean,
        "observacoes" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "removed_at" TIMESTAMP,
        CONSTRAINT "PK_situacao_moradia" PRIMARY KEY ("id"),
        CONSTRAINT "UK_situacao_moradia_cidadao" UNIQUE ("cidadao_id")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX "IDX_situacao_moradia_cidadao" ON "situacao_moradia" ("cidadao_id");
      CREATE INDEX "IDX_situacao_moradia_tipo" ON "situacao_moradia" ("tipo_moradia");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_situacao_moradia_update_timestamp
      BEFORE UPDATE ON "situacao_moradia"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
    `);
    
    // Adicionar as chaves estrangeiras
    await queryRunner.query(`
      ALTER TABLE "papel_cidadao" ADD CONSTRAINT "FK_papel_cidadao_cidadao"
      FOREIGN KEY ("cidadao_id") REFERENCES "cidadao" ("id") ON DELETE CASCADE;
      
      ALTER TABLE "papel_cidadao" ADD CONSTRAINT "FK_papel_cidadao_composicao_familiar"
      FOREIGN KEY ("composicao_familiar_id") REFERENCES "composicao_familiar" ("id") ON DELETE SET NULL;
      
      ALTER TABLE "composicao_familiar" ADD CONSTRAINT "FK_composicao_familiar_cidadao"
      FOREIGN KEY ("cidadao_id") REFERENCES "cidadao" ("id") ON DELETE CASCADE;
      
      ALTER TABLE "dados_sociais" ADD CONSTRAINT "FK_dados_sociais_cidadao"
      FOREIGN KEY ("cidadao_id") REFERENCES "cidadao" ("id") ON DELETE CASCADE;
      
      ALTER TABLE "situacao_moradia" ADD CONSTRAINT "FK_situacao_moradia_cidadao"
      FOREIGN KEY ("cidadao_id") REFERENCES "cidadao" ("id") ON DELETE CASCADE;
    `);
    
    // Adicionar políticas RLS (Row-Level Security)
    await queryRunner.query(`
      ALTER TABLE "cidadao" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "papel_cidadao" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "composicao_familiar" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "dados_sociais" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "situacao_moradia" ENABLE ROW LEVEL SECURITY;
      
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'cidadao_policy') THEN
          CREATE POLICY cidadao_policy ON "cidadao" 
            USING (TRUE) 
            WITH CHECK (TRUE);
        END IF;
      END$$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'papel_cidadao_policy') THEN
          CREATE POLICY papel_cidadao_policy ON "papel_cidadao" 
            USING (TRUE) 
            WITH CHECK (TRUE);
        END IF;
      END$$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'composicao_familiar_policy') THEN
          CREATE POLICY composicao_familiar_policy ON "composicao_familiar" 
            USING (TRUE) 
            WITH CHECK (TRUE);
        END IF;
      END$$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'dados_sociais_policy') THEN
          CREATE POLICY dados_sociais_policy ON "dados_sociais" 
            USING (TRUE) 
            WITH CHECK (TRUE);
        END IF;
      END$$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'situacao_moradia_policy') THEN
          CREATE POLICY situacao_moradia_policy ON "situacao_moradia" 
            USING (TRUE) 
            WITH CHECK (TRUE);
        END IF;
      END$$;
    `);
    
    console.log('Migration 1020000-CreateCidadaoSchema executada com sucesso.');
  }

  /**
   * Reverte todas as alterações realizadas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Revertendo migration 1020000-CreateCidadaoSchema...');
    
    // Remover políticas RLS
    await queryRunner.query(`
      DROP POLICY IF EXISTS cidadao_policy ON "cidadao";
      DROP POLICY IF EXISTS papel_cidadao_policy ON "papel_cidadao";
      DROP POLICY IF EXISTS composicao_familiar_policy ON "composicao_familiar";
      DROP POLICY IF EXISTS dados_sociais_policy ON "dados_sociais";
      DROP POLICY IF EXISTS situacao_moradia_policy ON "situacao_moradia";
    `);
    
    // Remover chaves estrangeiras
    await queryRunner.query(`
      ALTER TABLE "papel_cidadao" DROP CONSTRAINT IF EXISTS "FK_papel_cidadao_cidadao";
      ALTER TABLE "papel_cidadao" DROP CONSTRAINT IF EXISTS "FK_papel_cidadao_composicao_familiar";
      ALTER TABLE "composicao_familiar" DROP CONSTRAINT IF EXISTS "FK_composicao_familiar_cidadao";
      ALTER TABLE "dados_sociais" DROP CONSTRAINT IF EXISTS "FK_dados_sociais_cidadao";
      ALTER TABLE "situacao_moradia" DROP CONSTRAINT IF EXISTS "FK_situacao_moradia_cidadao";
    `);
    
    // Remover triggers de log de auditoria
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS audit_log_trigger_cidadao ON "cidadao";
      DROP TRIGGER IF EXISTS audit_log_trigger_papel_cidadao ON "papel_cidadao";
      DROP TRIGGER IF EXISTS audit_log_trigger_composicao_familiar ON "composicao_familiar";
      DROP TRIGGER IF EXISTS audit_log_trigger_dados_sociais ON "dados_sociais";
      DROP TRIGGER IF EXISTS audit_log_trigger_situacao_moradia ON "situacao_moradia";
    `);
    
    // Remover triggers de atualização automática de timestamp
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_cidadao_update_timestamp ON "cidadao";
      DROP TRIGGER IF EXISTS trigger_papel_cidadao_update_timestamp ON "papel_cidadao";
      DROP TRIGGER IF EXISTS trigger_composicao_familiar_update_timestamp ON "composicao_familiar";
      DROP TRIGGER IF EXISTS trigger_dados_sociais_update_timestamp ON "dados_sociais";
      DROP TRIGGER IF EXISTS trigger_situacao_moradia_update_timestamp ON "situacao_moradia";
    `);
    
    // Remover tabelas
    await queryRunner.query(`
      DROP TABLE IF EXISTS "situacao_moradia";
      DROP TABLE IF EXISTS "dados_sociais";
      DROP TABLE IF EXISTS "papel_cidadao";
      DROP TABLE IF EXISTS "composicao_familiar";
      DROP TABLE IF EXISTS "cidadao";
    `);
    
    // Remover tipos enumerados
    await queryRunner.query(`
      DROP TYPE IF EXISTS "tipo_papel";
      DROP TYPE IF EXISTS "parentesco";
      DROP TYPE IF EXISTS "tipo_moradia_enum";
      DROP TYPE IF EXISTS "tipo_trabalho_enum";
      DROP TYPE IF EXISTS "situacao_trabalho_enum";
      DROP TYPE IF EXISTS "escolaridade_enum";
      DROP TYPE IF EXISTS "sexo";
    `);
    
    console.log('Migration 1020000-CreateCidadaoSchema revertida com sucesso.');
  }
}
