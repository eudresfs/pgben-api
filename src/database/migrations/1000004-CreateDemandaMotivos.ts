import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDemandaMotivos1000004 implements MigrationInterface {
  name = 'CreateDemandaMotivos20250512122300';
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar enum para tipos de demanda
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE tipo_demanda AS ENUM (
          'denuncia',
          'reclamacao',
          'sugestao',
          'elogio',
          'informacao',
          'outro'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Criar tabela de motivos de demanda
    await queryRunner.query(`
      CREATE TABLE "demanda_motivos" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tipo" tipo_demanda NOT NULL,
        "nome" VARCHAR(255) NOT NULL,
        "descricao" TEXT,
        "solicitacao_id" UUID,
        "ativo" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "removed_at" TIMESTAMP,
        CONSTRAINT "UQ_demanda_motivos_tipo_nome" UNIQUE ("tipo", "nome"),
        CONSTRAINT "CK_demanda_motivos_nome_length" CHECK (length(nome) >= 3),
        CONSTRAINT "FK_demanda_motivos_solicitacao" FOREIGN KEY ("solicitacao_id")
          REFERENCES "solicitacao"("id") ON DELETE SET NULL
      );
    `);

    // Criar índice para a chave estrangeira
    await queryRunner.query(`
      CREATE INDEX "IDX_demanda_motivos_solicitacao" ON "demanda_motivos"("solicitacao_id");
    `);

    // Criar índices para otimização de consultas
    await queryRunner.query(`
      CREATE INDEX "IDX_demanda_motivos_tipo" ON "demanda_motivos"("tipo");
      CREATE INDEX "IDX_demanda_motivos_nome" ON "demanda_motivos"("nome");
      CREATE INDEX "IDX_demanda_motivos_ativo" ON "demanda_motivos"("ativo");
    `);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índices
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_demanda_motivos_ativo";
      DROP INDEX IF EXISTS "IDX_demanda_motivos_nome";
      DROP INDEX IF EXISTS "IDX_demanda_motivos_tipo";
      DROP INDEX IF EXISTS "IDX_demanda_motivos_solicitacao";
    `);

    // Remover tabela
    await queryRunner.query('DROP TABLE IF EXISTS "demanda_motivos" CASCADE;');

    // Remover enum
    await queryRunner.query('DROP TYPE IF EXISTS "tipo_demanda";');
  }
}