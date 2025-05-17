import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration: CreateNotificacaoSchema
 *
 * Descrição: Cria a estrutura de notificações, incluindo templates de notificação,
 * notificações e tabelas relacionadas para o sistema de envio de notificações.
 *
 * Domínio: Notificação
 * Dependências: CreateBaseStructure, CreateAuthSchema
 *
 * @author Desenvolvedor Sênior
 * @date 16/05/2025
 */
export class CreateNotificacaoSchema1090000 implements MigrationInterface {
  name = 'CreateNotificacaoSchema20250516000000';

  /**
   * Cria as estruturas de banco de dados para o módulo de notificação
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Criar tipo enum para canais de notificação
    await queryRunner.query(`
      CREATE TYPE "canal_notificacao_enum" AS ENUM (
        'email',
        'in_app',
        'sms',
        'push',
        'whatsapp'
      );
    `);

    // 2. Criar tipo enum para status de notificação
    await queryRunner.query(`
      CREATE TYPE "status_notificacao_enum" AS ENUM (
        'pendente',
        'em_processamento',
        'enviada',
        'falha',
        'cancelada',
        'nao_lida',
        'lida',
        'arquivada'
      );
    `);

    // 3. Criar tabela de templates de notificação
    await queryRunner.createTable(
      new Table({
        name: 'notification_templates',
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
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'assunto',
            type: 'varchar',
            length: '150',
            isNullable: false,
          },
          {
            name: 'template_conteudo',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'canais_suportados',
            type: 'canal_notificacao_enum',
            isArray: true,
            isNullable: false,
            default: "'{email}'",
          },
          {
            name: 'ativo',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'criado_em',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'atualizado_em',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // 4. Criar índices para a tabela de templates
    await queryRunner.createIndex(
      'notification_templates',
      new TableIndex({
        name: 'IDX_NOTIFICATION_TEMPLATES_NOME',
        columnNames: ['nome'],
      }),
    );

    await queryRunner.createIndex(
      'notification_templates',
      new TableIndex({
        name: 'IDX_NOTIFICATION_TEMPLATES_ATIVO',
        columnNames: ['ativo'],
      }),
    );

    // 5. Criar tabela de notificações
    await queryRunner.createTable(
      new Table({
        name: 'notificacoes',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'destinatario_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'template_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'dados_contexto',
            type: 'jsonb',
            isNullable: false,
            default: '{}',
          },
          {
            name: 'status',
            type: 'status_notificacao_enum',
            isNullable: false,
            default: "'pendente'",
          },
          {
            name: 'tentativas_entrega',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'dados_envio',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'ultima_tentativa',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'tentativas_envio',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'proxima_tentativa',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'numero_tentativas',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'data_entrega',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'data_envio',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'data_agendamento',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'data_leitura',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'criado_em',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'atualizado_em',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // 6. Criar índices para a tabela de notificações
    await queryRunner.createIndex(
      'notificacoes',
      new TableIndex({
        name: 'IDX_NOTIFICACOES_DESTINATARIO_CRIADO_EM',
        columnNames: ['destinatario_id', 'criado_em'],
      }),
    );

    await queryRunner.createIndex(
      'notificacoes',
      new TableIndex({
        name: 'IDX_NOTIFICACOES_STATUS_CRIADO_EM',
        columnNames: ['status', 'criado_em'],
      }),
    );

    await queryRunner.createIndex(
      'notificacoes',
      new TableIndex({
        name: 'IDX_NOTIFICACOES_DATA_AGENDAMENTO',
        columnNames: ['data_agendamento'],
        where: 'data_agendamento IS NOT NULL',
      }),
    );

    // 7. Criar chaves estrangeiras
    await queryRunner.createForeignKey(
      'notificacoes',
      new TableForeignKey({
        name: 'FK_NOTIFICACOES_TEMPLATE',
        columnNames: ['template_id'],
        referencedTableName: 'notification_templates',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'notificacoes',
      new TableForeignKey({
        name: 'FK_NOTIFICACOES_USUARIO',
        columnNames: ['destinatario_id'],
        referencedTableName: 'usuarios',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // 8. Criar trigger para atualização automática do campo atualizado_em
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_notification_templates_atualizado_em()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.atualizado_em = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER trigger_update_notification_templates_atualizado_em
      BEFORE UPDATE ON notification_templates
      FOR EACH ROW
      EXECUTE FUNCTION update_notification_templates_atualizado_em();
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_notificacoes_atualizado_em()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.atualizado_em = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER trigger_update_notificacoes_atualizado_em
      BEFORE UPDATE ON notificacoes
      FOR EACH ROW
      EXECUTE FUNCTION update_notificacoes_atualizado_em();
    `);

    // 9. Criar políticas RLS (Row-Level Security) para notificações
    await queryRunner.query(`
      -- Habilitar RLS para a tabela de notificações
      ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

      -- Política para administradores (acesso total)
      CREATE POLICY admin_notificacoes_policy ON notificacoes
      FOR ALL
      TO administrador
      USING (true);

      -- Política para usuários (apenas suas próprias notificações)
      CREATE POLICY user_notificacoes_policy ON notificacoes
      FOR ALL
      USING (destinatario_id = current_setting('app.current_user_id')::uuid);
    `);

    // 10. Comentários nas tabelas para documentação
    await queryRunner.query(`
      COMMENT ON TABLE notification_templates IS 'Templates de notificação utilizados para envio de mensagens padronizadas';
      COMMENT ON TABLE notificacoes IS 'Notificações enviadas aos usuários do sistema';
      
      COMMENT ON COLUMN notification_templates.canais_suportados IS 'Canais pelos quais este template pode ser enviado';
      COMMENT ON COLUMN notificacoes.dados_contexto IS 'Dados de contexto para substituição no template';
      COMMENT ON COLUMN notificacoes.tentativas_entrega IS 'Registro de tentativas de entrega da notificação';
      COMMENT ON COLUMN notificacoes.dados_envio IS 'Dados de resposta dos provedores de envio';
    `);
  }

  /**
   * Reverte as alterações feitas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Remover triggers
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_update_notificacoes_atualizado_em ON notificacoes;
      DROP FUNCTION IF EXISTS update_notificacoes_atualizado_em();
      
      DROP TRIGGER IF EXISTS trigger_update_notification_templates_atualizado_em ON notification_templates;
      DROP FUNCTION IF EXISTS update_notification_templates_atualizado_em();
    `);

    // 2. Remover políticas RLS
    await queryRunner.query(`
      DROP POLICY IF EXISTS admin_notificacoes_policy ON notificacoes;
      DROP POLICY IF EXISTS user_notificacoes_policy ON notificacoes;
    `);

    // 3. Remover chaves estrangeiras
    await queryRunner.dropForeignKey('notificacoes', 'FK_NOTIFICACOES_USUARIO');
    await queryRunner.dropForeignKey(
      'notificacoes',
      'FK_NOTIFICACOES_TEMPLATE',
    );

    // 4. Remover índices
    await queryRunner.dropIndex(
      'notificacoes',
      'IDX_NOTIFICACOES_DATA_AGENDAMENTO',
    );
    await queryRunner.dropIndex(
      'notificacoes',
      'IDX_NOTIFICACOES_STATUS_CRIADO_EM',
    );
    await queryRunner.dropIndex(
      'notificacoes',
      'IDX_NOTIFICACOES_DESTINATARIO_CRIADO_EM',
    );
    await queryRunner.dropIndex(
      'notification_templates',
      'IDX_NOTIFICATION_TEMPLATES_ATIVO',
    );
    await queryRunner.dropIndex(
      'notification_templates',
      'IDX_NOTIFICATION_TEMPLATES_NOME',
    );

    // 5. Remover tabelas
    await queryRunner.dropTable('notificacoes');
    await queryRunner.dropTable('notification_templates');

    // 6. Remover tipos enum
    await queryRunner.query(`DROP TYPE IF EXISTS "status_notificacao_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "canal_notificacao_enum"`);
  }
}
