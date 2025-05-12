import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePendenciaOcorrenciaStructures1000009 implements MigrationInterface {
  name = 'CreatePendenciaOcorrenciaStructures20250512122500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar enum para tipo de pendência
    await queryRunner.query(`
      CREATE TYPE "tipo_pendencia_enum" AS ENUM ('documento', 'informacao', 'outro');
    `);

    // Criar enum para status de pendência
    await queryRunner.query(`
      CREATE TYPE "status_pendencia_enum" AS ENUM ('aberta', 'em_analise', 'resolvida', 'cancelada');
    `);

    // Criar enum para tipo de ocorrência
    await queryRunner.query(`
      CREATE TYPE "tipo_ocorrencia_enum" AS ENUM ('observacao', 'alteracao', 'irregularidade', 'outro');
    `);

    // Criar tabela de tipos de documento
    await queryRunner.query(`
      CREATE TABLE "tipo_documento" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "nome" VARCHAR(255) NOT NULL,
        "sigla" VARCHAR(10),
        "descricao" TEXT,
        "obrigatorio" BOOLEAN DEFAULT FALSE,
        "ativo" BOOLEAN DEFAULT TRUE,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "removed_at" TIMESTAMP
      );
    `);

    // Criar tabela de pendências
    await queryRunner.query(`
      CREATE TABLE "pendencia" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "solicitacao_id" UUID NOT NULL,
        "tipo" tipo_pendencia_enum NOT NULL,
        "descricao" TEXT NOT NULL,
        "status" status_pendencia_enum NOT NULL DEFAULT 'aberta',
        "data_limite" TIMESTAMP,
        "data_resolucao" TIMESTAMP,
        "usuario_criacao_id" UUID NOT NULL,
        "usuario_resolucao_id" UUID,
        "observacao" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "removed_at" TIMESTAMP,
        CONSTRAINT "fk_pendencia_solicitacao" FOREIGN KEY ("solicitacao_id")
          REFERENCES "solicitacao"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_pendencia_usuario_criacao" FOREIGN KEY ("usuario_criacao_id")
          REFERENCES "usuario"("id"),
        CONSTRAINT "fk_pendencia_usuario_resolucao" FOREIGN KEY ("usuario_resolucao_id")
          REFERENCES "usuario"("id")
      );
    `);

    // Criar tabela de ocorrências
    await queryRunner.query(`
      CREATE TABLE "ocorrencia" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "solicitacao_id" UUID NOT NULL,
        "tipo" tipo_ocorrencia_enum NOT NULL,
        "descricao" TEXT NOT NULL,
        "usuario_id" UUID NOT NULL,
        "data_ocorrencia" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "removed_at" TIMESTAMP,
        CONSTRAINT "fk_ocorrencia_solicitacao" FOREIGN KEY ("solicitacao_id")
          REFERENCES "solicitacao"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_ocorrencia_usuario" FOREIGN KEY ("usuario_id")
          REFERENCES "usuario"("id")
      );
    `);

    // Criar índices
    await queryRunner.query(`
      CREATE INDEX "idx_tipo_documento_nome" ON "tipo_documento"("nome");
      CREATE INDEX "idx_tipo_documento_ativo" ON "tipo_documento"("ativo");
      
      CREATE INDEX "idx_pendencia_solicitacao" ON "pendencia"("solicitacao_id");
      CREATE INDEX "idx_pendencia_tipo" ON "pendencia"("tipo");
      CREATE INDEX "idx_pendencia_status" ON "pendencia"("status");
      CREATE INDEX "idx_pendencia_data_limite" ON "pendencia"("data_limite");
      
      CREATE INDEX "idx_ocorrencia_solicitacao" ON "ocorrencia"("solicitacao_id");
      CREATE INDEX "idx_ocorrencia_tipo" ON "ocorrencia"("tipo");
      CREATE INDEX "idx_ocorrencia_data" ON "ocorrencia"("data_ocorrencia");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índices
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_ocorrencia_data";
      DROP INDEX IF EXISTS "idx_ocorrencia_tipo";
      DROP INDEX IF EXISTS "idx_ocorrencia_solicitacao";
      
      DROP INDEX IF EXISTS "idx_pendencia_data_limite";
      DROP INDEX IF EXISTS "idx_pendencia_status";
      DROP INDEX IF EXISTS "idx_pendencia_tipo";
      DROP INDEX IF EXISTS "idx_pendencia_solicitacao";
      
      DROP INDEX IF EXISTS "idx_tipo_documento_ativo";
      DROP INDEX IF EXISTS "idx_tipo_documento_nome";
    `);

    // Remover tabelas
    await queryRunner.query('DROP TABLE IF EXISTS "ocorrencia";');
    await queryRunner.query('DROP TABLE IF EXISTS "pendencia";');
    await queryRunner.query('DROP TABLE IF EXISTS "tipo_documento";');

    // Remover enums
    await queryRunner.query('DROP TYPE IF EXISTS "tipo_ocorrencia_enum";');
    await queryRunner.query('DROP TYPE IF EXISTS "status_pendencia_enum";');
    await queryRunner.query('DROP TYPE IF EXISTS "tipo_pendencia_enum";');
  }
}