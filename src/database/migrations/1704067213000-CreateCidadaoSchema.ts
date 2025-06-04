import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para criar o schema relacionado ao cidadão
 *
 * Esta migration cria as tabelas e restrições para o módulo de cidadão,
 * incluindo estruturas para armazenar dados pessoais, composição familiar,
 * situação de moradia e papéis que o cidadão pode assumir.
 *
 * Os enums necessários são criados na migration CreateAllEnums
 *
 * @author Engenheiro de Dados
 * @date 19/05/2025
 */
export class CreateCidadaoSchema1704067216000 implements MigrationInterface {
  name = 'CreateCidadaoSchema1704067216000';

  /**
   * Cria as estruturas relacionadas ao cidadão
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Iniciando migration CreateCidadaoSchema...');

    // Criar função update_timestamp se não existir
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Tabela principal de cidadão
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cidadao" (
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
        "sexo" "sexo_enum" NOT NULL,
        "estado_civil" "estado_civil_enum" NOT NULL,
        "telefone" character varying NOT NULL,
        "email" character varying,
        "endereco" jsonb NOT NULL,
        "unidade_id" UUID NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "removed_at" TIMESTAMP,
        CONSTRAINT "UQ_cidadao_cpf" UNIQUE ("cpf"),
        CONSTRAINT "UQ_cidadao_nis" UNIQUE ("nis"),
        CONSTRAINT "PK_cidadao" PRIMARY KEY ("id"),
        CONSTRAINT "FK_cidadao_unidade" FOREIGN KEY ("unidade_id") REFERENCES "unidade"("id")
      );
    `);

    // Índices para otimização de consultas
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cidadao_cpf" ON "cidadao" ("cpf");
      CREATE INDEX IF NOT EXISTS "IDX_cidadao_nis" ON "cidadao" ("nis");
      CREATE INDEX IF NOT EXISTS "IDX_cidadao_telefone" ON "cidadao" ("telefone");
      CREATE INDEX IF NOT EXISTS "IDX_cidadao_nome_mae" ON "cidadao" ("nome_mae");
      CREATE INDEX IF NOT EXISTS "IDX_cidadao_endereco" ON "cidadao" USING GIN ("endereco");
      CREATE INDEX IF NOT EXISTS "IDX_cidadao_estado_civil" ON "cidadao" USING GIN ("estado_civil");
    `);

    // Trigger para atualização automática de timestamp
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_cidadao_update_timestamp ON "cidadao";
      CREATE TRIGGER trigger_cidadao_update_timestamp
        BEFORE UPDATE ON "cidadao"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
    `);

    // Tabela de papel do cidadão
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "papel_cidadao" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "cidadao_id" uuid NOT NULL,
        "composicao_familiar_id" uuid,
        "tipo_papel" "tipo_papel_enum" NOT NULL,
        "metadados" jsonb,
        "ativo" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "removed_at" TIMESTAMP,
        CONSTRAINT "PK_papel_cidadao" PRIMARY KEY ("id"),
        CONSTRAINT "UK_papel_cidadao_cidadao_tipo" UNIQUE ("cidadao_id", "tipo_papel")
      );
    `);

    // Índices para papel_cidadao
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_papel_cidadao_cidadao" ON "papel_cidadao" ("cidadao_id");
      CREATE INDEX IF NOT EXISTS "IDX_papel_cidadao_tipo" ON "papel_cidadao" ("tipo_papel");
      CREATE INDEX IF NOT EXISTS "IDX_papel_cidadao_metadados" ON "papel_cidadao" USING GIN ("metadados");
    `);

    // Trigger para papel_cidadao
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_papel_cidadao_update_timestamp ON "papel_cidadao";
      CREATE TRIGGER trigger_papel_cidadao_update_timestamp
        BEFORE UPDATE ON "papel_cidadao"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
    `);

    // Tabela de composição familiar
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "composicao_familiar" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "cidadao_id" uuid NOT NULL,
        "nome" character varying NOT NULL,
        "nis" character varying,
        "idade" integer NOT NULL,
        "ocupacao" character varying NOT NULL,
        "escolaridade" "escolaridade_enum" NOT NULL,
        "parentesco" "parentesco_enum" NOT NULL DEFAULT 'outro',
        "renda" decimal(10,2),
        "observacoes" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "removed_at" TIMESTAMP,
        CONSTRAINT "PK_composicao_familiar" PRIMARY KEY ("id"),
        CONSTRAINT "UK_composicao_familiar_cidadao_nome" UNIQUE ("cidadao_id", "nome")
      );
    `);

    // Índices para composicao_familiar
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_composicao_familiar_cidadao" ON "composicao_familiar" ("cidadao_id");
      CREATE INDEX IF NOT EXISTS "IDX_composicao_familiar_parentesco" ON "composicao_familiar" ("parentesco");
    `);

    // Trigger para composicao_familiar
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_composicao_familiar_update_timestamp ON "composicao_familiar";
      CREATE TRIGGER trigger_composicao_familiar_update_timestamp
        BEFORE UPDATE ON "composicao_familiar"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
    `);

    // Tabela de dados sociais
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dados_sociais" (
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
    `);

    // Índices para dados_sociais
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_dados_sociais_cidadao" ON "dados_sociais" ("cidadao_id");
      CREATE INDEX IF NOT EXISTS "IDX_dados_sociais_escolaridade" ON "dados_sociais" ("escolaridade");
      CREATE INDEX IF NOT EXISTS "IDX_dados_sociais_situacao_trabalho" ON "dados_sociais" ("situacao_trabalho");
    `);

    // Trigger para dados_sociais
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_dados_sociais_update_timestamp ON "dados_sociais";
      CREATE TRIGGER trigger_dados_sociais_update_timestamp
        BEFORE UPDATE ON "dados_sociais"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
    `);

    // Tabela de situação de moradia
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "situacao_moradia" (
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
    `);

    // Índices para situacao_moradia
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_situacao_moradia_cidadao" ON "situacao_moradia" ("cidadao_id");
      CREATE INDEX IF NOT EXISTS "IDX_situacao_moradia_tipo" ON "situacao_moradia" ("tipo_moradia");
    `);

    // Trigger para situacao_moradia
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_situacao_moradia_update_timestamp ON "situacao_moradia";
      CREATE TRIGGER trigger_situacao_moradia_update_timestamp
        BEFORE UPDATE ON "situacao_moradia"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
    `);

    // Adicionar as chaves estrangeiras
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_papel_cidadao_cidadao'
        ) THEN
          ALTER TABLE "papel_cidadao" ADD CONSTRAINT "FK_papel_cidadao_cidadao"
          FOREIGN KEY ("cidadao_id") REFERENCES "cidadao" ("id") ON DELETE CASCADE;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_papel_cidadao_composicao_familiar'
        ) THEN
          ALTER TABLE "papel_cidadao" ADD CONSTRAINT "FK_papel_cidadao_composicao_familiar"
          FOREIGN KEY ("composicao_familiar_id") REFERENCES "composicao_familiar" ("id") ON DELETE SET NULL;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_composicao_familiar_cidadao'
        ) THEN
          ALTER TABLE "composicao_familiar" ADD CONSTRAINT "FK_composicao_familiar_cidadao"
          FOREIGN KEY ("cidadao_id") REFERENCES "cidadao" ("id") ON DELETE CASCADE;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_dados_sociais_cidadao'
        ) THEN
          ALTER TABLE "dados_sociais" ADD CONSTRAINT "FK_dados_sociais_cidadao"
          FOREIGN KEY ("cidadao_id") REFERENCES "cidadao" ("id") ON DELETE CASCADE;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_situacao_moradia_cidadao'
        ) THEN
          ALTER TABLE "situacao_moradia" ADD CONSTRAINT "FK_situacao_moradia_cidadao"
          FOREIGN KEY ("cidadao_id") REFERENCES "cidadao" ("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    console.log('Migration CreateCidadaoSchema executada com sucesso.');
  }

  /**
   * Reverte todas as alterações realizadas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Revertendo migration CreateCidadaoSchema...');

    // Remover chaves estrangeiras
    await queryRunner.query(`
      ALTER TABLE "papel_cidadao" DROP CONSTRAINT IF EXISTS "FK_papel_cidadao_cidadao";
      ALTER TABLE "papel_cidadao" DROP CONSTRAINT IF EXISTS "FK_papel_cidadao_composicao_familiar";
      ALTER TABLE "composicao_familiar" DROP CONSTRAINT IF EXISTS "FK_composicao_familiar_cidadao";
      ALTER TABLE "dados_sociais" DROP CONSTRAINT IF EXISTS "FK_dados_sociais_cidadao";
      ALTER TABLE "situacao_moradia" DROP CONSTRAINT IF EXISTS "FK_situacao_moradia_cidadao";
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

    // Remover função update_timestamp se não for usada por outras tabelas
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS update_timestamp();
    `);

    console.log('Migration CreateCidadaoSchema revertida com sucesso.');
  }
}
