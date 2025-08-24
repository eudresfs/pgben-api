import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para criar as tabelas do módulo aprovacao-v2
 * Cria 3 entidades simplificadas: acoes_aprovacao, solicitacoes_aprovacao, aprovadores
 */
export class CreateAprovacaoV2Tables1755280700000 implements MigrationInterface {
  name = 'CreateAprovacaoV2Tables1755280700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar enums apenas se não existirem
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "tipo_acao_critica_enum" AS ENUM (
          'cancelamento_solicitacao',
          'suspensao_beneficio', 
          'alteracao_dados_criticos',
          'exclusao_registro',
          'aprovacao_emergencial'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "estrategia_aprovacao_enum" AS ENUM (
          'simples',
          'maioria'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "status_solicitacao_enum" AS ENUM (
          'pendente',
          'aprovada',
          'rejeitada',
          'cancelada'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Criar tabela acoes_aprovacao
    await queryRunner.query(`
      CREATE TABLE "acoes_aprovacao" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tipo_acao" "tipo_acao_critica_enum" NOT NULL,
        "nome" character varying(100) NOT NULL,
        "descricao" text,
        "estrategia" "estrategia_aprovacao_enum" NOT NULL DEFAULT 'simples',
        "min_aprovadores" integer NOT NULL DEFAULT 1,
        "permitir_auto_aprovacao" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_acoes_aprovacao" PRIMARY KEY ("id")
      )
    `);

    // Adicionar comentários na tabela acoes_aprovacao
    await queryRunner.query(`
      COMMENT ON COLUMN "acoes_aprovacao"."tipo_acao" IS 'Tipo da ação crítica que requer aprovação';
      COMMENT ON COLUMN "acoes_aprovacao"."nome" IS 'Nome descritivo da ação';
      COMMENT ON COLUMN "acoes_aprovacao"."descricao" IS 'Descrição detalhada da ação';
      COMMENT ON COLUMN "acoes_aprovacao"."estrategia" IS 'Estratégia de aprovação a ser utilizada';
      COMMENT ON COLUMN "acoes_aprovacao"."min_aprovadores" IS 'Número mínimo de aprovadores necessários';
      COMMENT ON COLUMN "acoes_aprovacao"."ativo" IS 'Indica se a configuração está ativa';
      COMMENT ON COLUMN "acoes_aprovacao"."created_at" IS 'Data de criação do registro';
      COMMENT ON COLUMN "acoes_aprovacao"."updated_at" IS 'Data da última atualização';
    `);

    // Criar tabela solicitacoes_aprovacao
    await queryRunner.query(`
      CREATE TABLE "solicitacoes_aprovacao" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "codigo" character varying(20) NOT NULL,
        "status" "status_solicitacao_enum" NOT NULL DEFAULT 'pendente',
        "solicitante_id" uuid NOT NULL,
        "justificativa" text NOT NULL,
        "dados_acao" jsonb NOT NULL,
        "metodo_execucao" character varying(200) NOT NULL,
        "prazo_aprovacao" TIMESTAMP,
        "executado_em" TIMESTAMP,
        "erro_execucao" text,
        "anexos" jsonb,
        "processado_em" TIMESTAMP,
        "processado_por" uuid,
        "observacoes" text,
        "acao_aprovacao_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_solicitacoes_aprovacao" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_solicitacoes_aprovacao_codigo" UNIQUE ("codigo")
      )
    `);

    // Adicionar comentários na tabela solicitacoes_aprovacao
    await queryRunner.query(`
      COMMENT ON COLUMN "solicitacoes_aprovacao"."codigo" IS 'Código único da solicitação';
      COMMENT ON COLUMN "solicitacoes_aprovacao"."status" IS 'Status atual da solicitação';
      COMMENT ON COLUMN "solicitacoes_aprovacao"."solicitante_id" IS 'ID do usuário solicitante';
      COMMENT ON COLUMN "solicitacoes_aprovacao"."justificativa" IS 'Justificativa para a solicitação';
      COMMENT ON COLUMN "solicitacoes_aprovacao"."dados_acao" IS 'Dados da ação a ser executada após aprovação';
      COMMENT ON COLUMN "solicitacoes_aprovacao"."metodo_execucao" IS 'Método/endpoint que será executado após aprovação';
      COMMENT ON COLUMN "solicitacoes_aprovacao"."prazo_aprovacao" IS 'Data limite para aprovação';
      COMMENT ON COLUMN "solicitacoes_aprovacao"."processado_em" IS 'Data de processamento da solicitação';
      COMMENT ON COLUMN "solicitacoes_aprovacao"."processado_por" IS 'ID do usuário que processou a solicitação';
      COMMENT ON COLUMN "solicitacoes_aprovacao"."observacoes" IS 'Observações do processamento';
      COMMENT ON COLUMN "solicitacoes_aprovacao"."acao_aprovacao_id" IS 'ID da ação de aprovação';
      COMMENT ON COLUMN "solicitacoes_aprovacao"."created_at" IS 'Data de criação da solicitação';
      COMMENT ON COLUMN "solicitacoes_aprovacao"."updated_at" IS 'Data da última atualização';
    `);

    // Criar tabela aprovadores
    await queryRunner.query(`
      CREATE TABLE "aprovadores" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "usuario_id" uuid NOT NULL,
        "aprovado" boolean,
        "justificativa_decisao" text,
        "decidido_em" TIMESTAMP,
        "ativo" boolean NOT NULL DEFAULT true,
        "acao_aprovacao_id" uuid NOT NULL,
        "anexos_decisao" jsonb,
        "solicitacao_aprovacao_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_aprovadores" PRIMARY KEY ("id")
      )
    `);

    // Adicionar comentários na tabela aprovadores
    await queryRunner.query(`
      COMMENT ON COLUMN "aprovadores"."usuario_id" IS 'ID do usuário aprovador';
      COMMENT ON COLUMN "aprovadores"."aprovado" IS 'Decisão do aprovador: true=aprovado, false=rejeitado, null=pendente';
      COMMENT ON COLUMN "aprovadores"."justificativa_decisao" IS 'Justificativa da decisão';
      COMMENT ON COLUMN "aprovadores"."decidido_em" IS 'Data da decisão';
      COMMENT ON COLUMN "aprovadores"."ativo" IS 'Indica se o aprovador está ativo';
      COMMENT ON COLUMN "aprovadores"."acao_aprovacao_id" IS 'ID da ação de aprovação';
      COMMENT ON COLUMN "aprovadores"."solicitacao_aprovacao_id" IS 'ID da solicitação específica (quando aplicável)';
      COMMENT ON COLUMN "aprovadores"."created_at" IS 'Data de criação do registro';
      COMMENT ON COLUMN "aprovadores"."updated_at" IS 'Data da última atualização';
    `);

    // Criar foreign keys
    await queryRunner.query(`
      ALTER TABLE "solicitacoes_aprovacao" 
      ADD CONSTRAINT "FK_solicitacoes_aprovacao_acao_aprovacao" 
      FOREIGN KEY ("acao_aprovacao_id") REFERENCES "acoes_aprovacao"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "aprovadores" 
      ADD CONSTRAINT "FK_aprovadores_acao_aprovacao" 
      FOREIGN KEY ("acao_aprovacao_id") REFERENCES "acoes_aprovacao"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "aprovadores" 
      ADD CONSTRAINT "FK_aprovadores_solicitacao_aprovacao" 
      FOREIGN KEY ("solicitacao_aprovacao_id") REFERENCES "solicitacoes_aprovacao"("id") ON DELETE CASCADE
    `);

    // Criar índices para performance
    await queryRunner.query(`
      CREATE INDEX "IDX_solicitacoes_aprovacao_status" ON "solicitacoes_aprovacao" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_solicitacoes_aprovacao_solicitante" ON "solicitacoes_aprovacao" ("solicitante_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_aprovadores_usuario" ON "aprovadores" ("usuario_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_aprovadores_acao" ON "aprovadores" ("acao_aprovacao_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_acoes_aprovacao_tipo" ON "acoes_aprovacao" ("tipo_acao")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índices
    await queryRunner.query(`DROP INDEX "IDX_acoes_aprovacao_tipo"`);
    await queryRunner.query(`DROP INDEX "IDX_aprovadores_acao"`);
    await queryRunner.query(`DROP INDEX "IDX_aprovadores_usuario"`);
    await queryRunner.query(`DROP INDEX "IDX_solicitacoes_aprovacao_solicitante"`);
    await queryRunner.query(`DROP INDEX "IDX_solicitacoes_aprovacao_status"`);

    // Remover foreign keys
    await queryRunner.query(`ALTER TABLE "aprovadores" DROP CONSTRAINT "FK_aprovadores_solicitacao_aprovacao"`);
    await queryRunner.query(`ALTER TABLE "aprovadores" DROP CONSTRAINT "FK_aprovadores_acao_aprovacao"`);
    await queryRunner.query(`ALTER TABLE "solicitacoes_aprovacao" DROP CONSTRAINT "FK_solicitacoes_aprovacao_acao_aprovacao"`);

    // Remover tabelas
    await queryRunner.query(`DROP TABLE "aprovadores"`);
    await queryRunner.query(`DROP TABLE "solicitacoes_aprovacao"`);
    await queryRunner.query(`DROP TABLE "acoes_aprovacao"`);

    // Remover enums
    await queryRunner.query(`DROP TYPE "status_solicitacao_enum"`);
    await queryRunner.query(`DROP TYPE "estrategia_aprovacao_enum"`);
    await queryRunner.query(`DROP TYPE "tipo_acao_critica_enum"`);
  }
}