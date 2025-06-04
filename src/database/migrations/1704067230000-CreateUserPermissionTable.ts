import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migração para criar a tabela de permissões atribuídas diretamente a usuários.
 *
 * Esta tabela armazena permissões específicas atribuídas a usuários individuais,
 * que podem sobrepor-se às permissões da role do usuário. Também suporta
 * permissões com escopo e validade temporal.
 */
export class CreateUserPermissionTable1704067220000
  implements MigrationInterface
{
  name = 'CreateUserPermissionTable1704067220000';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'usuario_permissao',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'usuario_id',
            type: 'uuid',
          },
          {
            name: 'permissao_id',
            type: 'uuid',
          },
          {
            name: 'concedida',
            type: 'boolean',
            default: true,
          },
          {
            name: 'tipo_escopo',
            type: 'varchar',
            length: '20',
            default: "'GLOBAL'",
          },
          {
            name: 'escopo_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'valido_ate',
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
            name: 'criado_por',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'atualizado_por',
            type: 'uuid',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['usuario_id'],
            referencedTableName: 'usuario',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['permissao_id'],
            referencedTableName: 'permissao',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['criado_por'],
            referencedTableName: 'usuario',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            columnNames: ['atualizado_por'],
            referencedTableName: 'usuario',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'usuario_permissao',
      new TableIndex({
        name: 'IDX_USUARIO_PERMISSAO_USUARIO',
        columnNames: ['usuario_id'],
      }),
    );

    await queryRunner.createIndex(
      'usuario_permissao',
      new TableIndex({
        name: 'IDX_USUARIO_PERMISSAO_PERMISSAO',
        columnNames: ['permissao_id'],
      }),
    );

    await queryRunner.createIndex(
      'usuario_permissao',
      new TableIndex({
        name: 'IDX_USUARIO_PERMISSAO_ESCOPO',
        columnNames: ['tipo_escopo', 'escopo_id'],
      }),
    );

    await queryRunner.createIndex(
      'usuario_permissao',
      new TableIndex({
        name: 'IDX_USUARIO_PERMISSAO_VALIDADE',
        columnNames: ['valido_ate'],
      }),
    );

    await queryRunner.createIndex(
      'usuario_permissao',
      new TableIndex({
        name: 'IDX_USUARIO_PERMISSAO_UNICO',
        columnNames: ['usuario_id', 'permissao_id', 'tipo_escopo', 'escopo_id'],
        isUnique: true,
        where: 'escopo_id IS NOT NULL',
      }),
    );

    await queryRunner.createIndex(
      'usuario_permissao',
      new TableIndex({
        name: 'IDX_USUARIO_PERMISSAO_UNICO_SEM_ESCOPO',
        columnNames: ['usuario_id', 'permissao_id', 'tipo_escopo'],
        isUnique: true,
        where: 'escopo_id IS NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('usuario_permissao');
  }
}
