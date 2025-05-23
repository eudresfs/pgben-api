import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migração para criar a tabela de escopos padrão para permissões.
 * 
 * Esta tabela define o tipo de escopo padrão para cada permissão,
 * facilitando a atribuição de permissões com escopo adequado.
 */
export class CreatePermissionScopeTable1747961017270 implements MigrationInterface {
  name = 'CreatePermissionScopeTable1747961017270';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'permission_scope',
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
            name: 'default_scope_type',
            type: 'varchar',
            length: '20',
            default: "'GLOBAL'",
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'updated_by',
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
            columnNames: ['created_by'],
            referencedTableName: 'usuario',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            columnNames: ['updated_by'],
            referencedTableName: 'usuario',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true
    );

    await queryRunner.createIndex(
      'permission_scope',
      new TableIndex({
        name: 'IDX_PERMISSION_SCOPE_PERMISSION',
        columnNames: ['permission_id'],
        isUnique: true,
      })
    );

    await queryRunner.createIndex(
      'permission_scope',
      new TableIndex({
        name: 'IDX_PERMISSION_SCOPE_TYPE',
        columnNames: ['default_scope_type'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('permission_scope');
  }
}
