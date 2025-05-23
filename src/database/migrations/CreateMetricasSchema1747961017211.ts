import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para criar o schema relacionado ao módulo de métricas
 * 
 * Esta migration cria as tabelas, enumerações e restrições para o módulo de métricas,
 * permitindo o registro e acompanhamento de métricas do sistema para analytics e monitoring.
 * 
 * @author Engenheiro de Dados
 * @date 20/05/2025
 */
export class CreateMetricasSchema1747961017211 implements MigrationInterface {
  name = 'CreateMetricasSchema1747961017211';

  /**
   * Cria as estruturas relacionadas às métricas
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Iniciando migration 1140000-CreateMetricasSchema...');
    
    // Criação de tipos enumerados para o módulo de métricas
    await queryRunner.query(`
      DO $$ 
      BEGIN
        -- Tipo de métrica (escalar, série temporal, contador, etc.)
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_metrica_enum') THEN
          CREATE TYPE "tipo_metrica_enum" AS ENUM (
            'escalar',
            'contador',
            'serie_temporal',
            'distribuicao',
            'percentil',
            'taxa',
            'composicao'
          );
        END IF;
        
        -- Categoria de métrica (performance, negocio, infra, etc.)
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'categoria_metrica_enum') THEN
          CREATE TYPE "categoria_metrica_enum" AS ENUM (
            'performance',
            'negocio',
            'infraestrutura',
            'seguranca',
            'usuario',
            'qualidade',
            'financeiro',
            'operacional'
          );
        END IF;
        
        -- Estratégia de amostragem para coleta
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estrategia_amostragem_enum') THEN
          CREATE TYPE "estrategia_amostragem_enum" AS ENUM (
            'completa',
            'aleatoria',
            'sistematica',
            'estratificada'
          );
        END IF;
        
        -- Tipo de agendamento para coleta
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_agendamento_enum') THEN
          CREATE TYPE "tipo_agendamento_enum" AS ENUM (
            'intervalo',
            'cron',
            'evento',
            'manual'
          );
        END IF;
      END
      $$;
    `);
    
    console.log('Tipos enumerados criados com sucesso.');
    
    // Tabela de definições de métricas
    const metricaDefinicaoExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'metrica_definicao'
      );
    `);
    
    if (!metricaDefinicaoExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "metrica_definicao" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "codigo" character varying(100) NOT NULL,
        "nome" character varying(200) NOT NULL,
        "descricao" text,
        "tipo" character varying(50) NOT NULL DEFAULT 'escalar',
        "categoria" character varying(50) NOT NULL DEFAULT 'negocio',
        "unidade" character varying(50),
        "prefixo" character varying(10),
        "sufixo" character varying(10),
        "casas_decimais" integer DEFAULT 2,
        "sql_consulta" text,
        "formula_calculo" text,
        "fonte_dados" character varying(100),
        "agregacao_temporal" character varying(50),
        "granularidade" character varying(50),
        "metricas_dependentes" jsonb,
        "ativa" boolean NOT NULL DEFAULT true,
        "parametros_especificos" jsonb,
        "tags" text[],
        "versao" integer NOT NULL DEFAULT 1,
        "ultima_coleta" timestamp without time zone,
        "calculo_tempo_real" boolean NOT NULL DEFAULT false,
        "criado_por" uuid,
        "atualizado_por" uuid,
        "created_at" timestamp without time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_metrica_definicao_codigo" UNIQUE ("codigo"),
        CONSTRAINT "PK_metrica_definicao" PRIMARY KEY ("id")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX IF NOT EXISTS "IDX_metrica_definicao_codigo" ON "metrica_definicao" ("codigo");
      CREATE INDEX IF NOT EXISTS "IDX_metrica_definicao_tipo" ON "metrica_definicao" ("tipo");
      CREATE INDEX IF NOT EXISTS "IDX_metrica_definicao_categoria" ON "metrica_definicao" ("categoria");
      CREATE INDEX IF NOT EXISTS "IDX_metrica_definicao_ativa" ON "metrica_definicao" ("ativa");
      `);
    } else {
      console.log('Tabela metrica_definicao já existe, pulando criação.');
    }
    
    // Tabela de configuração de métricas
    const metricaConfiguracaoExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'metrica_configuracao'
      );
    `);
    
    if (!metricaConfiguracaoExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "metrica_configuracao" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "metrica_id" uuid NOT NULL,
        "coleta_automatica" boolean NOT NULL DEFAULT true,
        "tipo_agendamento" character varying(50) NOT NULL DEFAULT 'intervalo',
        "intervalo_segundos" integer DEFAULT 3600,
        "expressao_cron" character varying(100),
        "nome_evento" character varying(100),
        "max_snapshots" integer DEFAULT 1000,
        "periodo_retencao_dias" integer DEFAULT 365,
        "estrategia_amostragem" character varying(50) DEFAULT 'completa',
        "tamanho_amostra" integer,
        "cacheamento_habilitado" boolean DEFAULT false,
        "cache_ttl" integer DEFAULT 300,
        "alertas" jsonb,
        "visualizacao" jsonb,
        "exibir_dashboard" boolean DEFAULT false,
        "prioridade_dashboard" integer DEFAULT 0,
        "criado_por" uuid,
        "atualizado_por" uuid,
        "created_at" timestamp without time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_metrica_configuracao_metrica" UNIQUE ("metrica_id"),
        CONSTRAINT "PK_metrica_configuracao" PRIMARY KEY ("id"),
        CONSTRAINT "FK_metrica_configuracao_metrica" FOREIGN KEY ("metrica_id") REFERENCES "metrica_definicao" ("id") ON DELETE CASCADE
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX IF NOT EXISTS "IDX_metrica_configuracao_metrica_id" ON "metrica_configuracao" ("metrica_id");
      CREATE INDEX IF NOT EXISTS "IDX_metrica_configuracao_coleta_automatica" ON "metrica_configuracao" ("coleta_automatica");
      CREATE INDEX IF NOT EXISTS "IDX_metrica_configuracao_tipo_agendamento" ON "metrica_configuracao" ("tipo_agendamento");
      `);
    } else {
      console.log('Tabela metrica_configuracao já existe, pulando criação.');
    }
    
    // Tabela de valores de métricas
    const metricaValorExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'metrica_valor'
      );
    `);
    
    if (!metricaValorExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "metrica_valor" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "metrica_id" uuid NOT NULL,
        "timestamp" timestamp without time zone NOT NULL DEFAULT now(),
        "valor" numeric(20,5),
        "valor_texto" text,
        "valor_json" jsonb,
        "parametros_coleta" jsonb,
        "created_at" timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_metrica_valor" PRIMARY KEY ("id"),
        CONSTRAINT "FK_metrica_valor_metrica" FOREIGN KEY ("metrica_id") REFERENCES "metrica_definicao" ("id") ON DELETE CASCADE
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX IF NOT EXISTS "IDX_metrica_valor_metrica_id" ON "metrica_valor" ("metrica_id");
      CREATE INDEX IF NOT EXISTS "IDX_metrica_valor_timestamp" ON "metrica_valor" ("timestamp");
      -- Índice composto para consultas de séries temporais
      CREATE INDEX IF NOT EXISTS "IDX_metrica_valor_metrica_timestamp" ON "metrica_valor" ("metrica_id", "timestamp");
      `);
    } else {
      console.log('Tabela metrica_valor já existe, pulando criação.');
    }
    
    // Aplicando políticas RLS para segurança
    await queryRunner.query(`
      -- Habilitar RLS nas tabelas
      ALTER TABLE "metrica_definicao" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "metrica_configuracao" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "metrica_valor" ENABLE ROW LEVEL SECURITY;
      
      -- Política para postgres (usuário de migração)
      CREATE POLICY metrica_definicao_policy ON "metrica_definicao" 
        USING (current_user = 'postgres');
      CREATE POLICY metrica_configuracao_policy ON "metrica_configuracao" 
        USING (current_user = 'postgres');
      CREATE POLICY metrica_valor_policy ON "metrica_valor" 
        USING (current_user = 'postgres');
    `);
    
    console.log('Políticas de segurança aplicadas com sucesso.');
    console.log('Migration 1140000-CreateMetricasSchema executada com sucesso.');
  }

  /**
   * Reverte todas as alterações realizadas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Revertendo migration 1140000-CreateMetricasSchema...');
    
    // Remover políticas RLS
    await queryRunner.query(`
      DROP POLICY IF EXISTS metrica_definicao_policy ON "metrica_definicao";
      DROP POLICY IF EXISTS metrica_configuracao_policy ON "metrica_configuracao";
      DROP POLICY IF EXISTS metrica_valor_policy ON "metrica_valor";
      
      ALTER TABLE "metrica_definicao" DISABLE ROW LEVEL SECURITY;
      ALTER TABLE "metrica_configuracao" DISABLE ROW LEVEL SECURITY;
      ALTER TABLE "metrica_valor" DISABLE ROW LEVEL SECURITY;
    `);
    
    // Remover tabelas em ordem reversa (para respeitar constraints)
    await queryRunner.query(`
      DROP TABLE IF EXISTS "metrica_valor";
      DROP TABLE IF EXISTS "metrica_configuracao";
      DROP TABLE IF EXISTS "metrica_definicao";
    `);
    
    // Remover tipos enumerados
    await queryRunner.query(`
      DROP TYPE IF EXISTS "tipo_agendamento_enum";
      DROP TYPE IF EXISTS "estrategia_amostragem_enum";
      DROP TYPE IF EXISTS "categoria_metrica_enum";
      DROP TYPE IF EXISTS "tipo_metrica_enum";
    `);
    
    console.log('Migration 1140000-CreateMetricasSchema revertida com sucesso.');
  }
}
