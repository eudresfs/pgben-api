import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFeedbackSchema1756720000000 implements MigrationInterface {
  name = 'CreateFeedbackSchema1756720000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar enums
    await queryRunner.query(`
      CREATE TYPE "feedback_tipo_enum" AS ENUM (
        'bug',
        'melhoria',
        'sugestao',
        'reclamacao',
        'elogio',
        'duvida',
        'outro'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "feedback_prioridade_enum" AS ENUM (
        'baixa',
        'media',
        'alta',
        'critica'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "feedback_status_enum" AS ENUM (
        'aberto',
        'em_analise',
        'em_desenvolvimento',
        'resolvido',
        'fechado',
        'rejeitado'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "tag_categoria_enum" AS ENUM (
        'funcionalidade',
        'interface',
        'performance',
        'seguranca',
        'usabilidade',
        'integracao',
        'mobile',
        'desktop',
        'geral'
      )
    `);

    // Criar tabela de tags
    await queryRunner.query(`
      CREATE TABLE "tag" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "nome" character varying(50) NOT NULL,
        "descricao" text,
        "categoria" "tag_categoria_enum" NOT NULL DEFAULT 'geral',
        "cor" character varying(7) DEFAULT '#6B7280',
        "ativa" boolean NOT NULL DEFAULT true,
        "ordem_exibicao" integer DEFAULT 0,
        "contador_uso" integer NOT NULL DEFAULT 0,
        "criado_em" TIMESTAMP NOT NULL DEFAULT now(),
        "atualizado_em" TIMESTAMP NOT NULL DEFAULT now(),
        "criado_por" uuid,
        "atualizado_por" uuid,
        CONSTRAINT "PK_tag" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tag_nome" UNIQUE ("nome")
      )
    `);

    // Criar tabela de feedback
    await queryRunner.query(`
      CREATE TABLE "feedback" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tipo" "feedback_tipo_enum" NOT NULL,
        "titulo" character varying(200) NOT NULL,
        "descricao" text NOT NULL,
        "prioridade" "feedback_prioridade_enum" NOT NULL DEFAULT 'media',
        "status" "feedback_status_enum" NOT NULL DEFAULT 'aberto',
        "pagina_origem" character varying(500),
        "url_origem" character varying(1000),
        "user_agent" text,
        "resolucao_tela" character varying(20),
        "versao_sistema" character varying(50),
        "informacoes_tecnicas" jsonb,
        "lido" boolean NOT NULL DEFAULT false,
        "resolvido" boolean NOT NULL DEFAULT false,
        "data_leitura" TIMESTAMP,
        "data_resolucao" TIMESTAMP,
        "resposta_admin" text,
        "tempo_resolucao_horas" integer,
        "avaliacao_resolucao" integer,
        "comentario_avaliacao" text,
        "ip_origem" inet,
        "navegador" character varying(100),
        "sistema_operacional" character varying(100),
        "dispositivo" character varying(100),
        "criado_em" TIMESTAMP NOT NULL DEFAULT now(),
        "atualizado_em" TIMESTAMP NOT NULL DEFAULT now(),
        "criado_por" uuid,
        "atualizado_por" uuid,
        "lido_por" uuid,
        "resolvido_por" uuid,
        CONSTRAINT "PK_feedback" PRIMARY KEY ("id")
      )
    `);

    // Criar tabela de anexos do feedback
    await queryRunner.query(`
      CREATE TABLE "feedback_anexo" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "feedback_id" uuid NOT NULL,
        "nome_original" character varying(255) NOT NULL,
        "nome_arquivo" character varying(255) NOT NULL,
        "caminho_arquivo" character varying(500) NOT NULL,
        "tipo_mime" character varying(100) NOT NULL,
        "tamanho" bigint NOT NULL,
        "hash_arquivo" character varying(64),
        "largura" integer,
        "altura" integer,
        "duracao" integer,
        "metadados" jsonb,
        "criado_em" TIMESTAMP NOT NULL DEFAULT now(),
        "criado_por" uuid,
        CONSTRAINT "PK_feedback_anexo" PRIMARY KEY ("id")
      )
    `);

    // Criar tabela de relacionamento feedback-tag (many-to-many)
    await queryRunner.query(`
      CREATE TABLE "feedback_tag" (
        "feedback_id" uuid NOT NULL,
        "tag_id" uuid NOT NULL,
        "criado_em" TIMESTAMP NOT NULL DEFAULT now(),
        "criado_por" uuid,
        CONSTRAINT "PK_feedback_tag" PRIMARY KEY ("feedback_id", "tag_id")
      )
    `);

    // Criar índices para performance
    await queryRunner.query(`CREATE INDEX "IDX_feedback_tipo" ON "feedback" ("tipo")`);
    await queryRunner.query(`CREATE INDEX "IDX_feedback_prioridade" ON "feedback" ("prioridade")`);
    await queryRunner.query(`CREATE INDEX "IDX_feedback_status" ON "feedback" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_feedback_criado_por" ON "feedback" ("criado_por")`);
    await queryRunner.query(`CREATE INDEX "IDX_feedback_criado_em" ON "feedback" ("criado_em")`);
    await queryRunner.query(`CREATE INDEX "IDX_feedback_lido" ON "feedback" ("lido")`);
    await queryRunner.query(`CREATE INDEX "IDX_feedback_resolvido" ON "feedback" ("resolvido")`);
    await queryRunner.query(`CREATE INDEX "IDX_feedback_pagina_origem" ON "feedback" ("pagina_origem")`);
    
    await queryRunner.query(`CREATE INDEX "IDX_tag_categoria" ON "tag" ("categoria")`);
    await queryRunner.query(`CREATE INDEX "IDX_tag_ativa" ON "tag" ("ativa")`);
    await queryRunner.query(`CREATE INDEX "IDX_tag_contador_uso" ON "tag" ("contador_uso")`);
    await queryRunner.query(`CREATE INDEX "IDX_tag_ordem_exibicao" ON "tag" ("ordem_exibicao")`);
    
    await queryRunner.query(`CREATE INDEX "IDX_feedback_anexo_feedback_id" ON "feedback_anexo" ("feedback_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_feedback_anexo_tipo_mime" ON "feedback_anexo" ("tipo_mime")`);
    
    await queryRunner.query(`CREATE INDEX "IDX_feedback_tag_feedback_id" ON "feedback_tag" ("feedback_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_feedback_tag_tag_id" ON "feedback_tag" ("tag_id")`);

    // Criar índices compostos para consultas complexas
    await queryRunner.query(`CREATE INDEX "IDX_feedback_status_prioridade" ON "feedback" ("status", "prioridade")`);
    await queryRunner.query(`CREATE INDEX "IDX_feedback_tipo_status" ON "feedback" ("tipo", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_feedback_criado_por_status" ON "feedback" ("criado_por", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_feedback_lido_resolvido" ON "feedback" ("lido", "resolvido")`);

    // Criar índices para busca textual
    await queryRunner.query(`CREATE INDEX "IDX_feedback_titulo_gin" ON "feedback" USING gin(to_tsvector('portuguese', "titulo"))`);
    await queryRunner.query(`CREATE INDEX "IDX_feedback_descricao_gin" ON "feedback" USING gin(to_tsvector('portuguese', "descricao"))`);
    await queryRunner.query(`CREATE INDEX "IDX_tag_nome_gin" ON "tag" USING gin(to_tsvector('portuguese', "nome"))`);

    // Adicionar foreign keys
    await queryRunner.query(`
      ALTER TABLE "feedback_anexo" 
      ADD CONSTRAINT "FK_feedback_anexo_feedback" 
      FOREIGN KEY ("feedback_id") REFERENCES "feedback"("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "feedback_tag" 
      ADD CONSTRAINT "FK_feedback_tag_feedback" 
      FOREIGN KEY ("feedback_id") REFERENCES "feedback"("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "feedback_tag" 
      ADD CONSTRAINT "FK_feedback_tag_tag" 
      FOREIGN KEY ("tag_id") REFERENCES "tag"("id") 
      ON DELETE CASCADE
    `);

    // Criar triggers para atualizar contador de uso das tags
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_tag_contador_uso()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE tag SET contador_uso = contador_uso + 1 WHERE id = NEW.tag_id;
          RETURN NEW;
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE tag SET contador_uso = GREATEST(contador_uso - 1, 0) WHERE id = OLD.tag_id;
          RETURN OLD;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trigger_update_tag_contador_uso
      AFTER INSERT OR DELETE ON feedback_tag
      FOR EACH ROW
      EXECUTE FUNCTION update_tag_contador_uso();
    `);

    // Criar trigger para calcular tempo de resolução
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION calculate_tempo_resolucao()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.resolvido = true AND OLD.resolvido = false THEN
          NEW.data_resolucao = NOW();
          NEW.tempo_resolucao_horas = EXTRACT(EPOCH FROM (NEW.data_resolucao - NEW.criado_em)) / 3600;
        ELSIF NEW.resolvido = false AND OLD.resolvido = true THEN
          NEW.data_resolucao = NULL;
          NEW.tempo_resolucao_horas = NULL;
        END IF;
        
        IF NEW.lido = true AND OLD.lido = false THEN
          NEW.data_leitura = NOW();
        ELSIF NEW.lido = false AND OLD.lido = true THEN
          NEW.data_leitura = NULL;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trigger_calculate_tempo_resolucao
      BEFORE UPDATE ON feedback
      FOR EACH ROW
      EXECUTE FUNCTION calculate_tempo_resolucao();
    `);

    // Inserir tags padrão do sistema
    await queryRunner.query(`
      INSERT INTO "tag" ("nome", "descricao", "categoria", "cor", "ordem_exibicao") VALUES
      ('Interface', 'Problemas ou sugestões relacionadas à interface do usuário', 'interface', '#3B82F6', 1),
      ('Performance', 'Questões relacionadas à velocidade e desempenho do sistema', 'performance', '#EF4444', 2),
      ('Usabilidade', 'Melhorias na experiência do usuário', 'usabilidade', '#10B981', 3),
      ('Bug Crítico', 'Erros que impedem o funcionamento normal do sistema', 'funcionalidade', '#DC2626', 4),
      ('Melhoria', 'Sugestões de melhorias e novas funcionalidades', 'funcionalidade', '#8B5CF6', 5),
      ('Mobile', 'Questões específicas da versão mobile', 'mobile', '#F59E0B', 6),
      ('Segurança', 'Questões relacionadas à segurança do sistema', 'seguranca', '#EF4444', 7),
      ('Integração', 'Problemas com integrações externas', 'integracao', '#6366F1', 8),
      ('Documentação', 'Melhorias na documentação e ajuda', 'geral', '#6B7280', 9),
      ('Acessibilidade', 'Melhorias de acessibilidade', 'usabilidade', '#059669', 10)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover triggers
    await queryRunner.query(`DROP TRIGGER IF EXISTS trigger_calculate_tempo_resolucao ON feedback`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trigger_update_tag_contador_uso ON feedback_tag`);
    
    // Remover funções
    await queryRunner.query(`DROP FUNCTION IF EXISTS calculate_tempo_resolucao()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_tag_contador_uso()`);

    // Remover foreign keys
    await queryRunner.query(`ALTER TABLE "feedback_tag" DROP CONSTRAINT "FK_feedback_tag_tag"`);
    await queryRunner.query(`ALTER TABLE "feedback_tag" DROP CONSTRAINT "FK_feedback_tag_feedback"`);
    await queryRunner.query(`ALTER TABLE "feedback_anexo" DROP CONSTRAINT "FK_feedback_anexo_feedback"`);

    // Remover índices
    await queryRunner.query(`DROP INDEX "IDX_tag_nome_gin"`);
    await queryRunner.query(`DROP INDEX "IDX_feedback_descricao_gin"`);
    await queryRunner.query(`DROP INDEX "IDX_feedback_titulo_gin"`);
    await queryRunner.query(`DROP INDEX "IDX_feedback_lido_resolvido"`);
    await queryRunner.query(`DROP INDEX "IDX_feedback_criado_por_status"`);
    await queryRunner.query(`DROP INDEX "IDX_feedback_tipo_status"`);
    await queryRunner.query(`DROP INDEX "IDX_feedback_status_prioridade"`);
    await queryRunner.query(`DROP INDEX "IDX_feedback_tag_tag_id"`);
    await queryRunner.query(`DROP INDEX "IDX_feedback_tag_feedback_id"`);
    await queryRunner.query(`DROP INDEX "IDX_feedback_anexo_tipo_mime"`);
    await queryRunner.query(`DROP INDEX "IDX_feedback_anexo_feedback_id"`);
    await queryRunner.query(`DROP INDEX "IDX_tag_ordem_exibicao"`);
    await queryRunner.query(`DROP INDEX "IDX_tag_contador_uso"`);
    await queryRunner.query(`DROP INDEX "IDX_tag_ativa"`);
    await queryRunner.query(`DROP INDEX "IDX_tag_categoria"`);
    await queryRunner.query(`DROP INDEX "IDX_feedback_pagina_origem"`);
    await queryRunner.query(`DROP INDEX "IDX_feedback_resolvido"`);
    await queryRunner.query(`DROP INDEX "IDX_feedback_lido"`);
    await queryRunner.query(`DROP INDEX "IDX_feedback_criado_em"`);
    await queryRunner.query(`DROP INDEX "IDX_feedback_criado_por"`);
    await queryRunner.query(`DROP INDEX "IDX_feedback_status"`);
    await queryRunner.query(`DROP INDEX "IDX_feedback_prioridade"`);
    await queryRunner.query(`DROP INDEX "IDX_feedback_tipo"`);

    // Remover tabelas
    await queryRunner.query(`DROP TABLE "feedback_tag"`);
    await queryRunner.query(`DROP TABLE "feedback_anexo"`);
    await queryRunner.query(`DROP TABLE "feedback"`);
    await queryRunner.query(`DROP TABLE "tag"`);

    // Remover enums
    await queryRunner.query(`DROP TYPE "tag_categoria_enum"`);
    await queryRunner.query(`DROP TYPE "feedback_status_enum"`);
    await queryRunner.query(`DROP TYPE "feedback_prioridade_enum"`);
    await queryRunner.query(`DROP TYPE "feedback_tipo_enum"`);
  }
}