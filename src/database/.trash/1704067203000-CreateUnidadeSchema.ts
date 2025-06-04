import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: CreateUnidadeSchema
 *
 * Descrição: Cria a estrutura do módulo de Unidades e Setores, essencial para
 * a organização hierárquica dos serviços oferecidos pelo sistema.
 *
 * Domínio: Unidades e Setores
 * Dependências: 1000000-CreateAutenticacaoUsuarioSchema.ts
 *
 * @author Engenheiro de Dados
 * @date 19/05/2025
 */
export class CreateUnidadeSchema1704067203000 implements MigrationInterface {
  name = 'CreateUnidadeSchema1704067203000';

  /**
   * Cria as estruturas do módulo de unidades e setores
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      console.log('Iniciando migration 1010000-CreateUnidadeSchema...');

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

      // 4. Atualizar a tabela de usuário para adicionar as foreign keys para unidade e setor
      await queryRunner.query(`
        -- Adicionar chave estrangeira para unidade na tabela de usuários
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_USUARIO_UNIDADE') THEN
            ALTER TABLE "usuario" 
            ADD CONSTRAINT "FK_USUARIO_UNIDADE" 
            FOREIGN KEY ("unidade_id") REFERENCES "unidade" ("id") 
            ON DELETE SET NULL;
          END IF;
        END$$;

        -- Adicionar chave estrangeira para setor na tabela de usuários
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_USUARIO_SETOR') THEN
            ALTER TABLE "usuario" 
            ADD CONSTRAINT "FK_USUARIO_SETOR" 
            FOREIGN KEY ("setor_id") REFERENCES "setor" ("id") 
            ON DELETE SET NULL;
          END IF;
        END$$;
      `);

      console.log(
        'Migration 1010000-CreateUnidadeSchema executada com sucesso.',
      );
    } catch (error) {
      console.error(
        'Erro ao executar migration 1010000-CreateUnidadeSchema:',
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
        'Iniciando rollback da migration 1010000-CreateUnidadeSchema...',
      );

      // 1. Remover as foreign keys da tabela de usuários
      await queryRunner.query(`
        ALTER TABLE "usuario" DROP CONSTRAINT IF EXISTS "FK_USUARIO_SETOR";
        ALTER TABLE "usuario" DROP CONSTRAINT IF EXISTS "FK_USUARIO_UNIDADE";
      `);

      // 2. Remover tabelas na ordem inversa da criação
      await queryRunner.query(`DROP TABLE IF EXISTS "setor";`);
      await queryRunner.query(`DROP TABLE IF EXISTS "unidade";`);

      // 3. Remover tipos enumerados
      await queryRunner.query(`DROP TYPE IF EXISTS "status_unidade";`);
      await queryRunner.query(`DROP TYPE IF EXISTS "tipo_unidade";`);

      console.log(
        'Rollback da migration 1010000-CreateUnidadeSchema executado com sucesso.',
      );
    } catch (error) {
      console.error(
        'Erro ao executar rollback da migration 1010000-CreateUnidadeSchema:',
        error,
      );
      throw error;
    }
  }
}
