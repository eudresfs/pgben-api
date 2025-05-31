import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddJwtBlacklistEntity1704067204000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'jwt_blacklist',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'jti',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'usuario_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'token_type',
            type: 'enum',
            enum: ['access', 'refresh'],
            isNullable: false,
          },
          {
            name: 'expires_at',
            type: 'timestamp with time zone',
            isNullable: false,
          },
          {
            name: 'reason',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'client_ip',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'user_agent',
            type: 'varchar',
            length: '1000',
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
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
        indices: [
          {
            name: 'IDX_JWT_BLACKLIST_JTI',
            columnNames: ['jti'],
            isUnique: true,
          },
          {
            name: 'IDX_JWT_BLACKLIST_USUARIO_ID',
            columnNames: ['usuario_id'],
          },
          {
            name: 'IDX_JWT_BLACKLIST_EXPIRES_AT',
            columnNames: ['expires_at'],
          },
          {
            name: 'IDX_JWT_BLACKLIST_CREATED_AT',
            columnNames: ['created_at'],
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('jwt_blacklist');
  }
}
