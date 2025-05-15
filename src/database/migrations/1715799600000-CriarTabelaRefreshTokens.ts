import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migração para criar a tabela de refresh tokens
 * 
 * Esta migração cria a estrutura necessária para armazenar os tokens
 * de refresh usados para autenticação JWT.
 */
export class CriarTabelaRefreshTokens1715799600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar se a tabela de usuários existe
    const usuarioTableExists = await queryRunner.hasTable('usuarios');
    
    if (!usuarioTableExists) {
      await queryRunner.query(`
        CREATE TABLE usuarios (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          nome VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          senha_hash VARCHAR(255) NOT NULL,
          cpf VARCHAR(14) UNIQUE,
          telefone VARCHAR(20),
          matricula VARCHAR(50) UNIQUE,
          role VARCHAR(50) NOT NULL DEFAULT 'TECNICO_UNIDADE',
          unidade_id UUID,
          setor_id UUID,
          status VARCHAR(20) NOT NULL DEFAULT 'ativo',
          primeiro_acesso BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          removed_at TIMESTAMPTZ
        );
      `);
    }

    // Criar a tabela de refresh tokens
    await queryRunner.query(`
      CREATE TABLE refresh_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        usuario_id UUID NOT NULL,
        token VARCHAR(500) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        revoked BOOLEAN NOT NULL DEFAULT FALSE,
        revoked_at TIMESTAMPTZ NULL,
        revoked_by_ip VARCHAR(45) NULL,
        replaced_by_token VARCHAR(500) NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Adicionar a chave estrangeira após criar a tabela
    await queryRunner.query(`
      ALTER TABLE refresh_tokens
      ADD CONSTRAINT fk_refresh_token_usuario
      FOREIGN KEY (usuario_id)
      REFERENCES usuario(id)
      ON DELETE CASCADE;
    `);
    
    // Criar índices
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
      CREATE INDEX idx_refresh_tokens_usuario_id ON refresh_tokens(usuario_id);
      CREATE INDEX idx_refresh_tokens_revoked ON refresh_tokens(revoked);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_refresh_tokens_token;
      DROP INDEX IF EXISTS idx_refresh_tokens_usuario_id;
      DROP INDEX IF EXISTS idx_refresh_tokens_revoked;
      DROP TABLE IF EXISTS refresh_tokens;
    `);
  }
}
