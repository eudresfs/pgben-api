import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateHistoricoConcessao1750333200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'historico_concessao',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'concessao_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'status_anterior',
            type: 'enum',
            enumName: 'status_concessao_enum',
          },
          {
            name: 'status_novo',
            type: 'enum',
            enumName: 'status_concessao_enum',
            isNullable: false,
          },
          {
            name: 'motivo',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'alterado_por',
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
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'historico_concessao',
      new TableForeignKey({
        columnNames: ['concessao_id'],
        referencedTableName: 'concessao',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('historico_concessao');
  }
}
