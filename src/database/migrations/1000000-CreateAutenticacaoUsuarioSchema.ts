import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: CreateAutenticacaoUsuarioSchema
 *
 * Descrição: Cria a estrutura do módulo de autenticação e usuários, incluindo tabelas para
 * controle de acesso, permissões, papéis e tokens de autenticação.
 *
 * Domínio: Autenticação e Usuários
 * Dependências: Nenhuma
 *
 * @author Engenheiro de Dados
 * @date 19/05/2025
 */
export class CreateAutenticacaoUsuarioSchema1685468879182 implements MigrationInterface {
  name = 'CreateAutenticacaoUsuarioSchema1685468879182';

  /**
   * Cria as estruturas do módulo de autenticação e usuário
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      console.log('Iniciando migration 1000000-CreateAutenticacaoUsuarioSchema...');

      // 1. Criar extensões PostgreSQL necessárias
      await queryRunner.query(`
        -- Extensão para geração de UUIDs
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        
        -- Extensão para funções criptográficas
        CREATE EXTENSION IF NOT EXISTS "pgcrypto";
        
        -- Extensão para busca textual
        CREATE EXTENSION IF NOT EXISTS "pg_trgm";
        
        -- Extensão para índices GIN e GiST
        CREATE EXTENSION IF NOT EXISTS "btree_gin";
        CREATE EXTENSION IF NOT EXISTS "btree_gist";
      `);

      // 2. Criar função para atualização automática de timestamp
      await queryRunner.query(`
        CREATE OR REPLACE FUNCTION update_timestamp()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);
      
      // 3. Criar tipos enumerados 
      await queryRunner.query(`
        -- Enum para roles do sistema (baseado no Role enum)
          CREATE TYPE role AS ENUM (
              'admin',
              'gestor',
              'coordenador',
              'tecnico',
              'assistente_social',
              'cidadao',
              'auditor'
            );
      `);

      // 4. Criar tabela de permissões (baseado na entidade Permissao)
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "permissao" (
          "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          "nome" VARCHAR(100) NOT NULL,
          "descricao" TEXT,
          "modulo" VARCHAR(50) NOT NULL,
          "acao" VARCHAR(50) NOT NULL,
          "ativo" BOOLEAN DEFAULT TRUE,
          "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
          "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
          "removed_at" TIMESTAMP WITH TIME ZONE
        );

        -- Índices para campos frequentemente consultados
        CREATE INDEX "IDX_PERMISSAO_MODULO" ON "permissao" ("modulo");
        CREATE INDEX "IDX_PERMISSAO_NOME" ON "permissao" ("nome");

        -- Trigger para atualização automática do timestamp
        CREATE TRIGGER update_permissao_timestamp
        BEFORE UPDATE ON permissao
        FOR EACH ROW
        EXECUTE FUNCTION update_timestamp();
      `);

      // 5. Criar tabela de usuários (baseado na entidade Usuario)
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "usuario" (
          "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          "nome" VARCHAR(100) NOT NULL,
          "email" VARCHAR(100) UNIQUE NOT NULL,
          "senha_hash" VARCHAR(255) NOT NULL,
          "cpf" VARCHAR(14) UNIQUE,
          "telefone" VARCHAR(20),
          "matricula" VARCHAR(50) UNIQUE,
          "role" "role" NOT NULL DEFAULT 'tecnico',
          "unidade_id" UUID,
          "setor_id" UUID,
          "status" VARCHAR(20) DEFAULT 'ativo',
          "primeiro_acesso" BOOLEAN DEFAULT TRUE,
          "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
          "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
          "removed_at" TIMESTAMP WITH TIME ZONE
        );

        -- Índices para campos frequentemente consultados
        CREATE UNIQUE INDEX "IDX_USUARIO_EMAIL" ON "usuario" ("email");
        CREATE UNIQUE INDEX "IDX_USUARIO_CPF" ON "usuario" ("cpf");
        CREATE UNIQUE INDEX "IDX_USUARIO_MATRICULA" ON "usuario" ("matricula");
        CREATE INDEX "IDX_USUARIO_UNIDADE" ON "usuario" ("unidade_id");
        CREATE INDEX "IDX_USUARIO_SETOR" ON "usuario" ("setor_id");
        CREATE INDEX "IDX_USUARIO_ROLE" ON "usuario" ("role");
        CREATE INDEX "IDX_USUARIO_STATUS" ON "usuario" ("status");

        -- Trigger para atualização automática do timestamp
        CREATE TRIGGER update_usuario_timestamp
        BEFORE UPDATE ON usuario
        FOR EACH ROW
        EXECUTE FUNCTION update_timestamp();
      `);

      // 6. Criar tabela de associação entre roles e permissões (baseado na entidade RolePermissao)
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "role_permissao" (
          "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          "role" "role" NOT NULL,
          "permissao_id" UUID NOT NULL,
          "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
          "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
          "removed_at" TIMESTAMP WITH TIME ZONE,
          CONSTRAINT "FK_ROLE_PERMISSAO_PERMISSAO" FOREIGN KEY ("permissao_id") 
            REFERENCES "permissao" ("id") ON DELETE CASCADE
        );

        -- Índices para campos frequentemente consultados
        CREATE INDEX "IDX_ROLE_PERMISSAO_ROLE" ON "role_permissao" ("role");
        CREATE INDEX "IDX_ROLE_PERMISSAO_PERMISSAO" ON "role_permissao" ("permissao_id");

        -- Trigger para atualização automática do timestamp
        CREATE TRIGGER update_role_permissao_timestamp
        BEFORE UPDATE ON role_permissao
        FOR EACH ROW
        EXECUTE FUNCTION update_timestamp();
      `);

      // 7. Criar tabela de tokens de refresh para autenticação (baseado na entidade RefreshToken)
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "refresh_tokens" (
          "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          "usuario_id" UUID NOT NULL,
          "token" VARCHAR(500) UNIQUE NOT NULL,
          "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
          "revoked" BOOLEAN DEFAULT FALSE,
          "revoked_at" TIMESTAMP WITH TIME ZONE,
          "revoked_by_ip" VARCHAR(45),
          "replaced_by_token" VARCHAR(500),
          "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
          "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
          CONSTRAINT "FK_REFRESH_TOKEN_USUARIO" FOREIGN KEY ("usuario_id") 
            REFERENCES "usuario" ("id") ON DELETE CASCADE
        );

        -- Índices para campos frequentemente consultados
        CREATE INDEX "IDX_REFRESH_TOKEN_USUARIO" ON "refresh_tokens" ("usuario_id");
        CREATE INDEX "IDX_REFRESH_TOKEN_TOKEN" ON "refresh_tokens" ("token");
        CREATE INDEX "IDX_REFRESH_TOKEN_EXPIRES" ON "refresh_tokens" ("expires_at");

        -- Trigger para atualização automática do timestamp
        CREATE TRIGGER update_refresh_token_timestamp
        BEFORE UPDATE ON refresh_tokens
        FOR EACH ROW
        EXECUTE FUNCTION update_timestamp();
      `);

      console.log('Migration 1000000-CreateAutenticacaoUsuarioSchema executada com sucesso.');
    } catch (error) {
      console.error('Erro ao executar migration 1000000-CreateAutenticacaoUsuarioSchema:', error);
      throw error;
    }
  }

  /**
   * Reverte todas as alterações feitas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    try {
      console.log('Iniciando rollback da migration 1000000-CreateAutenticacaoUsuarioSchema...');
      
      // 1. Remover tabelas na ordem inversa da criação
      await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens";`);
      await queryRunner.query(`DROP TABLE IF EXISTS "role_permissao";`);
      await queryRunner.query(`DROP TABLE IF EXISTS "usuario";`);
      await queryRunner.query(`DROP TABLE IF EXISTS "permissao";`);

      // 2. Remover tipos enumerados
      await queryRunner.query(`DROP TYPE IF EXISTS "role";`);

      // 3. Remover funções criadas
      await queryRunner.query(`DROP FUNCTION IF EXISTS update_timestamp();`);

      console.log('Rollback da migration 1000000-CreateAutenticacaoUsuarioSchema executado com sucesso.');
    } catch (error) {
      console.error('Erro ao executar rollback da migration 1000000-CreateAutenticacaoUsuarioSchema:', error);
      throw error;
    }
  }
}
