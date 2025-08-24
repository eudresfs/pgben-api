import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddObservacoesToHistoricoConcessao1750333300000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'historico_concessao',
      new TableColumn({
        name: 'observacoes',
        type: 'text',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('historico_concessao', 'observacoes');
  }
}
