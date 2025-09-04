import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

/**
 * Migration para adicionar relacionamento entre documentos e pendências
 *
 * Esta migration:
 * - Adiciona a coluna pendencia_id à tabela documentos
 * - Cria a foreign key para a tabela pendencias
 * - Garante que a migration seja reversível
 *
 * @author Arquiteto de Software
 * @date 19/05/2025
 */
export class AddPendenciaIdToDocumentos1704067250000 implements MigrationInterface {
  name = 'AddPendenciaIdToDocumentos1704067250000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adicionar coluna pendencia_id à tabela documentos
    await queryRunner.addColumn(
      'documentos',
      new TableColumn({
        name: 'pendencia_id',
        type: 'uuid',
        isNullable: true,
        comment: 'ID da pendência associada ao documento (opcional)',
      }),
    );

    // Criar foreign key para a tabela pendencias
    await queryRunner.createForeignKey(
      'documentos',
      new TableForeignKey({
        columnNames: ['pendencia_id'],
        referencedTableName: 'pendencias',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        name: 'FK_documentos_pendencia_id',
      }),
    );

    // Criar índice para melhorar performance das consultas
    await queryRunner.query(`
      CREATE INDEX "IDX_documentos_pendencia_id" ON "documentos" ("pendencia_id") 
      WHERE "pendencia_id" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índice
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_documentos_pendencia_id";`);

    // Remover foreign key
    await queryRunner.dropForeignKey('documentos', 'FK_documentos_pendencia_id');

    // Remover coluna pendencia_id
    await queryRunner.dropColumn('documentos', 'pendencia_id');
  }
}