import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSistemaAprovacaoSchema1751100000000 implements MigrationInterface {
  name = 'CreateSistemaAprovacaoSchema1751100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar enums necessários (apenas se não existirem)
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."tipo_acao_critica_enum" AS ENUM(
          'cancelar_solicitacao',
          'suspender_solicitacao', 
          'reativar_solicitacao',
          'suspender_beneficio',
          'bloquear_beneficio',
          'desbloquear_beneficio',
          'liberar_beneficio',
          'cancelar_beneficio',
          'inativar_cidadao',
          'reativar_cidadao',
          'excluir_cidadao',
          'inativar_usuario',
          'reativar_usuario',
          'alterar_permissoes',
          'excluir_documento',
          'substituir_documento',
          'alterar_configuracao_critica'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."status_solicitacao_aprovacao_enum" AS ENUM(
           'pendente',
           'em_analise',
           'aprovada',
           'rejeitada',
           'expirada',
           'cancelada'
         );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."estrategia_aprovacao_enum" AS ENUM(
           'qualquer_um',
           'maioria',
           'unanime'
         );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."acao_aprovacao_enum" AS ENUM(
           'aprovar',
           'rejeitar'
         );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."tipo_escopo_enum" AS ENUM(
           'global',
           'unidade',
           'setor'
         );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Criar tabela acoes_criticas
    await queryRunner.query(`
      CREATE TABLE "acoes_criticas" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "codigo" character varying(100) NOT NULL,
        "nome" character varying(255) NOT NULL,
        "descricao" text,
        "modulo" character varying(100) NOT NULL,
        "entidade_alvo" character varying(100) NOT NULL,
        "requer_aprovacao" boolean NOT NULL DEFAULT true,
        "nivel_criticidade" integer NOT NULL DEFAULT 1,
        "tags" text array,
        "ativo" boolean NOT NULL DEFAULT true,
        "metadados" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_acoes_criticas" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_acoes_criticas_codigo" UNIQUE ("codigo")
      )
    `);

    // Criar tabela configuracoes_aprovacao
    await queryRunner.query(`
      CREATE TABLE "configuracoes_aprovacao" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "acao_critica_id" uuid NOT NULL,
        "estrategia_aprovacao" "public"."estrategia_aprovacao_enum" NOT NULL DEFAULT 'qualquer_um',
        "min_aprovacoes" integer NOT NULL DEFAULT 1,
        "max_rejeicoes" integer NOT NULL DEFAULT 1,
        "tempo_limite_horas" integer NOT NULL DEFAULT 24,
        "permite_auto_aprovacao" boolean NOT NULL DEFAULT false,
        "condicoes_auto_aprovacao" jsonb,
        "escalacao_ativa" boolean NOT NULL DEFAULT true,
        "tempo_escalacao_horas" integer NOT NULL DEFAULT 48,
        "configuracao_escalacao" jsonb,
        "notificacao_ativa" boolean NOT NULL DEFAULT true,
        "configuracao_notificacao" jsonb,
        "ativa" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_configuracoes_aprovacao" PRIMARY KEY ("id")
      )
    `);

    // Criar tabela aprovador
    await queryRunner.query(`
      CREATE TABLE "aprovador" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "configuracao_aprovacao_id" uuid NOT NULL,
        "usuario_id" uuid,
        "role_aprovador" character varying(50),
        "permissao_aprovador" character varying(100),
        "escopo_aprovacao" "public"."tipo_escopo_enum" NOT NULL DEFAULT 'global',
        "escopo_id" uuid,
        "ordem_hierarquica" integer NOT NULL DEFAULT 1,
        "valor_limite_aprovacao" decimal(15,2),
        "ativo" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_aprovador" PRIMARY KEY ("id")
      )
    `);

    // Criar tabela solicitacoes_aprovacao
    await queryRunner.query(`
      CREATE TABLE "solicitacoes_aprovacao" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "acao_critica_id" uuid NOT NULL,
        "usuario_solicitante_id" uuid NOT NULL,
        "perfil_solicitante" character varying(50),
        "unidade_solicitante" character varying(100),
        "entidade_alvo_id" uuid,
        "entidade_alvo_tipo" character varying(100),
        "justificativa" text NOT NULL,
        "contexto" jsonb,
        "dados_originais" jsonb,
        "dados_propostos" jsonb,
        "valor_envolvido" decimal(15,2),
        "status" "public"."status_solicitacao_aprovacao_enum" NOT NULL DEFAULT 'pendente',
        "aprovacoes_necessarias" integer NOT NULL DEFAULT 1,
        "aprovacoes_recebidas" integer NOT NULL DEFAULT 0,
        "rejeicoes_recebidas" integer NOT NULL DEFAULT 0,
        "data_expiracao" TIMESTAMP,
        "data_primeira_aprovacao" TIMESTAMP,
        "data_conclusao" TIMESTAMP,
        "data_execucao" TIMESTAMP,
        "observacoes_execucao" text,
        "ip_solicitante" inet,
        "user_agent" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_solicitacoes_aprovacao" PRIMARY KEY ("id")
      )
    `);

    // Criar tabela historico_aprovacao
    await queryRunner.query(`
      CREATE TABLE "historico_aprovacao" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "solicitacao_aprovacao_id" uuid NOT NULL,
        "aprovador_id" uuid NOT NULL,
        "acao" "public"."acao_aprovacao_enum" NOT NULL,
        "justificativa" text,
        "observacoes" text,
        "dados_contexto" jsonb,
        "ip_aprovador" inet,
        "user_agent" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_historico_aprovacao" PRIMARY KEY ("id")
      )
    `);

    // Criar foreign keys
    await queryRunner.query(`
      ALTER TABLE "configuracoes_aprovacao" 
      ADD CONSTRAINT "FK_configuracoes_aprovacao_acao_critica" 
      FOREIGN KEY ("acao_critica_id") REFERENCES "acoes_criticas"("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "aprovador" 
      ADD CONSTRAINT "FK_aprovador_configuracao_aprovacao" 
      FOREIGN KEY ("configuracao_aprovacao_id") REFERENCES "configuracoes_aprovacao"("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "aprovador" 
      ADD CONSTRAINT "FK_aprovador_usuario" 
      FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") 
      ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "solicitacoes_aprovacao" 
      ADD CONSTRAINT "FK_solicitacoes_aprovacao_acao_critica" 
      FOREIGN KEY ("acao_critica_id") REFERENCES "acoes_criticas"("id") 
      ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      ALTER TABLE "solicitacoes_aprovacao" 
      ADD CONSTRAINT "FK_solicitacoes_aprovacao_usuario_solicitante" 
      FOREIGN KEY ("usuario_solicitante_id") REFERENCES "usuario"("id") 
      ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      ALTER TABLE "historico_aprovacao" 
      ADD CONSTRAINT "FK_historico_aprovacao_solicitacao" 
      FOREIGN KEY ("solicitacao_aprovacao_id") REFERENCES "solicitacoes_aprovacao"("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "historico_aprovacao" 
      ADD CONSTRAINT "FK_historico_aprovacao_aprovador" 
      FOREIGN KEY ("aprovador_id") REFERENCES "usuario"("id") 
      ON DELETE RESTRICT
    `);

    // Criar índices para performance
    await queryRunner.query(`CREATE INDEX "IDX_acoes_criticas_codigo" ON "acoes_criticas" ("codigo")`);
    await queryRunner.query(`CREATE INDEX "IDX_acoes_criticas_modulo" ON "acoes_criticas" ("modulo")`);
    await queryRunner.query(`CREATE INDEX "IDX_acoes_criticas_ativo" ON "acoes_criticas" ("ativo")`);
    
    await queryRunner.query(`CREATE INDEX "IDX_configuracoes_aprovacao_acao_critica" ON "configuracoes_aprovacao" ("acao_critica_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_configuracoes_aprovacao_ativa" ON "configuracoes_aprovacao" ("ativa")`);
    
    await queryRunner.query(`CREATE INDEX "IDX_aprovador_configuracao" ON "aprovador" ("configuracao_aprovacao_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_aprovador_usuario" ON "aprovador" ("usuario_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_aprovador_ativo" ON "aprovador" ("ativo")`);
    
    await queryRunner.query(`CREATE INDEX "IDX_solicitacoes_aprovacao_status" ON "solicitacoes_aprovacao" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_solicitacoes_aprovacao_solicitante" ON "solicitacoes_aprovacao" ("usuario_solicitante_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_solicitacoes_aprovacao_acao_critica" ON "solicitacoes_aprovacao" ("acao_critica_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_solicitacoes_aprovacao_data_expiracao" ON "solicitacoes_aprovacao" ("data_expiracao")`);
    await queryRunner.query(`CREATE INDEX "IDX_solicitacoes_aprovacao_created_at" ON "solicitacoes_aprovacao" ("created_at")`);
    
    await queryRunner.query(`CREATE INDEX "IDX_historico_aprovacao_solicitacao" ON "historico_aprovacao" ("solicitacao_aprovacao_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_historico_aprovacao_aprovador" ON "historico_aprovacao" ("aprovador_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_historico_aprovacao_acao" ON "historico_aprovacao" ("acao")`);
    await queryRunner.query(`CREATE INDEX "IDX_historico_aprovacao_created_at" ON "historico_aprovacao" ("created_at")`);

    // Criar índices compostos para consultas frequentes
    await queryRunner.query(`
      CREATE INDEX "IDX_solicitacoes_aprovacao_status_created_at" 
      ON "solicitacoes_aprovacao" ("status", "created_at" DESC)
    `);
    
    await queryRunner.query(`
      CREATE INDEX "IDX_solicitacoes_aprovacao_solicitante_status" 
      ON "solicitacoes_aprovacao" ("usuario_solicitante_id", "status")
    `);

    // Criar triggers para updated_at
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_acoes_criticas_updated_at 
      BEFORE UPDATE ON "acoes_criticas" 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_configuracoes_aprovacao_updated_at 
      BEFORE UPDATE ON "configuracoes_aprovacao" 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_aprovador_updated_at 
      BEFORE UPDATE ON "aprovador" 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_solicitacoes_aprovacao_updated_at 
      BEFORE UPDATE ON "solicitacoes_aprovacao" 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover triggers
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_solicitacoes_aprovacao_updated_at ON "solicitacoes_aprovacao"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_aprovador_updated_at ON "aprovador"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_configuracoes_aprovacao_updated_at ON "configuracoes_aprovacao"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_acoes_criticas_updated_at ON "acoes_criticas"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column()`);

    // Remover índices
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_solicitacoes_aprovacao_solicitante_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_solicitacoes_aprovacao_status_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_historico_aprovacao_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_historico_aprovacao_acao"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_historico_aprovacao_aprovador"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_historico_aprovacao_solicitacao"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_solicitacoes_aprovacao_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_solicitacoes_aprovacao_data_expiracao"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_solicitacoes_aprovacao_acao_critica"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_solicitacoes_aprovacao_solicitante"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_solicitacoes_aprovacao_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_aprovador_ativo"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_aprovador_usuario"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_aprovador_configuracao"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_configuracoes_aprovacao_ativa"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_configuracoes_aprovacao_acao_critica"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_acoes_criticas_ativo"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_acoes_criticas_modulo"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_acoes_criticas_codigo"`);

    // Remover foreign keys
    await queryRunner.query(`ALTER TABLE "historico_aprovacao" DROP CONSTRAINT "FK_historico_aprovacao_aprovador"`);
    await queryRunner.query(`ALTER TABLE "historico_aprovacao" DROP CONSTRAINT "FK_historico_aprovacao_solicitacao"`);
    await queryRunner.query(`ALTER TABLE "solicitacoes_aprovacao" DROP CONSTRAINT "FK_solicitacoes_aprovacao_usuario_solicitante"`);
    await queryRunner.query(`ALTER TABLE "solicitacoes_aprovacao" DROP CONSTRAINT "FK_solicitacoes_aprovacao_acao_critica"`);
    await queryRunner.query(`ALTER TABLE "aprovador" DROP CONSTRAINT "FK_aprovador_usuario"`);
    await queryRunner.query(`ALTER TABLE "aprovador" DROP CONSTRAINT "FK_aprovador_configuracao_aprovacao"`);
    await queryRunner.query(`ALTER TABLE "configuracoes_aprovacao" DROP CONSTRAINT "FK_configuracoes_aprovacao_acao_critica"`);

    // Remover tabelas
    await queryRunner.query(`DROP TABLE "historico_aprovacao"`);
    await queryRunner.query(`DROP TABLE "solicitacoes_aprovacao"`);
    await queryRunner.query(`DROP TABLE "aprovador"`);
    await queryRunner.query(`DROP TABLE "configuracoes_aprovacao"`);
    await queryRunner.query(`DROP TABLE "acoes_criticas"`);

    // Remover enums
    await queryRunner.query(`DROP TYPE "public"."tipo_escopo_enum"`);
    await queryRunner.query(`DROP TYPE "public"."acao_aprovacao_enum"`);
    await queryRunner.query(`DROP TYPE "public"."estrategia_aprovacao_enum"`);
    await queryRunner.query(`DROP TYPE "public"."status_solicitacao_aprovacao_enum"`);
    await queryRunner.query(`DROP TYPE "public"."tipo_acao_critica_enum"`);
  }
}