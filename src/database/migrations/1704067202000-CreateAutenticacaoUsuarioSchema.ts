import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

// Carrega as variáveis de ambiente
dotenv.config();

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
export class CreateAutenticacaoUsuarioSchema1704067202000
  implements MigrationInterface
{
  name = 'CreateAutenticacaoUsuarioSchema1704067202000';

  /**
   * Cria as estruturas do módulo de autenticação e usuário
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      console.log(
        'Iniciando migration 1000000-CreateAutenticacaoUsuarioSchema...',
      );

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
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role') THEN
            CREATE TYPE role AS ENUM (
              'admin',
              'gestor',
              'coordenador',
              'tecnico',
              'assistente_social',
              'cidadao',
              'auditor'
            );
          END IF;
        END$$;
      `);

      // 4. Criar tabela de permissões (baseado na entidade Permissao)
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "permissao" (
          "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          "nome" VARCHAR(100) NOT NULL,
          "descricao" TEXT,
          "modulo" VARCHAR(50) NOT NULL,
          "acao" VARCHAR(50) NOT NULL,
          "status" varchar(10),
          "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
          "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
          "removed_at" TIMESTAMP WITH TIME ZONE
        );

        -- Índices para campos frequentemente consultados
        CREATE INDEX IF NOT EXISTS "IDX_PERMISSAO_MODULO" ON "permissao" ("modulo");
        CREATE INDEX IF NOT EXISTS "IDX_PERMISSAO_NOME" ON "permissao" ("nome");
        CREATE INDEX IF NOT EXISTS "IDX_PERMISSAO_STATUS" ON "permissao" ("status");

        -- Trigger para atualização automática do timestamp
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_permissao_timestamp') THEN
            CREATE TRIGGER update_permissao_timestamp
            BEFORE UPDATE ON permissao
            FOR EACH ROW
            EXECUTE FUNCTION update_timestamp();
          END IF;
        END$$;
      `);

      // 1. Criar tipos enumerados para o módulo
      await queryRunner.query(`
              -- Enum para tipos de unidades
              DO $$
              BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_unidade') THEN
                  CREATE TYPE "tipo_unidade" AS ENUM (
                    'cras',
                    'creas',
                    'centro_pop',
                    'semtas',
                    'outro'
                  );
                END IF;
              END$$;
      
              -- Enum para status de unidade
              DO $$
              BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_unidade') THEN
                  CREATE TYPE "status_unidade" AS ENUM (
                    'ativo',
                    'inativo'
                  );
                END IF;
              END$$;
            `);

      // 2. Criar tabela de unidades (baseado na entidade Unidade)
      await queryRunner.query(`
              CREATE TABLE IF NOT EXISTS "unidade" (
                "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                "nome" VARCHAR(100) NOT NULL,
                "codigo" VARCHAR(20) NOT NULL UNIQUE,
                "sigla" VARCHAR(20),
                "tipo" "tipo_unidade" NOT NULL DEFAULT 'cras',
                "endereco" TEXT,
                "telefone" VARCHAR(20),
                "email" VARCHAR(100),
                "responsavel_matricula" VARCHAR(50),
                "status" "status_unidade" NOT NULL DEFAULT 'ativo',
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "removed_at" TIMESTAMP WITH TIME ZONE
              );
      
              -- Índices para otimização de consultas
              DO $$
              BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_UNIDADE_NOME') THEN
                  CREATE INDEX "IDX_UNIDADE_NOME" ON "unidade" ("nome");
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_UNIDADE_CODIGO') THEN
                  CREATE UNIQUE INDEX "IDX_UNIDADE_CODIGO" ON "unidade" ("codigo");
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_UNIDADE_TIPO') THEN
                  CREATE INDEX "IDX_UNIDADE_TIPO" ON "unidade" ("tipo");
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_UNIDADE_STATUS') THEN
                  CREATE INDEX "IDX_UNIDADE_STATUS" ON "unidade" ("status");
                END IF;
              END$$;
      
              -- Trigger para atualização automática do timestamp
              DO $$
              BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_unidade_timestamp') THEN
                  CREATE TRIGGER update_unidade_timestamp
                  BEFORE UPDATE ON unidade
                  FOR EACH ROW
                  EXECUTE FUNCTION update_timestamp();
                END IF;
              END$$;
            `);

      // 3. Criar tabela de setores (baseado na entidade Setor)
      await queryRunner.query(`
              CREATE TABLE IF NOT EXISTS "setor" (
                "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                "nome" VARCHAR(100) NOT NULL,
                "sigla" VARCHAR(20) DEFAULT 'N/A',
                "descricao" TEXT,
                "unidade_id" UUID NOT NULL,
                "status" BOOLEAN NOT NULL DEFAULT TRUE,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "removed_at" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "FK_SETOR_UNIDADE" FOREIGN KEY ("unidade_id")
                  REFERENCES "unidade" ("id") ON DELETE CASCADE
              );
      
              -- Índices para otimização de consultas
              DO $$
              BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_SETOR_NOME') THEN
                  CREATE INDEX "IDX_SETOR_NOME" ON "setor" ("nome");
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_SETOR_UNIDADE_ID') THEN
                  CREATE INDEX "IDX_SETOR_UNIDADE_ID" ON "setor" ("unidade_id");
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_SETOR_STATUS') THEN
                  CREATE INDEX "IDX_SETOR_STATUS" ON "setor" ("status");
                END IF;
              END$$;
      
              -- Trigger para atualização automática do timestamp
              DO $$
              BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_setor_timestamp') THEN
                  CREATE TRIGGER update_setor_timestamp
                  BEFORE UPDATE ON setor
                  FOR EACH ROW
                  EXECUTE FUNCTION update_timestamp();
                END IF;
              END$$;
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
          "role_id" UUID NOT NULL,
          "unidade_id" UUID,
          "setor_id" UUID,
          "status" VARCHAR(20) DEFAULT 'ativo',
          "tentativas_login" INTEGER,
          "ultimo_login" TIMESTAMP WITH TIME ZONE,
          "primeiro_acesso" BOOLEAN DEFAULT TRUE,
          "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
          "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
          "removed_at" TIMESTAMP WITH TIME ZONE
        );

        -- Índices para campos frequentemente consultados
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_USUARIO_EMAIL') THEN
            CREATE UNIQUE INDEX "IDX_USUARIO_EMAIL" ON "usuario" ("email");
          END IF;
        END$$;

        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_USUARIO_CPF') THEN
            CREATE UNIQUE INDEX "IDX_USUARIO_CPF" ON "usuario" ("cpf");
          END IF;
        END$$;

        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_USUARIO_MATRICULA') THEN
            CREATE UNIQUE INDEX "IDX_USUARIO_MATRICULA" ON "usuario" ("matricula");
          END IF;
        END$$;

        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_USUARIO_UNIDADE') THEN
            CREATE INDEX "IDX_USUARIO_UNIDADE" ON "usuario" ("unidade_id");
          END IF;
        END$$;

        DO $$
        BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_USUARIO_SETOR') THEN
            CREATE INDEX "IDX_USUARIO_SETOR" ON "usuario" ("setor_id");
          END IF;
        END$$;

        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_USUARIO_ROLE') THEN
            CREATE INDEX "IDX_USUARIO_ROLE" ON "usuario" ("role_id");
          END IF;
        END$$;

        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_USUARIO_STATUS') THEN
            CREATE INDEX "IDX_USUARIO_STATUS" ON "usuario" ("status");
          END IF;
        END$$;

        -- Trigger para atualização automática do timestamp
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_usuario_timestamp') THEN
            CREATE TRIGGER update_usuario_timestamp
            BEFORE UPDATE ON usuario
            FOR EACH ROW
            EXECUTE FUNCTION update_timestamp();
          END IF;
        END$$;

      `);

      // 6. Criar tabela de associação entre roles e permissões (baseado na entidade RolePermissao)
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "role_permissao" (
          "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          "role_id" UUID NOT NULL,
          "permissao_id" UUID NOT NULL,
          "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
          "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
          "removed_at" TIMESTAMP WITH TIME ZONE,
          CONSTRAINT "FK_ROLE_PERMISSAO_PERMISSAO" FOREIGN KEY ("permissao_id") 
            REFERENCES "permissao" ("id") ON DELETE CASCADE
        );

        -- Índices para campos frequentemente consultados
        CREATE INDEX IF NOT EXISTS "IDX_ROLE_PERMISSAO_ROLE" ON "role_permissao" ("role_id");
        CREATE INDEX IF NOT EXISTS "IDX_ROLE_PERMISSAO_PERMISSAO" ON "role_permissao" ("permissao_id");

        -- Trigger para atualização automática do timestamp
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_role_permissao_timestamp') THEN
            CREATE TRIGGER update_role_permissao_timestamp
            BEFORE UPDATE ON role_permissao
            FOR EACH ROW
            EXECUTE FUNCTION update_timestamp();
          END IF;
        END$$;
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
        CREATE INDEX IF NOT EXISTS "IDX_REFRESH_TOKEN_USUARIO" ON "refresh_tokens" ("usuario_id");
        CREATE INDEX IF NOT EXISTS "IDX_REFRESH_TOKEN_TOKEN" ON "refresh_tokens" ("token");
        CREATE INDEX IF NOT EXISTS "IDX_REFRESH_TOKEN_EXPIRES" ON "refresh_tokens" ("expires_at");

        -- Trigger para atualização automática do timestamp
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_refresh_token_timestamp') THEN
            CREATE TRIGGER update_refresh_token_timestamp
            BEFORE UPDATE ON refresh_tokens
            FOR EACH ROW
            EXECUTE FUNCTION update_timestamp();
          END IF;
        END$$;
      `);

      // 8. Inserir usuário administrador padrão usando variáveis de ambiente
      const adminEmail =
        process.env.DEFAULT_ADMIN_USER_EMAIL || 'admin@natal.pgben.gov.br';
      const adminName =
        process.env.DEFAULT_ADMIN_USER_NAME || 'Administrador do Sistema';
      const adminPassword =
        process.env.DEFAULT_ADMIN_USER_PASSWORD || 'PGBen@2025';

      // Gera o hash da senha usando bcrypt
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

      // Primeiro verifica se o usuário já existe
      const existingUser = await queryRunner.query(
        `SELECT 1 FROM "usuario" WHERE "email" = $1`,
        [adminEmail],
      );

      // Se não existe, cria o usuário
      if (existingUser.length === 0) {
        await queryRunner.query(
          `
          INSERT INTO "usuario" (
            "id",
            "nome",
            "email",
            "senha_hash",
            "role_id",
            "status",
            "primeiro_acesso"
          ) VALUES (
            uuid_generate_v4(),
            $1,
            $2,
            $3,
            '00000000-0000-0000-0000-000000000000',
            'ativo',
            false
          )
        `,
          [adminName, adminEmail, hashedPassword],
        );
      }

      console.log('Usuário administrador padrão criado com sucesso.');
      console.log(
        'Migration 1000000-CreateAutenticacaoUsuarioSchema executada com sucesso.',
      );
    } catch (error) {
      console.error(
        'Erro ao executar migration 1000000-CreateAutenticacaoUsuarioSchema:',
        error,
      );
      throw error;
    }
  }

  /**
   * Reverte todas as alterações feitas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    try {
      console.log(
        'Iniciando rollback da migration 1000000-CreateAutenticacaoUsuarioSchema...',
      );

      // 1. Remover tabelas na ordem inversa da criação
      await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens";`);
      await queryRunner.query(`DROP TABLE IF EXISTS "role_permissao";`);
      await queryRunner.query(`DROP TABLE IF EXISTS "usuario";`);
      await queryRunner.query(`DROP TABLE IF EXISTS "permissao";`);

      // 2. Remover tipos enumerados
      await queryRunner.query(`DROP TYPE IF EXISTS "role";`);

      // 3. Remover funções criadas
      await queryRunner.query(`DROP FUNCTION IF EXISTS update_timestamp();`);

      console.log(
        'Rollback da migration 1000000-CreateAutenticacaoUsuarioSchema executado com sucesso.',
      );
    } catch (error) {
      console.error(
        'Erro ao executar rollback da migration 1000000-CreateAutenticacaoUsuarioSchema:',
        error,
      );
      throw error;
    }
  }
}
