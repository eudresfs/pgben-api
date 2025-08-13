import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDelegacaoAprovacaoSchema1751200000000 implements MigrationInterface {
  name = 'CreateDelegacaoAprovacaoSchema1751200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar tabela delegacoes_aprovacao
    await queryRunner.query(`
      CREATE TABLE "delegacoes_aprovacao" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "aprovador_origem_id" uuid NOT NULL,
        "aprovador_delegado_id" uuid NOT NULL,
        "motivo" text NOT NULL,
        "data_inicio" TIMESTAMP NOT NULL,
        "data_fim" TIMESTAMP NOT NULL,
        "escopo" character varying(50) NOT NULL DEFAULT 'GLOBAL',
        "tipos_acao_permitidos" text array,
        "valor_maximo" decimal(15,2),
        "condicoes_especificas" jsonb,
        "unidades_permitidas" text array,
        "ativo" boolean NOT NULL DEFAULT true,
        "notificar_aprovador_origem" boolean NOT NULL DEFAULT true,
        "notificar_delegado" boolean NOT NULL DEFAULT true,
        "permite_revogacao" boolean NOT NULL DEFAULT true,
        "data_revogacao" TIMESTAMP,
        "revogado_por" uuid,
        "motivo_revogacao" text,
        "total_aprovacoes_realizadas" integer NOT NULL DEFAULT 0,
        "ultima_aprovacao_em" TIMESTAMP,
        "observacoes" text,
        "metadados" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_delegacoes_aprovacao" PRIMARY KEY ("id")
      )
    `);

    // Criar índices para performance
    await queryRunner.query(`
      CREATE INDEX "IDX_delegacoes_aprovacao_origem_ativo" 
      ON "delegacoes_aprovacao" ("aprovador_origem_id", "ativo")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_delegacoes_aprovacao_delegado_ativo" 
      ON "delegacoes_aprovacao" ("aprovador_delegado_id", "ativo")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_delegacoes_aprovacao_periodo" 
      ON "delegacoes_aprovacao" ("data_inicio", "data_fim")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_delegacoes_aprovacao_ativo" 
      ON "delegacoes_aprovacao" ("ativo")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_delegacoes_aprovacao_escopo" 
      ON "delegacoes_aprovacao" ("escopo")
    `);

    // Criar índice composto para consultas de delegações ativas por período
    await queryRunner.query(`
      CREATE INDEX "IDX_delegacoes_aprovacao_ativas_periodo" 
      ON "delegacoes_aprovacao" ("ativo", "data_inicio", "data_fim") 
      WHERE "ativo" = true AND "data_revogacao" IS NULL
    `);

    // Adicionar foreign keys (referenciando usuários)
    await queryRunner.query(`
      ALTER TABLE "delegacoes_aprovacao" 
      ADD CONSTRAINT "FK_delegacoes_aprovacao_origem" 
      FOREIGN KEY ("aprovador_origem_id") REFERENCES "usuario"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "delegacoes_aprovacao" 
      ADD CONSTRAINT "FK_delegacoes_aprovacao_delegado" 
      FOREIGN KEY ("aprovador_delegado_id") REFERENCES "usuario"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "delegacoes_aprovacao" 
      ADD CONSTRAINT "FK_delegacoes_aprovacao_revogado_por" 
      FOREIGN KEY ("revogado_por") REFERENCES "usuario"("id") 
      ON DELETE SET NULL ON UPDATE CASCADE
    `);

    // Adicionar constraints de validação
    await queryRunner.query(`
      ALTER TABLE "delegacoes_aprovacao" 
      ADD CONSTRAINT "CHK_delegacoes_aprovacao_periodo" 
      CHECK ("data_fim" > "data_inicio")
    `);

    await queryRunner.query(`
      ALTER TABLE "delegacoes_aprovacao" 
      ADD CONSTRAINT "CHK_delegacoes_aprovacao_aprovadores_diferentes" 
      CHECK ("aprovador_origem_id" != "aprovador_delegado_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "delegacoes_aprovacao" 
      ADD CONSTRAINT "CHK_delegacoes_aprovacao_valor_positivo" 
      CHECK ("valor_maximo" IS NULL OR "valor_maximo" > 0)
    `);

    // Constraint para garantir que se foi revogada, tem data e motivo
    await queryRunner.query(`
      ALTER TABLE "delegacoes_aprovacao" 
      ADD CONSTRAINT "CHK_delegacoes_aprovacao_revogacao" 
      CHECK (
        ("data_revogacao" IS NULL AND "revogado_por" IS NULL AND "motivo_revogacao" IS NULL) OR
        ("data_revogacao" IS NOT NULL AND "revogado_por" IS NOT NULL AND "motivo_revogacao" IS NOT NULL)
      )
    `);

    // Trigger para atualizar updated_at
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_delegacoes_aprovacao_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await queryRunner.query(`
      CREATE TRIGGER trigger_update_delegacoes_aprovacao_updated_at
        BEFORE UPDATE ON "delegacoes_aprovacao"
        FOR EACH ROW
        EXECUTE FUNCTION update_delegacoes_aprovacao_updated_at();
    `);

    // Comentários na tabela e colunas
    await queryRunner.query(`
      COMMENT ON TABLE "delegacoes_aprovacao" IS 'Tabela que armazena as delegações de autoridade de aprovação entre usuários';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "delegacoes_aprovacao"."aprovador_origem_id" IS 'ID do usuário que está delegando sua autoridade';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "delegacoes_aprovacao"."aprovador_delegado_id" IS 'ID do usuário que receberá a autoridade delegada';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "delegacoes_aprovacao"."escopo" IS 'Escopo da delegação: GLOBAL, UNIDADE, DEPARTAMENTO';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "delegacoes_aprovacao"."tipos_acao_permitidos" IS 'Array com os tipos de ação crítica que podem ser aprovadas na delegação';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "delegacoes_aprovacao"."condicoes_especificas" IS 'Condições específicas da delegação (horários, dias da semana, etc.)';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "delegacoes_aprovacao"."metadados" IS 'Metadados adicionais da delegação (IP, user agent, localização, etc.)';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover trigger
    await queryRunner.query(`DROP TRIGGER IF EXISTS trigger_update_delegacoes_aprovacao_updated_at ON "delegacoes_aprovacao"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_delegacoes_aprovacao_updated_at()`);

    // Remover foreign keys
    await queryRunner.query(`ALTER TABLE "delegacoes_aprovacao" DROP CONSTRAINT IF EXISTS "FK_delegacoes_aprovacao_revogado_por"`);
    await queryRunner.query(`ALTER TABLE "delegacoes_aprovacao" DROP CONSTRAINT IF EXISTS "FK_delegacoes_aprovacao_delegado"`);
    await queryRunner.query(`ALTER TABLE "delegacoes_aprovacao" DROP CONSTRAINT IF EXISTS "FK_delegacoes_aprovacao_origem"`);

    // Remover índices
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_delegacoes_aprovacao_ativas_periodo"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_delegacoes_aprovacao_escopo"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_delegacoes_aprovacao_ativo"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_delegacoes_aprovacao_periodo"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_delegacoes_aprovacao_delegado_ativo"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_delegacoes_aprovacao_origem_ativo"`);

    // Remover tabela
    await queryRunner.query(`DROP TABLE IF EXISTS "delegacoes_aprovacao"`);
  }
}