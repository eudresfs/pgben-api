import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration unificada para criar o schema relacionado às métricas
 *
 * Esta migration cria as tabelas e restrições para o módulo de métricas,
 * incluindo estruturas para monitoramento, alertas, registro de métricas do sistema,
 * definições de métricas, configurações e valores históricos.
 *
 * Os enums necessários são criados na migration CreateAllEnums
 *
 * @author Engenheiro de Dados
 * @date 19/05/2025
 */
export class CreateMetricasSchema1704067234000 implements MigrationInterface {
  name = 'CreateMetricasSchema1704067234000';

  /**
   * Cria as estruturas relacionadas às métricas
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Iniciando migration CreateMetricasSchema...');

    // Tabela de definições de métricas
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "metrica_definicao" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "codigo" character varying(100) NOT NULL,
        "nome" character varying(200) NOT NULL,
        "descricao" text,
        "tipo" "tipo_metrica_enum" NOT NULL DEFAULT 'gauge',
        "categoria" "categoria_metrica_enum" NOT NULL DEFAULT 'negocio',
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
    `);

    // Índices para metrica_definicao
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_metrica_definicao_codigo" ON "metrica_definicao" ("codigo");
      CREATE INDEX IF NOT EXISTS "IDX_metrica_definicao_tipo" ON "metrica_definicao" ("tipo");
      CREATE INDEX IF NOT EXISTS "IDX_metrica_definicao_categoria" ON "metrica_definicao" ("categoria");
      CREATE INDEX IF NOT EXISTS "IDX_metrica_definicao_ativa" ON "metrica_definicao" ("ativa");
      CREATE INDEX IF NOT EXISTS "IDX_metrica_definicao_tags" ON "metrica_definicao" USING GIN ("tags");
    `);

    // Trigger para metrica_definicao
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_metrica_definicao_update_timestamp ON "metrica_definicao";
      CREATE TRIGGER trigger_metrica_definicao_update_timestamp
        BEFORE UPDATE ON "metrica_definicao"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
    `);

    console.log('Tabela de definições de métricas criada com sucesso.');

    // Tabela de configuração de métricas
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "metrica_configuracao" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "metrica_id" uuid NOT NULL,
        "coleta_automatica" boolean NOT NULL DEFAULT true,
        "tipo_agendamento" "tipo_agendamento_enum" NOT NULL DEFAULT 'unico',
        "intervalo_segundos" integer DEFAULT 3600,
        "expressao_cron" character varying(100),
        "nome_evento" character varying(100),
        "max_snapshots" integer DEFAULT 1000,
        "periodo_retencao_dias" integer DEFAULT 365,
        "estrategia_amostragem" "estrategia_amostragem_enum" DEFAULT 'completa',
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
        CONSTRAINT "PK_metrica_configuracao" PRIMARY KEY ("id")
      );
    `);

    // Índices para metrica_configuracao
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_metrica_configuracao_metrica_id" ON "metrica_configuracao" ("metrica_id");
      CREATE INDEX IF NOT EXISTS "IDX_metrica_configuracao_coleta_automatica" ON "metrica_configuracao" ("coleta_automatica");
      CREATE INDEX IF NOT EXISTS "IDX_metrica_configuracao_tipo_agendamento" ON "metrica_configuracao" ("tipo_agendamento");
    `);

    // Trigger para metrica_configuracao
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_metrica_configuracao_update_timestamp ON "metrica_configuracao";
      CREATE TRIGGER trigger_metrica_configuracao_update_timestamp
        BEFORE UPDATE ON "metrica_configuracao"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
    `);

    console.log('Tabela de configuração de métricas criada com sucesso.');

    // Tabela de valores de métricas
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "metrica_valor" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "metrica_id" uuid NOT NULL,
        "timestamp" timestamp without time zone NOT NULL DEFAULT now(),
        "valor" numeric(20,5),
        "valor_texto" text,
        "valor_json" jsonb,
        "parametros_coleta" jsonb,
        "created_at" timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_metrica_valor" PRIMARY KEY ("id")
      );
    `);

    // Índices para metrica_valor
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_integrador_metrica_valor_metrica_id" ON "metrica_valor" ("metrica_id");
      CREATE INDEX IF NOT EXISTS "IDX_integrador_metrica_valor_timestamp" ON "metrica_valor" ("timestamp");
      CREATE INDEX IF NOT EXISTS "IDX_integrador_metrica_valor_metrica_timestamp" ON "metrica_valor" ("metrica_id", "timestamp");
    `);

    console.log('Tabela de valores de métricas criada com sucesso.');

    // Tabela de registros de métricas (legacy - para compatibilidade)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "registros_metricas" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "metrica_id" uuid NOT NULL,
        "valor" numeric(15,2) NOT NULL,
        "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "detalhes" jsonb,
        "ip_origem" character varying(45),
        "usuario_id" uuid,
        "endpoint" character varying(255),
        CONSTRAINT "PK_registros_metricas" PRIMARY KEY ("id")
      );
    `);

    // Índices para registros_metricas
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_registros_metricas_metrica_id" ON "registros_metricas" ("metrica_id");
      CREATE INDEX IF NOT EXISTS "IDX_registros_metricas_timestamp" ON "registros_metricas" ("timestamp");
      CREATE INDEX IF NOT EXISTS "IDX_registros_metricas_usuario_id" ON "registros_metricas" ("usuario_id");
      CREATE INDEX IF NOT EXISTS "IDX_registros_metricas_detalhes" ON "registros_metricas" USING GIN ("detalhes");
    `);

    console.log('Tabela de registros de métricas criada com sucesso.');

    // Tabela de regras de alerta
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "regras_alerta" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "nome" character varying(100) NOT NULL,
        "metrica_id" uuid NOT NULL,
        "nivel" "nivel_alerta_enum" NOT NULL,
        "operador" character varying(10) NOT NULL,
        "valor_limiar" numeric(15,2) NOT NULL,
        "mensagem_alerta" text NOT NULL,
        "canais_notificacao" jsonb,
        "ativo" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_regras_alerta" PRIMARY KEY ("id")
      );
    `);

    // Índices para regras_alerta
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_regras_alerta_metrica" ON "regras_alerta" ("metrica_id");
      CREATE INDEX IF NOT EXISTS "IDX_regras_alerta_nivel" ON "regras_alerta" ("nivel");
      CREATE INDEX IF NOT EXISTS "IDX_regras_alerta_ativo" ON "regras_alerta" ("ativo");
      CREATE INDEX IF NOT EXISTS "IDX_regras_alerta_canais" ON "regras_alerta" USING GIN ("canais_notificacao");
    `);

    // Trigger para regras_alerta
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_regras_alerta_update_timestamp ON "regras_alerta";
      CREATE TRIGGER trigger_regras_alerta_update_timestamp
        BEFORE UPDATE ON "regras_alerta"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
    `);

    console.log('Tabela de regras de alerta criada com sucesso.');

    // Tabela de alertas de métricas
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "alertas_metrica" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "metrica_id" uuid NOT NULL,
        "regra_id" uuid NOT NULL,
        "valor_detectado" numeric(15,2) NOT NULL,
        "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "mensagem" text NOT NULL,
        "resolvido" boolean NOT NULL DEFAULT false,
        "resolvido_por" uuid,
        "timestamp_resolucao" TIMESTAMP WITH TIME ZONE,
        "observacao_resolucao" text,
        "detalhes" jsonb,
        "notificacoes_enviadas" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_alertas_metrica" PRIMARY KEY ("id")
      );
    `);

    // Índices para alertas_metrica
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_alertas_metrica_id" ON "alertas_metrica" ("metrica_id");
      CREATE INDEX IF NOT EXISTS "IDX_alertas_regra_id" ON "alertas_metrica" ("regra_id");
      CREATE INDEX IF NOT EXISTS "IDX_alertas_timestamp" ON "alertas_metrica" ("timestamp");
      CREATE INDEX IF NOT EXISTS "IDX_alertas_resolvido" ON "alertas_metrica" ("resolvido");
      CREATE INDEX IF NOT EXISTS "IDX_alertas_detalhes" ON "alertas_metrica" USING GIN ("detalhes");
    `);

    // Trigger para alertas_metrica
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_alertas_metrica_update_timestamp ON "alertas_metrica";
      CREATE TRIGGER trigger_alertas_metrica_update_timestamp
        BEFORE UPDATE ON "alertas_metrica"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
    `);

    console.log('Tabela de alertas de métricas criada com sucesso.');

    // Tabela de configuração de notificação
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "configuracao_notificacao" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "usuario_id" uuid NOT NULL,
        "canal" "canal_notificacao_enum" NOT NULL,
        "configuracao" jsonb NOT NULL,
        "ativo" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_configuracao_notificacao" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_configuracao_notificacao_usuario_canal" UNIQUE ("usuario_id", "canal")
      );
    `);

    // Índices para configuracao_notificacao
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_configuracao_usuario" ON "configuracao_notificacao" ("usuario_id");
      CREATE INDEX IF NOT EXISTS "IDX_configuracao_canal" ON "configuracao_notificacao" ("canal");
      CREATE INDEX IF NOT EXISTS "IDX_configuracao_ativo" ON "configuracao_notificacao" ("ativo");
    `);

    // Trigger para configuracao_notificacao
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_configuracao_notificacao_update_timestamp ON "configuracao_notificacao";
      CREATE TRIGGER trigger_configuracao_notificacao_update_timestamp
        BEFORE UPDATE ON "configuracao_notificacao"
        FOR EACH ROW
        EXECUTE PROCEDURE update_timestamp();
    `);

    console.log('Tabela de configuração de notificação criada com sucesso.');

    // Tabela de snapshot de métricas
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "metrica_snapshot" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "metrica_id" uuid NOT NULL,
        "valor" numeric(15,2) NOT NULL,
        "periodo" character varying(20) NOT NULL,
        "data_inicio" TIMESTAMP WITH TIME ZONE NOT NULL,
        "data_fim" TIMESTAMP WITH TIME ZONE NOT NULL,
        "metadados" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_metrica_snapshot" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_metrica_snapshot_periodo" UNIQUE ("metrica_id", "periodo", "data_inicio")
      );
    `);

    // Índices para metrica_snapshot
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_snapshot_metrica" ON "metrica_snapshot" ("metrica_id");
      CREATE INDEX IF NOT EXISTS "IDX_snapshot_periodo" ON "metrica_snapshot" ("periodo");
      CREATE INDEX IF NOT EXISTS "IDX_snapshot_data" ON "metrica_snapshot" ("data_inicio", "data_fim");
    `);

    console.log('Tabela de snapshot de métricas criada com sucesso.');

    // Adicionar as chaves estrangeiras
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_metrica_configuracao_metrica'
        ) THEN
          ALTER TABLE "metrica_configuracao" ADD CONSTRAINT "FK_metrica_configuracao_metrica"
          FOREIGN KEY ("metrica_id") REFERENCES "metrica_definicao" ("id") ON DELETE CASCADE;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_metrica_valor_metrica'
        ) THEN
          ALTER TABLE "metrica_valor" ADD CONSTRAINT "FK_metrica_valor_metrica"
          FOREIGN KEY ("metrica_id") REFERENCES "metrica_definicao" ("id") ON DELETE CASCADE;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_registros_metrica'
        ) THEN
          ALTER TABLE "registros_metricas" ADD CONSTRAINT "FK_registros_metrica"
          FOREIGN KEY ("metrica_id") REFERENCES "metrica_definicao" ("id") ON DELETE CASCADE;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_registros_usuario'
        ) THEN
          ALTER TABLE "registros_metricas" ADD CONSTRAINT "FK_registros_usuario"
          FOREIGN KEY ("usuario_id") REFERENCES "usuario" ("id") ON DELETE SET NULL;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_regras_metrica'
        ) THEN
          ALTER TABLE "regras_alerta" ADD CONSTRAINT "FK_regras_metrica"
          FOREIGN KEY ("metrica_id") REFERENCES "metrica_definicao" ("id") ON DELETE CASCADE;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_alertas_metrica'
        ) THEN
          ALTER TABLE "alertas_metrica" ADD CONSTRAINT "FK_alertas_metrica"
          FOREIGN KEY ("metrica_id") REFERENCES "metrica_definicao" ("id") ON DELETE CASCADE;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_alertas_regra'
        ) THEN
          ALTER TABLE "alertas_metrica" ADD CONSTRAINT "FK_alertas_regra"
          FOREIGN KEY ("regra_id") REFERENCES "regras_alerta" ("id") ON DELETE CASCADE;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_alertas_usuario'
        ) THEN
          ALTER TABLE "alertas_metrica" ADD CONSTRAINT "FK_alertas_usuario"
          FOREIGN KEY ("resolvido_por") REFERENCES "usuario" ("id") ON DELETE SET NULL;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_configuracao_usuario'
        ) THEN
          ALTER TABLE "configuracao_notificacao" ADD CONSTRAINT "FK_configuracao_usuario"
          FOREIGN KEY ("usuario_id") REFERENCES "usuario" ("id") ON DELETE CASCADE;
        END IF;
      END $$;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'FK_snapshot_metrica'
        ) THEN
          ALTER TABLE "metrica_snapshot" ADD CONSTRAINT "FK_snapshot_metrica"
          FOREIGN KEY ("metrica_id") REFERENCES "metrica_definicao" ("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    console.log('Migration CreateMetricasSchema executada com sucesso.');
  }

  /**
   * Reverte todas as alterações realizadas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Revertendo migration CreateMetricasSchema...');

    // Remover chaves estrangeiras
    await queryRunner.query(`
      ALTER TABLE "metrica_configuracao" DROP CONSTRAINT IF EXISTS "FK_metrica_configuracao_metrica";
      ALTER TABLE "metrica_valor" DROP CONSTRAINT IF EXISTS "FK_metrica_valor_metrica";
      ALTER TABLE "registros_metricas" DROP CONSTRAINT IF EXISTS "FK_registros_metrica";
      ALTER TABLE "registros_metricas" DROP CONSTRAINT IF EXISTS "FK_registros_usuario";
      ALTER TABLE "regras_alerta" DROP CONSTRAINT IF EXISTS "FK_regras_metrica";
      ALTER TABLE "alertas_metrica" DROP CONSTRAINT IF EXISTS "FK_alertas_metrica";
      ALTER TABLE "alertas_metrica" DROP CONSTRAINT IF EXISTS "FK_alertas_regra";
      ALTER TABLE "alertas_metrica" DROP CONSTRAINT IF EXISTS "FK_alertas_usuario";
      ALTER TABLE "configuracao_notificacao" DROP CONSTRAINT IF EXISTS "FK_configuracao_usuario";
      ALTER TABLE "metrica_snapshot" DROP CONSTRAINT IF EXISTS "FK_snapshot_metrica";
    `);

    // Remover triggers de atualização automática de timestamp
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_metrica_definicao_update_timestamp ON "metrica_definicao";
      DROP TRIGGER IF EXISTS trigger_metrica_configuracao_update_timestamp ON "metrica_configuracao";
      DROP TRIGGER IF EXISTS trigger_regras_alerta_update_timestamp ON "regras_alerta";
      DROP TRIGGER IF EXISTS trigger_alertas_metrica_update_timestamp ON "alertas_metrica";
      DROP TRIGGER IF EXISTS trigger_configuracao_notificacao_update_timestamp ON "configuracao_notificacao";
    `);

    // Remover tabelas em ordem reversa (para respeitar constraints)
    await queryRunner.query(`
      DROP TABLE IF EXISTS "metrica_snapshot";
      DROP TABLE IF EXISTS "configuracao_notificacao";
      DROP TABLE IF EXISTS "alertas_metrica";
      DROP TABLE IF EXISTS "regras_alerta";
      DROP TABLE IF EXISTS "registros_metricas";
      DROP TABLE IF EXISTS "metrica_valor";
      DROP TABLE IF EXISTS "metrica_configuracao";
      DROP TABLE IF EXISTS "metrica_definicao";
    `);

    console.log('Migration CreateMetricasSchema revertida com sucesso.');
  }
}
