import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPendenciaIndexes1749330812428 implements MigrationInterface {
  name = 'AddPendenciaIndexes1749330812428';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adicionar índices para otimizar consultas de pendências
    await queryRunner.query(
      `CREATE INDEX "IDX_pendencia_status_prazo" ON "pendencias" ("status", "prazo_resolucao")`
    );
    
    await queryRunner.query(
      `CREATE INDEX "IDX_pendencia_registrado_por" ON "pendencias" ("registrado_por_id")`
    );
    
    await queryRunner.query(
      `CREATE INDEX "IDX_pendencia_status_created" ON "pendencias" ("status", "created_at")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índices
    await queryRunner.query(`DROP INDEX "IDX_pendencia_status_created"`);
    await queryRunner.query(`DROP INDEX "IDX_pendencia_registrado_por"`);
    await queryRunner.query(`DROP INDEX "IDX_pendencia_status_prazo"`);
  }
}