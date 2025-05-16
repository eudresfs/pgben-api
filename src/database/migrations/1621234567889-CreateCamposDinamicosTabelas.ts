import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para criar as tabelas de campos dinâmicos e versionamento de schema
 * 
 * Esta migration cria as tabelas necessárias para implementar a estrutura
 * flexível de dados via JSON para o módulo de benefício.
 */
export class CreateCamposDinamicosTabelas1621234567889 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar enum para tipos de dados
    await queryRunner.query(`
      CREATE TYPE "tipo_dado_enum" AS ENUM (
        'string',
        'number',
        'boolean',
        'date',
        'array',
        'object'
      )
    `);

    // Criar tabela de campos dinâmicos
    await queryRunner.query(`
      CREATE TABLE "campos_dinamicos_beneficio" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tipo_beneficio_id" uuid NOT NULL,
        "label" character varying NOT NULL,
        "nome" character varying NOT NULL,
        "tipo" "tipo_dado_enum" NOT NULL,
        "obrigatorio" boolean NOT NULL DEFAULT false,
        "descricao" text,
        "validacoes" jsonb,
        "ordem" integer NOT NULL DEFAULT 1,
        "ativo" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "removed_at" TIMESTAMP,
        CONSTRAINT "PK_campos_dinamicos_beneficio" PRIMARY KEY ("id")
      )
    `);

    // Criar índice único para tipo_beneficio_id + nome
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_campo_dinamico_tipo_nome" ON "campos_dinamicos_beneficio" ("tipo_beneficio_id", "nome") 
      WHERE "removed_at" IS NULL
    `);

    // Criar tabela de versionamento de schema
    await queryRunner.query(`
      CREATE TABLE "versoes_schema_beneficio" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tipo_beneficio_id" uuid NOT NULL,
        "versao" integer NOT NULL,
        "schema" jsonb NOT NULL,
        "descricao_mudancas" text,
        "ativo" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_versoes_schema_beneficio" PRIMARY KEY ("id")
      )
    `);

    // Criar índice único para tipo_beneficio_id + versao
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_versao_schema_tipo_versao" ON "versoes_schema_beneficio" ("tipo_beneficio_id", "versao")
    `);

    // Adicionar foreign keys
    await queryRunner.query(`
      ALTER TABLE "campos_dinamicos_beneficio" 
      ADD CONSTRAINT "FK_campo_dinamico_tipo_beneficio" 
      FOREIGN KEY ("tipo_beneficio_id") 
      REFERENCES "tipos_beneficio"("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "versoes_schema_beneficio" 
      ADD CONSTRAINT "FK_versao_schema_tipo_beneficio" 
      FOREIGN KEY ("tipo_beneficio_id") 
      REFERENCES "tipos_beneficio"("id") 
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover foreign keys
    await queryRunner.query(`ALTER TABLE "campos_dinamicos_beneficio" DROP CONSTRAINT "FK_campo_dinamico_tipo_beneficio"`);
    await queryRunner.query(`ALTER TABLE "versoes_schema_beneficio" DROP CONSTRAINT "FK_versao_schema_tipo_beneficio"`);

    // Remover índices
    await queryRunner.query(`DROP INDEX "IDX_campo_dinamico_tipo_nome"`);
    await queryRunner.query(`DROP INDEX "IDX_versao_schema_tipo_versao"`);

    // Remover tabelas
    await queryRunner.query(`DROP TABLE "campos_dinamicos_beneficio"`);
    await queryRunner.query(`DROP TABLE "versoes_schema_beneficio"`);

    // Remover enum
    await queryRunner.query(`DROP TYPE "tipo_dado_enum"`);
  }
}
