import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateAuditLogsTable1704067238000 implements MigrationInterface {
  name = 'CreateAuditLogsTable1704067238000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar enum para audit_action se não existir
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE audit_action AS ENUM (
          'create', 'read', 'update', 'delete',
          'login', 'logout', 'login_failed',
          'password_reset', 'password_change',
          'permission_denied', 'token_refresh', 'token_revoke',
          'export_data', 'import_data', 'system_config'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Criar enum para audit_severity se não existir
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE audit_severity AS ENUM ('low', 'medium', 'high', 'critical');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Criar tabela audit_logs
    await queryRunner.createTable(
      new Table({
        name: 'audit_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'usuario_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'action',
            type: 'audit_action',
            isNullable: false,
          },
          {
            name: 'resource_type',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'resource_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'severity',
            type: 'audit_severity',
            default: "'low'",
            isNullable: false,
          },
          {
            name: 'client_ip',
            type: 'inet',
            isNullable: true,
          },
          {
            name: 'user_agent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'request_method',
            type: 'varchar',
            length: '10',
            isNullable: true,
          },
          {
            name: 'request_url',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['usuario_id'],
            referencedTableName: 'usuario',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Criar índices para otimização de consultas
    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_usuario_id',
        columnNames: ['usuario_id'],
      }),
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_action',
        columnNames: ['action'],
      }),
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_resource',
        columnNames: ['resource_type', 'resource_id'],
      }),
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_severity',
        columnNames: ['severity'],
      }),
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_created_at',
        columnNames: ['created_at'],
      }),
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_client_ip',
        columnNames: ['client_ip'],
      }),
    );

    // Índice composto para consultas de auditoria por usuário e período
    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_usuario_created',
        columnNames: ['usuario_id', 'created_at'],
      }),
    );

    // Índice para consultas de segurança por severidade e data
    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_severity_created',
        columnNames: ['severity', 'created_at'],
      }),
    );

    // Índice GIN para consultas em metadata JSONB
    await queryRunner.query(`
      CREATE INDEX IDX_audit_logs_metadata_gin ON audit_logs USING GIN (metadata);
    `);

    // Trigger para atualizar updated_at automaticamente
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_audit_logs_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await queryRunner.query(`
      CREATE TRIGGER trigger_audit_logs_updated_at
        BEFORE UPDATE ON audit_logs
        FOR EACH ROW
        EXECUTE FUNCTION update_audit_logs_updated_at();
    `);

    // Política de segurança RLS (Row Level Security)
    await queryRunner.query(`
      ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
    `);

    // Política para permitir que usuários vejam apenas seus próprios logs (exceto admins)
    await queryRunner.query(`
      CREATE POLICY audit_logs_user_policy ON audit_logs
        FOR SELECT
        USING (
          usuario_id = current_setting('app.current_user_id', true)::uuid
          OR current_setting('app.user_role', true) = 'ADMIN'
          OR current_setting('app.user_role', true) = 'SUPER_ADMIN'
        );
    `);

    // Política para inserção (apenas sistema pode inserir)
    await queryRunner.query(`
      CREATE POLICY audit_logs_insert_policy ON audit_logs
        FOR INSERT
        WITH CHECK (true); -- Sistema sempre pode inserir logs
    `);

    // Comentários na tabela e colunas para documentação
    await queryRunner.query(`
      COMMENT ON TABLE audit_logs IS 'Tabela de logs de auditoria do sistema';
      COMMENT ON COLUMN audit_logs.id IS 'Identificador único do log';
      COMMENT ON COLUMN audit_logs.usuario_id IS 'ID do usuário que executou a ação';
      COMMENT ON COLUMN audit_logs.action IS 'Tipo de ação executada';
      COMMENT ON COLUMN audit_logs.resource_type IS 'Tipo do recurso afetado';
      COMMENT ON COLUMN audit_logs.resource_id IS 'ID do recurso afetado';
      COMMENT ON COLUMN audit_logs.description IS 'Descrição detalhada da ação';
      COMMENT ON COLUMN audit_logs.severity IS 'Nível de severidade do evento';
      COMMENT ON COLUMN audit_logs.client_ip IS 'Endereço IP do cliente';
      COMMENT ON COLUMN audit_logs.user_agent IS 'User Agent do navegador';
      COMMENT ON COLUMN audit_logs.request_method IS 'Método HTTP da requisição';
      COMMENT ON COLUMN audit_logs.request_url IS 'URL da requisição';
      COMMENT ON COLUMN audit_logs.metadata IS 'Dados adicionais em formato JSON';
      COMMENT ON COLUMN audit_logs.created_at IS 'Data e hora de criação do log';
      COMMENT ON COLUMN audit_logs.updated_at IS 'Data e hora da última atualização';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover políticas RLS
    await queryRunner.query(`DROP POLICY IF EXISTS audit_logs_user_policy ON audit_logs;`);
    await queryRunner.query(`DROP POLICY IF EXISTS audit_logs_insert_policy ON audit_logs;`);

    // Remover trigger e função
    await queryRunner.query(`DROP TRIGGER IF EXISTS trigger_audit_logs_updated_at ON audit_logs;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_audit_logs_updated_at();`);

    // Remover tabela
    await queryRunner.dropTable('audit_logs');

    // Remover enums (cuidado: pode afetar outras tabelas)
    await queryRunner.query(`DROP TYPE IF EXISTS audit_action;`);
    await queryRunner.query(`DROP TYPE IF EXISTS audit_severity;`);
  }
}