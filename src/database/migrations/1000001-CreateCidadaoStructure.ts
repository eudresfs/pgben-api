import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateCidadaoStructure1000001 implements MigrationInterface {
  name = 'CreateCidadaoStructure20250512122000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criação dos tipos enumerados com valores atualizados
    await queryRunner.query(`
      CREATE TYPE "sexo_enum" AS ENUM ('masculino', 'feminino');
      CREATE TYPE "tipo_cidadao_enum" AS ENUM ('beneficiario', 'solicitante', 'representante_legal');
      CREATE TYPE "parentesco_enum" AS ENUM ('pai', 'mae', 'filho', 'filha', 'irmao', 'irma', 'avô', 'avó', 'outro');
      CREATE TYPE "escolaridade_enum" AS ENUM (
        'Infantil',
        'Fundamental_Incompleto',
        'Fundamental_Completo',
        'Medio_Incompleto',
        'Medio_Completo',
        'Superior_Incompleto',
        'Superior_Completo',
        'Pos_Graduacao',
        'Mestrado',
        'Doutorado'
      );
      CREATE TYPE "tipo_beneficio_social_enum" AS ENUM ('pbf', 'bpc');
      CREATE TYPE "tipo_bpc_enum" AS ENUM ('idoso', 'deficiente');
      CREATE TYPE "pix_tipo_enum" AS ENUM ('cpf', 'email', 'telefone', 'chave_aleatoria');
      
      -- Tipo moradia atualizado com o valor 'abrigo'
      CREATE TYPE "tipo_moradia_enum" AS ENUM (
        'propria', 
        'alugada', 
        'cedida', 
        'ocupacao', 
        'situacao_rua', 
        'outro',
        'abrigo'
      );
    `);

    // Criação da tabela de cidadãos
    await queryRunner.createTable(
      new Table({
        name: 'cidadao',
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
            isNullable: false,
          },
          {
            name: 'nome_social',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'cpf',
            type: 'varchar',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'rg',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'nis',
            type: 'varchar',
            isNullable: true,
            isUnique: true,
          },
          {
            name: 'data_nascimento',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'sexo',
            type: 'sexo_enum',
            isNullable: false,
          },
          {
            name: 'tipo_cidadao',
            type: 'tipo_cidadao_enum',
            isNullable: false,
          },
          {
            name: 'nome_mae',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'naturalidade',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'endereco',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'numero',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'complemento',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'bairro',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'cidade',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'uf',
            type: 'varchar',
            length: '2',
            isNullable: false,
          },
          {
            name: 'cep',
            type: 'varchar',
            length: '8',
            isNullable: true,
          },
          {
            name: 'telefone',
            type: 'varchar',
            length: '11',
            isNullable: true,
          },
          {
            name: 'email',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'escolaridade',
            type: 'escolaridade_enum',
            isNullable: true,
          },
          {
            name: 'profissao',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'renda',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'observacoes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            isNullable: false,
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            isNullable: false,
            default: 'now()',
          },
          {
            name: 'removed_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Criação da tabela de situação de moradia
    await queryRunner.createTable(
      new Table({
        name: 'situacao_moradia',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'cidadao_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'tipo_moradia',
            type: 'tipo_moradia_enum',
            isNullable: false,
          },
          {
            name: 'valor_aluguel',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'tempo_moradia',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            isNullable: false,
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            isNullable: false,
            default: 'now()',
          },
          {
            name: 'removed_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Criação da tabela de composição familiar
    await queryRunner.createTable(
      new Table({
        name: 'composicao_familiar',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'cidadao_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'nome',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'data_nascimento',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'parentesco',
            type: 'parentesco_enum',
            isNullable: false,
          },
          {
            name: 'escolaridade',
            type: 'escolaridade_enum',
            isNullable: true,
          },
          {
            name: 'renda',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            isNullable: false,
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            isNullable: false,
            default: 'now()',
          },
          {
            name: 'removed_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Criação da tabela de benefícios sociais
    await queryRunner.createTable(
      new Table({
        name: 'beneficio_social',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'cidadao_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'tipo',
            type: 'tipo_beneficio_social_enum',
            isNullable: false,
          },
          {
            name: 'tipo_bpc',
            type: 'tipo_bpc_enum',
            isNullable: true,
          },
          {
            name: 'valor',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'data_inicio',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'data_fim',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            isNullable: false,
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            isNullable: false,
            default: 'now()',
          },
          {
            name: 'removed_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Criação da tabela de informações bancárias
    await queryRunner.createTable(
      new Table({
        name: 'info_bancaria',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'cidadao_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'banco',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'agencia',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'conta',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'tipo_conta',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'pix_tipo',
            type: 'pix_tipo_enum',
            isNullable: true,
          },
          {
            name: 'pix_chave',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            isNullable: false,
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            isNullable: false,
            default: 'now()',
          },
          {
            name: 'removed_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Criação dos índices
    await queryRunner.createIndex(
      'cidadao',
      new TableIndex({
        name: 'IDX_cidadao_cpf',
        columnNames: ['cpf'],
      })
    );

    await queryRunner.createIndex(
      'cidadao',
      new TableIndex({
        name: 'IDX_cidadao_nis',
        columnNames: ['nis'],
      })
    );

    await queryRunner.createIndex(
      'cidadao',
      new TableIndex({
        name: 'IDX_cidadao_nome',
        columnNames: ['nome'],
      })
    );

    // Criação de índices para a tabela de situação de moradia
    await queryRunner.createIndex(
      'situacao_moradia',
      new TableIndex({
        name: 'IDX_situacao_moradia_cidadao_id',
        columnNames: ['cidadao_id'],
      })
    );

    await queryRunner.createIndex(
      'composicao_familiar',
      new TableIndex({
        name: 'IDX_membro_familia_cidadao_id',
        columnNames: ['cidadao_id'],
      })
    );

    await queryRunner.createIndex(
      'beneficio_social',
      new TableIndex({
        name: 'IDX_beneficio_social_cidadao_id',
        columnNames: ['cidadao_id'],
      })
    );

    await queryRunner.createIndex(
      'info_bancaria',
      new TableIndex({
        name: 'IDX_info_bancaria_cidadao_id',
        columnNames: ['cidadao_id'],
      })
    );

    // Criação das chaves estrangeiras
    await queryRunner.createForeignKey(
      'situacao_moradia',
      new TableForeignKey({
        name: 'FK_situacao_moradia_cidadao',
        columnNames: ['cidadao_id'],
        referencedTableName: 'cidadao',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'composicao_familiar',
      new TableForeignKey({
        name: 'FK_membro_familia_cidadao',
        columnNames: ['cidadao_id'],
        referencedTableName: 'cidadao',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'beneficio_social',
      new TableForeignKey({
        name: 'FK_beneficio_social_cidadao',
        columnNames: ['cidadao_id'],
        referencedTableName: 'cidadao',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'info_bancaria',
      new TableForeignKey({
        name: 'FK_info_bancaria_cidadao',
        columnNames: ['cidadao_id'],
        referencedTableName: 'cidadao',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover chaves estrangeiras
    await queryRunner.dropForeignKey('info_bancaria', 'FK_info_bancaria_cidadao');
    await queryRunner.dropForeignKey('beneficio_social', 'FK_beneficio_social_cidadao');
    await queryRunner.dropForeignKey('composicao_familiar', 'FK_membro_familia_cidadao');
    await queryRunner.dropForeignKey('situacao_moradia', 'FK_situacao_moradia_cidadao');

    // Remover índices
    await queryRunner.dropIndex('info_bancaria', 'IDX_info_bancaria_cidadao_id');
    await queryRunner.dropIndex('beneficio_social', 'IDX_beneficio_social_cidadao_id');
    await queryRunner.dropIndex('composicao_familiar', 'IDX_membro_familia_cidadao_id');
    await queryRunner.dropIndex('situacao_moradia', 'IDX_situacao_moradia_cidadao_id');
    await queryRunner.dropIndex('cidadao', 'IDX_cidadao_nome');
    await queryRunner.dropIndex('cidadao', 'IDX_cidadao_nis');
    await queryRunner.dropIndex('cidadao', 'IDX_cidadao_cpf');

    // Remover tabelas
    await queryRunner.dropTable('info_bancaria');
    await queryRunner.dropTable('beneficio_social');
    await queryRunner.dropTable('composicao_familiar');
    await queryRunner.dropTable('situacao_moradia');
    await queryRunner.dropTable('cidadao');

    // Remover tipos enumerados
    await queryRunner.query(`
      DROP TYPE IF EXISTS "pix_tipo_enum";
      DROP TYPE IF EXISTS "tipo_beneficio_social_enum";
      DROP TYPE IF EXISTS "tipo_bpc_enum";
      DROP TYPE IF EXISTS "escolaridade_enum";
      DROP TYPE IF EXISTS "parentesco_enum";
      DROP TYPE IF EXISTS "sexo_enum";
      DROP TYPE IF EXISTS "tipo_moradia_enum";
      DROP TYPE IF EXISTS "tipo_cidadao_enum";
    `);
  }
}