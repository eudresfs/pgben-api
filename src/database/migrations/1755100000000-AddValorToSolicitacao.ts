import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddValorToSolicitacao1755100000000 implements MigrationInterface {
  private readonly table = 'solicitacao';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adicionar coluna valor do tipo decimal com precisão 10 e escala 2
    await queryRunner.query(`
      ALTER TABLE ${this.table}
        ADD COLUMN IF NOT EXISTS valor DECIMAL(10,2);
    `);

    // Adicionar comentário na coluna
    await queryRunner.query(`
      COMMENT ON COLUMN ${this.table}.valor IS 'Valor de referência do benefício';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover a coluna valor
    await queryRunner.query(`
      ALTER TABLE ${this.table}
        DROP COLUMN IF EXISTS valor;
    `);
  }
}