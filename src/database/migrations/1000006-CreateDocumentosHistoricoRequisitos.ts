import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDocumentosHistoricoRequisitos1000006 implements MigrationInterface {
  name = 'CreateDocumentosHistoricoRequisitos20250512122500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Atualização dos enums pendentes
    await queryRunner.query(`
      -- Atualização do enum role para incluir novos papéis
      ALTER TYPE "public"."usuario_role_enum" ADD VALUE IF NOT EXISTS 'coordenador_unidade';
      ALTER TYPE "public"."usuario_role_enum" ADD VALUE IF NOT EXISTS 'gestor_beneficio';
      
      -- Atualização do enum status_usuario para incluir novos status
      ALTER TYPE "public"."usuario_status_enum" ADD VALUE IF NOT EXISTS 'bloqueado';
      ALTER TYPE "public"."usuario_status_enum" ADD VALUE IF NOT EXISTS 'pendente';
      
      -- Criação do enum fase_documento se não existir
      DO $$ BEGIN
        CREATE TYPE "fase_documento_enum" AS ENUM ('solicitacao', 'analise', 'aprovacao', 'liberacao');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Criação da tabela documentos_enviados
    await queryRunner.query(`
      CREATE TABLE "documentos_enviados" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "solicitacao_id" UUID NOT NULL,
        "requisito_id" UUID NOT NULL,
        "nome_arquivo" VARCHAR(255) NOT NULL,
        "caminho_arquivo" VARCHAR(500) NOT NULL,
        "tamanho_bytes" INTEGER NOT NULL,
        "tipo_arquivo" VARCHAR(100) NOT NULL,
        "fase" fase_documento_enum NOT NULL,
        "observacoes" TEXT,
        "usuario_id" UUID NOT NULL,
        "data_upload" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "removed_at" TIMESTAMP,
        CONSTRAINT "fk_documentos_enviados_solicitacao" FOREIGN KEY ("solicitacao_id")
          REFERENCES "solicitacao"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_documentos_enviados_requisito" FOREIGN KEY ("requisito_id")
          REFERENCES "requisito_documento"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_documentos_enviados_usuario" FOREIGN KEY ("usuario_id")
          REFERENCES "usuario"("id") ON DELETE RESTRICT
      );
    `);

    // Criação da tabela historico_solicitacao
    await queryRunner.query(`
      CREATE TABLE "historico_solicitacao" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "solicitacao_id" UUID NOT NULL,
        "status_anterior" status_solicitacao_enum,
        "status_novo" status_solicitacao_enum NOT NULL,
        "usuario_id" UUID NOT NULL,
        "observacao" TEXT,
        "data_alteracao" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "fk_historico_solicitacao_solicitacao" FOREIGN KEY ("solicitacao_id")
          REFERENCES "solicitacao"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_historico_solicitacao_usuario" FOREIGN KEY ("usuario_id")
          REFERENCES "usuario"("id") ON DELETE RESTRICT
      );
    `);

    // Criação da tabela requisitos_beneficio (renomeada para manter consistência com o nome da tabela)
    await queryRunner.query(`
      CREATE TABLE "requisitos_beneficio" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "solicitacao_id" UUID NOT NULL,
        "requisito_id" UUID NOT NULL,
        "atendido" BOOLEAN DEFAULT FALSE,
        "observacoes" TEXT,
        "usuario_id" UUID NOT NULL,
        "data_verificacao" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "removed_at" TIMESTAMP,
        CONSTRAINT "fk_requisitos_beneficio_solicitacao" FOREIGN KEY ("solicitacao_id")
          REFERENCES "solicitacao"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_requisitos_beneficio_requisito" FOREIGN KEY ("requisito_id")
          REFERENCES "requisito_documento"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_requisitos_beneficio_usuario" FOREIGN KEY ("usuario_id")
          REFERENCES "usuario"("id") ON DELETE RESTRICT,
        CONSTRAINT "uq_requisitos_beneficio_solicitacao_requisito" UNIQUE ("solicitacao_id", "requisito_id")
      );
    `);

    // Criação de índices para otimização
    await queryRunner.query(`
      -- Índices para documentos_enviados
      CREATE INDEX "idx_documentos_enviados_solicitacao" ON "documentos_enviados"("solicitacao_id");
      CREATE INDEX "idx_documentos_enviados_requisito" ON "documentos_enviados"("requisito_id");
      CREATE INDEX "idx_documentos_enviados_usuario" ON "documentos_enviados"("usuario_id");
      CREATE INDEX "idx_documentos_enviados_fase" ON "documentos_enviados"("fase");
      
      -- Índices para historico_solicitacao
      CREATE INDEX "idx_historico_solicitacao_solicitacao" ON "historico_solicitacao"("solicitacao_id");
      CREATE INDEX "idx_historico_solicitacao_usuario" ON "historico_solicitacao"("usuario_id");
      CREATE INDEX "idx_historico_solicitacao_status_novo" ON "historico_solicitacao"("status_novo");
      CREATE INDEX "idx_historico_solicitacao_data" ON "historico_solicitacao"("data_alteracao");
      
      -- Índices para requisitos_beneficio
      CREATE INDEX "idx_requisitos_beneficio_solicitacao" ON "requisitos_beneficio"("solicitacao_id");
      CREATE INDEX "idx_requisitos_beneficio_requisito" ON "requisitos_beneficio"("requisito_id");
      CREATE INDEX "idx_requisitos_beneficio_usuario" ON "requisitos_beneficio"("usuario_id");
      CREATE INDEX "idx_requisitos_beneficio_atendido" ON "requisitos_beneficio"("atendido");
    `);

    // Verificação e adição das constraints de chave estrangeira pendentes
    await queryRunner.query(`
      -- Verificar se a constraint entre setor e unidade já existe
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'setor' AND ccu.table_name = 'unidade'
        ) THEN
          ALTER TABLE "setor" ADD CONSTRAINT "fk_setor_unidade"
            FOREIGN KEY ("unidade_id") REFERENCES "unidade"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END $$;
      
      -- Verificar se a constraint entre solicitacao e cidadao já existe
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'solicitacao' AND ccu.table_name = 'cidadao'
        ) THEN
          -- As constraints já foram adicionadas na migration CreateSolicitacaoStructure
          -- Não é necessário adicionar novamente
        END IF;
      END $$;
      
      -- Verificar se a constraint entre situacao_moradia e cidadao já existe
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'situacao_moradia' AND ccu.table_name = 'cidadao'
        ) THEN
          ALTER TABLE "situacao_moradia" ADD CONSTRAINT "fk_situacao_moradia_cidadao"
            FOREIGN KEY ("cidadao_id") REFERENCES "cidadao"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índices
    await queryRunner.query(`
      -- Remover índices de requisitos_beneficio
      DROP INDEX IF EXISTS "idx_requisitos_beneficio_atendido";
      DROP INDEX IF EXISTS "idx_requisitos_beneficio_usuario";
      DROP INDEX IF EXISTS "idx_requisitos_beneficio_requisito";
      DROP INDEX IF EXISTS "idx_requisitos_beneficio_solicitacao";
      
      -- Remover índices de historico_solicitacao
      DROP INDEX IF EXISTS "idx_historico_solicitacao_data";
      DROP INDEX IF EXISTS "idx_historico_solicitacao_status_novo";
      DROP INDEX IF EXISTS "idx_historico_solicitacao_usuario";
      DROP INDEX IF EXISTS "idx_historico_solicitacao_solicitacao";
      
      -- Remover índices de documentos_enviados
      DROP INDEX IF EXISTS "idx_documentos_enviados_fase";
      DROP INDEX IF EXISTS "idx_documentos_enviados_usuario";
      DROP INDEX IF EXISTS "idx_documentos_enviados_requisito";
      DROP INDEX IF EXISTS "idx_documentos_enviados_solicitacao";
    `);

    // Remover tabelas
    await queryRunner.query('DROP TABLE IF EXISTS "requisitos_beneficio" CASCADE;');
    await queryRunner.query('DROP TABLE IF EXISTS "historico_solicitacao" CASCADE;');
    await queryRunner.query('DROP TABLE IF EXISTS "documentos_enviados" CASCADE;');

    // Remover constraints adicionadas
    await queryRunner.query(`
      ALTER TABLE "situacao_moradia" DROP CONSTRAINT IF EXISTS "fk_situacao_moradia_cidadao";
      ALTER TABLE "setor" DROP CONSTRAINT IF EXISTS "fk_setor_unidade";
    `);

    // Não é possível remover valores de enums no PostgreSQL, então não tentamos remover
    // os valores adicionados aos enums role e status_usuario
    
    // Remover enum fase_documento
    await queryRunner.query('DROP TYPE IF EXISTS "fase_documento_enum";');
  }
}