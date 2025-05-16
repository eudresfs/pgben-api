import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

/**
 * Migração para criar a tabela de papéis de cidadão e remover o campo tipo_cidadao da tabela de cidadãos
 */
export class CreatePapelCidadaoTable1715866193000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar tabela de papéis de cidadão
    await queryRunner.createTable(
      new Table({
        name: 'papel_cidadao',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'cidadao_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'tipo_papel',
            type: 'enum',
            enum: ['BENEFICIARIO', 'REQUERENTE', 'REPRESENTANTE_LEGAL'],
            isNullable: false,
          },
          {
            name: 'metadados',
            type: 'jsonb',
            isNullable: true,
            default: '{}',
          },
          {
            name: 'ativo',
            type: 'boolean',
            default: true,
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
      true,
    );

    // Adicionar chave estrangeira
    await queryRunner.createForeignKey(
      'papel_cidadao',
      new TableForeignKey({
        columnNames: ['cidadao_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'cidadao',
        onDelete: 'CASCADE',
      }),
    );

    // Remover o campo tipo_cidadao da tabela de cidadãos
    await queryRunner.query(`
      -- Migrar dados existentes para a nova estrutura
      INSERT INTO papel_cidadao (cidadao_id, tipo_papel)
      SELECT id, tipo_cidadao FROM cidadao WHERE tipo_cidadao IS NOT NULL;
      
      -- Remover a coluna tipo_cidadao
      ALTER TABLE cidadao DROP COLUMN IF EXISTS tipo_cidadao;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Adicionar o campo tipo_cidadao de volta à tabela de cidadãos
    await queryRunner.query(`
      -- Adicionar a coluna tipo_cidadao
      ALTER TABLE cidadao ADD COLUMN tipo_cidadao VARCHAR(50);
      
      -- Migrar dados de volta para a estrutura antiga
      UPDATE cidadao c
      SET tipo_cidadao = pc.tipo_papel
      FROM papel_cidadao pc
      WHERE c.id = pc.cidadao_id AND pc.ativo = true;
    `);

    // Remover chave estrangeira
    const table = await queryRunner.getTable('papel_cidadao');
    if (table) {
      const foreignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('cidadao_id') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('papel_cidadao', foreignKey);
      }
    }

    // Remover tabela de papéis de cidadão
    await queryRunner.dropTable('papel_cidadao');
  }
}
