import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Migration para adicionar coluna url_publica à tabela documentos
 *
 * Esta migration adiciona a coluna url_publica que armazenará
 * a URL pública gerada automaticamente durante o upload de documentos.
 */
export class AddUrlPublicaToDocumento1750800000000
  implements MigrationInterface
{
  name = 'AddUrlPublicaToDocumento1750800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adicionar coluna url_publica à tabela documentos
    await queryRunner.addColumn(
      'documentos',
      new TableColumn({
        name: 'url_publica',
        type: 'varchar',
        isNullable: true,
        comment: 'URL pública para acesso direto ao documento',
      }),
    );

    // Adicionar índice para otimizar consultas por URL pública
    await queryRunner.query(
      `CREATE INDEX "IDX_documentos_url_publica" ON "documentos" ("url_publica") WHERE "url_publica" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índice
    await queryRunner.query(`DROP INDEX "IDX_documentos_url_publica"`);

    // Remover coluna url_publica
    await queryRunner.dropColumn('documentos', 'url_publica');
  }
}
