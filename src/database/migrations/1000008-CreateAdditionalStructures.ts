import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdditionalStructures1000008 implements MigrationInterface {
  name = 'CreateAdditionalStructures20250512122400';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar tabela de dados sociais
    await queryRunner.query(`
      CREATE TABLE "dados_sociais" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "cidadao_id" UUID NOT NULL,
        "renda_familiar" DECIMAL(10,2),
        "quantidade_pessoas" INTEGER,
        "tipo_moradia" tipo_moradia_enum NOT NULL,
        "valor_aluguel" DECIMAL(10,2),
        "tempo_moradia" INTEGER,
        "possui_deficiencia" BOOLEAN DEFAULT FALSE,
        "tipo_deficiencia" VARCHAR,
        "possui_beneficio_social" BOOLEAN DEFAULT FALSE,
        "tipo_beneficio_social" tipo_beneficio_social_enum,
        "valor_beneficio_social" DECIMAL(10,2),
        "observacoes" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "removed_at" TIMESTAMP,
        CONSTRAINT "fk_dados_sociais_cidadao" FOREIGN KEY ("cidadao_id")
          REFERENCES "cidadao"("id") ON DELETE CASCADE
      );
    `);

    // Criar tabela de setor_unidade
    await queryRunner.query(`
      CREATE TABLE "setor_unidade" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "setor_id" UUID NOT NULL,
        "unidade_id" UUID NOT NULL,
        "data_inicio" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "data_fim" TIMESTAMP,
        "ativo" BOOLEAN DEFAULT TRUE,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "removed_at" TIMESTAMP,
        CONSTRAINT "fk_setor_unidade_setor" FOREIGN KEY ("setor_id")
          REFERENCES "setor"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_setor_unidade_unidade" FOREIGN KEY ("unidade_id")
          REFERENCES "unidade"("id") ON DELETE CASCADE
      );
    `);

    // Criar índices
    await queryRunner.query(`
      CREATE INDEX "idx_dados_sociais_cidadao" ON "dados_sociais"("cidadao_id");
      CREATE INDEX "idx_dados_sociais_tipo_moradia" ON "dados_sociais"("tipo_moradia");
      CREATE INDEX "idx_dados_sociais_tipo_beneficio_social" ON "dados_sociais"("tipo_beneficio_social");
      
      CREATE INDEX "idx_setor_unidade_setor" ON "setor_unidade"("setor_id");
      CREATE INDEX "idx_setor_unidade_unidade" ON "setor_unidade"("unidade_id");
      CREATE INDEX "idx_setor_unidade_ativo" ON "setor_unidade"("ativo");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índices
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_setor_unidade_ativo";
      DROP INDEX IF EXISTS "idx_setor_unidade_unidade";
      DROP INDEX IF EXISTS "idx_setor_unidade_setor";
      
      DROP INDEX IF EXISTS "idx_dados_sociais_tipo_beneficio_social";
      DROP INDEX IF EXISTS "idx_dados_sociais_tipo_moradia";
      DROP INDEX IF EXISTS "idx_dados_sociais_cidadao";
    `);

    // Remover tabelas
    await queryRunner.query('DROP TABLE IF EXISTS "setor_unidade";');
    await queryRunner.query('DROP TABLE IF EXISTS "dados_sociais";');
  }
}