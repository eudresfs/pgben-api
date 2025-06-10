import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateDadosSociaisSchema1704067214000 implements MigrationInterface {
  name = 'UpdateDadosSociaisSchema1704067214000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar novos enums
    await queryRunner.query(`
      CREATE TYPE "modalidade_bpc_enum" AS ENUM ('idoso', 'pcd');
    `);

    await queryRunner.query(`
      CREATE TYPE "tipo_insercao_enum" AS ENUM ('formal', 'informal');
    `);

    await queryRunner.query(`
      CREATE TYPE "tipo_insercao_conjuge_enum" AS ENUM ('formal', 'informal');
    `);

    // Renomear coluna ocupacao para ocupacao_beneficiario
    await queryRunner.query(`
      ALTER TABLE "dados_sociais" RENAME COLUMN "ocupacao" TO "ocupacao_beneficiario";
    `);

    // Alterar tipo_bpc para modalidade_bpc com enum
    await queryRunner.query(`
      ALTER TABLE "dados_sociais" DROP COLUMN "tipo_bpc";
    `);

    await queryRunner.query(`
      ALTER TABLE "dados_sociais" ADD "modalidade_bpc" "modalidade_bpc_enum";
    `);

    // Adicionar novos campos de benefícios
    await queryRunner.query(`
      ALTER TABLE "dados_sociais" ADD "recebe_tributo_crianca" boolean NOT NULL DEFAULT false;
    `);

    await queryRunner.query(`
      ALTER TABLE "dados_sociais" ADD "valor_tributo_crianca" decimal(10,2);
    `);

    await queryRunner.query(`
      ALTER TABLE "dados_sociais" ADD "pensao_morte" boolean NOT NULL DEFAULT false;
    `);

    await queryRunner.query(`
      ALTER TABLE "dados_sociais" ADD "aposentadoria" boolean NOT NULL DEFAULT false;
    `);

    await queryRunner.query(`
      ALTER TABLE "dados_sociais" ADD "outros_beneficios" boolean NOT NULL DEFAULT false;
    `);

    await queryRunner.query(`
      ALTER TABLE "dados_sociais" ADD "descricao_outros_beneficios" character varying;
    `);

    // Adicionar novos campos de ocupação do beneficiario
    await queryRunner.query(`
      ALTER TABLE "dados_sociais" ADD "exerce_atividade_remunerada" boolean NOT NULL DEFAULT false;
    `);

    await queryRunner.query(`
      ALTER TABLE "dados_sociais" ADD "tipo_insercao_beneficiario" "tipo_insercao_enum";
    `);

    // Adicionar campos do cônjuge
    await queryRunner.query(`
      ALTER TABLE "dados_sociais" ADD "nome_conjuge" character varying;
    `);

    await queryRunner.query(`
      ALTER TABLE "dados_sociais" ADD "ocupacao_conjuge" character varying;
    `);

    await queryRunner.query(`
      ALTER TABLE "dados_sociais" ADD "exerce_atividade_remunerada_conjuge" boolean;
    `);

    await queryRunner.query(`
      ALTER TABLE "dados_sociais" ADD "tipo_insercao_conjuge" "tipo_insercao_conjuge_enum";
    `);

    // Criar índices para os novos campos
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_dados_sociais_modalidade_bpc" ON "dados_sociais" ("modalidade_bpc");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_dados_sociais_tipo_insercao_beneficiario" ON "dados_sociais" ("tipo_insercao_beneficiario");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_dados_sociais_tipo_insercao_conjuge" ON "dados_sociais" ("tipo_insercao_conjuge");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índices
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_dados_sociais_tipo_insercao_conjuge";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_dados_sociais_tipo_insercao_beneficiario";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_dados_sociais_modalidade_bpc";
    `);

    // Remover campos do cônjuge
    await queryRunner.query(`
      ALTER TABLE "dados_sociais" DROP COLUMN "tipo_insercao_conjuge";
    `);

    await queryRunner.query(`
      ALTER TABLE "dados_sociais" DROP COLUMN "exerce_atividade_remunerada_conjuge";
    `);

    await queryRunner.query(`
      ALTER TABLE "dados_sociais" DROP COLUMN "ocupacao_conjuge";
    `);

    await queryRunner.query(`
      ALTER TABLE "dados_sociais" DROP COLUMN "nome_conjuge";
    `);

    // Remover campos de ocupação do beneficiario
    await queryRunner.query(`
      ALTER TABLE "dados_sociais" DROP COLUMN "tipo_insercao_beneficiario";
    `);

    await queryRunner.query(`
      ALTER TABLE "dados_sociais" DROP COLUMN "exerce_atividade_remunerada";
    `);

    // Remover campos de benefícios
    await queryRunner.query(`
      ALTER TABLE "dados_sociais" DROP COLUMN "descricao_outros_beneficios";
    `);

    await queryRunner.query(`
      ALTER TABLE "dados_sociais" DROP COLUMN "outros_beneficios";
    `);

    await queryRunner.query(`
      ALTER TABLE "dados_sociais" DROP COLUMN "aposentadoria";
    `);

    await queryRunner.query(`
      ALTER TABLE "dados_sociais" DROP COLUMN "pensao_morte";
    `);

    await queryRunner.query(`
      ALTER TABLE "dados_sociais" DROP COLUMN "valor_tributo_crianca";
    `);

    await queryRunner.query(`
      ALTER TABLE "dados_sociais" DROP COLUMN "recebe_tributo_crianca";
    `);

    // Restaurar tipo_bpc
    await queryRunner.query(`
      ALTER TABLE "dados_sociais" DROP COLUMN "modalidade_bpc";
    `);

    await queryRunner.query(`
      ALTER TABLE "dados_sociais" ADD "tipo_bpc" character varying;
    `);

    // Renomear ocupacao_beneficiario de volta para ocupacao
    await queryRunner.query(`
      ALTER TABLE "dados_sociais" RENAME COLUMN "ocupacao_beneficiario" TO "ocupacao";
    `);

    // Remover enums
    await queryRunner.query(`
      DROP TYPE "tipo_insercao_conjuge_enum";
    `);

    await queryRunner.query(`
      DROP TYPE "tipo_insercao_enum";
    `);

    await queryRunner.query(`
      DROP TYPE "modalidade_bpc_enum";
    `);
  }
}