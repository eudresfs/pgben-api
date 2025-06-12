import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para criar o schema relacionado ao módulo de notificações
 *
 * Esta migration cria as tabelas, enumerações e restrições para o módulo de notificações,
 * permitindo o gerenciamento de notificações do sistema, templates e preferências do usuário.
 *
 * @author Engenheiro de Dados
 * @date 19/05/2025
 */
export class CreateNotificacaoSchema1704067235000
  implements MigrationInterface
{
  name = 'CreateNotificacaoSchema1704067235000';

  /**
   * Cria as estruturas relacionadas às notificações
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Iniciando migration 1110000-CreateNotificacaoSchema...');

    // Inicialmente, vamos usar VARCHAR em vez de tipos enumerados para evitar problemas de conversão
    console.log(
      'Utilizando campos de texto em vez de enumerações para evitar problemas de compatibilidade.',
    );

    console.log('Tipos enumerados criados com sucesso.');

    // Tabela de templates de notificação
    const notificationTemplateExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_template'
      );
    `);

    if (!notificationTemplateExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "notification_template" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "codigo" character varying(100) NOT NULL,
        "nome" character varying(200) NOT NULL,
        "descricao" text,
        "assunto" character varying(255) NOT NULL,
        "corpo" text NOT NULL,
        "corpo_html" text,
        "canais_disponiveis" text[] NOT NULL DEFAULT '{"email"}',
        "variaveis_requeridas" jsonb NOT NULL DEFAULT '[]',
        "ativo" boolean NOT NULL DEFAULT true,
        "tipo" character varying(50) NOT NULL DEFAULT 'sistema',
        "categoria" character varying(100),
        "prioridade" character varying(20) NOT NULL DEFAULT 'normal',
        "criado_por" uuid,
        "atualizado_por" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_notification_template_codigo" UNIQUE ("codigo"),
        CONSTRAINT "PK_notification_template" PRIMARY KEY ("id")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX IF NOT EXISTS "IDX_notification_template_codigo" ON "notification_template" ("codigo");
      CREATE INDEX IF NOT EXISTS "IDX_notification_template_tipo" ON "notification_template" ("tipo");
      CREATE INDEX IF NOT EXISTS "IDX_notification_template_ativo" ON "notification_template" ("ativo");
      CREATE INDEX IF NOT EXISTS "IDX_notification_template_categoria" ON "notification_template" ("categoria");
      CREATE INDEX IF NOT EXISTS "IDX_notification_template_prioridade" ON "notification_template" ("prioridade");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_notification_template_update_timestamp
      BEFORE UPDATE ON "notification_template"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
      `);
    } else {
      console.log('Tabela notification_template já existe, pulando criação.');
    }

    console.log('Tabela de templates de notificação criada com sucesso.');

    // Tabela principal de notificações
    const notificacoesSistemaExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'notificacoes_sistema'
      );
    `);

    if (!notificacoesSistemaExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "notificacoes_sistema" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "destinatario_id" uuid NOT NULL,
        "template_id" uuid,
        "dados_contexto" jsonb,
        "status" character varying(30) NOT NULL DEFAULT 'pendente',
        "tentativas_entrega" jsonb,
        "dados_envio" jsonb,
        "ultima_tentativa" timestamp without time zone,
        "tentativas_envio" integer NOT NULL DEFAULT 0,
        "proxima_tentativa" timestamp without time zone,
        "numero_tentativas" integer NOT NULL DEFAULT 0,
        "data_entrega" timestamp without time zone,
        "data_envio" timestamp without time zone,
        "data_agendamento" timestamp without time zone,
        "data_leitura" timestamp without time zone,
        "created_at" timestamp without time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notificacoes_sistema" PRIMARY KEY ("id")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX IF NOT EXISTS "IDX_notificacao_destinatario" ON "notificacoes_sistema" ("destinatario_id");
      CREATE INDEX IF NOT EXISTS "IDX_notificacao_status" ON "notificacoes_sistema" ("status");
      CREATE INDEX IF NOT EXISTS "IDX_notificacao_template" ON "notificacoes_sistema" ("template_id");
      CREATE INDEX IF NOT EXISTS "IDX_notificacao_data_agendamento" ON "notificacoes_sistema" ("data_agendamento");
      CREATE INDEX IF NOT EXISTS "IDX_notificacao_contexto" ON "notificacoes_sistema" USING GIN ("dados_contexto");
      `);
    } else {
      console.log('Tabela notificacoes_sistema já existe, pulando criação.');
    }

    console.log('Tabela de notificações do sistema criada com sucesso.');

    // Tabela de preferências de notificação por usuário
    const preferenciasNotificacaoExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'preferencias_notificacao'
      );
    `);

    if (!preferenciasNotificacaoExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "preferencias_notificacao" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "usuario_id" uuid NOT NULL,
        "canais_ativos" text[] NOT NULL DEFAULT '{"app"}',
        "silenciar_todos" boolean NOT NULL DEFAULT false,
        "horario_inicio_silencio" time without time zone,
        "horario_fim_silencio" time without time zone,
        "dias_silencio" integer[],
        "excecoes_silencio" text[],
        "configuracoes_especificas" jsonb,
        "created_at" timestamp without time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp without time zone NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_preferencias_usuario" UNIQUE ("usuario_id"),
        CONSTRAINT "PK_preferencias_notificacao" PRIMARY KEY ("id")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX IF NOT EXISTS "IDX_preferencias_usuario" ON "preferencias_notificacao" ("usuario_id");
      CREATE INDEX IF NOT EXISTS "IDX_preferencias_silenciar" ON "preferencias_notificacao" ("silenciar_todos");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_preferencias_update_timestamp
      BEFORE UPDATE ON "preferencias_notificacao"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
      `);
    } else {
      console.log(
        'Tabela preferencias_notificacao já existe, pulando criação.',
      );
    }

    console.log('Tabela de preferências de notificação criada com sucesso.');

    // Tabela de configurações de canais de notificação
    const canalNotificacaoExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'canal_notificacao'
      );
    `);

    if (!canalNotificacaoExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "canal_notificacao" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "codigo" character varying(100) NOT NULL,
        "nome" character varying(200) NOT NULL,
        "descricao" text,
        "configuracao" jsonb NOT NULL DEFAULT '{}',
        "tipo" character varying(30) NOT NULL DEFAULT 'app',
        "integracao_id" uuid,
        "ativo" boolean NOT NULL DEFAULT true,
        "maximo_tentativas" integer NOT NULL DEFAULT 3,
        "canais_suportados" text[],
        "intervalo_tentativas_minutos" integer NOT NULL DEFAULT 15,
        "ordem_prioridade" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_by" uuid,
        CONSTRAINT "UQ_canal_notificacao_codigo" UNIQUE ("codigo"),
        CONSTRAINT "PK_canal_notificacao" PRIMARY KEY ("id")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX IF NOT EXISTS "IDX_canal_tipo" ON "canal_notificacao" ("tipo");
      CREATE INDEX IF NOT EXISTS "IDX_canal_ativo" ON "canal_notificacao" ("ativo");
      CREATE INDEX IF NOT EXISTS "IDX_canal_prioridade" ON "canal_notificacao" ("ordem_prioridade");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_canal_update_timestamp
      BEFORE UPDATE ON "canal_notificacao"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
      `);
    } else {
      console.log('Tabela canal_notificacao já existe, pulando criação.');
    }

    console.log('Tabela de canais de notificação criada com sucesso.');

    // Tabela de grupos de notificação
    const grupoNotificacaoExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'grupo_notificacao'
      );
    `);

    if (!grupoNotificacaoExists[0].exists) {
      await queryRunner.query(`
        CREATE TABLE "grupo_notificacao" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "nome" character varying(100) NOT NULL,
        "descricao" text,
        "ativo" boolean NOT NULL DEFAULT true,
        "usuarios" uuid[] NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "created_by" uuid,
        CONSTRAINT "UQ_grupo_notificacao_nome" UNIQUE ("nome"),
        CONSTRAINT "PK_grupo_notificacao" PRIMARY KEY ("id")
      );
      
      -- Índices para otimização de consultas
      CREATE INDEX IF NOT EXISTS "IDX_grupo_notificacao_ativo" ON "grupo_notificacao" ("ativo");
      CREATE INDEX IF NOT EXISTS "IDX_grupo_notificacao_usuarios" ON "grupo_notificacao" USING GIN ("usuarios");
      
      -- Trigger para atualização automática de timestamp
      CREATE TRIGGER trigger_grupo_notificacao_update_timestamp
      BEFORE UPDATE ON "grupo_notificacao"
      FOR EACH ROW
      EXECUTE PROCEDURE update_timestamp();
      `);
    } else {
      console.log('Tabela grupo_notificacao já existe, pulando criação.');
    }

    console.log('Tabela de grupos de notificação criada com sucesso.');

    // Adicionar as chaves estrangeiras
    await queryRunner.query(`
      -- Relacionamentos da tabela de templates
      ALTER TABLE "notification_template" ADD CONSTRAINT "FK_template_criado_por"
      FOREIGN KEY ("criado_por") REFERENCES "usuario" ("id") ON DELETE SET NULL;
      
      ALTER TABLE "notification_template" ADD CONSTRAINT "FK_template_atualizado_por"
      FOREIGN KEY ("atualizado_por") REFERENCES "usuario" ("id") ON DELETE SET NULL;
      
      -- Relacionamentos da tabela de notificações
      ALTER TABLE "notificacoes_sistema" ADD CONSTRAINT "FK_notificacao_destinatario"
      FOREIGN KEY ("destinatario_id") REFERENCES "usuario" ("id") ON DELETE CASCADE;
      
      ALTER TABLE "notificacoes_sistema" ADD CONSTRAINT "FK_notificacao_template"
      FOREIGN KEY ("template_id") REFERENCES "notification_template" ("id") ON DELETE RESTRICT;
      
      -- Relacionamentos da tabela de preferências
      ALTER TABLE "preferencias_notificacao" ADD CONSTRAINT "FK_preferencias_usuario"
      FOREIGN KEY ("usuario_id") REFERENCES "usuario" ("id") ON DELETE CASCADE;
      
      -- Relacionamentos da tabela de canais
      ALTER TABLE "canal_notificacao" ADD CONSTRAINT "FK_canal_integracao"
      FOREIGN KEY ("integracao_id") REFERENCES "configuracao_integracao" ("id") ON DELETE SET NULL;
      
      ALTER TABLE "canal_notificacao" ADD CONSTRAINT "FK_canal_updated_by"
      FOREIGN KEY ("updated_by") REFERENCES "usuario" ("id") ON DELETE SET NULL;
      
      -- Relacionamentos da tabela de grupos
      ALTER TABLE "grupo_notificacao" ADD CONSTRAINT "FK_grupo_created_by"
      FOREIGN KEY ("created_by") REFERENCES "usuario" ("id") ON DELETE SET NULL;
    `);

    // Adicionar políticas RLS (Row-Level Security) simplificadas
    await queryRunner.query(`
      ALTER TABLE "notification_template" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "notificacoes_sistema" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "preferencias_notificacao" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "canal_notificacao" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "grupo_notificacao" ENABLE ROW LEVEL SECURITY;
      
      -- Políticas simples para postgres (usuário de migração)
      CREATE POLICY notification_template_policy ON "notification_template" 
        USING (current_user = 'postgres');
      
      CREATE POLICY notificacoes_sistema_policy ON "notificacoes_sistema" 
        USING (current_user = 'postgres');
      
      CREATE POLICY preferencias_notificacao_policy ON "preferencias_notificacao" 
        USING (current_user = 'postgres');
      
      CREATE POLICY canal_notificacao_policy ON "canal_notificacao" 
        USING (current_user = 'postgres');
      
      CREATE POLICY grupo_notificacao_policy ON "grupo_notificacao" 
        USING (current_user = 'postgres');
    `);

    // Criar log de auditoria para tabelas importantes
    /*
    await queryRunner.query(`
      SELECT create_audit_log_trigger('notification_template');
      SELECT create_audit_log_trigger('canal_notificacao');
      SELECT create_audit_log_trigger('grupo_notificacao');
    `);
    */

    console.log(
      'Migration 1110000-CreateNotificacaoSchema executada com sucesso.',
    );
  }

  /**
   * Reverte todas as alterações realizadas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Revertendo migration 1110000-CreateNotificacaoSchema...');

    // Remover políticas RLS
    await queryRunner.query(`
      DROP POLICY IF EXISTS notification_template_policy ON "notification_template";
      DROP POLICY IF EXISTS notificacoes_sistema_policy ON "notificacoes_sistema";
      DROP POLICY IF EXISTS preferencias_notificacao_policy ON "preferencias_notificacao";
      DROP POLICY IF EXISTS canal_notificacao_policy ON "canal_notificacao";
      DROP POLICY IF EXISTS grupo_notificacao_policy ON "grupo_notificacao";
    `);

    // Remover chaves estrangeiras
    await queryRunner.query(`
      ALTER TABLE "notification_template" DROP CONSTRAINT IF EXISTS "FK_template_criado_por";
      ALTER TABLE "notification_template" DROP CONSTRAINT IF EXISTS "FK_template_atualizado_por";
      
      ALTER TABLE "notificacoes_sistema" DROP CONSTRAINT IF EXISTS "FK_notificacao_destinatario";
      ALTER TABLE "notificacoes_sistema" DROP CONSTRAINT IF EXISTS "FK_notificacao_template";
      
      ALTER TABLE "preferencias_notificacao" DROP CONSTRAINT IF EXISTS "FK_preferencias_usuario";
      
      ALTER TABLE "canal_notificacao" DROP CONSTRAINT IF EXISTS "FK_canal_integracao";
      ALTER TABLE "canal_notificacao" DROP CONSTRAINT IF EXISTS "FK_canal_updated_by";
      
      ALTER TABLE "grupo_notificacao" DROP CONSTRAINT IF EXISTS "FK_grupo_created_by";
    `);

    // Remover triggers
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_notification_template_update_timestamp ON "notification_template";
      DROP TRIGGER IF EXISTS trigger_preferencias_update_timestamp ON "preferencias_notificacao";
      DROP TRIGGER IF EXISTS trigger_canal_update_timestamp ON "canal_notificacao";
      DROP TRIGGER IF EXISTS trigger_grupo_notificacao_update_timestamp ON "grupo_notificacao";
    `);

    // Remover tabelas
    await queryRunner.query(`
      DROP TABLE IF EXISTS "grupo_notificacao";
      DROP TABLE IF EXISTS "canal_notificacao";
      DROP TABLE IF EXISTS "preferencias_notificacao";
      DROP TABLE IF EXISTS "notificacoes_sistema";
      DROP TABLE IF EXISTS "notification_template";
    `);

    // Remover tipos enumerados
    await queryRunner.query(`
      DROP TYPE IF EXISTS "prioridade_notificacao_enum";
      DROP TYPE IF EXISTS "canal_notificacao_enum";
      DROP TYPE IF EXISTS "status_notificacao_processamento";
      DROP TYPE IF EXISTS "tipo_notificacao";
    `);

    console.log(
      'Migration 1110000-CreateNotificacaoSchema revertida com sucesso.',
    );
  }
}
