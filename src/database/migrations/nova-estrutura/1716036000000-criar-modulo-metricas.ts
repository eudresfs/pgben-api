import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migração para criação das estruturas do módulo de métricas
 * 
 * Esta migração cria as tabelas necessárias para o funcionamento do módulo de métricas,
 * incluindo definições, configurações e snapshots.
 */
export class CriarModuloMetricas1716036000000 implements MigrationInterface {
  name = 'CriarModuloMetricas1716036000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar tipos enumerados
    await queryRunner.query(`
      CREATE TYPE "public"."tipo_metrica_enum" AS ENUM (
        'contagem', 'soma', 'media', 'minimo', 'maximo', 'composta', 
        'percentil', 'cardinalidade', 'taxa_variacao'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."categoria_metrica_enum" AS ENUM (
        'financeiro', 'operacional', 'desempenho', 'qualidade', 'usuario',
        'beneficio', 'processamento', 'sistema'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."granularidade_temporal_enum" AS ENUM (
        'minuto', 'hora', 'dia', 'semana', 'mes', 'trimestre', 'ano'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."tipo_agendamento_enum" AS ENUM (
        'intervalo', 'cron', 'evento', 'manual'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."estrategia_amostragem_enum" AS ENUM (
        'completa', 'aleatoria', 'sistematica', 'estratificada'
      );
    `);

    // Criar tabela de definições de métricas
    await queryRunner.query(`
      CREATE TABLE "metrica_definicao" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "codigo" character varying(100) NOT NULL,
        "nome" character varying(100) NOT NULL,
        "descricao" text NOT NULL,
        "tipo" "public"."tipo_metrica_enum" NOT NULL DEFAULT 'contagem',
        "categoria" "public"."categoria_metrica_enum" NOT NULL DEFAULT 'operacional',
        "unidade" character varying(50),
        "prefixo" character varying(10),
        "sufixo" character varying(10),
        "casas_decimais" integer NOT NULL DEFAULT 2,
        "sql_consulta" text,
        "formula_calculo" text,
        "fonte_dados" character varying(50) NOT NULL DEFAULT 'banco_dados',
        "agregacao_temporal" character varying(20) NOT NULL DEFAULT 'soma',
        "granularidade" "public"."granularidade_temporal_enum" NOT NULL DEFAULT 'dia',
        "metricas_dependentes" text,
        "ativa" boolean NOT NULL DEFAULT true,
        "parametros_especificos" jsonb,
        "tags" text,
        "versao" integer NOT NULL DEFAULT 1,
        "ultima_coleta" TIMESTAMP,
        "calculo_tempo_real" boolean NOT NULL DEFAULT false,
        "criado_por" character varying(100),
        "atualizado_por" character varying(100),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_metrica_definicao" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_metrica_definicao_codigo" UNIQUE ("codigo")
      );
    `);

    // Criar índice para busca de métricas por código
    await queryRunner.query(`
      CREATE INDEX "IDX_metrica_definicao_codigo" ON "metrica_definicao" ("codigo");
    `);

    // Criar tabela de configurações de métricas
    await queryRunner.query(`
      CREATE TABLE "metrica_configuracao" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "metrica_id" uuid NOT NULL,
        "coleta_automatica" boolean NOT NULL DEFAULT true,
        "tipo_agendamento" "public"."tipo_agendamento_enum" NOT NULL DEFAULT 'intervalo',
        "intervalo_segundos" integer NOT NULL DEFAULT 86400,
        "expressao_cron" character varying(100),
        "nome_evento" character varying(100),
        "max_snapshots" integer NOT NULL DEFAULT 0,
        "periodo_retencao_dias" integer NOT NULL DEFAULT 365,
        "estrategia_amostragem" "public"."estrategia_amostragem_enum" NOT NULL DEFAULT 'completa',
        "tamanho_amostra" integer NOT NULL DEFAULT 0,
        "cacheamento_habilitado" boolean NOT NULL DEFAULT true,
        "cache_ttl" integer NOT NULL DEFAULT 300,
        "alertas" jsonb,
        "visualizacao" jsonb,
        "exibir_dashboard" boolean NOT NULL DEFAULT true,
        "prioridade_dashboard" integer NOT NULL DEFAULT 100,
        "criado_por" character varying(100),
        "atualizado_por" character varying(100),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_metrica_configuracao" PRIMARY KEY ("id")
      );
    `);

    // Criar índice para busca de configurações por métrica
    await queryRunner.query(`
      CREATE INDEX "IDX_metrica_configuracao_metrica_id" ON "metrica_configuracao" ("metrica_id");
    `);

    // Criar tabela de snapshots de métricas
    await queryRunner.query(`
      CREATE TABLE "metrica_snapshot" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "definicao_id" uuid NOT NULL,
        "periodo_inicio" TIMESTAMP NOT NULL,
        "periodo_fim" TIMESTAMP NOT NULL,
        "granularidade" "public"."granularidade_temporal_enum" NOT NULL,
        "valor" decimal(20,6) NOT NULL,
        "valor_formatado" character varying(100),
        "dimensoes" jsonb NOT NULL DEFAULT '{}',
        "dimensoes_hash" character varying(64) NOT NULL DEFAULT '',
        "metadados" jsonb,
        "validado" boolean NOT NULL DEFAULT true,
        "versao_definicao" integer NOT NULL DEFAULT 1,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "duracao_processamento_ms" integer NOT NULL DEFAULT 0,
        "status_coleta" character varying(20) NOT NULL DEFAULT 'sucesso',
        "mensagem_status" text,
        CONSTRAINT "PK_metrica_snapshot" PRIMARY KEY ("id")
      );
    `);

    // Criar índices para otimizar buscas em snapshots
    await queryRunner.query(`
      CREATE INDEX "IDX_metrica_snapshot_definicao_id" ON "metrica_snapshot" ("definicao_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_metrica_snapshot_periodo" ON "metrica_snapshot" ("periodo_inicio", "periodo_fim");
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_metrica_snapshot_unicidade" ON "metrica_snapshot" ("definicao_id", "periodo_inicio", "periodo_fim", "dimensoes_hash");
    `);

    // Adicionar chaves estrangeiras
    await queryRunner.query(`
      ALTER TABLE "metrica_configuracao" ADD CONSTRAINT "FK_metrica_configuracao_metrica"
      FOREIGN KEY ("metrica_id") REFERENCES "metrica_definicao"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    `);

    await queryRunner.query(`
      ALTER TABLE "metrica_snapshot" ADD CONSTRAINT "FK_metrica_snapshot_definicao"
      FOREIGN KEY ("definicao_id") REFERENCES "metrica_definicao"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover chaves estrangeiras
    await queryRunner.query(`
      ALTER TABLE "metrica_snapshot" DROP CONSTRAINT "FK_metrica_snapshot_definicao";
    `);

    await queryRunner.query(`
      ALTER TABLE "metrica_configuracao" DROP CONSTRAINT "FK_metrica_configuracao_metrica";
    `);

    // Remover índices
    await queryRunner.query(`DROP INDEX "IDX_metrica_snapshot_unicidade";`);
    await queryRunner.query(`DROP INDEX "IDX_metrica_snapshot_periodo";`);
    await queryRunner.query(`DROP INDEX "IDX_metrica_snapshot_definicao_id";`);
    await queryRunner.query(`DROP INDEX "IDX_metrica_configuracao_metrica_id";`);
    await queryRunner.query(`DROP INDEX "IDX_metrica_definicao_codigo";`);

    // Remover tabelas
    await queryRunner.query(`DROP TABLE "metrica_snapshot";`);
    await queryRunner.query(`DROP TABLE "metrica_configuracao";`);
    await queryRunner.query(`DROP TABLE "metrica_definicao";`);

    // Remover tipos enumerados
    await queryRunner.query(`DROP TYPE "public"."estrategia_amostragem_enum";`);
    await queryRunner.query(`DROP TYPE "public"."tipo_agendamento_enum";`);
    await queryRunner.query(`DROP TYPE "public"."granularidade_temporal_enum";`);
    await queryRunner.query(`DROP TYPE "public"."categoria_metrica_enum";`);
    await queryRunner.query(`DROP TYPE "public"."tipo_metrica_enum";`);
  }
}
