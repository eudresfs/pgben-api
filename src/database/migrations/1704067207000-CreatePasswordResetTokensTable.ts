import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreatePasswordResetTokensTable1704067210000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar a tabela password_reset_tokens
    await queryRunner.createTable(
      new Table({
        name: 'password_reset_tokens',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
            comment: 'ID único do token de recuperação',
          },
          {
            name: 'token',
            type: 'varchar',
            length: '255',
            isNullable: false,
            isUnique: true,
            comment: 'Token único para recuperação de senha',
          },
          {
            name: 'token_hash',
            type: 'varchar',
            length: '255',
            isNullable: false,
            comment: 'Hash do token para verificação segura',
          },
          {
            name: 'usuario_id',
            type: 'uuid',
            isNullable: false,
            comment: 'ID do usuário associado ao token',
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: false,
            comment: 'Data e hora de expiração do token',
          },
          {
            name: 'is_used',
            type: 'boolean',
            default: false,
            isNullable: false,
            comment: 'Indica se o token já foi utilizado',
          },
          {
            name: 'used_at',
            type: 'timestamp',
            isNullable: true,
            comment: 'Data e hora em que o token foi utilizado',
          },
          {
            name: 'client_ip',
            type: 'varchar',
            length: '45', // IPv6 max length
            isNullable: true,
            comment: 'IP do cliente que solicitou o token',
          },
          {
            name: 'user_agent',
            type: 'text',
            isNullable: true,
            comment: 'User Agent do cliente que solicitou o token',
          },
          {
            name: 'attempts',
            type: 'integer',
            default: 0,
            isNullable: false,
            comment: 'Número de tentativas de uso do token',
          },
          {
            name: 'last_attempt_at',
            type: 'timestamp',
            isNullable: true,
            comment: 'Data da última tentativa de uso',
          },
          {
            name: 'invalidation_reason',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: 'Motivo da invalidação do token',
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
            comment: 'Metadados adicionais para auditoria',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
            comment: 'Data de criação do registro',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
            comment: 'Data da última atualização do registro',
          },
        ],
      }),
      true,
    );

    // Criar índices conforme definido na entidade
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_password_reset_tokens_token" ON "password_reset_tokens" ("token")'
    );
    
    await queryRunner.query(
      'CREATE INDEX "IDX_password_reset_tokens_usuario_id_is_used" ON "password_reset_tokens" ("usuario_id", "is_used")'
    );
    
    await queryRunner.query(
      'CREATE INDEX "IDX_password_reset_tokens_expires_at" ON "password_reset_tokens" ("expires_at")'
    );
    
    await queryRunner.query(
      'CREATE INDEX "IDX_password_reset_tokens_used_at" ON "password_reset_tokens" ("used_at")'
    );

    // Criar trigger para atualizar updated_at automaticamente
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
      CREATE TRIGGER update_password_reset_tokens_updated_at
        BEFORE UPDATE ON password_reset_tokens
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    // Criar chave estrangeira para usuario
    await queryRunner.createForeignKey(
      'password_reset_tokens',
      new TableForeignKey({
        columnNames: ['usuario_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'usuario',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_password_reset_tokens_usuario',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover trigger
    await queryRunner.query('DROP TRIGGER IF EXISTS update_password_reset_tokens_updated_at ON password_reset_tokens');
    
    // Remover função do trigger (só se não estiver sendo usada por outras tabelas)
    await queryRunner.query('DROP FUNCTION IF EXISTS update_updated_at_column()');
    
    // Remover a tabela (isso também remove os índices e chaves estrangeiras)
    await queryRunner.dropTable('password_reset_tokens');
  }
}