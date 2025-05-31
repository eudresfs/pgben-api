import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsuarioRoleTable1704067224000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar se a tabela já existe para evitar erros
    const tableExists = await queryRunner.hasTable('usuario_role');
    if (tableExists) {
      console.log('Tabela usuario_role já existe, pulando criação');
      return;
    }

    // Verificar se a tabela role existe
    const roleTableExists = await queryRunner.hasTable('role');
    if (!roleTableExists) {
      console.log('Tabela role não existe, verificando tabela role');
      
      // Verificar se a tabela role existe
      const roleExists = await queryRunner.hasTable('role');
      if (!roleExists) {
        console.log('Tabela role não existe, não é possível criar relacionamentos');
        return;
      }
    }

    // Determinar o nome correto da tabela de roles
    const roleTableName = roleTableExists ? 'role' : 'role';
    
    await queryRunner.query(`
      CREATE TABLE "usuario_role" (
        "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        "usuario_id" UUID NOT NULL,
        "role_id" UUID NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "criado_por" UUID,
        CONSTRAINT "fk_usuario_role_usuario" FOREIGN KEY ("usuario_id") 
          REFERENCES "usuario" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "fk_usuario_role_role" FOREIGN KEY ("role_id") 
          REFERENCES "${roleTableName}" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "uq_usuario_role" UNIQUE ("usuario_id", "role_id")
      );
      
      CREATE INDEX "idx_usuario_role_usuario_id" ON "usuario_role" ("usuario_id");
      CREATE INDEX "idx_usuario_role_role_id" ON "usuario_role" ("role_id");
      
      -- Adicionar comentários para documentação
      COMMENT ON TABLE "usuario_role" IS 'Tabela de associação entre usuários e roles';
      COMMENT ON COLUMN "usuario_role"."id" IS 'Identificador único da associação';
      COMMENT ON COLUMN "usuario_role"."usuario_id" IS 'Referência ao usuário';
      COMMENT ON COLUMN "usuario_role"."role_id" IS 'Referência à role';
      COMMENT ON COLUMN "usuario_role"."created_at" IS 'Data de criação do registro';
      COMMENT ON COLUMN "usuario_role"."criado_por" IS 'Usuário que criou o registro';
    `);
    
    // Migrar dados do campo role_id da tabela usuario para a nova tabela usuario_role
    await queryRunner.query(`
      INSERT INTO "usuario_role" ("usuario_id", "role_id", "created_at")
      SELECT "id", "role_id", CURRENT_TIMESTAMP
      FROM "usuario"
      WHERE "role_id" IS NOT NULL;
    `);
    
    console.log('Tabela usuario_role criada com sucesso');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "usuario_role"`);
  }
}
