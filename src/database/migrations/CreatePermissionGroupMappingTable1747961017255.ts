import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migração para criar a tabela de mapeamento entre permissões e grupos.
 * 
 * Esta tabela implementa o relacionamento muitos-para-muitos entre permissões e grupos,
 * permitindo que uma permissão pertença a múltiplos grupos e que um grupo contenha
 * múltiplas permissões.
 */
export class CreatePermissionGroupMappingTable1747961017255 implements MigrationInterface {
  name = 'CreatePermissionGroupMappingTable1747961017255';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'permission_group_mapping',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'permission_id',
            type: 'uuid',
          },
          {
            name: 'group_id',
            type: 'uuid',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['permission_id'],
            referencedTableName: 'permission',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['group_id'],
            referencedTableName: 'permission_group',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['created_by'],
            referencedTableName: 'usuario',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true
    );

    await queryRunner.createIndex(
      'permission_group_mapping',
      new TableIndex({
        name: 'IDX_PERMISSION_GROUP_MAPPING_PERMISSION',
        columnNames: ['permission_id'],
      })
    );

    await queryRunner.createIndex(
      'permission_group_mapping',
      new TableIndex({
        name: 'IDX_PERMISSION_GROUP_MAPPING_GROUP',
        columnNames: ['group_id'],
      })
    );

    await queryRunner.createIndex(
      'permission_group_mapping',
      new TableIndex({
        name: 'IDX_PERMISSION_GROUP_MAPPING_UNIQUE',
        columnNames: ['permission_id', 'group_id'],
        isUnique: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('permission_group_mapping');
  }
}
