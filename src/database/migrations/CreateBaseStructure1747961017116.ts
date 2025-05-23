import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: CreateBaseStructure
 *
 * Descrição: Cria a estrutura base do banco de dados, incluindo extensões PostgreSQL,
 * schemas, funções utilitárias e tipos enumerados para o funcionamento do sistema.
 *
 * Domínio: Base
 * Dependências: Nenhuma
 *
 * @author Engenheiro de Dados
 * @date 19/05/2025
 */
export class CreateBaseStructure1747961017116 implements MigrationInterface {
  name = 'CreateBaseStructure1747961017116';

  /**
   * Cria as estruturas de banco de dados base
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      console.log('Iniciando migration 1000000-CreateBaseStructure...');
      
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

      // 3. Criar função para registro de logs (visando atender LGPD)
      await queryRunner.query(`
        CREATE OR REPLACE FUNCTION log_change()
        RETURNS TRIGGER AS $$
        DECLARE
          user_id UUID;
          changes JSONB;
        BEGIN
          -- Obter usuário atual do contexto (se disponível)
          user_id := current_setting('app.usuario_id', TRUE);
          
          -- Registrar diferenças entre OLD e NEW
          IF (TG_OP = 'UPDATE') THEN
            changes := jsonb_build_object(
              'anterior', row_to_json(OLD),
              'atual', row_to_json(NEW)
            );
          ELSIF (TG_OP = 'INSERT') THEN
            changes := jsonb_build_object(
              'atual', row_to_json(NEW)
            );
          ELSIF (TG_OP = 'DELETE') THEN
            changes := jsonb_build_object(
              'anterior', row_to_json(OLD)
            );
          END IF;
          
          -- Inserir registro na tabela de logs
          -- Obs: A tabela será criada em outra migration
          -- Aqui apenas definimos a função que será utilizada posteriormente
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      // 4. Criar tipos enumerados globais
      await queryRunner.query(`
        -- Enum para sexo usado em várias entidades
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sexo_enum') THEN
            CREATE TYPE "sexo_enum" AS ENUM ('masculino', 'feminino', 'outro');
          END IF;
        END$$;
        
        -- Enum para status de ativo/inativo
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_ativo_enum') THEN
            CREATE TYPE "status_ativo_enum" AS ENUM ('ativo', 'inativo');
          END IF;
        END$$;
        
        -- Enum para sim/não
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sim_nao_enum') THEN
            CREATE TYPE "sim_nao_enum" AS ENUM ('sim', 'nao');
          END IF;
        END$$;
      `);

      // 5. Criar tabela de configuração global do sistema
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "configuracao_sistema" (
          "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          "chave" VARCHAR(100) NOT NULL UNIQUE,
          "valor" TEXT NOT NULL,
          "descricao" TEXT,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          "removed_at" TIMESTAMP
        );

        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_configuracao_timestamp') THEN
            CREATE TRIGGER update_configuracao_timestamp
            BEFORE UPDATE ON configuracao_sistema
            FOR EACH ROW
            EXECUTE FUNCTION update_timestamp();
          END IF;
        END$$;
      `);

      // 6. Criar tabela básica de parâmetros do sistema
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "parametro_sistema" (
          "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          "codigo" VARCHAR(50) NOT NULL UNIQUE,
          "nome" VARCHAR(100) NOT NULL,
          "valor" TEXT NOT NULL,
          "tipo_valor" VARCHAR(20) NOT NULL,
          "descricao" TEXT,
          "grupo" VARCHAR(50) NOT NULL,
          "editavel" BOOLEAN DEFAULT TRUE,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          "removed_at" TIMESTAMP
        );

        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_parametro_timestamp') THEN
            CREATE TRIGGER update_parametro_timestamp
            BEFORE UPDATE ON parametro_sistema
            FOR EACH ROW
            EXECUTE FUNCTION update_timestamp();
          END IF;
        END$$;
        
        -- Índices para pesquisa
        DO $$
        BEGIN
          -- Índice para pesquisa por grupo
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_PARAMETRO_GRUPO') THEN
            CREATE INDEX "IDX_PARAMETRO_GRUPO" ON "parametro_sistema" ("grupo");
          END IF;
          
          -- Índice para pesquisa por código
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_PARAMETRO_CODIGO') THEN
            CREATE INDEX "IDX_PARAMETRO_CODIGO" ON "parametro_sistema" ("codigo");
          END IF;
        END$$;
      `);

      console.log('Migration 1000000-CreateBaseStructure executada com sucesso.');
    } catch (error) {
      console.error('Erro ao executar migration 1000000-CreateBaseStructure:', error);
      throw error;
    }
  }

  /**
   * Reverte todas as alterações feitas no método up
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    try {
      console.log('Iniciando rollback da migration 1000000-CreateBaseStructure...');
      
      // 1. Remover tabelas
      await queryRunner.query(`DROP TABLE IF EXISTS "parametro_sistema";`);
      await queryRunner.query(`DROP TABLE IF EXISTS "configuracao_sistema";`);

      // 2. Remover tipos enumerados
      await queryRunner.query(`DROP TYPE IF EXISTS "sim_nao_enum";`);
      await queryRunner.query(`DROP TYPE IF EXISTS "status_ativo_enum";`);
      await queryRunner.query(`DROP TYPE IF EXISTS "sexo_enum";`);
      
      // 3. Remover funções criadas
      await queryRunner.query(`DROP FUNCTION IF EXISTS log_change();`);
      await queryRunner.query(`DROP FUNCTION IF EXISTS update_timestamp();`);

      // 4. As extensões geralmente não são removidas, pois podem ser usadas por outros sistemas

      console.log('Rollback da migration 1000000-CreateBaseStructure executado com sucesso.');
    } catch (error) {
      console.error('Erro ao executar rollback da migration 1000000-CreateBaseStructure:', error);
      throw error;
    }
  }
}
