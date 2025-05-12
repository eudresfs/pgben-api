import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateBaseStructureConsolidado1000000 implements MigrationInterface {
  name = 'CreateBaseStructureConsolidado1000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Habilitando a extensão uuid-ossp para geração de UUIDs
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Criação dos tipos enumerados
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_enum') THEN
          CREATE TYPE "role_enum" AS ENUM ('admin', 'gestor', 'tecnico', 'atendente');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_usuario_enum') THEN
          CREATE TYPE "status_usuario_enum" AS ENUM ('ativo', 'inativo', 'bloqueado');
        END IF;
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
            default: 'uuid_generate_v4()'
          },
          {
            name: 'nome',
            type: 'varchar',
            isNullable: false
          },
          {
            name: 'email',
            type: 'varchar',
            isNullable: false,
            isUnique: true
          },
          {
            name: 'senha',
            type: 'varchar',
            isNullable: false
          },
          {
            name: 'cpf',
            type: 'varchar',
            isNullable: false,
            isUnique: true
          },
          {
            name: 'matricula',
            type: 'varchar',
            isNullable: false,
            isUnique: true
          },
          {
            name: 'role',
            type: 'role_enum',
            isNullable: false,
            default: "'atendente'"
          },
          {
            name: 'status',
            type: 'status_usuario_enum',
            isNullable: false,
            default: "'ativo'"
          },
          {
            name: 'ultimo_login',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'created_at',
            type: 'timestamp',
            isNullable: false,
            default: 'now()'
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            isNullable: false,
            default: 'now()'
          },
          {
            name: 'removed_at',
            type: 'timestamp',
            isNullable: true
          }
        ]
      }),
      true
    );

    // Criação da tabela de unidades (já com as colunas sigla e tipo)
    await queryRunner.createTable(
      new Table({
        name: 'unidade',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()'
          },
          {
            name: 'nome',
            type: 'varchar',
            isNullable: false
          },
          {
            name: 'codigo',
            type: 'varchar',
            isNullable: false,
            isUnique: true
          },
          {
            name: 'sigla',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'tipo',
            type: 'varchar',
            isNullable: true,
            default: "'cras'"
          },
          {
            name: 'tipo_unidade',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'endereco',
            type: 'varchar',
            isNullable: false
          },
          {
            name: 'telefone',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'email',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'responsavel_id',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'created_at',
            type: 'timestamp',
            isNullable: false,
            default: 'now()'
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            isNullable: false,
            default: 'now()'
          },
          {
            name: 'removed_at',
            type: 'timestamp',
            isNullable: true
          }
        ]
      }),
      true
    );

    // Criação da tabela de setores (já com as colunas status e sigla)
    await queryRunner.createTable(
      new Table({
        name: 'setor',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()'
          },
          {
            name: 'nome',
            type: 'varchar',
            isNullable: false
          },
          {
            name: 'sigla',
            type: 'varchar',
            isNullable: true,
            default: "'N/A'"
          },
          {
            name: 'status',
            type: 'boolean',
            isNullable: false,
            default: true
          },
          {
            name: 'unidade_id',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'responsavel_id',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'created_at',
            type: 'timestamp',
            isNullable: false,
            default: 'now()'
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            isNullable: false,
            default: 'now()'
          },
          {
            name: 'removed_at',
            type: 'timestamp',
            isNullable: true
          }
        ]
      }),
      true
    );

    // Criação de índices para a tabela de usuários
    await queryRunner.createIndex(
      'usuario',
      new TableIndex({
        name: 'IDX_usuario_email',
        columnNames: ['email']
      })
    );

    await queryRunner.createIndex(
      'usuario',
      new TableIndex({
        name: 'IDX_usuario_cpf',
        columnNames: ['cpf']
      })
    );

    await queryRunner.createIndex(
      'usuario',
      new TableIndex({
        name: 'IDX_usuario_matricula',
        columnNames: ['matricula']
      })
    );

    // Criação de índices para a tabela de unidades
    await queryRunner.createIndex(
      'unidade',
      new TableIndex({
        name: 'IDX_unidade_codigo',
        columnNames: ['codigo']
      })
    );

    await queryRunner.createIndex(
      'unidade',
      new TableIndex({
        name: 'IDX_unidade_sigla',
        columnNames: ['sigla']
      })
    );

    await queryRunner.createIndex(
      'unidade',
      new TableIndex({
        name: 'IDX_unidade_tipo',
        columnNames: ['tipo']
      })
    );

    // Criação de índices para a tabela de setores
    await queryRunner.createIndex(
      'setor',
      new TableIndex({
        name: 'IDX_setor_unidade_id',
        columnNames: ['unidade_id']
      })
    );

    await queryRunner.createIndex(
      'setor',
      new TableIndex({
        name: 'IDX_setor_sigla',
        columnNames: ['sigla']
      })
    );

    // Criação de chaves estrangeiras
    await queryRunner.createForeignKey(
      'unidade',
      new TableForeignKey({
        name: 'FK_unidade_responsavel',
        columnNames: ['responsavel_id'],
        referencedTableName: 'usuario',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL'
      })
    );

    await queryRunner.createForeignKey(
      'setor',
      new TableForeignKey({
        name: 'FK_setor_unidade',
        columnNames: ['unidade_id'],
        referencedTableName: 'unidade',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE'
      })
    );

    await queryRunner.createForeignKey(
      'setor',
      new TableForeignKey({
        name: 'FK_setor_responsavel',
        columnNames: ['responsavel_id'],
        referencedTableName: 'usuario',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL'
      })
    );

    // Atualiza as siglas dos setores com valores padrão
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

    // Atualiza os tipos de unidade
    await queryRunner.query(`
      UPDATE unidade 
      SET tipo_unidade = tipo 
      WHERE tipo_unidade IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover chaves estrangeiras
    await queryRunner.dropForeignKey('setor', 'FK_setor_responsavel');
    await queryRunner.dropForeignKey('setor', 'FK_setor_unidade');
    await queryRunner.dropForeignKey('unidade', 'FK_unidade_responsavel');

    // Remover índices
    await queryRunner.dropIndex('setor', 'IDX_setor_sigla');
    await queryRunner.dropIndex('setor', 'IDX_setor_unidade_id');
    await queryRunner.dropIndex('unidade', 'IDX_unidade_tipo');
    await queryRunner.dropIndex('unidade', 'IDX_unidade_sigla');
    await queryRunner.dropIndex('unidade', 'IDX_unidade_codigo');
    await queryRunner.dropIndex('usuario', 'IDX_usuario_matricula');
    await queryRunner.dropIndex('usuario', 'IDX_usuario_cpf');
    await queryRunner.dropIndex('usuario', 'IDX_usuario_email');

    // Remover tabelas
    await queryRunner.dropTable('setor');
    await queryRunner.dropTable('unidade');
    await queryRunner.dropTable('usuario');

    // Remover tipos enumerados
    await queryRunner.query(`
      DROP TYPE IF EXISTS "status_usuario_enum";
      DROP TYPE IF EXISTS "role_enum";
    `);
  }
}