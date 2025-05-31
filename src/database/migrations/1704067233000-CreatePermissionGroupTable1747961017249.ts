import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migração para criar a tabela de grupos de permissões.
 * 
 * Esta tabela armazena os grupos lógicos de permissões, facilitando a organização
 * e atribuição de permissões relacionadas.
 */
export class CreatePermissionGroupTable1704067238000 implements MigrationInterface {
  name = 'CreatePermissionGroupTable1704067238000';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'grupo_permissao',
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
      true
    );

    await queryRunner.createIndex(
      'grupo_permissao',
      new TableIndex({
        name: 'IDX_GRUPO_PERMISSAO_NOME',
        columnNames: ['nome'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('grupo_permissao');
  }
}
