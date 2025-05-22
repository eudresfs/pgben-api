import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migração para criar o esquema de permissões do sistema
 * 
 * Esta migração cria todas as tabelas necessárias para o sistema de permissões granulares:
 * - permission: Armazena as permissões individuais
 * - permission_group: Armazena os grupos de permissões
 * - permission_group_mapping: Mapeia permissões para grupos
 * - role_permission: Associa permissões a papéis (roles)
 * - user_permission: Associa permissões diretamente a usuários
 * - permission_scope: Define o escopo de uma permissão
 */
export class CreatePermissionSchema1160000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar tabela de permissões
    await queryRunner.query(`
      CREATE TABLE "permission" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" VARCHAR(100) NOT NULL UNIQUE,
        "description" VARCHAR(255) NOT NULL,
        "is_composite" BOOLEAN NOT NULL DEFAULT false,
        "parent_id" UUID NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "created_by" UUID NULL,
        "updated_by" UUID NULL,
        CONSTRAINT "fk_permission_parent" FOREIGN KEY ("parent_id") 
          REFERENCES "permission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_permission_created_by" FOREIGN KEY ("created_by") 
          REFERENCES "usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "fk_permission_updated_by" FOREIGN KEY ("updated_by") 
          REFERENCES "usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `);

    // Criar tabela de grupos de permissões
    await queryRunner.query(`
      CREATE TABLE "permission_group" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" VARCHAR(100) NOT NULL UNIQUE,
        "description" VARCHAR(255) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "created_by" UUID NULL,
        "updated_by" UUID NULL,
        CONSTRAINT "fk_permission_group_created_by" FOREIGN KEY ("created_by") 
          REFERENCES "usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "fk_permission_group_updated_by" FOREIGN KEY ("updated_by") 
          REFERENCES "usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `);

    // Criar tabela de mapeamento de permissões para grupos
    await queryRunner.query(`
      CREATE TABLE "permission_group_mapping" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "permission_id" UUID NOT NULL,
        "group_id" UUID NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "created_by" UUID NULL,
        CONSTRAINT "fk_permission_group_mapping_permission" FOREIGN KEY ("permission_id") 
          REFERENCES "permission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_permission_group_mapping_group" FOREIGN KEY ("group_id") 
          REFERENCES "permission_group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_permission_group_mapping_created_by" FOREIGN KEY ("created_by") 
          REFERENCES "usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "uq_permission_group_mapping" UNIQUE ("permission_id", "group_id")
      )
    `);

    // Criar tabela de permissões de papel (role)
    await queryRunner.query(`
      CREATE TABLE "role_permission" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "role_id" UUID NOT NULL,
        "permission_id" UUID NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "created_by" UUID NULL,
        CONSTRAINT "fk_role_permission_role" FOREIGN KEY ("role_id") 
          REFERENCES "papel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_role_permission_permission" FOREIGN KEY ("permission_id") 
          REFERENCES "permission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_role_permission_created_by" FOREIGN KEY ("created_by") 
          REFERENCES "usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "uq_role_permission" UNIQUE ("role_id", "permission_id")
      )
    `);

    // Criar tabela de permissões de usuário
    await queryRunner.query(`
      CREATE TABLE "user_permission" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" UUID NOT NULL,
        "permission_id" UUID NOT NULL,
        "scope_type" VARCHAR(50) NOT NULL DEFAULT 'GLOBAL',
        "scope_id" UUID NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "created_by" UUID NULL,
        CONSTRAINT "fk_user_permission_user" FOREIGN KEY ("user_id") 
          REFERENCES "usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_user_permission_permission" FOREIGN KEY ("permission_id") 
          REFERENCES "permission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_user_permission_created_by" FOREIGN KEY ("created_by") 
          REFERENCES "usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "uq_user_permission" UNIQUE ("user_id", "permission_id", "scope_type", "scope_id")
      )
    `);

    // Criar tabela de escopo de permissão
    await queryRunner.query(`
      CREATE TABLE "permission_scope" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_permission_id" UUID NOT NULL,
        "scope_type" VARCHAR(50) NOT NULL,
        "scope_id" UUID NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "created_by" UUID NULL,
        CONSTRAINT "fk_permission_scope_user_permission" FOREIGN KEY ("user_permission_id") 
          REFERENCES "user_permission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_permission_scope_created_by" FOREIGN KEY ("created_by") 
          REFERENCES "usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `);

    // Criar índices para melhorar a performance
    await queryRunner.query(`CREATE INDEX "idx_permission_name" ON "permission" ("name")`);
    await queryRunner.query(`CREATE INDEX "idx_permission_parent_id" ON "permission" ("parent_id")`);
    await queryRunner.query(`CREATE INDEX "idx_permission_group_name" ON "permission_group" ("name")`);
    await queryRunner.query(`CREATE INDEX "idx_permission_group_mapping_permission_id" ON "permission_group_mapping" ("permission_id")`);
    await queryRunner.query(`CREATE INDEX "idx_permission_group_mapping_group_id" ON "permission_group_mapping" ("group_id")`);
    await queryRunner.query(`CREATE INDEX "idx_role_permission_role_id" ON "role_permission" ("role_id")`);
    await queryRunner.query(`CREATE INDEX "idx_role_permission_permission_id" ON "role_permission" ("permission_id")`);
    await queryRunner.query(`CREATE INDEX "idx_user_permission_user_id" ON "user_permission" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "idx_user_permission_permission_id" ON "user_permission" ("permission_id")`);
    await queryRunner.query(`CREATE INDEX "idx_user_permission_scope_type" ON "user_permission" ("scope_type")`);
    await queryRunner.query(`CREATE INDEX "idx_user_permission_scope_id" ON "user_permission" ("scope_id")`);
    await queryRunner.query(`CREATE INDEX "idx_permission_scope_user_permission_id" ON "permission_scope" ("user_permission_id")`);
    await queryRunner.query(`CREATE INDEX "idx_permission_scope_scope_type" ON "permission_scope" ("scope_type")`);
    await queryRunner.query(`CREATE INDEX "idx_permission_scope_scope_id" ON "permission_scope" ("scope_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índices
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_permission_scope_scope_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_permission_scope_scope_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_permission_scope_user_permission_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_permission_scope_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_permission_scope_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_permission_permission_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_permission_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_role_permission_permission_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_role_permission_role_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_permission_group_mapping_group_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_permission_group_mapping_permission_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_permission_group_name"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_permission_parent_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_permission_name"`);

    // Remover tabelas na ordem inversa para evitar problemas de chave estrangeira
    await queryRunner.query(`DROP TABLE IF EXISTS "permission_scope"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_permission"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "role_permission"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "permission_group_mapping"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "permission_group"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "permission"`);
  }
}
