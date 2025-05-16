import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatusToUnidade1747216128000 implements MigrationInterface {
  name = 'AddStatusToUnidade1747216128000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "unidade" 
      ADD COLUMN IF NOT EXISTS "status" character varying NOT NULL DEFAULT 'ativo'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "unidade" DROP COLUMN "status"`);
  }
}
