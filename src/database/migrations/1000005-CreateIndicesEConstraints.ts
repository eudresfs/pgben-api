import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIndicesEConstraints1000005 implements MigrationInterface {
  name = 'CreateIndicesEConstraints20250512122400';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Índices para otimização de busca em usuários
    await queryRunner.query(`
      CREATE INDEX "idx_usuario_nome" ON "usuario"("nome");
      CREATE INDEX "idx_usuario_email" ON "usuario"("email");
      CREATE INDEX "idx_usuario_cpf" ON "usuario"("cpf");
      CREATE INDEX "idx_usuario_matricula" ON "usuario"("matricula");
      CREATE INDEX "idx_usuario_role_status" ON "usuario"("role", "status");
      CREATE INDEX "idx_usuario_unidade" ON "usuario"("unidade_id");
      CREATE INDEX "idx_usuario_setor" ON "usuario"("setor_id");
    `);

    // Índices para otimização de busca em cidadãos
    await queryRunner.query(`
      CREATE INDEX "idx_cidadao_nome" ON "cidadao"("nome");
      CREATE INDEX "idx_cidadao_cpf" ON "cidadao"("cpf");
      CREATE INDEX "idx_cidadao_nis" ON "cidadao"("nis");
      CREATE INDEX "idx_cidadao_data_nascimento" ON "cidadao"("data_nascimento");
      CREATE INDEX "idx_cidadao_tipo" ON "cidadao"("tipo_cidadao");
      CREATE INDEX "idx_cidadao_bairro" ON "cidadao"("bairro");
      CREATE INDEX "idx_cidadao_cidade_uf" ON "cidadao"("cidade", "uf");
    `);

    // Constraints de integridade referencial
    await queryRunner.query(`
      -- Usuários -> Unidade
      ALTER TABLE "usuario" ADD CONSTRAINT "fk_usuario_unidade"
        FOREIGN KEY ("unidade_id") REFERENCES "unidade"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;

      -- Usuários -> Setor
      ALTER TABLE "usuario" ADD CONSTRAINT "fk_usuario_setor"
        FOREIGN KEY ("setor_id") REFERENCES "setor"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    `);

    // Constraints de validação
    await queryRunner.query(`
      -- Validação de CPF
      ALTER TABLE "usuario" ADD CONSTRAINT "ck_usuario_cpf"
        CHECK (cpf ~ '^[0-9]{11}$');
      ALTER TABLE "cidadao" ADD CONSTRAINT "ck_cidadao_cpf"
        CHECK (cpf ~ '^[0-9]{11}$');

      -- Validação de email
      ALTER TABLE "usuario" ADD CONSTRAINT "ck_usuario_email"
        CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
      ALTER TABLE "cidadao" ADD CONSTRAINT "ck_cidadao_email"
        CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR email IS NULL);

      -- Validação de CEP
      ALTER TABLE "cidadao" ADD CONSTRAINT "ck_cidadao_cep"
        CHECK (cep ~ '^[0-9]{8}$' OR cep IS NULL);

      -- Validação de telefone
      ALTER TABLE "usuario" ADD CONSTRAINT "ck_usuario_telefone"
        CHECK (telefone ~ '^[0-9]{10,11}$' OR telefone IS NULL);
      ALTER TABLE "cidadao" ADD CONSTRAINT "ck_cidadao_telefone"
        CHECK (telefone ~ '^[0-9]{10,11}$' OR telefone IS NULL);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover constraints de validação
    await queryRunner.query(`
      ALTER TABLE "cidadao" DROP CONSTRAINT IF EXISTS "ck_cidadao_telefone";
      ALTER TABLE "usuario" DROP CONSTRAINT IF EXISTS "ck_usuario_telefone";
      ALTER TABLE "cidadao" DROP CONSTRAINT IF EXISTS "ck_cidadao_cep";
      ALTER TABLE "cidadao" DROP CONSTRAINT IF EXISTS "ck_cidadao_email";
      ALTER TABLE "usuario" DROP CONSTRAINT IF EXISTS "ck_usuario_email";
      ALTER TABLE "cidadao" DROP CONSTRAINT IF EXISTS "ck_cidadao_cpf";
      ALTER TABLE "usuario" DROP CONSTRAINT IF EXISTS "ck_usuario_cpf";
    `);

    // Remover constraints de integridade referencial
    await queryRunner.query(`
      ALTER TABLE "usuario" DROP CONSTRAINT IF EXISTS "fk_usuario_setor";
      ALTER TABLE "usuario" DROP CONSTRAINT IF EXISTS "fk_usuario_unidade";
    `);

    // Remover índices de cidadão
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_cidadao_cidade_uf";
      DROP INDEX IF EXISTS "idx_cidadao_bairro";
      DROP INDEX IF EXISTS "idx_cidadao_tipo";
      DROP INDEX IF EXISTS "idx_cidadao_data_nascimento";
      DROP INDEX IF EXISTS "idx_cidadao_nis";
      DROP INDEX IF EXISTS "idx_cidadao_cpf";
      DROP INDEX IF EXISTS "idx_cidadao_nome";
    `);

    // Remover índices de usuários
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_usuario_setor";
      DROP INDEX IF EXISTS "idx_usuario_unidade";
      DROP INDEX IF EXISTS "idx_usuario_role_status";
      DROP INDEX IF EXISTS "idx_usuario_matricula";
      DROP INDEX IF EXISTS "idx_usuario_cpf";
      DROP INDEX IF EXISTS "idx_usuario_email";
      DROP INDEX IF EXISTS "idx_usuario_nome";
    `);
  }
}