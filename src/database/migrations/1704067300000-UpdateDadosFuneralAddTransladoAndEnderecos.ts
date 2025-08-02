import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para adicionar campos de translado e endereços ao benefício funeral
 *
 * Alterações:
 * - Renomeia campo numero_certidao_obito para declaracao_obito
 * - Adiciona campo translado (enum)
 * - Adiciona campo endereco_velorio (jsonb)
 * - Adiciona campo endereco_cemiterio (jsonb)
 */
export class UpdateDadosFuneralAddTransladoAndEnderecos1704067300000
  implements MigrationInterface
{
  name = 'UpdateDadosFuneralAddTransladoAndEnderecos1704067300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar enum para translado
    await queryRunner.query(
      `CREATE TYPE "translado_tipo" AS ENUM('svo', 'itep', 'nao_necessario')`,
    );

    // Renomear coluna numero_certidao_obito para declaracao_obito
    await queryRunner.query(
      `ALTER TABLE "dados_funeral" RENAME COLUMN "numero_certidao_obito" TO "declaracao_obito"`,
    );

    // Adicionar campo translado
    await queryRunner.query(
      `ALTER TABLE "dados_funeral" ADD "translado" "translado_tipo"`,
    );

    // Adicionar campo endereco_velorio
    await queryRunner.query(
      `ALTER TABLE "dados_funeral" ADD "endereco_velorio" jsonb`,
    );

    // Adicionar campo endereco_cemiterio
    await queryRunner.query(
      `ALTER TABLE "dados_funeral" ADD "endereco_cemiterio" jsonb`,
    );

    // Adicionar comentários nas colunas
    await queryRunner.query(
      `COMMENT ON COLUMN "dados_funeral"."declaracao_obito" IS 'Declaração de óbito (anteriormente numero_certidao_obito)'`,
    );

    await queryRunner.query(
      `COMMENT ON COLUMN "dados_funeral"."translado" IS 'Tipo de translado necessário: SVO, ITEP ou não necessário'`,
    );

    await queryRunner.query(
      `COMMENT ON COLUMN "dados_funeral"."endereco_velorio" IS 'Endereço do local do velório em formato JSON'`,
    );

    await queryRunner.query(
      `COMMENT ON COLUMN "dados_funeral"."endereco_cemiterio" IS 'Endereço do cemitério em formato JSON'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover comentários
    await queryRunner.query(
      `COMMENT ON COLUMN "dados_funeral"."declaracao_obito" IS NULL`,
    );

    await queryRunner.query(
      `COMMENT ON COLUMN "dados_funeral"."translado" IS NULL`,
    );

    await queryRunner.query(
      `COMMENT ON COLUMN "dados_funeral"."endereco_velorio" IS NULL`,
    );

    await queryRunner.query(
      `COMMENT ON COLUMN "dados_funeral"."endereco_cemiterio" IS NULL`,
    );

    // Remover campos adicionados
    await queryRunner.query(
      `ALTER TABLE "dados_funeral" DROP COLUMN "endereco_cemiterio"`,
    );

    await queryRunner.query(
      `ALTER TABLE "dados_funeral" DROP COLUMN "endereco_velorio"`,
    );

    await queryRunner.query(
      `ALTER TABLE "dados_funeral" DROP COLUMN "translado"`,
    );

    // Renomear coluna de volta
    await queryRunner.query(
      `ALTER TABLE "dados_funeral" RENAME COLUMN "declaracao_obito" TO "numero_certidao_obito"`,
    );

    // Remover enum
    await queryRunner.query(`DROP TYPE "translado_tipo"`);
  }
}
