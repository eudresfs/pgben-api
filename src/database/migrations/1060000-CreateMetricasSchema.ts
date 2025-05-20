import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para criar o schema relacionado às métricas
 * 
 * Esta migration cria as tabelas, enumerações e restrições para o módulo de métricas,
 * incluindo estruturas para monitoramento, alertas e registro de métricas do sistema.
 * 
 * @author Engenheiro de Dados
 * @date 19/05/2025
 */
export class CreateMetricasSchema1685468879187 implements MigrationInterface {
  name = 'CreateMetricasSchema1685468879187';

  /**
   * Cria as estruturas relacionadas às métricas
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Iniciando migration 1060000-CreateMetricasSchema...');
    
    // Criação dos tipos enumerados
    await queryRunner.query(`
      CREATE TYPE "tipo_metrica_enum" AS ENUM (
        'seguranca',
        'lgpd',
        'documento',
        'sistema',
        'banco_dados',
        'http'
      );
      
      CREATE TYPE "categoria_metrica_enum" AS ENUM (
        'contagem',
        'duracao',
        'tamanho',
        'percentual',
        'estado',
        'erro'
      );
      
      CREATE TYPE "nivel_alerta_enum" AS ENUM (
        'info',
        'aviso',
        'erro',
        'critico'
      );
      
      CREATE TYPE "canal_notificacao_enum" AS ENUM (
        'email',
        'sms',
        'sistema',
        'webhook'
      );
    `);
    
    console.log('Tipos enumerados criados com sucesso.');
    
    // Tabela principal de métricas
    await queryRunner.query(`
      CREATE TABLE "metricas" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "nome" character varying(100) NOT NULL,
        "tipo" "tipo_metrica_enum" NOT NULL,
        "categoria" "categoria_metrica_enum" NOT NULL,
        "descricao" text,
        "ativo" boolean NOT NULL DEFAULT true,
        "unidade_medida" character varying(50),
        "limiar_alerta" numeric(15,2),
        "limiar_critico" numeric(15,2),
        "tags" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "removed_at" TIMESTAMP,
        CONSTRAINT "PK_metricas" PRIMARY KEY ("id")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX "IDX_metricas_nome" ON "metricas" ("nome");
      CREATE INDEX "IDX_metricas_tipo" ON "metricas" ("tipo");
      CREATE INDEX "IDX_metricas_categoria" ON "metricas" ("categoria");
      CREATE INDEX "IDX_metricas_ativo" ON "metricas" ("ativo");
      CREATE INDEX "IDX_metricas_tags" ON "metricas" USING GIN ("tags");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_metricas_update_timestamp
      BEFORE UPDATE ON "metricas"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
    `);
    
    console.log('Tabela de métricas criada com sucesso.');
    
    // Tabela de registros de métricas
    await queryRunner.query(`
      CREATE TABLE "registros_metricas" (
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
      
      -- Índices para otimização de consultas
      CREATE INDEX "idx_registros_metricas_metrica_id" ON "registros_metricas" ("metrica_id");
      CREATE INDEX "idx_registros_metricas_timestamp" ON "registros_metricas" ("timestamp");
      CREATE INDEX "idx_registros_metricas_usuario_id" ON "registros_metricas" ("usuario_id");
      CREATE INDEX "idx_registros_metricas_detalhes" ON "registros_metricas" USING GIN ("detalhes");
    `);
    
    console.log('Tabela de registros de métricas criada com sucesso.');
    
    // Tabela de regras de alerta
    await queryRunner.query(`
      CREATE TABLE "regras_alerta" (
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
      
      -- Índices para otimização de consultas
      CREATE INDEX "idx_regras_alerta_metrica" ON "regras_alerta" ("metrica_id");
      CREATE INDEX "idx_regras_alerta_nivel" ON "regras_alerta" ("nivel");
      CREATE INDEX "idx_regras_alerta_ativo" ON "regras_alerta" ("ativo");
      CREATE INDEX "idx_regras_alerta_canais" ON "regras_alerta" USING GIN ("canais_notificacao");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_regras_alerta_update_timestamp
      BEFORE UPDATE ON "regras_alerta"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
    `);
    
    console.log('Tabela de regras de alerta criada com sucesso.');
    
    // Tabela de alertas de métricas
    await queryRunner.query(`
      CREATE TABLE "alertas_metrica" (
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
      
      -- Índices para otimização de consultas
      CREATE INDEX "IDX_alertas_metrica_id" ON "alertas_metrica" ("metrica_id");
      CREATE INDEX "IDX_alertas_regra_id" ON "alertas_metrica" ("regra_id");
      CREATE INDEX "IDX_alertas_timestamp" ON "alertas_metrica" ("timestamp");
      CREATE INDEX "IDX_alertas_resolvido" ON "alertas_metrica" ("resolvido");
      CREATE INDEX "IDX_alertas_detalhes" ON "alertas_metrica" USING GIN ("detalhes");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_alertas_metrica_update_timestamp
      BEFORE UPDATE ON "alertas_metrica"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
    `);
    
    console.log('Tabela de alertas de métricas criada com sucesso.');
    
    // Tabela de configuração de notificação
    await queryRunner.query(`
      CREATE TABLE "configuracao_notificacao" (
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
      
      -- Índices para otimização de consultas
      CREATE INDEX "IDX_configuracao_usuario" ON "configuracao_notificacao" ("usuario_id");
      CREATE INDEX "IDX_configuracao_canal" ON "configuracao_notificacao" ("canal");
      CREATE INDEX "IDX_configuracao_ativo" ON "configuracao_notificacao" ("ativo");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_configuracao_notificacao_update_timestamp
      BEFORE UPDATE ON "configuracao_notificacao"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
    `);
    
    console.log('Tabela de configuração de notificação criada com sucesso.');
    
    // Tabela de snapshot de métricas
    await queryRunner.query(`
      CREATE TABLE "metrica_snapshot" (
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
      
      -- Índices para otimização de consultas
      CREATE INDEX "IDX_snapshot_metrica" ON "metrica_snapshot" ("metrica_id");
      CREATE INDEX "IDX_snapshot_periodo" ON "metrica_snapshot" ("periodo");
      CREATE INDEX "IDX_snapshot_data" ON "metrica_snapshot" ("data_inicio", "data_fim");
    `);
    
    console.log('Tabela de snapshot de métricas criada com sucesso.');
    
    // Adicionar as chaves estrangeiras
    await queryRunner.query(`
      ALTER TABLE "registros_metricas" ADD CONSTRAINT "FK_registros_metrica"
      FOREIGN KEY ("metrica_id") REFERENCES "metricas" ("id") ON DELETE CASCADE;
      
      ALTER TABLE "registros_metricas" ADD CONSTRAINT "FK_registros_usuario"
      FOREIGN KEY ("usuario_id") REFERENCES "usuario" ("id") ON DELETE SET NULL;
      
      ALTER TABLE "regras_alerta" ADD CONSTRAINT "FK_regras_metrica"
      FOREIGN KEY ("metrica_id") REFERENCES "metricas" ("id") ON DELETE CASCADE;
      
      ALTER TABLE "alertas_metrica" ADD CONSTRAINT "FK_alertas_metrica"
      FOREIGN KEY ("metrica_id") REFERENCES "metricas" ("id") ON DELETE CASCADE;
      
      ALTER TABLE "alertas_metrica" ADD CONSTRAINT "FK_alertas_regra"
      FOREIGN KEY ("regra_id") REFERENCES "regras_alerta" ("id") ON DELETE CASCADE;
      
      ALTER TABLE "alertas_metrica" ADD CONSTRAINT "FK_alertas_usuario"
      FOREIGN KEY ("resolvido_por") REFERENCES "usuario" ("id") ON DELETE SET NULL;
      
      ALTER TABLE "configuracao_notificacao" ADD CONSTRAINT "FK_configuracao_usuario"
      FOREIGN KEY ("usuario_id") REFERENCES "usuario" ("id") ON DELETE CASCADE;
      
      ALTER TABLE "metrica_snapshot" ADD CONSTRAINT "FK_snapshot_metrica"
      FOREIGN KEY ("metrica_id") REFERENCES "metricas" ("id") ON DELETE CASCADE;
    `);
    
    // Adicionar políticas RLS (Row-Level Security)
    await queryRunner.query(`
      ALTER TABLE "metricas" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "registros_metricas" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "regras_alerta" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "alertas_metrica" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "configuracao_notificacao" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "metrica_snapshot" ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY metricas_policy ON "metricas" 
        USING (TRUE) 
        WITH CHECK (TRUE);
      
      CREATE POLICY registros_metricas_policy ON "registros_metricas" 
        USING (TRUE) 
        WITH CHECK (TRUE);
      
      CREATE POLICY regras_alerta_policy ON "regras_alerta" 
        USING (TRUE) 
        WITH CHECK (TRUE);
      
      CREATE POLICY alertas_metrica_policy ON "alertas_metrica" 
        USING (TRUE) 
        WITH CHECK (TRUE);
      
      CREATE POLICY configuracao_notificacao_policy ON "configuracao_notificacao" 
        USING (TRUE) 
        WITH CHECK (TRUE);
      
      CREATE POLICY metrica_snapshot_policy ON "metrica_snapshot" 
        USING (TRUE) 
        WITH CHECK (TRUE);
    `);
    
    // Criar log de auditoria para tabelas importantes
    // Nota: A função create_audit_log_trigger foi definida na migration base
    // Isso fica comentado até termos certeza que a função existe
    /*
    await queryRunner.query(`
      SELECT create_audit_log_trigger('metricas');
      SELECT create_audit_log_trigger('regras_alerta');
      SELECT create_audit_log_trigger('alertas_metrica');
      SELECT create_audit_log_trigger('configuracao_notificacao');
    `);
    */
    
    console.log('Migration 1060000-CreateMetricasSchema executada com sucesso.');
  }

  /**
   * Reverte todas as alterações realizadas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Revertendo migration 1060000-CreateMetricasSchema...');
    
    // Remover políticas RLS
    await queryRunner.query(`
      DROP POLICY IF EXISTS metricas_policy ON "metricas";
      DROP POLICY IF EXISTS registros_metricas_policy ON "registros_metricas";
      DROP POLICY IF EXISTS regras_alerta_policy ON "regras_alerta";
      DROP POLICY IF EXISTS alertas_metrica_policy ON "alertas_metrica";
      DROP POLICY IF EXISTS configuracao_notificacao_policy ON "configuracao_notificacao";
      DROP POLICY IF EXISTS metrica_snapshot_policy ON "metrica_snapshot";
    `);
    
    // Remover chaves estrangeiras
    await queryRunner.query(`
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
      DROP TRIGGER IF EXISTS trigger_metricas_update_timestamp ON "metricas";
      DROP TRIGGER IF EXISTS trigger_regras_alerta_update_timestamp ON "regras_alerta";
      DROP TRIGGER IF EXISTS trigger_alertas_metrica_update_timestamp ON "alertas_metrica";
      DROP TRIGGER IF EXISTS trigger_configuracao_notificacao_update_timestamp ON "configuracao_notificacao";
    `);
    
    // Remover tabelas
    await queryRunner.query(`
      DROP TABLE IF EXISTS "metrica_snapshot";
      DROP TABLE IF EXISTS "configuracao_notificacao";
      DROP TABLE IF EXISTS "alertas_metrica";
      DROP TABLE IF EXISTS "regras_alerta";
      DROP TABLE IF EXISTS "registros_metricas";
      DROP TABLE IF EXISTS "metricas";
    `);
    
    // Remover tipos enumerados
    await queryRunner.query(`
      DROP TYPE IF EXISTS "canal_notificacao_enum";
      DROP TYPE IF EXISTS "nivel_alerta_enum";
      DROP TYPE IF EXISTS "categoria_metrica_enum";
      DROP TYPE IF EXISTS "tipo_metrica_enum";
    `);
    
    console.log('Migration 1060000-CreateMetricasSchema revertida com sucesso.');
  }
}
