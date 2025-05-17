import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration: CreateIntegracaoSchema
 *
 * Descrição: Cria a estrutura do módulo de integração, incluindo tabelas para
 * configuração de APIs externas, webhooks, filas de mensagens e logs de integração.
 *
 * Domínio: Integração
 * Dependências: 1070000-CreateRelatorioSchema.ts
 *
 * @author Arquiteto de Dados
 * @date 16/05/2025
 */
export class CreateIntegracaoSchema1080000 implements MigrationInterface {
  name = 'CreateIntegracaoSchema20250516000800';

  /**
   * Cria as estruturas do módulo de integração
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Criar tipos enumerados
    await queryRunner.query(`
      CREATE TYPE "tipo_integracao_enum" AS ENUM (
        'api_rest',
        'soap',
        'ftp',
        'sftp',
        'banco_dados',
        'webhook',
        'email',
        'arquivo'
      );
      
      CREATE TYPE "metodo_http_enum" AS ENUM (
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'HEAD',
        'OPTIONS'
      );
      
      CREATE TYPE "formato_dados_enum" AS ENUM (
        'json',
        'xml',
        'csv',
        'texto',
        'binario'
      );
      
      CREATE TYPE "status_integracao_enum" AS ENUM (
        'ativo',
        'inativo',
        'em_teste',
        'em_manutencao',
        'descontinuado'
      );
      
      CREATE TYPE "direcao_integracao_enum" AS ENUM (
        'entrada',
        'saida',
        'bidirecional'
      );
      
      CREATE TYPE "status_mensagem_enum" AS ENUM (
        'pendente',
        'processando',
        'sucesso',
        'erro',
        'retry',
        'cancelada'
      );
    `);

    // 2. Criar tabela de sistemas externos
    await queryRunner.createTable(
      new Table({
        name: 'sistema_externo',
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
            name: 'url_base',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'contato_tecnico',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'documentacao_url',
            type: 'varchar',
            length: '500',
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

    // 3. Criar tabela de configurações de integração
    await queryRunner.createTable(
      new Table({
        name: 'configuracao_integracao',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'sistema_externo_id',
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
            name: 'tipo',
            type: 'tipo_integracao_enum',
            isNullable: false,
          },
          {
            name: 'direcao',
            type: 'direcao_integracao_enum',
            isNullable: false,
          },
          {
            name: 'endpoint',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'metodo',
            type: 'metodo_http_enum',
            isNullable: true,
          },
          {
            name: 'formato_dados',
            type: 'formato_dados_enum',
            isNullable: false,
          },
          {
            name: 'headers',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'parametros',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'credenciais',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'mapeamento_campos',
            type: 'jsonb',
            isNullable: true,
            comment:
              'Mapeamento entre campos do sistema externo e campos internos',
          },
          {
            name: 'transformacoes',
            type: 'jsonb',
            isNullable: true,
            comment: 'Regras de transformação de dados',
          },
          {
            name: 'validacoes',
            type: 'jsonb',
            isNullable: true,
            comment: 'Regras de validação de dados',
          },
          {
            name: 'timeout_segundos',
            type: 'integer',
            default: 30,
          },
          {
            name: 'max_tentativas',
            type: 'integer',
            default: 3,
          },
          {
            name: 'intervalo_tentativas_segundos',
            type: 'integer',
            default: 60,
          },
          {
            name: 'status',
            type: 'status_integracao_enum',
            default: "'inativo'",
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

    // 4. Criar tabela de agendamentos de integração
    await queryRunner.createTable(
      new Table({
        name: 'agendamento_integracao',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'configuracao_id',
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
            name: 'expressao_cron',
            type: 'varchar',
            length: '100',
            isNullable: false,
            comment: 'Expressão cron para agendamento',
          },
          {
            name: 'parametros',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'ativo',
            type: 'boolean',
            default: true,
          },
          {
            name: 'ultima_execucao',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'proxima_execucao',
            type: 'timestamp',
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

    // 5. Criar tabela de webhooks
    await queryRunner.createTable(
      new Table({
        name: 'webhook',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'configuracao_id',
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
            name: 'url_callback',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'eventos',
            type: 'jsonb',
            isNullable: false,
            comment: 'Lista de eventos que acionam o webhook',
          },
          {
            name: 'secret',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: 'Chave secreta para assinatura de payload',
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

    // 6. Criar tabela de mensagens de integração
    await queryRunner.createTable(
      new Table({
        name: 'mensagem_integracao',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'configuracao_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'agendamento_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'webhook_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'direcao',
            type: 'direcao_integracao_enum',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'status_mensagem_enum',
            default: "'pendente'",
          },
          {
            name: 'dados_entrada',
            type: 'jsonb',
            isNullable: true,
            comment: 'Dados recebidos ou enviados na integração',
          },
          {
            name: 'dados_saida',
            type: 'jsonb',
            isNullable: true,
            comment: 'Dados processados após transformação',
          },
          {
            name: 'data_criacao',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'data_processamento',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'tentativas',
            type: 'integer',
            default: 0,
          },
          {
            name: 'proxima_tentativa',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'mensagem_erro',
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
        ],
      }),
      true,
    );

    // 7. Criar tabela de logs de execução de integração
    await queryRunner.createTable(
      new Table({
        name: 'log_execucao_integracao',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'mensagem_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'tentativa',
            type: 'integer',
            isNullable: false,
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
            name: 'duracao_ms',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'request_headers',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'request_body',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'response_headers',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'response_body',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'codigo_http',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'erro',
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

    // 8. Criar índices para otimização de consultas
    await queryRunner.createIndex(
      'sistema_externo',
      new TableIndex({
        name: 'IDX_SISTEMA_EXTERNO_NOME',
        columnNames: ['nome'],
      }),
    );

    await queryRunner.createIndex(
      'configuracao_integracao',
      new TableIndex({
        name: 'IDX_CONFIGURACAO_INTEGRACAO_SISTEMA',
        columnNames: ['sistema_externo_id'],
      }),
    );

    await queryRunner.createIndex(
      'configuracao_integracao',
      new TableIndex({
        name: 'IDX_CONFIGURACAO_INTEGRACAO_TIPO',
        columnNames: ['tipo'],
      }),
    );

    await queryRunner.createIndex(
      'configuracao_integracao',
      new TableIndex({
        name: 'IDX_CONFIGURACAO_INTEGRACAO_STATUS',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'agendamento_integracao',
      new TableIndex({
        name: 'IDX_AGENDAMENTO_INTEGRACAO_CONFIGURACAO',
        columnNames: ['configuracao_id'],
      }),
    );

    await queryRunner.createIndex(
      'agendamento_integracao',
      new TableIndex({
        name: 'IDX_AGENDAMENTO_INTEGRACAO_ATIVO',
        columnNames: ['ativo'],
      }),
    );

    await queryRunner.createIndex(
      'webhook',
      new TableIndex({
        name: 'IDX_WEBHOOK_CONFIGURACAO',
        columnNames: ['configuracao_id'],
      }),
    );

    await queryRunner.createIndex(
      'webhook',
      new TableIndex({
        name: 'IDX_WEBHOOK_ATIVO',
        columnNames: ['ativo'],
      }),
    );

    await queryRunner.createIndex(
      'mensagem_integracao',
      new TableIndex({
        name: 'IDX_MENSAGEM_INTEGRACAO_CONFIGURACAO',
        columnNames: ['configuracao_id'],
      }),
    );

    await queryRunner.createIndex(
      'mensagem_integracao',
      new TableIndex({
        name: 'IDX_MENSAGEM_INTEGRACAO_STATUS',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'mensagem_integracao',
      new TableIndex({
        name: 'IDX_MENSAGEM_INTEGRACAO_DATA_CRIACAO',
        columnNames: ['data_criacao'],
      }),
    );

    await queryRunner.createIndex(
      'log_execucao_integracao',
      new TableIndex({
        name: 'IDX_LOG_EXECUCAO_INTEGRACAO_MENSAGEM',
        columnNames: ['mensagem_id'],
      }),
    );

    // 9. Criar chaves estrangeiras
    await queryRunner.createForeignKey(
      'configuracao_integracao',
      new TableForeignKey({
        name: 'FK_CONFIGURACAO_INTEGRACAO_SISTEMA',
        columnNames: ['sistema_externo_id'],
        referencedTableName: 'sistema_externo',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'agendamento_integracao',
      new TableForeignKey({
        name: 'FK_AGENDAMENTO_INTEGRACAO_CONFIGURACAO',
        columnNames: ['configuracao_id'],
        referencedTableName: 'configuracao_integracao',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'webhook',
      new TableForeignKey({
        name: 'FK_WEBHOOK_CONFIGURACAO',
        columnNames: ['configuracao_id'],
        referencedTableName: 'configuracao_integracao',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'mensagem_integracao',
      new TableForeignKey({
        name: 'FK_MENSAGEM_INTEGRACAO_CONFIGURACAO',
        columnNames: ['configuracao_id'],
        referencedTableName: 'configuracao_integracao',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'mensagem_integracao',
      new TableForeignKey({
        name: 'FK_MENSAGEM_INTEGRACAO_AGENDAMENTO',
        columnNames: ['agendamento_id'],
        referencedTableName: 'agendamento_integracao',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'mensagem_integracao',
      new TableForeignKey({
        name: 'FK_MENSAGEM_INTEGRACAO_WEBHOOK',
        columnNames: ['webhook_id'],
        referencedTableName: 'webhook',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'log_execucao_integracao',
      new TableForeignKey({
        name: 'FK_LOG_EXECUCAO_INTEGRACAO_MENSAGEM',
        columnNames: ['mensagem_id'],
        referencedTableName: 'mensagem_integracao',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // 10. Criar triggers para atualização automática de timestamps
    await queryRunner.query(`
      -- Trigger para sistema_externo
      CREATE TRIGGER update_sistema_externo_timestamp
      BEFORE UPDATE ON sistema_externo
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();

      -- Trigger para configuracao_integracao
      CREATE TRIGGER update_configuracao_integracao_timestamp
      BEFORE UPDATE ON configuracao_integracao
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();

      -- Trigger para agendamento_integracao
      CREATE TRIGGER update_agendamento_integracao_timestamp
      BEFORE UPDATE ON agendamento_integracao
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();

      -- Trigger para webhook
      CREATE TRIGGER update_webhook_timestamp
      BEFORE UPDATE ON webhook
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();

      -- Trigger para mensagem_integracao
      CREATE TRIGGER update_mensagem_integracao_timestamp
      BEFORE UPDATE ON mensagem_integracao
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();
    `);

    // 11. Criar políticas RLS para segurança
    await queryRunner.query(`
      -- Habilitar RLS para tabelas do módulo de integração
      ALTER TABLE sistema_externo ENABLE ROW LEVEL SECURITY;
      ALTER TABLE configuracao_integracao ENABLE ROW LEVEL SECURITY;
      ALTER TABLE agendamento_integracao ENABLE ROW LEVEL SECURITY;
      ALTER TABLE webhook ENABLE ROW LEVEL SECURITY;
      ALTER TABLE mensagem_integracao ENABLE ROW LEVEL SECURITY;
      ALTER TABLE log_execucao_integracao ENABLE ROW LEVEL SECURITY;

      -- Política para sistema_externo
      CREATE POLICY sistema_externo_policy ON sistema_externo
      USING (removed_at IS NULL)
      WITH CHECK (true);

      -- Política para configuracao_integracao
      CREATE POLICY configuracao_integracao_policy ON configuracao_integracao
      USING (removed_at IS NULL)
      WITH CHECK (true);

      -- Política para agendamento_integracao
      CREATE POLICY agendamento_integracao_policy ON agendamento_integracao
      USING (removed_at IS NULL)
      WITH CHECK (true);

      -- Política para webhook
      CREATE POLICY webhook_policy ON webhook
      USING (removed_at IS NULL)
      WITH CHECK (true);

      -- Política para mensagem_integracao
      CREATE POLICY mensagem_integracao_policy ON mensagem_integracao
      USING (true)
      WITH CHECK (true);

      -- Política para log_execucao_integracao
      CREATE POLICY log_execucao_integracao_policy ON log_execucao_integracao
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
      DROP POLICY IF EXISTS log_execucao_integracao_policy ON log_execucao_integracao;
      DROP POLICY IF EXISTS mensagem_integracao_policy ON mensagem_integracao;
      DROP POLICY IF EXISTS webhook_policy ON webhook;
      DROP POLICY IF EXISTS agendamento_integracao_policy ON agendamento_integracao;
      DROP POLICY IF EXISTS configuracao_integracao_policy ON configuracao_integracao;
      DROP POLICY IF EXISTS sistema_externo_policy ON sistema_externo;

      ALTER TABLE log_execucao_integracao DISABLE ROW LEVEL SECURITY;
      ALTER TABLE mensagem_integracao DISABLE ROW LEVEL SECURITY;
      ALTER TABLE webhook DISABLE ROW LEVEL SECURITY;
      ALTER TABLE agendamento_integracao DISABLE ROW LEVEL SECURITY;
      ALTER TABLE configuracao_integracao DISABLE ROW LEVEL SECURITY;
      ALTER TABLE sistema_externo DISABLE ROW LEVEL SECURITY;
    `);

    // 2. Remover triggers
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_mensagem_integracao_timestamp ON mensagem_integracao;
      DROP TRIGGER IF EXISTS update_webhook_timestamp ON webhook;
      DROP TRIGGER IF EXISTS update_agendamento_integracao_timestamp ON agendamento_integracao;
      DROP TRIGGER IF EXISTS update_configuracao_integracao_timestamp ON configuracao_integracao;
      DROP TRIGGER IF EXISTS update_sistema_externo_timestamp ON sistema_externo;
    `);

    // 3. Remover chaves estrangeiras
    await queryRunner.dropForeignKey(
      'log_execucao_integracao',
      'FK_LOG_EXECUCAO_INTEGRACAO_MENSAGEM',
    );
    await queryRunner.dropForeignKey(
      'mensagem_integracao',
      'FK_MENSAGEM_INTEGRACAO_WEBHOOK',
    );
    await queryRunner.dropForeignKey(
      'mensagem_integracao',
      'FK_MENSAGEM_INTEGRACAO_AGENDAMENTO',
    );
    await queryRunner.dropForeignKey(
      'mensagem_integracao',
      'FK_MENSAGEM_INTEGRACAO_CONFIGURACAO',
    );
    await queryRunner.dropForeignKey('webhook', 'FK_WEBHOOK_CONFIGURACAO');
    await queryRunner.dropForeignKey(
      'agendamento_integracao',
      'FK_AGENDAMENTO_INTEGRACAO_CONFIGURACAO',
    );
    await queryRunner.dropForeignKey(
      'configuracao_integracao',
      'FK_CONFIGURACAO_INTEGRACAO_SISTEMA',
    );

    // 4. Remover índices
    await queryRunner.dropIndex(
      'log_execucao_integracao',
      'IDX_LOG_EXECUCAO_INTEGRACAO_MENSAGEM',
    );
    await queryRunner.dropIndex(
      'mensagem_integracao',
      'IDX_MENSAGEM_INTEGRACAO_DATA_CRIACAO',
    );
    await queryRunner.dropIndex(
      'mensagem_integracao',
      'IDX_MENSAGEM_INTEGRACAO_STATUS',
    );
    await queryRunner.dropIndex(
      'mensagem_integracao',
      'IDX_MENSAGEM_INTEGRACAO_CONFIGURACAO',
    );
    await queryRunner.dropIndex('webhook', 'IDX_WEBHOOK_ATIVO');
    await queryRunner.dropIndex('webhook', 'IDX_WEBHOOK_CONFIGURACAO');
    await queryRunner.dropIndex(
      'agendamento_integracao',
      'IDX_AGENDAMENTO_INTEGRACAO_ATIVO',
    );
    await queryRunner.dropIndex(
      'agendamento_integracao',
      'IDX_AGENDAMENTO_INTEGRACAO_CONFIGURACAO',
    );
    await queryRunner.dropIndex(
      'configuracao_integracao',
      'IDX_CONFIGURACAO_INTEGRACAO_STATUS',
    );
    await queryRunner.dropIndex(
      'configuracao_integracao',
      'IDX_CONFIGURACAO_INTEGRACAO_TIPO',
    );
    await queryRunner.dropIndex(
      'configuracao_integracao',
      'IDX_CONFIGURACAO_INTEGRACAO_SISTEMA',
    );
    await queryRunner.dropIndex('sistema_externo', 'IDX_SISTEMA_EXTERNO_NOME');

    // 5. Remover tabelas
    await queryRunner.dropTable('log_execucao_integracao');
    await queryRunner.dropTable('mensagem_integracao');
    await queryRunner.dropTable('webhook');
    await queryRunner.dropTable('agendamento_integracao');
    await queryRunner.dropTable('configuracao_integracao');
    await queryRunner.dropTable('sistema_externo');

    // 6. Remover tipos enumerados
    await queryRunner.query(`
      DROP TYPE IF EXISTS "status_mensagem_enum";
      DROP TYPE IF EXISTS "direcao_integracao_enum";
      DROP TYPE IF EXISTS "status_integracao_enum";
      DROP TYPE IF EXISTS "formato_dados_enum";
      DROP TYPE IF EXISTS "metodo_http_enum";
      DROP TYPE IF EXISTS "tipo_integracao_enum";
    `);
  }
}
