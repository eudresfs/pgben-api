import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration: AddAvaliacaoHistoricoMonitoramento
 *
 * Descrição: Adiciona as tabelas de avaliação de visitas e histórico de monitoramento
 * para complementar o módulo de monitoramento domiciliar com funcionalidades de
 * avaliação detalhada e auditoria completa.
 *
 * Domínio: Monitoramento
 * Dependências: CreateMonitoramentoSchema
 *
 * @author Arquiteto de Software
 * @date 21/01/2025
 */
export class AddAvaliacaoHistoricoMonitoramento1755800000000
  implements MigrationInterface
{
  name = 'AddAvaliacaoHistoricoMonitoramento1755800000000';

  /**
   * Cria as estruturas de banco de dados para avaliação e histórico
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Criar enums para avaliação de visitas
    await queryRunner.query(`
      CREATE TYPE "tipo_avaliacao" AS ENUM (
        'condicoes_habitacao',
        'saude_familiar',
        'situacao_socioeconomica',
        'documentacao',
        'elegibilidade_beneficio',
        'cumprimento_requisitos',
        'infraestrutura_local',
        'seguranca_ambiente',
        'acesso_servicos_publicos',
        'composicao_familiar',
        'renda_familiar',
        'outros'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "resultado_avaliacao" AS ENUM (
        'adequado',
        'parcialmente_adequado',
        'inadequado',
        'critico',
        'nao_aplicavel',
        'necessita_verificacao'
      );
    `);

    // 2. Criar enums para histórico de monitoramento
    await queryRunner.query(`
      CREATE TYPE "tipo_acao_historico" AS ENUM (
        'agendamento_criado',
        'agendamento_atualizado',
        'agendamento_cancelado',
        'agendamento_reagendado',
        'visita_iniciada',
        'visita_concluida',
        'visita_cancelada',
        'avaliacao_criada',
        'avaliacao_atualizada',
        'avaliacao_removida',
        'problema_identificado',
        'acao_corretiva_aplicada',
        'notificacao_enviada',
        'documento_anexado',
        'status_alterado',
        'observacao_adicionada'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "categoria_historico" AS ENUM (
        'agendamento',
        'visita',
        'avaliacao',
        'sistema',
        'notificacao',
        'documento',
        'auditoria'
      );
    `);

    // 3. Criar tabela avaliacao_visita
    await queryRunner.createTable(
      new Table({
        name: 'avaliacao_visita',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'visita_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'tipo_avaliacao',
            type: 'tipo_avaliacao',
            isNullable: false,
          },
          {
            name: 'criterio_avaliado',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'resultado_avaliacao',
            type: 'resultado_avaliacao',
            isNullable: false,
          },
          {
            name: 'nota_avaliacao',
            type: 'decimal',
            precision: 4,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'observacoes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'evidencias',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'requer_acao_imediata',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          {
            name: 'acao_necessaria',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'prazo_acao',
            type: 'integer',
            isNullable: true,
            comment: 'Prazo em dias para execução da ação',
          },
          {
            name: 'peso_avaliacao',
            type: 'integer',
            isNullable: false,
            default: 5,
            comment: 'Peso da avaliação para cálculos (1-10)',
          },
          {
            name: 'dados_complementares',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'removed_at',
            type: 'timestamp with time zone',
            isNullable: true,
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

    // 4. Criar tabela historico_monitoramento
    await queryRunner.createTable(
      new Table({
        name: 'historico_monitoramento',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tipo_acao',
            type: 'tipo_acao_historico',
            isNullable: false,
          },
          {
            name: 'categoria',
            type: 'categoria_historico',
            isNullable: false,
          },
          {
            name: 'descricao',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'dados_anteriores',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'dados_novos',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'metadados',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'observacoes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'sucesso',
            type: 'boolean',
            isNullable: false,
            default: true,
          },
          {
            name: 'erro',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'duracao_ms',
            type: 'integer',
            isNullable: true,
            comment: 'Duração da operação em milissegundos',
          },
          {
            name: 'usuario_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'cidadao_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'agendamento_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'visita_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'avaliacao_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // 5. Criar foreign keys para avaliacao_visita
    await queryRunner.createForeignKey(
      'avaliacao_visita',
      new TableForeignKey({
        columnNames: ['visita_id'],
        referencedTableName: 'visita_domiciliar',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_avaliacao_visita_visita_id',
      }),
    );

    await queryRunner.createForeignKey(
      'avaliacao_visita',
      new TableForeignKey({
        columnNames: ['created_by'],
        referencedTableName: 'usuario',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        name: 'FK_avaliacao_visita_created_by',
      }),
    );

    await queryRunner.createForeignKey(
      'avaliacao_visita',
      new TableForeignKey({
        columnNames: ['updated_by'],
        referencedTableName: 'usuario',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        name: 'FK_avaliacao_visita_updated_by',
      }),
    );

    // 6. Criar foreign keys para historico_monitoramento
    await queryRunner.createForeignKey(
      'historico_monitoramento',
      new TableForeignKey({
        columnNames: ['usuario_id'],
        referencedTableName: 'usuario',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        name: 'FK_historico_monitoramento_usuario_id',
      }),
    );

    await queryRunner.createForeignKey(
      'historico_monitoramento',
      new TableForeignKey({
        columnNames: ['cidadao_id'],
        referencedTableName: 'cidadao',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        name: 'FK_historico_monitoramento_cidadao_id',
      }),
    );

    await queryRunner.createForeignKey(
      'historico_monitoramento',
      new TableForeignKey({
        columnNames: ['agendamento_id'],
        referencedTableName: 'agendamento_visita',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        name: 'FK_historico_monitoramento_agendamento_id',
      }),
    );

    await queryRunner.createForeignKey(
      'historico_monitoramento',
      new TableForeignKey({
        columnNames: ['visita_id'],
        referencedTableName: 'visita_domiciliar',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        name: 'FK_historico_monitoramento_visita_id',
      }),
    );

    await queryRunner.createForeignKey(
      'historico_monitoramento',
      new TableForeignKey({
        columnNames: ['avaliacao_id'],
        referencedTableName: 'avaliacao_visita',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        name: 'FK_historico_monitoramento_avaliacao_id',
      }),
    );

    // 7. Criar índices para performance
    
    // Índices para avaliacao_visita
    await queryRunner.createIndex(
      'avaliacao_visita',
      new TableIndex({
        name: 'IDX_avaliacao_visita_visita_id',
        columnNames: ['visita_id'],
      }),
    );

    await queryRunner.createIndex(
      'avaliacao_visita',
      new TableIndex({
        name: 'IDX_avaliacao_visita_tipo_resultado',
        columnNames: ['tipo_avaliacao', 'resultado_avaliacao'],
      }),
    );

    await queryRunner.createIndex(
      'avaliacao_visita',
      new TableIndex({
        name: 'IDX_avaliacao_visita_acao_imediata',
        columnNames: ['requer_acao_imediata'],
        where: 'requer_acao_imediata = true',
      }),
    );

    await queryRunner.createIndex(
      'avaliacao_visita',
      new TableIndex({
        name: 'IDX_avaliacao_visita_created_at',
        columnNames: ['created_at'],
      }),
    );

    await queryRunner.createIndex(
      'avaliacao_visita',
      new TableIndex({
        name: 'IDX_avaliacao_visita_nota',
        columnNames: ['nota_avaliacao'],
        where: 'nota_avaliacao IS NOT NULL',
      }),
    );

    // Índices para historico_monitoramento
    await queryRunner.createIndex(
      'historico_monitoramento',
      new TableIndex({
        name: 'IDX_historico_monitoramento_created_at',
        columnNames: ['created_at'],
      }),
    );

    await queryRunner.createIndex(
      'historico_monitoramento',
      new TableIndex({
        name: 'IDX_historico_monitoramento_tipo_categoria',
        columnNames: ['tipo_acao', 'categoria'],
      }),
    );

    await queryRunner.createIndex(
      'historico_monitoramento',
      new TableIndex({
        name: 'IDX_historico_monitoramento_usuario_id',
        columnNames: ['usuario_id'],
      }),
    );

    await queryRunner.createIndex(
      'historico_monitoramento',
      new TableIndex({
        name: 'IDX_historico_monitoramento_cidadao_id',
        columnNames: ['cidadao_id'],
      }),
    );

    await queryRunner.createIndex(
      'historico_monitoramento',
      new TableIndex({
        name: 'IDX_historico_monitoramento_agendamento_id',
        columnNames: ['agendamento_id'],
      }),
    );

    await queryRunner.createIndex(
      'historico_monitoramento',
      new TableIndex({
        name: 'IDX_historico_monitoramento_visita_id',
        columnNames: ['visita_id'],
      }),
    );

    await queryRunner.createIndex(
      'historico_monitoramento',
      new TableIndex({
        name: 'IDX_historico_monitoramento_avaliacao_id',
        columnNames: ['avaliacao_id'],
      }),
    );

    await queryRunner.createIndex(
      'historico_monitoramento',
      new TableIndex({
        name: 'IDX_historico_monitoramento_sucesso',
        columnNames: ['sucesso'],
      }),
    );

    // Índice composto para consultas de auditoria
    await queryRunner.createIndex(
      'historico_monitoramento',
      new TableIndex({
        name: 'IDX_historico_monitoramento_auditoria',
        columnNames: ['usuario_id', 'created_at', 'categoria'],
      }),
    );

    // 8. Criar trigger para atualização automática de updated_at em avaliacao_visita
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_avaliacao_visita_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trigger_update_avaliacao_visita_updated_at
        BEFORE UPDATE ON avaliacao_visita
        FOR EACH ROW
        EXECUTE FUNCTION update_avaliacao_visita_updated_at();
    `);

    // 9. Criar comentários nas tabelas
    await queryRunner.query(`
      COMMENT ON TABLE avaliacao_visita IS 'Tabela para armazenar avaliações detalhadas realizadas durante visitas domiciliares';
    `);

    await queryRunner.query(`
      COMMENT ON TABLE historico_monitoramento IS 'Tabela para auditoria e rastreamento de todas as ações realizadas no módulo de monitoramento';
    `);

    // 10. Criar comentários em colunas importantes
    await queryRunner.query(`
      COMMENT ON COLUMN avaliacao_visita.peso_avaliacao IS 'Peso da avaliação para cálculos ponderados (1-10)';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN avaliacao_visita.prazo_acao IS 'Prazo em dias para execução da ação necessária';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN historico_monitoramento.duracao_ms IS 'Duração da operação em milissegundos para análise de performance';
    `);
  }

  /**
   * Remove as estruturas criadas (rollback)
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Remover triggers
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_update_avaliacao_visita_updated_at ON avaliacao_visita;
    `);

    await queryRunner.query(`
      DROP FUNCTION IF EXISTS update_avaliacao_visita_updated_at();
    `);

    // 2. Remover índices
    await queryRunner.dropIndex('historico_monitoramento', 'IDX_historico_monitoramento_auditoria');
    await queryRunner.dropIndex('historico_monitoramento', 'IDX_historico_monitoramento_sucesso');
    await queryRunner.dropIndex('historico_monitoramento', 'IDX_historico_monitoramento_avaliacao_id');
    await queryRunner.dropIndex('historico_monitoramento', 'IDX_historico_monitoramento_visita_id');
    await queryRunner.dropIndex('historico_monitoramento', 'IDX_historico_monitoramento_agendamento_id');
    await queryRunner.dropIndex('historico_monitoramento', 'IDX_historico_monitoramento_cidadao_id');
    await queryRunner.dropIndex('historico_monitoramento', 'IDX_historico_monitoramento_usuario_id');
    await queryRunner.dropIndex('historico_monitoramento', 'IDX_historico_monitoramento_tipo_categoria');
    await queryRunner.dropIndex('historico_monitoramento', 'IDX_historico_monitoramento_created_at');
    
    await queryRunner.dropIndex('avaliacao_visita', 'IDX_avaliacao_visita_nota');
    await queryRunner.dropIndex('avaliacao_visita', 'IDX_avaliacao_visita_created_at');
    await queryRunner.dropIndex('avaliacao_visita', 'IDX_avaliacao_visita_acao_imediata');
    await queryRunner.dropIndex('avaliacao_visita', 'IDX_avaliacao_visita_tipo_resultado');
    await queryRunner.dropIndex('avaliacao_visita', 'IDX_avaliacao_visita_visita_id');

    // 3. Remover foreign keys
    await queryRunner.dropForeignKey('historico_monitoramento', 'FK_historico_monitoramento_avaliacao_id');
    await queryRunner.dropForeignKey('historico_monitoramento', 'FK_historico_monitoramento_visita_id');
    await queryRunner.dropForeignKey('historico_monitoramento', 'FK_historico_monitoramento_agendamento_id');
    await queryRunner.dropForeignKey('historico_monitoramento', 'FK_historico_monitoramento_cidadao_id');
    await queryRunner.dropForeignKey('historico_monitoramento', 'FK_historico_monitoramento_usuario_id');
    
    await queryRunner.dropForeignKey('avaliacao_visita', 'FK_avaliacao_visita_updated_by');
    await queryRunner.dropForeignKey('avaliacao_visita', 'FK_avaliacao_visita_created_by');
    await queryRunner.dropForeignKey('avaliacao_visita', 'FK_avaliacao_visita_visita_id');

    // 4. Remover tabelas
    await queryRunner.dropTable('historico_monitoramento');
    await queryRunner.dropTable('avaliacao_visita');

    // 5. Remover enums
    await queryRunner.query('DROP TYPE IF EXISTS "categoria_historico";');
    await queryRunner.query('DROP TYPE IF EXISTS "tipo_acao_historico";');
    await queryRunner.query('DROP TYPE IF EXISTS "resultado_avaliacao";');
    await queryRunner.query('DROP TYPE IF EXISTS "tipo_avaliacao";');
  }
}