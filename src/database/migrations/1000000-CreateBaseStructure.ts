import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateBaseStructure1000000 implements MigrationInterface {
  name = 'CreateBaseStructure20250512121900';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Habilitando a extensão uuid-ossp para geração de UUIDs
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Criação dos tipos enumerados para usuários
    await queryRunner.query(`
      DO $$
      BEGIN
        -- Não precisamos criar os tipos enumerados separadamente, pois estamos usando
        -- o tipo 'enum' diretamente nas colunas da tabela 'usuario'
        -- Os valores são definidos diretamente na definição da coluna
      END
      $$;
    `);

    // Criação da tabela de usuários
    await queryRunner.createTable(
      new Table({
        name: 'usuario',
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
            name: 'email',
            type: 'varchar',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'senha_hash',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'cpf',
            type: 'varchar',
            isNullable: true,
            isUnique: true,
          },
          {
            name: 'telefone',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'matricula',
            type: 'varchar',
            isNullable: true,
            isUnique: true,
          },
          {
            name: 'role',
            type: 'enum',
            enum: [
              'administrador',
              'gestor_semtas',
              'tecnico_semtas',
              'tecnico_unidade',
            ],
            default: "'tecnico_unidade'",
          },
          {
            name: 'unidade_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'setor_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['ativo', 'inativo'],
            default: "'ativo'",
          },
          {
            name: 'primeiro_acesso',
            type: 'boolean',
            default: true,
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
      true,
    );

    // Criação da tabela de setores
    await queryRunner.createTable(
      new Table({
        name: 'setor',
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
            name: 'descricao',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'sigla',
            type: 'varchar',
            isNullable: true,
            default: "'N/A'",
          },
          {
            name: 'unidade_id',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'status',
            type: 'boolean',
            isNullable: false,
            default: true,
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
      true,
    );

    // Criação da tabela de unidades
    await queryRunner.createTable(
      new Table({
        name: 'unidade',
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
            name: 'codigo',
            type: 'varchar',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'sigla',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'tipo',
            type: 'varchar',
            isNullable: true,
            default: "'cras'",
          },
          {
            name: 'tipo_unidade',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'endereco',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'telefone',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'email',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'responsavel',
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
      true,
    );

    // Criação da tabela de usuários por unidade
    await queryRunner.createTable(
      new Table({
        name: 'usuario_unidade',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'usuario_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'unidade_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'setor_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'data_inicio',
            type: 'timestamp',
            isNullable: false,
            default: 'now()',
          },
          {
            name: 'data_fim',
            type: 'timestamp',
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
      true,
    );

    // Criação dos índices
    await queryRunner.createIndex(
      'usuario',
      new TableIndex({
        name: 'IDX_USUARIOS_EMAIL',
        columnNames: ['email'],
      }),
    );

    await queryRunner.createIndex(
      'usuario',
      new TableIndex({
        name: 'IDX_USUARIOS_CPF',
        columnNames: ['cpf'],
      }),
    );

    await queryRunner.createIndex(
      'usuario',
      new TableIndex({
        name: 'IDX_USUARIOS_MATRICULA',
        columnNames: ['matricula'],
      }),
    );

    await queryRunner.createIndex(
      'unidade',
      new TableIndex({
        name: 'IDX_UNIDADE_CODIGO',
        columnNames: ['codigo'],
      }),
    );

    await queryRunner.createIndex(
      'usuario_unidade',
      new TableIndex({
        name: 'IDX_USUARIO_UNIDADE_USUARIO_ID',
        columnNames: ['usuario_id'],
      }),
    );

    await queryRunner.createIndex(
      'usuario_unidade',
      new TableIndex({
        name: 'IDX_USUARIO_UNIDADE_UNIDADE_ID',
        columnNames: ['unidade_id'],
      }),
    );

    await queryRunner.createIndex(
      'usuario_unidade',
      new TableIndex({
        name: 'IDX_USUARIO_UNIDADE_SETOR_ID',
        columnNames: ['setor_id'],
      }),
    );

    // Criação das chaves estrangeiras
    await queryRunner.createForeignKey(
      'usuario_unidade',
      new TableForeignKey({
        name: 'FK_USUARIO_UNIDADE_USUARIOS',
        columnNames: ['usuario_id'],
        referencedTableName: 'usuario',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'usuario_unidade',
      new TableForeignKey({
        name: 'FK_USUARIO_UNIDADE_UNIDADE',
        columnNames: ['unidade_id'],
        referencedTableName: 'unidade',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'usuario_unidade',
      new TableForeignKey({
        name: 'FK_USUARIO_UNIDADE_SETOR',
        columnNames: ['setor_id'],
        referencedTableName: 'setor',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Atualiza as siglas dos setores existentes
    await queryRunner.query(`
      UPDATE setor
      SET sigla = CASE
        WHEN nome = 'Administrativo' THEN 'ADM'
        WHEN nome = 'Atendimento' THEN 'ATD'
        WHEN nome = 'Análise Técnica' THEN 'TEC'
        WHEN nome = 'Gestão' THEN 'GES'
        ELSE 'N/A'
      END;
    `);

    // Atualizando registros existentes de unidade para usar o código como sigla temporariamente
    await queryRunner.query(`
      UPDATE unidade 
      SET sigla = codigo 
      WHERE sigla IS NULL
    `);

    // Atualizar registros existentes de unidade para usar um valor padrão para tipo_unidade
    await queryRunner.query(`
      UPDATE unidade 
      SET tipo_unidade = tipo 
      WHERE tipo_unidade IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover chaves estrangeiras
    await queryRunner.dropForeignKey(
      'usuario_unidade',
      'FK_USUARIO_UNIDADE_SETOR',
    );
    await queryRunner.dropForeignKey(
      'usuario_unidade',
      'FK_USUARIO_UNIDADE_UNIDADE',
    );
    await queryRunner.dropForeignKey(
      'usuario_unidade',
      'FK_USUARIO_UNIDADE_USUARIOS',
    );

    // Remover índices
    await queryRunner.dropIndex(
      'usuario_unidade',
      'IDX_USUARIO_UNIDADE_SETOR_ID',
    );
    await queryRunner.dropIndex(
      'usuario_unidade',
      'IDX_USUARIO_UNIDADE_UNIDADE_ID',
    );
    await queryRunner.dropIndex(
      'usuario_unidade',
      'IDX_USUARIO_UNIDADE_USUARIO_ID',
    );
    await queryRunner.dropIndex('unidade', 'IDX_UNIDADE_CODIGO');
    await queryRunner.dropIndex('usuario', 'IDX_USUARIOS_MATRICULA');
    await queryRunner.dropIndex('usuario', 'IDX_USUARIOS_CPF');
    await queryRunner.dropIndex('usuario', 'IDX_USUARIOS_EMAIL');

    // Remover tabelas
    await queryRunner.dropTable('usuario_unidade');
    await queryRunner.dropTable('unidade');
    await queryRunner.dropTable('setor');
    await queryRunner.dropTable('usuario');
  }
}
