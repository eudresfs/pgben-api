import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migração para criar a tabela de permissões atribuídas diretamente a usuários.
 * 
 * Esta tabela armazena permissões específicas atribuídas a usuários individuais,
 * que podem sobrepor-se às permissões da role do usuário. Também suporta
 * permissões com escopo e validade temporal.
 */
export class CreateUserPermissionTable1747961017265 implements MigrationInterface {
  name = 'CreateUserPermissionTable1747961017265';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'user_permission',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'permission_id',
            type: 'uuid',
          },
          {
            name: 'granted',
            type: 'boolean',
            default: true,
          },
          {
            name: 'scope_type',
            type: 'varchar',
            length: '20',
            default: "'GLOBAL'",
          },
          {
            name: 'scope_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'valid_until',
            type: 'timestamp',
            isNullable: true,
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
            columnNames: ['user_id'],
            referencedTableName: 'usuario',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
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
      'user_permission',
      new TableIndex({
        name: 'IDX_USER_PERMISSION_USER',
        columnNames: ['user_id'],
      })
    );

    await queryRunner.createIndex(
      'user_permission',
      new TableIndex({
        name: 'IDX_USER_PERMISSION_PERMISSION',
        columnNames: ['permission_id'],
      })
    );

    await queryRunner.createIndex(
      'user_permission',
      new TableIndex({
        name: 'IDX_USER_PERMISSION_SCOPE',
        columnNames: ['scope_type', 'scope_id'],
      })
    );

    await queryRunner.createIndex(
      'user_permission',
      new TableIndex({
        name: 'IDX_USER_PERMISSION_VALID_UNTIL',
        columnNames: ['valid_until'],
      })
    );

    await queryRunner.createIndex(
      'user_permission',
      new TableIndex({
        name: 'IDX_USER_PERMISSION_UNIQUE',
        columnNames: ['user_id', 'permission_id', 'scope_type', 'scope_id'],
        isUnique: true,
        where: 'scope_id IS NOT NULL',
      })
    );

    await queryRunner.createIndex(
      'user_permission',
      new TableIndex({
        name: 'IDX_USER_PERMISSION_UNIQUE_NULL_SCOPE',
        columnNames: ['user_id', 'permission_id', 'scope_type'],
        isUnique: true,
        where: 'scope_id IS NULL',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('user_permission');
  }
}
