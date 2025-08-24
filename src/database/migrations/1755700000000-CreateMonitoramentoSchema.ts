import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration: CreateMonitoramentoSchema
 *
 * Descrição: Cria o schema completo para o módulo de monitoramento domiciliar,
 * incluindo tabelas para agendamento e execução de visitas domiciliares.
 *
 * Domínio: Monitoramento
 * Dependências: CreateAllEnums, CreateCidadaoSchema, CreateUsuarioSchema, CreateUnidadeSchema
 *
 * @author Arquiteto de Software
 * @date 20/01/2025
 */
export class CreateMonitoramentoSchema1755700000000
  implements MigrationInterface {
  name = 'CreateMonitoramentoSchema1755700000000';

  /**
   * Cria as estruturas de banco de dados para o módulo de monitoramento
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Criar enums específicos do módulo de monitoramento
    await queryRunner.query(`
      CREATE TYPE "status_agendamento" AS ENUM (
        'agendado',
        'confirmado',
        'em_andamento',
        'realizado',
        'cancelado',
        'reagendado',
        'nao_realizado'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "tipo_visita" AS ENUM (
        'inicial',
        'acompanhamento',
        'renovacao',
        'verificacao',
        'emergencial'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "prioridade_visita" AS ENUM (
        'baixa',
        'normal',
        'alta',
        'urgente'
      );
    `);

    await queryRunner.query(`
      DO $$
        BEGIN
            -- Situação está em conformidade com os critérios do benefício
            IF NOT EXISTS (SELECT 1 FROM pg_enum e
                          JOIN pg_type t ON e.enumtypid = t.oid
                          WHERE t.typname = 'resultado_visita' AND e.enumlabel = 'conforme') THEN
                ALTER TYPE resultado_visita ADD VALUE 'conforme';
            END IF;

            -- Situação não está em conformidade com os critérios
            IF NOT EXISTS (SELECT 1 FROM pg_enum e
                          JOIN pg_type t ON e.enumtypid = t.oid
                          WHERE t.typname = 'resultado_visita' AND e.enumlabel = 'nao_conforme') THEN
                ALTER TYPE resultado_visita ADD VALUE 'nao_conforme';
            END IF;

            -- Situação está parcialmente em conformidade
            IF NOT EXISTS (SELECT 1 FROM pg_enum e
                          JOIN pg_type t ON e.enumtypid = t.oid
                          WHERE t.typname = 'resultado_visita' AND e.enumlabel = 'parcialmente_conforme') THEN
                ALTER TYPE resultado_visita ADD VALUE 'parcialmente_conforme';
            END IF;

            -- Situação requer ação imediata
            IF NOT EXISTS (SELECT 1 FROM pg_enum e
                          JOIN pg_type t ON e.enumtypid = t.oid
                          WHERE t.typname = 'resultado_visita' AND e.enumlabel = 'requer_acao') THEN
                ALTER TYPE resultado_visita ADD VALUE 'requer_acao';
            END IF;

            -- Beneficiário não foi encontrado no endereço
            IF NOT EXISTS (SELECT 1 FROM pg_enum e
                          JOIN pg_type t ON e.enumtypid = t.oid
                          WHERE t.typname = 'resultado_visita' AND e.enumlabel = 'beneficiario_ausente') THEN
                ALTER TYPE resultado_visita ADD VALUE 'beneficiario_ausente';
            END IF;

            -- Endereço não foi localizado
            IF NOT EXISTS (SELECT 1 FROM pg_enum e
                          JOIN pg_type t ON e.enumtypid = t.oid
                          WHERE t.typname = 'resultado_visita' AND e.enumlabel = 'endereco_nao_localizado') THEN
                ALTER TYPE resultado_visita ADD VALUE 'endereco_nao_localizado';
            END IF;

            -- Visita não pôde ser concluída por outros motivos
            IF NOT EXISTS (SELECT 1 FROM pg_enum e
                          JOIN pg_type t ON e.enumtypid = t.oid
                          WHERE t.typname = 'resultado_visita' AND e.enumlabel = 'visita_inconclusiva') THEN
                ALTER TYPE resultado_visita ADD VALUE 'visita_inconclusiva';
            END IF;

            -- Visita foi cancelada
            IF NOT EXISTS (SELECT 1 FROM pg_enum e
                          JOIN pg_type t ON e.enumtypid = t.oid
                          WHERE t.typname = 'resultado_visita' AND e.enumlabel = 'visita_cancelada') THEN
                ALTER TYPE resultado_visita ADD VALUE 'visita_cancelada';
            END IF;

            -- Visita não foi realizada
            IF NOT EXISTS (SELECT 1 FROM pg_enum e
                          JOIN pg_type t ON e.enumtypid = t.oid
                          WHERE t.typname = 'resultado_visita' AND e.enumlabel = 'nao_realizada') THEN
                ALTER TYPE resultado_visita ADD VALUE 'nao_realizada';
            END IF;

            -- Visita foi realizada com sucesso
            IF NOT EXISTS (SELECT 1 FROM pg_enum e
                          JOIN pg_type t ON e.enumtypid = t.oid
                          WHERE t.typname = 'resultado_visita' AND e.enumlabel = 'realizada_com_sucesso') THEN
                ALTER TYPE resultado_visita ADD VALUE 'realizada_com_sucesso';
            END IF;

        END$$;
    `);

    // 2. Criar tabela agendamento_visita
    await queryRunner.createTable(
      new Table({
        name: 'agendamento_visita',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'beneficiario_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'concessao_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'tecnico_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'unidade_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'data_agendamento',
            type: 'timestamp with time zone',
            isNullable: false,
          },
          {
            name: 'tipo_visita',
            type: 'tipo_visita',
            isNullable: false,
          },
          {
            name: 'prioridade',
            type: 'prioridade_visita',
            isNullable: false,
            default: "'normal'",
          },
          {
            name: 'status',
            type: 'status_agendamento',
            isNullable: false,
            default: "'agendado'",
          },
          {
            name: 'observacoes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'endereco_visita',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'telefone_contato',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'notificar_beneficiario',
            type: 'boolean',
            isNullable: false,
            default: true,
          },
          {
            name: 'motivo_visita',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'prazo_limite',
            type: 'date',
            isNullable: true,
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

    // 3. Criar tabela visita_domiciliar
    await queryRunner.createTable(
      new Table({
        name: 'visita_domiciliar',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'agendamento_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'beneficiario_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'unidade_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'tecnico_responsavel_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'data_inicio',
            type: 'timestamp with time zone',
            isNullable: false,
          },
          {
            name: 'data_conclusao',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'resultado',
            type: 'resultado_visita',
            isNullable: false,
          },
          {
            name: 'foi_realizada',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          {
            name: 'motivo_nao_realizacao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'quem_atendeu',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'relacao_beneficiario',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'condicoes_moradia',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'situacao_socioeconomica',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'tipo_visita',
            type: 'tipo_visita',
            isNullable: false,
          },
          {
            name: 'prioridade',
            type: 'prioridade_visita',
            isNullable: false,
            default: "'normal'",
          },
          {
            name: 'status',
            type: 'status_agendamento',
            isNullable: false,
            default: "'agendado'",
          },
          {
            name: 'observacoes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'motivo_problemas_elegibilidade',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'endereco_visitado',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'recomendacoes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'recomenda_renovacao',
            type: 'boolean',
            isNullable: true,
          },
          {
            name: 'justificativa_nao_renovacao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'necessita_nova_visita',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          {
            name: 'prazo_nova_visita',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'motivo_nova_visita',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'problemas_elegibilidade',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          {
            name: 'descricao_problemas',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'nota_avaliacao',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'coordenadas_gps',
            type: 'point',
            isNullable: true,
          },
          {
            name: 'fotos_evidencia',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'dados_complementares',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'condicoes_habitacionais',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'composicao_familiar_observada',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'criterios_elegibilidade_mantidos',
            type: 'boolean',
            isNullable: false,
            default: true,
          },
          {
            name: 'observacoes_criterios',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'justificativa_recomendacao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'observacoes_gerais',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'prazo_proxima_visita',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'pontuacao_risco',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'data_visita',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'beneficiario_presente',
            type: 'boolean',
            isNullable: true,
          },
          {
            name: 'pessoa_atendeu',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'relacao_pessoa_atendeu',
            type: 'parentesco_enum',
            isNullable: true,
          },
          {
            name: 'necessidades_identificadas',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'encaminhamentos_realizados',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'parecer_tecnico',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'cancelado_por',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'data_cancelamento',
            type: 'timestamp with time zone',
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

    // 4. Criar índices para otimização de consultas
    await queryRunner.createIndex(
      'agendamento_visita',
      new TableIndex({
        name: 'IDX_agendamento_beneficiario',
        columnNames: ['beneficiario_id'],
      }),
    );

    await queryRunner.createIndex(
      'agendamento_visita',
      new TableIndex({
        name: 'IDX_agendamento_tecnico',
        columnNames: ['tecnico_responsavel_id'],
      }),
    );

    await queryRunner.createIndex(
      'agendamento_visita',
      new TableIndex({
        name: 'IDX_agendamento_unidade',
        columnNames: ['unidade_id'],
      }),
    );

    await queryRunner.createIndex(
      'agendamento_visita',
      new TableIndex({
        name: 'IDX_agendamento_data_hora',
        columnNames: ['data_agendamento'],
      }),
    );

    await queryRunner.createIndex(
      'agendamento_visita',
      new TableIndex({
        name: 'IDX_agendamento_prioridade',
        columnNames: ['prioridade'],
      }),
    );

    await queryRunner.createIndex(
      'agendamento_visita',
      new TableIndex({
        name: 'IDX_agendamento_prazo_limite',
        columnNames: ['prazo_limite'],
      }),
    );

    await queryRunner.createIndex(
      'visita_domiciliar',
      new TableIndex({
        name: 'IDX_visita_agendamento',
        columnNames: ['agendamento_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'visita_domiciliar',
      new TableIndex({
        name: 'IDX_visita_data_inicio',
        columnNames: ['data_hora_inicio'],
      }),
    );

    await queryRunner.createIndex(
      'visita_domiciliar',
      new TableIndex({
        name: 'IDX_visita_resultado',
        columnNames: ['resultado'],
      }),
    );

    await queryRunner.createIndex(
      'visita_domiciliar',
      new TableIndex({
        name: 'IDX_visita_renovacao',
        columnNames: ['recomenda_renovacao'],
      }),
    );

    await queryRunner.createIndex(
      'visita_domiciliar',
      new TableIndex({
        name: 'IDX_visita_nova_visita',
        columnNames: ['necessita_nova_visita'],
      }),
    );

    await queryRunner.createIndex(
      'visita_domiciliar',
      new TableIndex({
        name: 'IDX_visita_problemas',
        columnNames: ['problemas_elegibilidade'],
      }),
    );

    // 5. Criar chaves estrangeiras
    await queryRunner.createForeignKey(
      'agendamento_visita',
      new TableForeignKey({
        columnNames: ['beneficiario_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'cidadao',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'agendamento_visita',
      new TableForeignKey({
        columnNames: ['concessao_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'concessao',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'agendamento_visita',
      new TableForeignKey({
        columnNames: ['tecnico_responsavel_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'usuario',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'agendamento_visita',
      new TableForeignKey({
        columnNames: ['unidade_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'unidade',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'agendamento_visita',
      new TableForeignKey({
        columnNames: ['created_by'],
        referencedColumnNames: ['id'],
        referencedTableName: 'usuario',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'agendamento_visita',
      new TableForeignKey({
        columnNames: ['updated_by'],
        referencedColumnNames: ['id'],
        referencedTableName: 'usuario',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'visita_domiciliar',
      new TableForeignKey({
        columnNames: ['agendamento_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'agendamento_visita',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'visita_domiciliar',
      new TableForeignKey({
        columnNames: ['created_by'],
        referencedColumnNames: ['id'],
        referencedTableName: 'usuario',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'visita_domiciliar',
      new TableForeignKey({
        columnNames: ['updated_by'],
        referencedColumnNames: ['id'],
        referencedTableName: 'usuario',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    // 6. Criar trigger para atualização automática do updated_at
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_agendamento_visita_updated_at
        BEFORE UPDATE ON agendamento_visita
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_visita_domiciliar_updated_at
        BEFORE UPDATE ON visita_domiciliar
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    // 7. Criar view para consultas otimizadas de agendamentos em atraso
    await queryRunner.query(`
      CREATE VIEW vw_agendamentos_em_atraso AS
      SELECT 
        av.*,
        CASE 
          WHEN av.data_agendamento < CURRENT_TIMESTAMP 
            AND av.status IN ('agendado', 'confirmado') 
          THEN true 
          ELSE false 
        END as em_atraso,
        CASE 
          WHEN av.data_agendamento < CURRENT_TIMESTAMP 
            AND av.status IN ('agendado', 'confirmado') 
          THEN EXTRACT(days FROM CURRENT_TIMESTAMP - av.data_agendamento)::integer
          ELSE 0 
        END as dias_atraso
      FROM agendamento_visita av
      WHERE av.data_agendamento < CURRENT_TIMESTAMP 
        AND av.status IN ('agendado', 'confirmado');
    `);

    // 8. Comentários nas tabelas para documentação
    await queryRunner.query(`
      COMMENT ON TABLE agendamento_visita IS 'Tabela para armazenar agendamentos de visitas domiciliares aos beneficiários';
    `);

    await queryRunner.query(`
      COMMENT ON TABLE visita_domiciliar IS 'Tabela para armazenar o registro de execução das visitas domiciliares';
    `);

    await queryRunner.query(`
      COMMENT ON VIEW vw_agendamentos_em_atraso IS 'View para consulta otimizada de agendamentos em atraso';
    `);
  }

  /**
   * Reverte todas as alterações feitas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverter na ordem inversa da criação

    // 1. Remover view
    await queryRunner.query(`DROP VIEW IF EXISTS vw_agendamentos_em_atraso;`);

    // 2. Remover triggers
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_visita_domiciliar_updated_at ON visita_domiciliar;
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_agendamento_visita_updated_at ON agendamento_visita;
    `);

    await queryRunner.query(`
      DROP FUNCTION IF EXISTS update_updated_at_column();
    `);

    // 3. Remover chaves estrangeiras
    const agendamentoTable = await queryRunner.getTable('agendamento_visita');
    const visitaTable = await queryRunner.getTable('visita_domiciliar');

    if (agendamentoTable) {
      const foreignKeys = agendamentoTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('agendamento_visita', foreignKey);
      }
    }

    if (visitaTable) {
      const foreignKeys = visitaTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('visita_domiciliar', foreignKey);
      }
    }

    // 4. Remover índices
    await queryRunner.dropIndex('agendamento_visita', 'IDX_agendamento_beneficiario');
    await queryRunner.dropIndex('agendamento_visita', 'IDX_agendamento_tecnico');
    await queryRunner.dropIndex('agendamento_visita', 'IDX_agendamento_unidade');
    await queryRunner.dropIndex('agendamento_visita', 'IDX_agendamento_data_hora');
    await queryRunner.dropIndex('agendamento_visita', 'IDX_agendamento_status');
    await queryRunner.dropIndex('agendamento_visita', 'IDX_agendamento_prioridade');
    await queryRunner.dropIndex('agendamento_visita', 'IDX_agendamento_prazo_limite');
    await queryRunner.dropIndex('visita_domiciliar', 'IDX_visita_agendamento');
    await queryRunner.dropIndex('visita_domiciliar', 'IDX_visita_data_inicio');
    await queryRunner.dropIndex('visita_domiciliar', 'IDX_visita_resultado');
    await queryRunner.dropIndex('visita_domiciliar', 'IDX_visita_renovacao');
    await queryRunner.dropIndex('visita_domiciliar', 'IDX_visita_nova_visita');
    await queryRunner.dropIndex('visita_domiciliar', 'IDX_visita_problemas');

    // 5. Remover tabelas
    await queryRunner.dropTable('visita_domiciliar');
    await queryRunner.dropTable('agendamento_visita');

    // 6. Remover enums
    await queryRunner.query(`DROP TYPE IF EXISTS "resultado_visita";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "prioridade_visita";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tipo_visita";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "status_agendamento";`);
  }
}