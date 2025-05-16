import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration: CreateRelatorioSchema
 * 
 * Descrição: Cria a estrutura do módulo de relatório, incluindo tabelas para
 * definição de relatórios, parâmetros, agendamentos e resultados.
 * 
 * Domínio: Relatório
 * Dependências: 1060000-CreateAuditoriaSchema.ts
 * 
 * @author Arquiteto de Dados
 * @date 16/05/2025
 */
export class CreateRelatorioSchema1070000 implements MigrationInterface {
  name = 'CreateRelatorioSchema20250516000700';

  /**
   * Cria as estruturas do módulo de relatório
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Criar tipos enumerados
    await queryRunner.query(`
      CREATE TYPE "tipo_relatorio_enum" AS ENUM (
        'operacional',
        'gerencial',
        'estatistico',
        'auditoria',
        'personalizado'
      );
      
      CREATE TYPE "formato_saida_enum" AS ENUM (
        'pdf',
        'excel',
        'csv',
        'html',
        'json'
      );
      
      CREATE TYPE "periodicidade_relatorio_enum" AS ENUM (
        'diario',
        'semanal',
        'quinzenal',
        'mensal',
        'bimestral',
        'trimestral',
        'semestral',
        'anual',
        'sob_demanda'
      );
      
      CREATE TYPE "tipo_parametro_enum" AS ENUM (
        'texto',
        'numero',
        'data',
        'booleano',
        'lista',
        'intervalo_data',
        'intervalo_numero'
      );
    `);

    // 2. Criar tabela de categorias de relatório
    await queryRunner.createTable(
      new Table({
        name: 'categoria_relatorio',
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

    // 3. Criar tabela de definição de relatórios
    await queryRunner.createTable(
      new Table({
        name: 'definicao_relatorio',
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
            name: 'categoria_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'tipo',
            type: 'tipo_relatorio_enum',
            isNullable: false,
          },
          {
            name: 'sql_query',
            type: 'text',
            isNullable: true,
            comment: 'Consulta SQL para gerar o relatório',
          },
          {
            name: 'template',
            type: 'text',
            isNullable: true,
            comment: 'Template para formatação do relatório',
          },
          {
            name: 'formatos_disponiveis',
            type: 'formato_saida_enum[]',
            isNullable: false,
            default: "ARRAY['pdf'::formato_saida_enum, 'excel'::formato_saida_enum]",
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

    // 4. Criar tabela de parâmetros de relatório
    await queryRunner.createTable(
      new Table({
        name: 'parametro_relatorio',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'relatorio_id',
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
            type: 'text',
            isNullable: true,
          },
          {
            name: 'tipo',
            type: 'tipo_parametro_enum',
            isNullable: false,
          },
          {
            name: 'obrigatorio',
            type: 'boolean',
            default: false,
          },
          {
            name: 'valor_padrao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'opcoes',
            type: 'jsonb',
            isNullable: true,
            comment: 'Opções para parâmetros do tipo lista',
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

    // 5. Criar tabela de agendamento de relatórios
    await queryRunner.createTable(
      new Table({
        name: 'agendamento_relatorio',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'relatorio_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'usuario_id',
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
            name: 'periodicidade',
            type: 'periodicidade_relatorio_enum',
            isNullable: false,
          },
          {
            name: 'data_inicio',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'data_fim',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'parametros',
            type: 'jsonb',
            isNullable: true,
            comment: 'Parâmetros para execução do relatório',
          },
          {
            name: 'formato_saida',
            type: 'formato_saida_enum',
            isNullable: false,
            default: "'pdf'",
          },
          {
            name: 'destinatarios',
            type: 'jsonb',
            isNullable: true,
            comment: 'Lista de destinatários para envio do relatório',
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

    // 6. Criar tabela de execução de relatórios
    await queryRunner.createTable(
      new Table({
        name: 'execucao_relatorio',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'relatorio_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'agendamento_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'usuario_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'data_inicio',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'data_fim',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'parametros',
            type: 'jsonb',
            isNullable: true,
            comment: 'Parâmetros utilizados na execução',
          },
          {
            name: 'formato_saida',
            type: 'formato_saida_enum',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            isNullable: false,
            default: "'pendente'",
          },
          {
            name: 'mensagem_erro',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'caminho_arquivo',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'tamanho_arquivo',
            type: 'integer',
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
      true,
    );

    // 7. Criar índices para otimização de consultas
    await queryRunner.createIndex(
      'categoria_relatorio',
      new TableIndex({
        name: 'IDX_CATEGORIA_RELATORIO_NOME',
        columnNames: ['nome'],
      }),
    );

    await queryRunner.createIndex(
      'definicao_relatorio',
      new TableIndex({
        name: 'IDX_DEFINICAO_RELATORIO_NOME',
        columnNames: ['nome'],
      }),
    );

    await queryRunner.createIndex(
      'definicao_relatorio',
      new TableIndex({
        name: 'IDX_DEFINICAO_RELATORIO_CATEGORIA',
        columnNames: ['categoria_id'],
      }),
    );

    await queryRunner.createIndex(
      'definicao_relatorio',
      new TableIndex({
        name: 'IDX_DEFINICAO_RELATORIO_TIPO',
        columnNames: ['tipo'],
      }),
    );

    await queryRunner.createIndex(
      'definicao_relatorio',
      new TableIndex({
        name: 'IDX_DEFINICAO_RELATORIO_ATIVO',
        columnNames: ['ativo'],
      }),
    );

    await queryRunner.createIndex(
      'parametro_relatorio',
      new TableIndex({
        name: 'IDX_PARAMETRO_RELATORIO',
        columnNames: ['relatorio_id'],
      }),
    );

    await queryRunner.createIndex(
      'agendamento_relatorio',
      new TableIndex({
        name: 'IDX_AGENDAMENTO_RELATORIO',
        columnNames: ['relatorio_id'],
      }),
    );

    await queryRunner.createIndex(
      'agendamento_relatorio',
      new TableIndex({
        name: 'IDX_AGENDAMENTO_USUARIO',
        columnNames: ['usuario_id'],
      }),
    );

    await queryRunner.createIndex(
      'agendamento_relatorio',
      new TableIndex({
        name: 'IDX_AGENDAMENTO_PERIODICIDADE',
        columnNames: ['periodicidade'],
      }),
    );

    await queryRunner.createIndex(
      'agendamento_relatorio',
      new TableIndex({
        name: 'IDX_AGENDAMENTO_ATIVO',
        columnNames: ['ativo'],
      }),
    );

    await queryRunner.createIndex(
      'execucao_relatorio',
      new TableIndex({
        name: 'IDX_EXECUCAO_RELATORIO',
        columnNames: ['relatorio_id'],
      }),
    );

    await queryRunner.createIndex(
      'execucao_relatorio',
      new TableIndex({
        name: 'IDX_EXECUCAO_AGENDAMENTO',
        columnNames: ['agendamento_id'],
      }),
    );

    await queryRunner.createIndex(
      'execucao_relatorio',
      new TableIndex({
        name: 'IDX_EXECUCAO_USUARIO',
        columnNames: ['usuario_id'],
      }),
    );

    await queryRunner.createIndex(
      'execucao_relatorio',
      new TableIndex({
        name: 'IDX_EXECUCAO_STATUS',
        columnNames: ['status'],
      }),
    );

    // 8. Criar chaves estrangeiras
    await queryRunner.createForeignKey(
      'definicao_relatorio',
      new TableForeignKey({
        name: 'FK_DEFINICAO_RELATORIO_CATEGORIA',
        columnNames: ['categoria_id'],
        referencedTableName: 'categoria_relatorio',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'parametro_relatorio',
      new TableForeignKey({
        name: 'FK_PARAMETRO_RELATORIO',
        columnNames: ['relatorio_id'],
        referencedTableName: 'definicao_relatorio',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'agendamento_relatorio',
      new TableForeignKey({
        name: 'FK_AGENDAMENTO_RELATORIO',
        columnNames: ['relatorio_id'],
        referencedTableName: 'definicao_relatorio',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'agendamento_relatorio',
      new TableForeignKey({
        name: 'FK_AGENDAMENTO_USUARIO',
        columnNames: ['usuario_id'],
        referencedTableName: 'usuario',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'execucao_relatorio',
      new TableForeignKey({
        name: 'FK_EXECUCAO_RELATORIO',
        columnNames: ['relatorio_id'],
        referencedTableName: 'definicao_relatorio',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'execucao_relatorio',
      new TableForeignKey({
        name: 'FK_EXECUCAO_AGENDAMENTO',
        columnNames: ['agendamento_id'],
        referencedTableName: 'agendamento_relatorio',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'execucao_relatorio',
      new TableForeignKey({
        name: 'FK_EXECUCAO_USUARIO',
        columnNames: ['usuario_id'],
        referencedTableName: 'usuario',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // 9. Criar triggers para atualização automática de timestamps
    await queryRunner.query(`
      -- Trigger para categoria_relatorio
      CREATE TRIGGER update_categoria_relatorio_timestamp
      BEFORE UPDATE ON categoria_relatorio
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();

      -- Trigger para definicao_relatorio
      CREATE TRIGGER update_definicao_relatorio_timestamp
      BEFORE UPDATE ON definicao_relatorio
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();

      -- Trigger para parametro_relatorio
      CREATE TRIGGER update_parametro_relatorio_timestamp
      BEFORE UPDATE ON parametro_relatorio
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();

      -- Trigger para agendamento_relatorio
      CREATE TRIGGER update_agendamento_relatorio_timestamp
      BEFORE UPDATE ON agendamento_relatorio
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();

      -- Trigger para execucao_relatorio
      CREATE TRIGGER update_execucao_relatorio_timestamp
      BEFORE UPDATE ON execucao_relatorio
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();
    `);

    // 10. Criar políticas RLS para segurança
    await queryRunner.query(`
      -- Habilitar RLS para tabelas do módulo de relatório
      ALTER TABLE categoria_relatorio ENABLE ROW LEVEL SECURITY;
      ALTER TABLE definicao_relatorio ENABLE ROW LEVEL SECURITY;
      ALTER TABLE parametro_relatorio ENABLE ROW LEVEL SECURITY;
      ALTER TABLE agendamento_relatorio ENABLE ROW LEVEL SECURITY;
      ALTER TABLE execucao_relatorio ENABLE ROW LEVEL SECURITY;

      -- Política para categoria_relatorio
      CREATE POLICY categoria_relatorio_policy ON categoria_relatorio
      USING (removed_at IS NULL)
      WITH CHECK (true);

      -- Política para definicao_relatorio
      CREATE POLICY definicao_relatorio_policy ON definicao_relatorio
      USING (removed_at IS NULL)
      WITH CHECK (true);

      -- Política para parametro_relatorio
      CREATE POLICY parametro_relatorio_policy ON parametro_relatorio
      USING (removed_at IS NULL)
      WITH CHECK (true);

      -- Política para agendamento_relatorio
      CREATE POLICY agendamento_relatorio_policy ON agendamento_relatorio
      USING (removed_at IS NULL)
      WITH CHECK (true);

      -- Política para execucao_relatorio
      CREATE POLICY execucao_relatorio_policy ON execucao_relatorio
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
      DROP POLICY IF EXISTS execucao_relatorio_policy ON execucao_relatorio;
      DROP POLICY IF EXISTS agendamento_relatorio_policy ON agendamento_relatorio;
      DROP POLICY IF EXISTS parametro_relatorio_policy ON parametro_relatorio;
      DROP POLICY IF EXISTS definicao_relatorio_policy ON definicao_relatorio;
      DROP POLICY IF EXISTS categoria_relatorio_policy ON categoria_relatorio;

      ALTER TABLE execucao_relatorio DISABLE ROW LEVEL SECURITY;
      ALTER TABLE agendamento_relatorio DISABLE ROW LEVEL SECURITY;
      ALTER TABLE parametro_relatorio DISABLE ROW LEVEL SECURITY;
      ALTER TABLE definicao_relatorio DISABLE ROW LEVEL SECURITY;
      ALTER TABLE categoria_relatorio DISABLE ROW LEVEL SECURITY;
    `);

    // 2. Remover triggers
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_execucao_relatorio_timestamp ON execucao_relatorio;
      DROP TRIGGER IF EXISTS update_agendamento_relatorio_timestamp ON agendamento_relatorio;
      DROP TRIGGER IF EXISTS update_parametro_relatorio_timestamp ON parametro_relatorio;
      DROP TRIGGER IF EXISTS update_definicao_relatorio_timestamp ON definicao_relatorio;
      DROP TRIGGER IF EXISTS update_categoria_relatorio_timestamp ON categoria_relatorio;
    `);

    // 3. Remover chaves estrangeiras
    await queryRunner.dropForeignKey('execucao_relatorio', 'FK_EXECUCAO_USUARIO');
    await queryRunner.dropForeignKey('execucao_relatorio', 'FK_EXECUCAO_AGENDAMENTO');
    await queryRunner.dropForeignKey('execucao_relatorio', 'FK_EXECUCAO_RELATORIO');
    await queryRunner.dropForeignKey('agendamento_relatorio', 'FK_AGENDAMENTO_USUARIO');
    await queryRunner.dropForeignKey('agendamento_relatorio', 'FK_AGENDAMENTO_RELATORIO');
    await queryRunner.dropForeignKey('parametro_relatorio', 'FK_PARAMETRO_RELATORIO');
    await queryRunner.dropForeignKey('definicao_relatorio', 'FK_DEFINICAO_RELATORIO_CATEGORIA');
    
    // 4. Remover índices
    await queryRunner.dropIndex('execucao_relatorio', 'IDX_EXECUCAO_STATUS');
    await queryRunner.dropIndex('execucao_relatorio', 'IDX_EXECUCAO_USUARIO');
    await queryRunner.dropIndex('execucao_relatorio', 'IDX_EXECUCAO_AGENDAMENTO');
    await queryRunner.dropIndex('execucao_relatorio', 'IDX_EXECUCAO_RELATORIO');
    await queryRunner.dropIndex('agendamento_relatorio', 'IDX_AGENDAMENTO_ATIVO');
    await queryRunner.dropIndex('agendamento_relatorio', 'IDX_AGENDAMENTO_PERIODICIDADE');
    await queryRunner.dropIndex('agendamento_relatorio', 'IDX_AGENDAMENTO_USUARIO');
    await queryRunner.dropIndex('agendamento_relatorio', 'IDX_AGENDAMENTO_RELATORIO');
    await queryRunner.dropIndex('parametro_relatorio', 'IDX_PARAMETRO_RELATORIO');
    await queryRunner.dropIndex('definicao_relatorio', 'IDX_DEFINICAO_RELATORIO_ATIVO');
    await queryRunner.dropIndex('definicao_relatorio', 'IDX_DEFINICAO_RELATORIO_TIPO');
    await queryRunner.dropIndex('definicao_relatorio', 'IDX_DEFINICAO_RELATORIO_CATEGORIA');
    await queryRunner.dropIndex('definicao_relatorio', 'IDX_DEFINICAO_RELATORIO_NOME');
    await queryRunner.dropIndex('categoria_relatorio', 'IDX_CATEGORIA_RELATORIO_NOME');
    
    // 5. Remover tabelas
    await queryRunner.dropTable('execucao_relatorio');
    await queryRunner.dropTable('agendamento_relatorio');
    await queryRunner.dropTable('parametro_relatorio');
    await queryRunner.dropTable('definicao_relatorio');
    await queryRunner.dropTable('categoria_relatorio');
    
    // 6. Remover tipos enumerados
    await queryRunner.query(`
      DROP TYPE IF EXISTS "tipo_parametro_enum";
      DROP TYPE IF EXISTS "periodicidade_relatorio_enum";
      DROP TYPE IF EXISTS "formato_saida_enum";
      DROP TYPE IF EXISTS "tipo_relatorio_enum";
    `);
  }
}
