import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migração para criar a tabela de regras de conflito de papéis
 */
export class CreateRegraConflitoPapel1747961017370 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'regra_conflito_papel',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'papel_origem_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'papel_destino_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'descricao',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'ativo',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'now()',
            isNullable: false,
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
      }),
      true,
    );

    // Criar índice para melhorar a performance das consultas
    await queryRunner.createIndex(
      'regra_conflito_papel',
      new TableIndex({
        name: 'IDX_REGRA_CONFLITO_PAPEL_ORIGEM_DESTINO',
        columnNames: ['papel_origem_id', 'papel_destino_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('regra_conflito_papel', 'IDX_REGRA_CONFLITO_PAPEL_ORIGEM_DESTINO');
    await queryRunner.dropTable('regra_conflito_papel');
  }
}
