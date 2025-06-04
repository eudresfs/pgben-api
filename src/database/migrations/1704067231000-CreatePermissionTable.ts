import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migração para criar a tabela de permissões.
 *
 * Esta tabela armazena todas as permissões do sistema no formato `modulo.recurso.operacao`.
 */
export class CreatePermissionTable1704067221000 implements MigrationInterface {
  name = 'CreatePermissionTable1704067221000';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'permissao',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'nome',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'descricao',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'composta',
            type: 'boolean',
            default: false,
          },
          {
            name: 'permissao_pai_id',
            type: 'uuid',
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
            columnNames: ['permissao_pai_id'],
            referencedTableName: 'permissao',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('permissao');
  }
}
