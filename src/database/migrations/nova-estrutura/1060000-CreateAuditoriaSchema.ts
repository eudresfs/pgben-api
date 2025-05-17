import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration: CreateAuditoriaSchema
 *
 * Descrição: Cria a estrutura do módulo de auditoria, incluindo tabelas para
 * registro de logs de ações, alterações de dados e trilhas de auditoria.
 *
 * Domínio: Auditoria
 * Dependências: 1050000-CreateDocumentoSchema.ts
 *
 * @author Arquiteto de Dados
 * @date 16/05/2025
 */
export class CreateAuditoriaSchema1060000 implements MigrationInterface {
  name = 'CreateAuditoriaSchema20250516000600';

  /**
   * Cria as estruturas do módulo de auditoria
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Criar tipos enumerados
    await queryRunner.query(`
      CREATE TYPE "tipo_acao_enum" AS ENUM (
        'criar',
        'visualizar',
        'atualizar',
        'excluir',
        'autenticar',
        'autorizar',
        'exportar',
        'imprimir',
        'enviar',
        'receber'
      );
      
      CREATE TYPE "nivel_log_enum" AS ENUM (
        'info',
        'aviso',
        'erro',
        'critico',
        'seguranca'
      );
      
      CREATE TYPE "status_auditoria_enum" AS ENUM (
        'pendente',
        'em_analise',
        'concluida',
        'arquivada'
      );
    `);

    // 2. Criar tabela de log de ações
    await queryRunner.createTable(
      new Table({
        name: 'log_acao',
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
            isNullable: true,
          },
          {
            name: 'data_hora',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'tipo_acao',
            type: 'tipo_acao_enum',
            isNullable: false,
          },
          {
            name: 'entidade',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'entidade_id',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'descricao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'ip',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'user_agent',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'nivel',
            type: 'nivel_log_enum',
            default: "'info'",
          },
          {
            name: 'metadados',
            type: 'jsonb',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // 3. Criar tabela de log de alterações
    await queryRunner.createTable(
      new Table({
        name: 'log_alteracao',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'log_acao_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'campo',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'valor_anterior',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'valor_novo',
            type: 'text',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // 4. Criar tabela de trilha de auditoria
    await queryRunner.createTable(
      new Table({
        name: 'trilha_auditoria',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'titulo',
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
            name: 'responsavel_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'status_auditoria_enum',
            default: "'pendente'",
          },
          {
            name: 'resultado',
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

    // 5. Criar tabela de itens de trilha de auditoria
    await queryRunner.createTable(
      new Table({
        name: 'item_trilha_auditoria',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'trilha_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'log_acao_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'observacao',
            type: 'text',
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

    // 6. Criar tabela de alertas de segurança
    await queryRunner.createTable(
      new Table({
        name: 'alerta_seguranca',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'titulo',
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
            name: 'data_ocorrencia',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'nivel',
            type: 'nivel_log_enum',
            default: "'aviso'",
          },
          {
            name: 'resolvido',
            type: 'boolean',
            default: false,
          },
          {
            name: 'data_resolucao',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'usuario_resolucao_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'log_acao_id',
            type: 'uuid',
            isNullable: true,
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
      'log_acao',
      new TableIndex({
        name: 'IDX_LOG_ACAO_USUARIO',
        columnNames: ['usuario_id'],
      }),
    );

    await queryRunner.createIndex(
      'log_acao',
      new TableIndex({
        name: 'IDX_LOG_ACAO_DATA_HORA',
        columnNames: ['data_hora'],
      }),
    );

    await queryRunner.createIndex(
      'log_acao',
      new TableIndex({
        name: 'IDX_LOG_ACAO_TIPO_ACAO',
        columnNames: ['tipo_acao'],
      }),
    );

    await queryRunner.createIndex(
      'log_acao',
      new TableIndex({
        name: 'IDX_LOG_ACAO_ENTIDADE',
        columnNames: ['entidade'],
      }),
    );

    await queryRunner.createIndex(
      'log_acao',
      new TableIndex({
        name: 'IDX_LOG_ACAO_NIVEL',
        columnNames: ['nivel'],
      }),
    );

    await queryRunner.createIndex(
      'log_alteracao',
      new TableIndex({
        name: 'IDX_LOG_ALTERACAO_LOG_ACAO',
        columnNames: ['log_acao_id'],
      }),
    );

    await queryRunner.createIndex(
      'trilha_auditoria',
      new TableIndex({
        name: 'IDX_TRILHA_AUDITORIA_STATUS',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'trilha_auditoria',
      new TableIndex({
        name: 'IDX_TRILHA_AUDITORIA_RESPONSAVEL',
        columnNames: ['responsavel_id'],
      }),
    );

    await queryRunner.createIndex(
      'item_trilha_auditoria',
      new TableIndex({
        name: 'IDX_ITEM_TRILHA_AUDITORIA_TRILHA',
        columnNames: ['trilha_id'],
      }),
    );

    await queryRunner.createIndex(
      'item_trilha_auditoria',
      new TableIndex({
        name: 'IDX_ITEM_TRILHA_AUDITORIA_LOG_ACAO',
        columnNames: ['log_acao_id'],
      }),
    );

    await queryRunner.createIndex(
      'alerta_seguranca',
      new TableIndex({
        name: 'IDX_ALERTA_SEGURANCA_NIVEL',
        columnNames: ['nivel'],
      }),
    );

    await queryRunner.createIndex(
      'alerta_seguranca',
      new TableIndex({
        name: 'IDX_ALERTA_SEGURANCA_RESOLVIDO',
        columnNames: ['resolvido'],
      }),
    );

    await queryRunner.createIndex(
      'alerta_seguranca',
      new TableIndex({
        name: 'IDX_ALERTA_SEGURANCA_LOG_ACAO',
        columnNames: ['log_acao_id'],
      }),
    );

    // 8. Criar chaves estrangeiras
    await queryRunner.createForeignKey(
      'log_acao',
      new TableForeignKey({
        name: 'FK_LOG_ACAO_USUARIO',
        columnNames: ['usuario_id'],
        referencedTableName: 'usuario',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'log_alteracao',
      new TableForeignKey({
        name: 'FK_LOG_ALTERACAO_LOG_ACAO',
        columnNames: ['log_acao_id'],
        referencedTableName: 'log_acao',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'trilha_auditoria',
      new TableForeignKey({
        name: 'FK_TRILHA_AUDITORIA_RESPONSAVEL',
        columnNames: ['responsavel_id'],
        referencedTableName: 'usuario',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'item_trilha_auditoria',
      new TableForeignKey({
        name: 'FK_ITEM_TRILHA_AUDITORIA_TRILHA',
        columnNames: ['trilha_id'],
        referencedTableName: 'trilha_auditoria',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'item_trilha_auditoria',
      new TableForeignKey({
        name: 'FK_ITEM_TRILHA_AUDITORIA_LOG_ACAO',
        columnNames: ['log_acao_id'],
        referencedTableName: 'log_acao',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'alerta_seguranca',
      new TableForeignKey({
        name: 'FK_ALERTA_SEGURANCA_USUARIO_RESOLUCAO',
        columnNames: ['usuario_resolucao_id'],
        referencedTableName: 'usuario',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'alerta_seguranca',
      new TableForeignKey({
        name: 'FK_ALERTA_SEGURANCA_LOG_ACAO',
        columnNames: ['log_acao_id'],
        referencedTableName: 'log_acao',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // 9. Criar triggers para atualização automática de timestamps
    await queryRunner.query(`
      -- Trigger para trilha_auditoria
      CREATE TRIGGER update_trilha_auditoria_timestamp
      BEFORE UPDATE ON trilha_auditoria
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();

      -- Trigger para alerta_seguranca
      CREATE TRIGGER update_alerta_seguranca_timestamp
      BEFORE UPDATE ON alerta_seguranca
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();
    `);

    // 10. Criar políticas RLS para segurança
    await queryRunner.query(`
      -- Habilitar RLS para tabelas do módulo de auditoria
      ALTER TABLE log_acao ENABLE ROW LEVEL SECURITY;
      ALTER TABLE log_alteracao ENABLE ROW LEVEL SECURITY;
      ALTER TABLE trilha_auditoria ENABLE ROW LEVEL SECURITY;
      ALTER TABLE item_trilha_auditoria ENABLE ROW LEVEL SECURITY;
      ALTER TABLE alerta_seguranca ENABLE ROW LEVEL SECURITY;

      -- Política para log_acao
      CREATE POLICY log_acao_policy ON log_acao
      USING (true)
      WITH CHECK (true);

      -- Política para log_alteracao
      CREATE POLICY log_alteracao_policy ON log_alteracao
      USING (true)
      WITH CHECK (true);

      -- Política para trilha_auditoria
      CREATE POLICY trilha_auditoria_policy ON trilha_auditoria
      USING (removed_at IS NULL)
      WITH CHECK (true);

      -- Política para item_trilha_auditoria
      CREATE POLICY item_trilha_auditoria_policy ON item_trilha_auditoria
      USING (true)
      WITH CHECK (true);

      -- Política para alerta_seguranca
      CREATE POLICY alerta_seguranca_policy ON alerta_seguranca
      USING (true)
      WITH CHECK (true);
    `);

    // 11. Criar função para registro automático de alterações
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION registrar_alteracao()
      RETURNS TRIGGER AS $$
      DECLARE
        log_id UUID;
        col TEXT;
        old_val TEXT;
        new_val TEXT;
      BEGIN
        -- Criar log de ação
        INSERT INTO log_acao (
          usuario_id,
          tipo_acao,
          entidade,
          entidade_id,
          descricao,
          nivel
        ) VALUES (
          current_setting('app.current_user_id', true)::UUID,
          CASE
            WHEN TG_OP = 'INSERT' THEN 'criar'::tipo_acao_enum
            WHEN TG_OP = 'UPDATE' THEN 'atualizar'::tipo_acao_enum
            WHEN TG_OP = 'DELETE' THEN 'excluir'::tipo_acao_enum
            ELSE 'visualizar'::tipo_acao_enum
          END,
          TG_TABLE_NAME,
          CASE
            WHEN TG_OP = 'INSERT' THEN NEW.id::TEXT
            WHEN TG_OP = 'UPDATE' THEN NEW.id::TEXT
            WHEN TG_OP = 'DELETE' THEN OLD.id::TEXT
            ELSE NULL
          END,
          'Operação ' || TG_OP || ' na tabela ' || TG_TABLE_NAME,
          'info'::nivel_log_enum
        ) RETURNING id INTO log_id;
        
        -- Registrar alterações para cada coluna
        IF TG_OP = 'UPDATE' THEN
          FOR col IN SELECT column_name FROM information_schema.columns 
                    WHERE table_name = TG_TABLE_NAME AND table_schema = 'public' LOOP
            
            EXECUTE format('SELECT $1.%I::TEXT, $2.%I::TEXT', col, col)
            INTO old_val, new_val
            USING OLD, NEW;
            
            IF old_val IS DISTINCT FROM new_val THEN
              INSERT INTO log_alteracao (log_acao_id, campo, valor_anterior, valor_novo)
              VALUES (log_id, col, old_val, new_val);
            END IF;
          END LOOP;
        ELSIF TG_OP = 'INSERT' THEN
          FOR col IN SELECT column_name FROM information_schema.columns 
                    WHERE table_name = TG_TABLE_NAME AND table_schema = 'public' LOOP
            
            EXECUTE format('SELECT $1.%I::TEXT', col)
            INTO new_val
            USING NEW;
            
            IF new_val IS NOT NULL THEN
              INSERT INTO log_alteracao (log_acao_id, campo, valor_anterior, valor_novo)
              VALUES (log_id, col, NULL, new_val);
            END IF;
          END LOOP;
        ELSIF TG_OP = 'DELETE' THEN
          FOR col IN SELECT column_name FROM information_schema.columns 
                    WHERE table_name = TG_TABLE_NAME AND table_schema = 'public' LOOP
            
            EXECUTE format('SELECT $1.%I::TEXT', col)
            INTO old_val
            USING OLD;
            
            IF old_val IS NOT NULL THEN
              INSERT INTO log_alteracao (log_acao_id, campo, valor_anterior, valor_novo)
              VALUES (log_id, col, old_val, NULL);
            END IF;
          END LOOP;
        END IF;
        
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);
  }

  /**
   * Reverte todas as alterações feitas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Remover função de registro automático de alterações
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS registrar_alteracao();
    `);

    // 2. Remover políticas RLS
    await queryRunner.query(`
      DROP POLICY IF EXISTS alerta_seguranca_policy ON alerta_seguranca;
      DROP POLICY IF EXISTS item_trilha_auditoria_policy ON item_trilha_auditoria;
      DROP POLICY IF EXISTS trilha_auditoria_policy ON trilha_auditoria;
      DROP POLICY IF EXISTS log_alteracao_policy ON log_alteracao;
      DROP POLICY IF EXISTS log_acao_policy ON log_acao;

      ALTER TABLE alerta_seguranca DISABLE ROW LEVEL SECURITY;
      ALTER TABLE item_trilha_auditoria DISABLE ROW LEVEL SECURITY;
      ALTER TABLE trilha_auditoria DISABLE ROW LEVEL SECURITY;
      ALTER TABLE log_alteracao DISABLE ROW LEVEL SECURITY;
      ALTER TABLE log_acao DISABLE ROW LEVEL SECURITY;
    `);

    // 3. Remover triggers
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_alerta_seguranca_timestamp ON alerta_seguranca;
      DROP TRIGGER IF EXISTS update_trilha_auditoria_timestamp ON trilha_auditoria;
    `);

    // 4. Remover chaves estrangeiras
    await queryRunner.dropForeignKey(
      'alerta_seguranca',
      'FK_ALERTA_SEGURANCA_LOG_ACAO',
    );
    await queryRunner.dropForeignKey(
      'alerta_seguranca',
      'FK_ALERTA_SEGURANCA_USUARIO_RESOLUCAO',
    );
    await queryRunner.dropForeignKey(
      'item_trilha_auditoria',
      'FK_ITEM_TRILHA_AUDITORIA_LOG_ACAO',
    );
    await queryRunner.dropForeignKey(
      'item_trilha_auditoria',
      'FK_ITEM_TRILHA_AUDITORIA_TRILHA',
    );
    await queryRunner.dropForeignKey(
      'trilha_auditoria',
      'FK_TRILHA_AUDITORIA_RESPONSAVEL',
    );
    await queryRunner.dropForeignKey(
      'log_alteracao',
      'FK_LOG_ALTERACAO_LOG_ACAO',
    );
    await queryRunner.dropForeignKey('log_acao', 'FK_LOG_ACAO_USUARIO');

    // 5. Remover índices
    await queryRunner.dropIndex(
      'alerta_seguranca',
      'IDX_ALERTA_SEGURANCA_LOG_ACAO',
    );
    await queryRunner.dropIndex(
      'alerta_seguranca',
      'IDX_ALERTA_SEGURANCA_RESOLVIDO',
    );
    await queryRunner.dropIndex(
      'alerta_seguranca',
      'IDX_ALERTA_SEGURANCA_NIVEL',
    );
    await queryRunner.dropIndex(
      'item_trilha_auditoria',
      'IDX_ITEM_TRILHA_AUDITORIA_LOG_ACAO',
    );
    await queryRunner.dropIndex(
      'item_trilha_auditoria',
      'IDX_ITEM_TRILHA_AUDITORIA_TRILHA',
    );
    await queryRunner.dropIndex(
      'trilha_auditoria',
      'IDX_TRILHA_AUDITORIA_RESPONSAVEL',
    );
    await queryRunner.dropIndex(
      'trilha_auditoria',
      'IDX_TRILHA_AUDITORIA_STATUS',
    );
    await queryRunner.dropIndex('log_alteracao', 'IDX_LOG_ALTERACAO_LOG_ACAO');
    await queryRunner.dropIndex('log_acao', 'IDX_LOG_ACAO_NIVEL');
    await queryRunner.dropIndex('log_acao', 'IDX_LOG_ACAO_ENTIDADE');
    await queryRunner.dropIndex('log_acao', 'IDX_LOG_ACAO_TIPO_ACAO');
    await queryRunner.dropIndex('log_acao', 'IDX_LOG_ACAO_DATA_HORA');
    await queryRunner.dropIndex('log_acao', 'IDX_LOG_ACAO_USUARIO');

    // 6. Remover tabelas
    await queryRunner.dropTable('alerta_seguranca');
    await queryRunner.dropTable('item_trilha_auditoria');
    await queryRunner.dropTable('trilha_auditoria');
    await queryRunner.dropTable('log_alteracao');
    await queryRunner.dropTable('log_acao');

    // 7. Remover tipos enumerados
    await queryRunner.query(`
      DROP TYPE IF EXISTS "status_auditoria_enum";
      DROP TYPE IF EXISTS "nivel_log_enum";
      DROP TYPE IF EXISTS "tipo_acao_enum";
    `);
  }
}
