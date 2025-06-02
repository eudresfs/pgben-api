import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

/**
 * Migration para criar a tabela tipo_beneficio_schema
 * Esta tabela mapeia tipos de benefícios para suas estruturas de entidades correspondentes
 */
export class CreateTipoBeneficioSchema1733158800000 implements MigrationInterface {
  name = 'CreateTipoBeneficioSchema1733158800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar tabela tipo_beneficio_schema
    await queryRunner.createTable(
      new Table({
        name: 'tipo_beneficio_schema',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'tipo_beneficio_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'entidade_dados',
            type: 'varchar',
            length: '100',
            isNullable: false,
            comment: 'Nome da entidade de dados correspondente (ex: DadosNatalidade, DadosAluguelSocial)',
          },
          {
            name: 'schema_estrutura',
            type: 'jsonb',
            isNullable: false,
            comment: 'Estrutura JSON contendo campos e metadados da entidade',
          },
          {
            name: 'versao',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'1.0.0'",
            comment: 'Versão do schema para controle de evolução',
          },
          {
            name: 'ativo',
            type: 'boolean',
            isNullable: false,
            default: true,
            comment: 'Indica se o schema está ativo',
          },
          {
            name: 'observacoes',
            type: 'text',
            isNullable: true,
            comment: 'Observações adicionais sobre o schema',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'removed_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Criar foreign key para tipo_beneficio
    await queryRunner.createForeignKey(
      'tipo_beneficio_schema',
      new TableForeignKey({
        columnNames: ['tipo_beneficio_id'],
        referencedTableName: 'tipo_beneficio',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_tipo_beneficio_schema_tipo_beneficio',
      }),
    );

    // Criar índices para otimização de consultas
    await queryRunner.createIndex(
      'tipo_beneficio_schema',
      new TableIndex({
        name: 'IDX_tipo_beneficio_schema_tipo_beneficio_id',
        columnNames: ['tipo_beneficio_id'],
      }),
    );

    await queryRunner.createIndex(
      'tipo_beneficio_schema',
      new TableIndex({
        name: 'IDX_tipo_beneficio_schema_entidade_dados',
        columnNames: ['entidade_dados'],
      }),
    );

    await queryRunner.createIndex(
      'tipo_beneficio_schema',
      new TableIndex({
        name: 'IDX_tipo_beneficio_schema_ativo',
        columnNames: ['ativo'],
      }),
    );

    // Criar índice único para garantir um schema ativo por tipo de benefício
    await queryRunner.createIndex(
      'tipo_beneficio_schema',
      new TableIndex({
        name: 'IDX_tipo_beneficio_schema_unique_ativo',
        columnNames: ['tipo_beneficio_id', 'ativo'],
        isUnique: true,
        where: 'ativo = true',
      }),
    );

    // Criar índice GIN para consultas no campo JSONB
    await queryRunner.query(
      `CREATE INDEX IDX_tipo_beneficio_schema_estrutura_gin 
       ON tipo_beneficio_schema USING GIN (schema_estrutura);`,
    );

    // Adicionar comentário na tabela
    await queryRunner.query(
      `COMMENT ON TABLE tipo_beneficio_schema IS 
       'Tabela que mapeia tipos de benefícios para suas estruturas de entidades correspondentes, 
        eliminando a necessidade de formulários dinâmicos';`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índices
    await queryRunner.dropIndex('tipo_beneficio_schema', 'IDX_tipo_beneficio_schema_estrutura_gin');
    await queryRunner.dropIndex('tipo_beneficio_schema', 'IDX_tipo_beneficio_schema_unique_ativo');
    await queryRunner.dropIndex('tipo_beneficio_schema', 'IDX_tipo_beneficio_schema_ativo');
    await queryRunner.dropIndex('tipo_beneficio_schema', 'IDX_tipo_beneficio_schema_entidade_dados');
    await queryRunner.dropIndex('tipo_beneficio_schema', 'IDX_tipo_beneficio_schema_tipo_beneficio_id');

    // Remover foreign key
    await queryRunner.dropForeignKey('tipo_beneficio_schema', 'FK_tipo_beneficio_schema_tipo_beneficio');

    // Remover tabela
    await queryRunner.dropTable('tipo_beneficio_schema');
  }
}