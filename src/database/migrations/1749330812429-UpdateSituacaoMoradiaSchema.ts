import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateSituacaoMoradiaSchema1749330812429 implements MigrationInterface {
  name = 'UpdateSituacaoMoradiaSchema1749330812429';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar novos enums se não existirem
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_desastre_enum') THEN
          CREATE TYPE "tipo_desastre_enum" AS ENUM (
            'enchente',
            'incendio',
            'deslizamento',
            'vendaval',
            'terremoto',
            'outro'
          );
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'programa_habitacional_enum') THEN
          CREATE TYPE "programa_habitacional_enum" AS ENUM (
            'minha_casa_minha_vida',
            'casa_verde_amarela',
            'auxilio_moradia',
            'programa_municipal',
            'outro',
            'nenhum'
          );
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_despesa_enum') THEN
          CREATE TYPE "tipo_despesa_enum" AS ENUM (
            'aluguel',
            'internet',
            'condominio',
            'iptu',
            'seguro',
            'manutencao',
            'agua',
            'energia',
            'gas',
            'alimentacao_higiene',
            'medicamentos',
            'telefone',
            'outro'
          );
        END IF;
      END
      $$;
    `);

    // Adicionar novas colunas à tabela situacao_moradia
    await queryRunner.query(`
      ALTER TABLE "situacao_moradia" 
      ADD COLUMN IF NOT EXISTS "moradia_cedida" boolean,
      ADD COLUMN IF NOT EXISTS "moradia_invadida" boolean,
      ADD COLUMN IF NOT EXISTS "tipo_desastre" "tipo_desastre_enum",
      ADD COLUMN IF NOT EXISTS "descricao_desastre" character varying,
      ADD COLUMN IF NOT EXISTS "outro_tipo_moradia" character varying,
      ADD COLUMN IF NOT EXISTS "programa_habitacional" "programa_habitacional_enum",
      ADD COLUMN IF NOT EXISTS "inscrito_programa_habitacional" boolean,
      ADD COLUMN IF NOT EXISTS "reside_2_anos_natal" boolean,
      ADD COLUMN IF NOT EXISTS "despesas_mensais" jsonb;
    `);

    // Criar índices para os novos campos
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_situacao_moradia_programa_habitacional" 
      ON "situacao_moradia" ("programa_habitacional");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_situacao_moradia_tipo_desastre" 
      ON "situacao_moradia" ("tipo_desastre");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_situacao_moradia_moradia_cedida" 
      ON "situacao_moradia" ("moradia_cedida");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_situacao_moradia_moradia_invadida" 
      ON "situacao_moradia" ("moradia_invadida");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_situacao_moradia_inscrito_programa" 
      ON "situacao_moradia" ("inscrito_programa_habitacional");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_situacao_moradia_reside_2_anos" 
      ON "situacao_moradia" ("reside_2_anos_natal");
    `);

    // Criar índice GIN para o campo JSONB despesas_mensais
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_situacao_moradia_despesas_mensais_gin" 
      ON "situacao_moradia" USING GIN ("despesas_mensais");
    `);

    // Adicionar comentários às colunas para documentação
    await queryRunner.query(`
      COMMENT ON COLUMN "situacao_moradia"."moradia_cedida" IS 'Indica se a moradia é cedida por terceiros';
      COMMENT ON COLUMN "situacao_moradia"."moradia_invadida" IS 'Indica se a moradia é uma invasão/ocupação irregular';
      COMMENT ON COLUMN "situacao_moradia"."tipo_desastre" IS 'Tipo de desastre natural que afetou a moradia';
      COMMENT ON COLUMN "situacao_moradia"."descricao_desastre" IS 'Descrição detalhada do desastre ocorrido';
      COMMENT ON COLUMN "situacao_moradia"."outro_tipo_moradia" IS 'Descrição quando tipo_moradia é OUTRO';
      COMMENT ON COLUMN "situacao_moradia"."programa_habitacional" IS 'Programa habitacional do qual participa';
      COMMENT ON COLUMN "situacao_moradia"."inscrito_programa_habitacional" IS 'Indica se está inscrito em algum programa habitacional';
      COMMENT ON COLUMN "situacao_moradia"."reside_2_anos_natal" IS 'Indica se reside há pelo menos 2 anos em Natal';
      COMMENT ON COLUMN "situacao_moradia"."despesas_mensais" IS 'Array JSON com despesas mensais detalhadas';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índices
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_situacao_moradia_despesas_mensais_gin";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_situacao_moradia_reside_2_anos";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_situacao_moradia_inscrito_programa";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_situacao_moradia_moradia_invadida";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_situacao_moradia_moradia_cedida";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_situacao_moradia_tipo_desastre";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_situacao_moradia_programa_habitacional";`);

    // Remover colunas
    await queryRunner.query(`
      ALTER TABLE "situacao_moradia" 
      DROP COLUMN IF EXISTS "despesas_mensais",
      DROP COLUMN IF EXISTS "reside_2_anos_natal",
      DROP COLUMN IF EXISTS "inscrito_programa_habitacional",
      DROP COLUMN IF EXISTS "programa_habitacional",
      DROP COLUMN IF EXISTS "outro_tipo_moradia",
      DROP COLUMN IF EXISTS "descricao_desastre",
      DROP COLUMN IF EXISTS "tipo_desastre",
      DROP COLUMN IF EXISTS "moradia_invadida",
      DROP COLUMN IF EXISTS "moradia_cedida";
    `);

    // Remover enums (cuidado: só remover se não estiverem sendo usados em outras tabelas)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_despesa_enum') THEN
          DROP TYPE "tipo_despesa_enum";
        END IF;
      EXCEPTION
        WHEN dependent_objects_still_exist THEN
          -- Não remove se ainda há dependências
          NULL;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'programa_habitacional_enum') THEN
          DROP TYPE "programa_habitacional_enum";
        END IF;
      EXCEPTION
        WHEN dependent_objects_still_exist THEN
          -- Não remove se ainda há dependências
          NULL;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_desastre_enum') THEN
          DROP TYPE "tipo_desastre_enum";
        END IF;
      EXCEPTION
        WHEN dependent_objects_still_exist THEN
          -- Não remove se ainda há dependências
          NULL;
      END
      $$;
    `);
  }
}