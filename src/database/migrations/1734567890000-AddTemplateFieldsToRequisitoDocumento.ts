import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTemplateFieldsToRequisitoDocumento1734567890000
  implements MigrationInterface
{
  name = 'AddTemplateFieldsToRequisitoDocumento1734567890000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adicionar campo observacoes
    await queryRunner.query(
      `ALTER TABLE "requisito_documento" ADD "observacoes" text`,
    );

    // Adicionar campo template_url
    await queryRunner.query(
      `ALTER TABLE "requisito_documento" ADD "template_url" character varying(500)`,
    );

    // Adicionar campo template_nome
    await queryRunner.query(
      `ALTER TABLE "requisito_documento" ADD "template_nome" character varying(255)`,
    );

    // Adicionar campo template_descricao
    await queryRunner.query(
      `ALTER TABLE "requisito_documento" ADD "template_descricao" text`,
    );

    // Adicionar comentários para documentação
    await queryRunner.query(
      `COMMENT ON COLUMN "requisito_documento"."observacoes" IS 'Observações adicionais sobre o documento'`,
    );

    await queryRunner.query(
      `COMMENT ON COLUMN "requisito_documento"."template_url" IS 'URL do template/modelo do documento para download'`,
    );

    await queryRunner.query(
      `COMMENT ON COLUMN "requisito_documento"."template_nome" IS 'Nome do arquivo template para identificação'`,
    );

    await queryRunner.query(
      `COMMENT ON COLUMN "requisito_documento"."template_descricao" IS 'Descrição ou instruções sobre o template'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover os campos adicionados
    await queryRunner.query(
      `ALTER TABLE "requisito_documento" DROP COLUMN "template_descricao"`,
    );

    await queryRunner.query(
      `ALTER TABLE "requisito_documento" DROP COLUMN "template_nome"`,
    );

    await queryRunner.query(
      `ALTER TABLE "requisito_documento" DROP COLUMN "template_url"`,
    );

    await queryRunner.query(
      `ALTER TABLE "requisito_documento" DROP COLUMN "observacoes"`,
    );
  }
}
