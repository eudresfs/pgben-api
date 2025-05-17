import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration: CreateDocumentoSchema
 *
 * Descrição: Cria a estrutura do módulo de documento, incluindo tabelas para
 * modelos de documentos, templates, metadados e controle de versões.
 *
 * Domínio: Documento
 * Dependências: 1040000-CreateSolicitacaoSchema.ts
 *
 * @author Arquiteto de Dados
 * @date 16/05/2025
 */
export class CreateDocumentoSchema1050000 implements MigrationInterface {
  name = 'CreateDocumentoSchema20250516000500';

  /**
   * Cria as estruturas do módulo de documento
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Criar tipos enumerados
    await queryRunner.query(`
      CREATE TYPE "tipo_modelo_documento_enum" AS ENUM (
        'declaracao',
        'parecer',
        'oficio',
        'relatorio',
        'formulario',
        'termo',
        'outro'
      );
      
      CREATE TYPE "formato_documento_enum" AS ENUM (
        'html',
        'pdf',
        'docx',
        'markdown',
        'texto'
      );
    `);

    // 2. Criar tabela de categorias de documento
    await queryRunner.createTable(
      new Table({
        name: 'categoria_documento',
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
            length: '100',
            isNullable: false,
          },
          {
            name: 'descricao',
            type: 'text',
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
          {
            name: 'removed_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // 3. Criar tabela de modelos de documento
    await queryRunner.createTable(
      new Table({
        name: 'modelo_documento',
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
            name: 'tipo',
            type: 'tipo_modelo_documento_enum',
            isNullable: false,
          },
          {
            name: 'categoria_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'formato',
            type: 'formato_documento_enum',
            isNullable: false,
          },
          {
            name: 'conteudo_template',
            type: 'text',
            isNullable: false,
            comment: 'Template com marcadores para substituição',
          },
          {
            name: 'metadados',
            type: 'jsonb',
            isNullable: true,
            comment: 'Metadados do modelo, como campos disponíveis',
          },
          {
            name: 'versao',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'1.0'",
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

    // 4. Criar tabela de documentos gerados
    await queryRunner.createTable(
      new Table({
        name: 'documento_gerado',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'modelo_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'titulo',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'conteudo',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'formato',
            type: 'formato_documento_enum',
            isNullable: false,
          },
          {
            name: 'caminho_arquivo',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'hash',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'dados_contexto',
            type: 'jsonb',
            isNullable: true,
            comment: 'Dados usados para gerar o documento',
          },
          {
            name: 'solicitacao_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'cidadao_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'usuario_geracao_id',
            type: 'uuid',
            isNullable: false,
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

    // 5. Criar tabela de assinaturas de documento
    await queryRunner.createTable(
      new Table({
        name: 'assinatura_documento',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'documento_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'usuario_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'data_assinatura',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'ip',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'hash_assinatura',
            type: 'varchar',
            length: '128',
            isNullable: false,
          },
          {
            name: 'metadados',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // 6. Criar tabela de histórico de versões de documento
    await queryRunner.createTable(
      new Table({
        name: 'historico_versao_documento',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'documento_id',
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
            name: 'conteudo',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'motivo_alteracao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'usuario_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // 7. Criar índices para otimização de consultas
    await queryRunner.createIndex(
      'categoria_documento',
      new TableIndex({
        name: 'IDX_CATEGORIA_DOCUMENTO_NOME',
        columnNames: ['nome'],
      }),
    );

    await queryRunner.createIndex(
      'modelo_documento',
      new TableIndex({
        name: 'IDX_MODELO_DOCUMENTO_NOME',
        columnNames: ['nome'],
      }),
    );

    await queryRunner.createIndex(
      'modelo_documento',
      new TableIndex({
        name: 'IDX_MODELO_DOCUMENTO_TIPO',
        columnNames: ['tipo'],
      }),
    );

    await queryRunner.createIndex(
      'modelo_documento',
      new TableIndex({
        name: 'IDX_MODELO_DOCUMENTO_CATEGORIA',
        columnNames: ['categoria_id'],
      }),
    );

    await queryRunner.createIndex(
      'modelo_documento',
      new TableIndex({
        name: 'IDX_MODELO_DOCUMENTO_ATIVO',
        columnNames: ['ativo'],
      }),
    );

    await queryRunner.createIndex(
      'documento_gerado',
      new TableIndex({
        name: 'IDX_DOCUMENTO_GERADO_MODELO',
        columnNames: ['modelo_id'],
      }),
    );

    await queryRunner.createIndex(
      'documento_gerado',
      new TableIndex({
        name: 'IDX_DOCUMENTO_GERADO_SOLICITACAO',
        columnNames: ['solicitacao_id'],
      }),
    );

    await queryRunner.createIndex(
      'documento_gerado',
      new TableIndex({
        name: 'IDX_DOCUMENTO_GERADO_CIDADAO',
        columnNames: ['cidadao_id'],
      }),
    );

    await queryRunner.createIndex(
      'assinatura_documento',
      new TableIndex({
        name: 'IDX_ASSINATURA_DOCUMENTO',
        columnNames: ['documento_id'],
      }),
    );

    await queryRunner.createIndex(
      'assinatura_documento',
      new TableIndex({
        name: 'IDX_ASSINATURA_USUARIO',
        columnNames: ['usuario_id'],
      }),
    );

    await queryRunner.createIndex(
      'historico_versao_documento',
      new TableIndex({
        name: 'IDX_HISTORICO_VERSAO_DOCUMENTO',
        columnNames: ['documento_id'],
      }),
    );

    // 8. Criar chaves estrangeiras
    await queryRunner.createForeignKey(
      'modelo_documento',
      new TableForeignKey({
        name: 'FK_MODELO_DOCUMENTO_CATEGORIA',
        columnNames: ['categoria_id'],
        referencedTableName: 'categoria_documento',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'documento_gerado',
      new TableForeignKey({
        name: 'FK_DOCUMENTO_GERADO_MODELO',
        columnNames: ['modelo_id'],
        referencedTableName: 'modelo_documento',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'documento_gerado',
      new TableForeignKey({
        name: 'FK_DOCUMENTO_GERADO_SOLICITACAO',
        columnNames: ['solicitacao_id'],
        referencedTableName: 'solicitacao',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'documento_gerado',
      new TableForeignKey({
        name: 'FK_DOCUMENTO_GERADO_CIDADAO',
        columnNames: ['cidadao_id'],
        referencedTableName: 'cidadao',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'documento_gerado',
      new TableForeignKey({
        name: 'FK_DOCUMENTO_GERADO_USUARIO',
        columnNames: ['usuario_geracao_id'],
        referencedTableName: 'usuario',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'assinatura_documento',
      new TableForeignKey({
        name: 'FK_ASSINATURA_DOCUMENTO',
        columnNames: ['documento_id'],
        referencedTableName: 'documento_gerado',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'assinatura_documento',
      new TableForeignKey({
        name: 'FK_ASSINATURA_USUARIO',
        columnNames: ['usuario_id'],
        referencedTableName: 'usuario',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'historico_versao_documento',
      new TableForeignKey({
        name: 'FK_HISTORICO_VERSAO_DOCUMENTO',
        columnNames: ['documento_id'],
        referencedTableName: 'documento_gerado',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'historico_versao_documento',
      new TableForeignKey({
        name: 'FK_HISTORICO_VERSAO_USUARIO',
        columnNames: ['usuario_id'],
        referencedTableName: 'usuario',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    // 9. Criar triggers para atualização automática de timestamps
    await queryRunner.query(`
      -- Trigger para categoria_documento
      CREATE TRIGGER update_categoria_documento_timestamp
      BEFORE UPDATE ON categoria_documento
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();

      -- Trigger para modelo_documento
      CREATE TRIGGER update_modelo_documento_timestamp
      BEFORE UPDATE ON modelo_documento
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();

      -- Trigger para documento_gerado
      CREATE TRIGGER update_documento_gerado_timestamp
      BEFORE UPDATE ON documento_gerado
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();
    `);

    // 10. Criar políticas RLS para segurança
    await queryRunner.query(`
      -- Habilitar RLS para tabelas do módulo de documento
      ALTER TABLE categoria_documento ENABLE ROW LEVEL SECURITY;
      ALTER TABLE modelo_documento ENABLE ROW LEVEL SECURITY;
      ALTER TABLE documento_gerado ENABLE ROW LEVEL SECURITY;
      ALTER TABLE assinatura_documento ENABLE ROW LEVEL SECURITY;
      ALTER TABLE historico_versao_documento ENABLE ROW LEVEL SECURITY;

      -- Política para categoria_documento
      CREATE POLICY categoria_documento_policy ON categoria_documento
      USING (removed_at IS NULL)
      WITH CHECK (true);

      -- Política para modelo_documento
      CREATE POLICY modelo_documento_policy ON modelo_documento
      USING (removed_at IS NULL)
      WITH CHECK (true);

      -- Política para documento_gerado
      CREATE POLICY documento_gerado_policy ON documento_gerado
      USING (removed_at IS NULL)
      WITH CHECK (true);

      -- Política para assinatura_documento
      CREATE POLICY assinatura_documento_policy ON assinatura_documento
      USING (true)
      WITH CHECK (true);

      -- Política para historico_versao_documento
      CREATE POLICY historico_versao_documento_policy ON historico_versao_documento
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
      DROP POLICY IF EXISTS historico_versao_documento_policy ON historico_versao_documento;
      DROP POLICY IF EXISTS assinatura_documento_policy ON assinatura_documento;
      DROP POLICY IF EXISTS documento_gerado_policy ON documento_gerado;
      DROP POLICY IF EXISTS modelo_documento_policy ON modelo_documento;
      DROP POLICY IF EXISTS categoria_documento_policy ON categoria_documento;

      ALTER TABLE historico_versao_documento DISABLE ROW LEVEL SECURITY;
      ALTER TABLE assinatura_documento DISABLE ROW LEVEL SECURITY;
      ALTER TABLE documento_gerado DISABLE ROW LEVEL SECURITY;
      ALTER TABLE modelo_documento DISABLE ROW LEVEL SECURITY;
      ALTER TABLE categoria_documento DISABLE ROW LEVEL SECURITY;
    `);

    // 2. Remover triggers
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_documento_gerado_timestamp ON documento_gerado;
      DROP TRIGGER IF EXISTS update_modelo_documento_timestamp ON modelo_documento;
      DROP TRIGGER IF EXISTS update_categoria_documento_timestamp ON categoria_documento;
    `);

    // 3. Remover chaves estrangeiras
    await queryRunner.dropForeignKey(
      'historico_versao_documento',
      'FK_HISTORICO_VERSAO_USUARIO',
    );
    await queryRunner.dropForeignKey(
      'historico_versao_documento',
      'FK_HISTORICO_VERSAO_DOCUMENTO',
    );
    await queryRunner.dropForeignKey(
      'assinatura_documento',
      'FK_ASSINATURA_USUARIO',
    );
    await queryRunner.dropForeignKey(
      'assinatura_documento',
      'FK_ASSINATURA_DOCUMENTO',
    );
    await queryRunner.dropForeignKey(
      'documento_gerado',
      'FK_DOCUMENTO_GERADO_USUARIO',
    );
    await queryRunner.dropForeignKey(
      'documento_gerado',
      'FK_DOCUMENTO_GERADO_CIDADAO',
    );
    await queryRunner.dropForeignKey(
      'documento_gerado',
      'FK_DOCUMENTO_GERADO_SOLICITACAO',
    );
    await queryRunner.dropForeignKey(
      'documento_gerado',
      'FK_DOCUMENTO_GERADO_MODELO',
    );
    await queryRunner.dropForeignKey(
      'modelo_documento',
      'FK_MODELO_DOCUMENTO_CATEGORIA',
    );

    // 4. Remover índices
    await queryRunner.dropIndex(
      'historico_versao_documento',
      'IDX_HISTORICO_VERSAO_DOCUMENTO',
    );
    await queryRunner.dropIndex(
      'assinatura_documento',
      'IDX_ASSINATURA_USUARIO',
    );
    await queryRunner.dropIndex(
      'assinatura_documento',
      'IDX_ASSINATURA_DOCUMENTO',
    );
    await queryRunner.dropIndex(
      'documento_gerado',
      'IDX_DOCUMENTO_GERADO_CIDADAO',
    );
    await queryRunner.dropIndex(
      'documento_gerado',
      'IDX_DOCUMENTO_GERADO_SOLICITACAO',
    );
    await queryRunner.dropIndex(
      'documento_gerado',
      'IDX_DOCUMENTO_GERADO_MODELO',
    );
    await queryRunner.dropIndex(
      'modelo_documento',
      'IDX_MODELO_DOCUMENTO_ATIVO',
    );
    await queryRunner.dropIndex(
      'modelo_documento',
      'IDX_MODELO_DOCUMENTO_CATEGORIA',
    );
    await queryRunner.dropIndex(
      'modelo_documento',
      'IDX_MODELO_DOCUMENTO_TIPO',
    );
    await queryRunner.dropIndex(
      'modelo_documento',
      'IDX_MODELO_DOCUMENTO_NOME',
    );
    await queryRunner.dropIndex(
      'categoria_documento',
      'IDX_CATEGORIA_DOCUMENTO_NOME',
    );

    // 5. Remover tabelas
    await queryRunner.dropTable('historico_versao_documento');
    await queryRunner.dropTable('assinatura_documento');
    await queryRunner.dropTable('documento_gerado');
    await queryRunner.dropTable('modelo_documento');
    await queryRunner.dropTable('categoria_documento');

    // 6. Remover tipos enumerados
    await queryRunner.query(`
      DROP TYPE IF EXISTS "formato_documento_enum";
      DROP TYPE IF EXISTS "tipo_modelo_documento_enum";
    `);
  }
}
