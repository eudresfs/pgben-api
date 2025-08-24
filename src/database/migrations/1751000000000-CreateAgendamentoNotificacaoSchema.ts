import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateAgendamentoNotificacaoSchema1751000000000
  implements MigrationInterface
{
  name = 'CreateAgendamentoNotificacaoSchema1751000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar enum StatusAgendamento
    await queryRunner.query(`
      CREATE TYPE "status_agendamento_enum" AS ENUM (
        'AGENDADA',
        'PROCESSANDO',
        'ENVIADA',
        'FALHOU',
        'CANCELADA',
        'EXPIRADA'
      )
    `);

    // Criar tabela agendamento_notificacao
    await queryRunner.createTable(
      new Table({
        name: 'agendamento_notificacao',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'usuario_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'tipo_notificacao',
            type: 'enum',
            enum: ['SISTEMA', 'EMAIL', 'SMS', 'PUSH', 'WEBHOOK'],
            default: "'SISTEMA'",
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
            name: 'data_agendamento',
            type: 'timestamp with time zone',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'status_agendamento_enum',
            default: "'AGENDADA'",
          },
          {
            name: 'tentativas',
            type: 'int',
            default: 0,
          },
          {
            name: 'max_tentativas',
            type: 'int',
            default: 3,
          },
          {
            name: 'ultima_tentativa',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'data_expiracao',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'dados_contexto',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'configuracoes',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'erro_ultima_tentativa',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'notificacao_enviada_id',
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
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Criar índices
    await queryRunner.createIndex(
      'agendamento_notificacao',
      new TableIndex({
        name: 'IDX_agendamento_data_status',
        columnNames: ['data_agendamento', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'agendamento_notificacao',
      new TableIndex({
        name: 'IDX_agendamento_usuario_status',
        columnNames: ['usuario_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'agendamento_notificacao',
      new TableIndex({
        name: 'IDX_agendamento_tipo_data',
        columnNames: ['tipo_notificacao', 'data_agendamento'],
      }),
    );

    await queryRunner.createIndex(
      'agendamento_notificacao',
      new TableIndex({
        name: 'IDX_agendamento_data_agendamento',
        columnNames: ['data_agendamento'],
      }),
    );

    await queryRunner.createIndex(
      'agendamento_notificacao',
      new TableIndex({
        name: 'IDX_agendamento_status',
        columnNames: ['status'],
      }),
    );

    // Criar foreign key para usuario
    await queryRunner.createForeignKey(
      'agendamento_notificacao',
      new TableForeignKey({
        name: 'FK_agendamento_notificacao_usuario',
        columnNames: ['usuario_id'],
        referencedTableName: 'usuario',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Criar trigger para updated_at
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
      CREATE TRIGGER update_agendamento_notificacao_updated_at
        BEFORE UPDATE ON agendamento_notificacao
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover trigger
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_agendamento_notificacao_updated_at ON agendamento_notificacao;
    `);

    // Remover foreign key
    await queryRunner.dropForeignKey(
      'agendamento_notificacao',
      'FK_agendamento_notificacao_usuario',
    );

    // Remover índices
    await queryRunner.dropIndex(
      'agendamento_notificacao',
      'IDX_agendamento_data_status',
    );
    await queryRunner.dropIndex(
      'agendamento_notificacao',
      'IDX_agendamento_usuario_status',
    );
    await queryRunner.dropIndex(
      'agendamento_notificacao',
      'IDX_agendamento_tipo_data',
    );
    await queryRunner.dropIndex(
      'agendamento_notificacao',
      'IDX_agendamento_data_agendamento',
    );
    await queryRunner.dropIndex(
      'agendamento_notificacao',
      'IDX_agendamento_status',
    );

    // Remover tabela
    await queryRunner.dropTable('agendamento_notificacao');

    // Remover enum
    await queryRunner.query(`DROP TYPE "status_agendamento_enum"`);
  }
}
