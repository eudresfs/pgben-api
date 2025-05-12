import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBeneficioStructure1000002 implements MigrationInterface {
  
  name = 'CreateBeneficioStructure20250512122100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar enum para periodicidade
    await queryRunner.query(`
      CREATE TYPE "periodicidade_enum" AS ENUM ('unico', 'mensal');
    `);

    // Criar enum para fase de requisito
    await queryRunner.query(`
      CREATE TYPE "fase_requisito_enum" AS ENUM ('solicitacao', 'analise', 'liberacao');
    `);

    // Criar tabela de tipos de benefício
    await queryRunner.query(`
      CREATE TABLE "tipos_beneficio" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "nome" VARCHAR(255) NOT NULL,
        "descricao" TEXT,
        "base_legal" TEXT,
        "periodicidade" periodicidade_enum NOT NULL,
        "periodo_maximo" INTEGER DEFAULT 6,
        "permite_renovacao" BOOLEAN DEFAULT FALSE,
        "permite_prorrogacao" BOOLEAN DEFAULT FALSE,
        "valor" DECIMAL(10,2),
        "valor_maximo" DECIMAL(10,2),
        "ativo" BOOLEAN DEFAULT TRUE,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "removed_at" TIMESTAMP
      );
    `);

    // Criar tabela de requisitos documentais
    await queryRunner.query(`
      CREATE TABLE "requisito_documento" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tipo_beneficio_id" UUID NOT NULL,
        "nome" VARCHAR(255) NOT NULL,
        "descricao" TEXT,
        "fase" fase_requisito_enum NOT NULL,
        "obrigatorio" BOOLEAN DEFAULT TRUE,
        "ordem" INTEGER DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "removed_at" TIMESTAMP,
        CONSTRAINT "fk_requisito_documento_tipo_beneficio" FOREIGN KEY ("tipo_beneficio_id") 
          REFERENCES "tipos_beneficio"("id") ON DELETE CASCADE
      );
    `);

    // Criar tabela de fluxo de benefício
    await queryRunner.query(`
      CREATE TABLE "fluxo_beneficio" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tipo_beneficio_id" UUID NOT NULL,
        "setor_id" UUID NOT NULL,
        "ordem" INTEGER NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "removed_at" TIMESTAMP,
        CONSTRAINT "fk_fluxo_beneficio_tipo_beneficio" FOREIGN KEY ("tipo_beneficio_id")
          REFERENCES "tipos_beneficio"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_fluxo_beneficio_setor" FOREIGN KEY ("setor_id")
          REFERENCES "setor"("id") ON DELETE CASCADE
      );
    `);

    // Criar índices
    await queryRunner.query(`
      CREATE INDEX "idx_tipos_beneficio_nome" ON "tipos_beneficio"("nome");
      CREATE INDEX "idx_tipos_beneficio_ativo" ON "tipos_beneficio"("ativo");
      CREATE INDEX "idx_requisito_documento_tipo_beneficio" ON "requisito_documento"("tipo_beneficio_id");
      CREATE INDEX "idx_fluxo_beneficio_tipo_beneficio" ON "fluxo_beneficio"("tipo_beneficio_id");
      CREATE INDEX "idx_fluxo_beneficio_setor" ON "fluxo_beneficio"("setor_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índices
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_fluxo_beneficio_setor";
      DROP INDEX IF EXISTS "idx_fluxo_beneficio_tipo_beneficio";
      DROP INDEX IF EXISTS "idx_requisito_documento_tipo_beneficio";
      DROP INDEX IF EXISTS "idx_tipos_beneficio_ativo";
      DROP INDEX IF EXISTS "idx_tipos_beneficio_nome";
    `);

    // Remover tabelas
    await queryRunner.query('DROP TABLE IF EXISTS "fluxo_beneficio";');
    await queryRunner.query('DROP TABLE IF EXISTS "requisito_documento";');
    await queryRunner.query('DROP TABLE IF EXISTS "tipos_beneficio";');

    // Remover enums
    await queryRunner.query('DROP TYPE IF EXISTS "fase_requisito_enum";');
    await queryRunner.query('DROP TYPE IF EXISTS "periodicidade_enum";');
  }
}