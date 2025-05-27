import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migração para criar a tabela de mapeamento entre roles e permissões.
 * 
 * Esta tabela implementa o relacionamento entre as roles existentes e as novas permissões granulares,
 * facilitando a transição do modelo baseado em roles para o modelo de permissões granulares.
 */
export class CreateRolePermissionTable1747961017260 implements MigrationInterface {
  name = 'CreateRolePermissionTable1747961017260';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'role_permissao',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'role_id',
            type: 'uuid',
          },
          {
            name: 'permissao_id',
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
            columnNames: ['criado_por'],
            referencedTableName: 'usuario',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true
    );

    await queryRunner.createIndex(
      'role_permissao',
      new TableIndex({
        name: 'IDX_ROLE_PERMISSAO_UNICO',
        columnNames: ['role_id', 'permissao_id'],
        isUnique: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('role_permissao');
  }
}
