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
        name: 'escopo_permissao',
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
            name: 'tipo_escopo_padrao',
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
      true
    );

    await queryRunner.createIndex(
      'escopo_permissao',
      new TableIndex({
        name: 'IDX_ESCOPO_PERMISSAO_PERMISSAO',
        columnNames: ['permissao_id'],
        isUnique: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('escopo_permissao');
  }
}
