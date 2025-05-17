import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration: CreateBeneficioSchema
 *
 * Descrição: Cria a estrutura do módulo de benefício, incluindo tabelas para
 * tipos de benefício, requisitos documentais, campos dinâmicos e fluxos de aprovação.
 *
 * Domínio: Benefício
 * Dependências: 1020000-CreateCidadaoSchema.ts
 *
 * @author Arquiteto de Dados
 * @date 16/05/2025
 */
export class CreateBeneficioSchema1030000 implements MigrationInterface {
  name = 'CreateBeneficioSchema20250516000300';

  /**
   * Cria as estruturas do módulo de benefício
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Criar tipos enumerados
    await queryRunner.query(`
      CREATE TYPE "periodicidade_enum" AS ENUM (
        'unico',
        'mensal',
        'bimestral',
        'trimestral',
        'semestral',
        'anual'
      );
      
      CREATE TYPE "fase_requisito_enum" AS ENUM (
        'solicitacao',
        'analise',
        'liberacao'
      );
      
      CREATE TYPE "tipo_campo_enum" AS ENUM (
        'texto',
        'numero',
        'data',
        'booleano',
        'selecao',
        'multipla_escolha',
        'arquivo',
        'endereco',
        'cpf',
        'cnpj',
        'telefone',
        'email',
        'monetario'
      );
    `);

    // 2. Criar tabela de tipos de benefício
    await queryRunner.createTable(
      new Table({
        name: 'tipo_beneficio',
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
            length: '255',
            isNullable: false,
          },
          {
            name: 'descricao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'base_legal',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'periodicidade',
            type: 'periodicidade_enum',
            isNullable: false,
          },
          {
            name: 'periodo_maximo',
            type: 'integer',
            default: 6,
            isNullable: true,
          },
          {
            name: 'permite_renovacao',
            type: 'boolean',
            default: false,
          },
          {
            name: 'permite_prorrogacao',
            type: 'boolean',
            default: false,
          },
          {
            name: 'valor',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'valor_maximo',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'criterios_elegibilidade',
            type: 'jsonb',
            isNullable: true,
            comment: 'Critérios para elegibilidade ao benefício',
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
          {
            name: 'removed_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // 3. Criar tabela de requisitos documentais
    await queryRunner.createTable(
      new Table({
        name: 'requisito_documento',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tipo_beneficio_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'nome',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'descricao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'fase',
            type: 'fase_requisito_enum',
            isNullable: false,
          },
          {
            name: 'obrigatorio',
            type: 'boolean',
            default: true,
          },
          {
            name: 'ordem',
            type: 'integer',
            default: 0,
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
            name: 'removed_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // 4. Criar tabela de fluxo de benefício
    await queryRunner.createTable(
      new Table({
        name: 'fluxo_beneficio',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tipo_beneficio_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'setor_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'ordem',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'acoes_permitidas',
            type: 'jsonb',
            isNullable: true,
            comment: 'Ações que podem ser realizadas nesta etapa do fluxo',
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
            name: 'removed_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // 5. Criar tabela de campos dinâmicos
    await queryRunner.createTable(
      new Table({
        name: 'campo_dinamico_beneficio',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tipo_beneficio_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'nome',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'descricao',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'tipo',
            type: 'tipo_campo_enum',
            isNullable: false,
          },
          {
            name: 'obrigatorio',
            type: 'boolean',
            default: false,
          },
          {
            name: 'ordem',
            type: 'integer',
            default: 0,
          },
          {
            name: 'opcoes',
            type: 'jsonb',
            isNullable: true,
            comment: 'Opções para campos de seleção ou múltipla escolha',
          },
          {
            name: 'validacoes',
            type: 'jsonb',
            isNullable: true,
            comment: 'Regras de validação para o campo',
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
            name: 'removed_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // 6. Criar tabela de versão de schema
    await queryRunner.createTable(
      new Table({
        name: 'versao_schema_beneficio',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tipo_beneficio_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'versao',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'schema',
            type: 'jsonb',
            isNullable: false,
            comment: 'Definição do schema JSON para validação',
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

    // 7. Criar índices para otimização de consultas
    await queryRunner.createIndex(
      'tipo_beneficio',
      new TableIndex({
        name: 'IDX_TIPO_BENEFICIO_NOME',
        columnNames: ['nome'],
      }),
    );

    await queryRunner.createIndex(
      'tipo_beneficio',
      new TableIndex({
        name: 'IDX_TIPO_BENEFICIO_ATIVO',
        columnNames: ['ativo'],
      }),
    );

    await queryRunner.createIndex(
      'requisito_documento',
      new TableIndex({
        name: 'IDX_REQUISITO_DOCUMENTO_TIPO_BENEFICIO',
        columnNames: ['tipo_beneficio_id'],
      }),
    );

    await queryRunner.createIndex(
      'requisito_documento',
      new TableIndex({
        name: 'IDX_REQUISITO_DOCUMENTO_FASE',
        columnNames: ['fase'],
      }),
    );

    await queryRunner.createIndex(
      'fluxo_beneficio',
      new TableIndex({
        name: 'IDX_FLUXO_BENEFICIO_TIPO_BENEFICIO',
        columnNames: ['tipo_beneficio_id'],
      }),
    );

    await queryRunner.createIndex(
      'fluxo_beneficio',
      new TableIndex({
        name: 'IDX_FLUXO_BENEFICIO_SETOR',
        columnNames: ['setor_id'],
      }),
    );

    await queryRunner.createIndex(
      'campo_dinamico_beneficio',
      new TableIndex({
        name: 'IDX_CAMPO_DINAMICO_TIPO_BENEFICIO',
        columnNames: ['tipo_beneficio_id'],
      }),
    );

    await queryRunner.createIndex(
      'versao_schema_beneficio',
      new TableIndex({
        name: 'IDX_VERSAO_SCHEMA_TIPO_BENEFICIO',
        columnNames: ['tipo_beneficio_id'],
      }),
    );

    await queryRunner.createIndex(
      'versao_schema_beneficio',
      new TableIndex({
        name: 'IDX_VERSAO_SCHEMA_ATIVO',
        columnNames: ['ativo'],
      }),
    );

    // 8. Criar chaves estrangeiras
    await queryRunner.createForeignKey(
      'requisito_documento',
      new TableForeignKey({
        name: 'FK_REQUISITO_DOCUMENTO_TIPO_BENEFICIO',
        columnNames: ['tipo_beneficio_id'],
        referencedTableName: 'tipo_beneficio',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'fluxo_beneficio',
      new TableForeignKey({
        name: 'FK_FLUXO_BENEFICIO_TIPO_BENEFICIO',
        columnNames: ['tipo_beneficio_id'],
        referencedTableName: 'tipo_beneficio',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'fluxo_beneficio',
      new TableForeignKey({
        name: 'FK_FLUXO_BENEFICIO_SETOR',
        columnNames: ['setor_id'],
        referencedTableName: 'setor',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'campo_dinamico_beneficio',
      new TableForeignKey({
        name: 'FK_CAMPO_DINAMICO_TIPO_BENEFICIO',
        columnNames: ['tipo_beneficio_id'],
        referencedTableName: 'tipo_beneficio',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'versao_schema_beneficio',
      new TableForeignKey({
        name: 'FK_VERSAO_SCHEMA_TIPO_BENEFICIO',
        columnNames: ['tipo_beneficio_id'],
        referencedTableName: 'tipo_beneficio',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // 9. Criar triggers para atualização automática de timestamps
    await queryRunner.query(`
      -- Trigger para tipo_beneficio
      CREATE TRIGGER update_tipo_beneficio_timestamp
      BEFORE UPDATE ON tipo_beneficio
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();

      -- Trigger para requisito_documento
      CREATE TRIGGER update_requisito_documento_timestamp
      BEFORE UPDATE ON requisito_documento
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();

      -- Trigger para fluxo_beneficio
      CREATE TRIGGER update_fluxo_beneficio_timestamp
      BEFORE UPDATE ON fluxo_beneficio
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();

      -- Trigger para campo_dinamico_beneficio
      CREATE TRIGGER update_campo_dinamico_beneficio_timestamp
      BEFORE UPDATE ON campo_dinamico_beneficio
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();

      -- Trigger para versao_schema_beneficio
      CREATE TRIGGER update_versao_schema_beneficio_timestamp
      BEFORE UPDATE ON versao_schema_beneficio
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();
    `);

    // 10. Criar políticas RLS para segurança
    await queryRunner.query(`
      -- Habilitar RLS para tabelas do módulo de benefício
      ALTER TABLE tipo_beneficio ENABLE ROW LEVEL SECURITY;
      ALTER TABLE requisito_documento ENABLE ROW LEVEL SECURITY;
      ALTER TABLE fluxo_beneficio ENABLE ROW LEVEL SECURITY;
      ALTER TABLE campo_dinamico_beneficio ENABLE ROW LEVEL SECURITY;
      ALTER TABLE versao_schema_beneficio ENABLE ROW LEVEL SECURITY;

      -- Política para tipo_beneficio
      CREATE POLICY tipo_beneficio_policy ON tipo_beneficio
      USING (removed_at IS NULL)
      WITH CHECK (true);

      -- Política para requisito_documento
      CREATE POLICY requisito_documento_policy ON requisito_documento
      USING (removed_at IS NULL)
      WITH CHECK (true);

      -- Política para fluxo_beneficio
      CREATE POLICY fluxo_beneficio_policy ON fluxo_beneficio
      USING (removed_at IS NULL)
      WITH CHECK (true);

      -- Política para campo_dinamico_beneficio
      CREATE POLICY campo_dinamico_beneficio_policy ON campo_dinamico_beneficio
      USING (removed_at IS NULL)
      WITH CHECK (true);

      -- Política para versao_schema_beneficio
      CREATE POLICY versao_schema_beneficio_policy ON versao_schema_beneficio
      USING (true)
      WITH CHECK (true);
    `);
  }

  /**
   * Reverte todas as alterações feitas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Remover políticas RLS
    await queryRunner.query(`
      DROP POLICY IF EXISTS versao_schema_beneficio_policy ON versao_schema_beneficio;
      DROP POLICY IF EXISTS campo_dinamico_beneficio_policy ON campo_dinamico_beneficio;
      DROP POLICY IF EXISTS fluxo_beneficio_policy ON fluxo_beneficio;
      DROP POLICY IF EXISTS requisito_documento_policy ON requisito_documento;
      DROP POLICY IF EXISTS tipo_beneficio_policy ON tipo_beneficio;

      ALTER TABLE versao_schema_beneficio DISABLE ROW LEVEL SECURITY;
      ALTER TABLE campo_dinamico_beneficio DISABLE ROW LEVEL SECURITY;
      ALTER TABLE fluxo_beneficio DISABLE ROW LEVEL SECURITY;
      ALTER TABLE requisito_documento DISABLE ROW LEVEL SECURITY;
      ALTER TABLE tipo_beneficio DISABLE ROW LEVEL SECURITY;
    `);

    // 2. Remover triggers
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_versao_schema_beneficio_timestamp ON versao_schema_beneficio;
      DROP TRIGGER IF EXISTS update_campo_dinamico_beneficio_timestamp ON campo_dinamico_beneficio;
      DROP TRIGGER IF EXISTS update_fluxo_beneficio_timestamp ON fluxo_beneficio;
      DROP TRIGGER IF EXISTS update_requisito_documento_timestamp ON requisito_documento;
      DROP TRIGGER IF EXISTS update_tipo_beneficio_timestamp ON tipo_beneficio;
    `);

    // 3. Remover chaves estrangeiras
    await queryRunner.dropForeignKey(
      'versao_schema_beneficio',
      'FK_VERSAO_SCHEMA_TIPO_BENEFICIO',
    );
    await queryRunner.dropForeignKey(
      'campo_dinamico_beneficio',
      'FK_CAMPO_DINAMICO_TIPO_BENEFICIO',
    );
    await queryRunner.dropForeignKey(
      'fluxo_beneficio',
      'FK_FLUXO_BENEFICIO_SETOR',
    );
    await queryRunner.dropForeignKey(
      'fluxo_beneficio',
      'FK_FLUXO_BENEFICIO_TIPO_BENEFICIO',
    );
    await queryRunner.dropForeignKey(
      'requisito_documento',
      'FK_REQUISITO_DOCUMENTO_TIPO_BENEFICIO',
    );

    // 4. Remover índices
    await queryRunner.dropIndex(
      'versao_schema_beneficio',
      'IDX_VERSAO_SCHEMA_ATIVO',
    );
    await queryRunner.dropIndex(
      'versao_schema_beneficio',
      'IDX_VERSAO_SCHEMA_TIPO_BENEFICIO',
    );
    await queryRunner.dropIndex(
      'campo_dinamico_beneficio',
      'IDX_CAMPO_DINAMICO_TIPO_BENEFICIO',
    );
    await queryRunner.dropIndex('fluxo_beneficio', 'IDX_FLUXO_BENEFICIO_SETOR');
    await queryRunner.dropIndex(
      'fluxo_beneficio',
      'IDX_FLUXO_BENEFICIO_TIPO_BENEFICIO',
    );
    await queryRunner.dropIndex(
      'requisito_documento',
      'IDX_REQUISITO_DOCUMENTO_FASE',
    );
    await queryRunner.dropIndex(
      'requisito_documento',
      'IDX_REQUISITO_DOCUMENTO_TIPO_BENEFICIO',
    );
    await queryRunner.dropIndex('tipo_beneficio', 'IDX_TIPO_BENEFICIO_ATIVO');
    await queryRunner.dropIndex('tipo_beneficio', 'IDX_TIPO_BENEFICIO_NOME');

    // 5. Remover tabelas
    await queryRunner.dropTable('versao_schema_beneficio');
    await queryRunner.dropTable('campo_dinamico_beneficio');
    await queryRunner.dropTable('fluxo_beneficio');
    await queryRunner.dropTable('requisito_documento');
    await queryRunner.dropTable('tipo_beneficio');

    // 6. Remover tipos enumerados
    await queryRunner.query(`
      DROP TYPE IF EXISTS "tipo_campo_enum";
      DROP TYPE IF EXISTS "fase_requisito_enum";
      DROP TYPE IF EXISTS "periodicidade_enum";
    `);
  }
}
