import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migração para criar a tabela de mapeamento entre permissões e grupos.
 *
 * Esta tabela implementa o relacionamento muitos-para-muitos entre permissões e grupos,
 * permitindo que uma permissão pertença a múltiplos grupos e que um grupo contenha
 * múltiplas permissões.
 */
export class CreatePermissionGroupMappingTable1704067237000
  implements MigrationInterface
{
  name = 'CreatePermissionGroupMappingTable1704067237000';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'mapeamento_grupo_permissao',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'permissao_id',
            type: 'uuid',
          },
          {
            name: 'grupo_id',
            type: 'uuid',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'criado_por',
            type: 'uuid',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['permissao_id'],
            referencedTableName: 'permissao',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['grupo_id'],
            referencedTableName: 'grupo_permissao',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['criado_por'],
            referencedTableName: 'usuario',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'mapeamento_grupo_permissao',
      new TableIndex({
        name: 'IDX_MAPEAMENTO_GRUPO_PERMISSAO_PERMISSAO',
        columnNames: ['permissao_id'],
      }),
    );

    await queryRunner.createIndex(
      'mapeamento_grupo_permissao',
      new TableIndex({
        name: 'IDX_MAPEAMENTO_GRUPO_PERMISSAO_GRUPO',
        columnNames: ['grupo_id'],
      }),
    );

    await queryRunner.createIndex(
      'mapeamento_grupo_permissao',
      new TableIndex({
        name: 'IDX_MAPEAMENTO_GRUPO_PERMISSAO_UNICO',
        columnNames: ['permissao_id', 'grupo_id'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('mapeamento_grupo_permissao');
  }
}
