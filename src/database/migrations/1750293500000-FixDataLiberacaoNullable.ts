import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixDataLiberacaoNullable1750293500000
  implements MigrationInterface
{
  name = 'FixDataLiberacaoNullable1750293500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Altera a coluna data_liberacao para permitir valores NULL
    // Isso corrige a inconsistência entre a entidade (nullable: true) e o banco (NOT NULL)
    await queryRunner.query(`
      ALTER TABLE "pagamento" 
      ALTER COLUMN "data_liberacao" DROP NOT NULL;
    `);

    // Adiciona comentário explicativo
    await queryRunner.query(`
      COMMENT ON COLUMN "pagamento"."data_liberacao" IS 'Data efetiva da liberação do pagamento - pode ser NULL quando o pagamento ainda não foi liberado';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverte a alteração, tornando a coluna NOT NULL novamente
    // ATENÇÃO: Esta operação pode falhar se existirem registros com data_liberacao NULL
    await queryRunner.query(`
      UPDATE "pagamento" 
      SET "data_liberacao" = CURRENT_TIMESTAMP 
      WHERE "data_liberacao" IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "pagamento" 
      ALTER COLUMN "data_liberacao" SET NOT NULL;
    `);

    // Remove o comentário
    await queryRunner.query(`
      COMMENT ON COLUMN "pagamento"."data_liberacao" IS NULL;
    `);
  }
}
