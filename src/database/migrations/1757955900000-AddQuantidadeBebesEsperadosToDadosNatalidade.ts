import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migração para adicionar o campo quantidade_bebes_esperados à tabela dados_natalidade
 * 
 * Este campo é necessário para calcular corretamente o valor do benefício de natalidade,
 * usando a quantidade de bebês esperados como fator multiplicador.
 */
export class AddQuantidadeBebesEsperadosToDadosNatalidade1757955900000
  implements MigrationInterface {
  name = 'AddQuantidadeBebesEsperadosToDadosNatalidade1757955900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adicionar coluna quantidade_bebes_esperados à tabela dados_natalidade
    await queryRunner.query(`
      ALTER TABLE "dados_natalidade"
      ADD COLUMN IF NOT EXISTS "quantidade_bebes_esperados" integer DEFAULT 1;
    `);

    // Adicionar comentário à coluna para documentação
    await queryRunner.query(`
      COMMENT ON COLUMN "dados_natalidade"."quantidade_bebes_esperados" 
      IS 'Quantidade de bebês esperados na gestação (usado como fator multiplicador no cálculo do benefício)'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover a coluna quantidade_bebes_esperados
    await queryRunner.query(`
      ALTER TABLE "dados_natalidade" 
      DROP COLUMN "quantidade_bebes_esperados"
    `);
  }
}