import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para criação das tabelas do módulo de integradores.
 * 
 * Esta migration cria:
 * - Tabela 'integradores' para armazenar dados dos sistemas integradores
 * - Tabela 'integrador_tokens' para os tokens de acesso
 * - Tabela 'tokens_revogados' para armazenar tokens invalidados
 * - Índices para otimização de consultas
 * - Chaves estrangeiras para garantir integridade referencial
 */
export class CreateIntegradorSchema1621500000 implements MigrationInterface {
  name = 'CreateIntegradorSchema1621500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar tabela de integradores
    await queryRunner.query(`
      CREATE TABLE "integradores" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "nome" varchar NOT NULL CONSTRAINT "UQ_integradores_nome" UNIQUE,
        "descricao" varchar(500),
        "responsavel" varchar,
        "emailContato" varchar,
        "telefoneContato" varchar,
        "ativo" boolean NOT NULL DEFAULT true,
        "permissoesEscopo" text,
        "ipPermitidos" text,
        "ultimoAcesso" TIMESTAMP WITH TIME ZONE,
        "dataCriacao" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "dataAtualizacao" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      )
    `);

    // Criar tabela de tokens de integrador
    await queryRunner.query(`
      CREATE TABLE "integrador_tokens" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "integrador_id" uuid NOT NULL,
        "nome" varchar(100) NOT NULL,
        "descricao" varchar(500),
        "tokenHash" varchar(64) NOT NULL,
        "escopos" text,
        "dataExpiracao" TIMESTAMP WITH TIME ZONE,
        "revogado" boolean NOT NULL DEFAULT false,
        "dataRevogacao" TIMESTAMP WITH TIME ZONE,
        "motivoRevogacao" varchar,
        "ultimoUso" TIMESTAMP WITH TIME ZONE,
        "dataCriacao" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "FK_integrador_tokens_integrador" FOREIGN KEY ("integrador_id") REFERENCES "integradores" ("id") ON DELETE CASCADE
      )
    `);

    // Criar tabela de tokens revogados
    await queryRunner.query(`
      CREATE TABLE "tokens_revogados" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tokenHash" varchar(64) NOT NULL,
        "integradorId" varchar NOT NULL,
        "motivoRevogacao" varchar,
        "dataExpiracao" TIMESTAMP WITH TIME ZONE,
        "dataCriacao" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "dataLimpeza" TIMESTAMP WITH TIME ZONE
      )
    `);

    // Criar índices para otimização
    await queryRunner.query(`CREATE INDEX "IDX_integrador_tokens_integrador_id" ON "integrador_tokens" ("integrador_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_integrador_tokens_tokenHash" ON "integrador_tokens" ("tokenHash")`);
    await queryRunner.query(`CREATE INDEX "IDX_tokens_revogados_tokenHash" ON "tokens_revogados" ("tokenHash")`);
    await queryRunner.query(`CREATE INDEX "IDX_tokens_revogados_dataLimpeza" ON "tokens_revogados" ("dataLimpeza")`);

    // Criar trigger para atualização automática do campo dataAtualizacao
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_integrador_data_atualizacao()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW."dataAtualizacao" = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER trigger_update_integrador_data_atualizacao
      BEFORE UPDATE ON "integradores"
      FOR EACH ROW
      EXECUTE FUNCTION update_integrador_data_atualizacao();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover triggers
    await queryRunner.query(`DROP TRIGGER IF EXISTS trigger_update_integrador_data_atualizacao ON "integradores"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_integrador_data_atualizacao()`);

    // Remover índices
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tokens_revogados_dataLimpeza"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tokens_revogados_tokenHash"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_integrador_tokens_tokenHash"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_integrador_tokens_integrador_id"`);

    // Remover tabelas
    await queryRunner.query(`DROP TABLE IF EXISTS "tokens_revogados"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "integrador_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "integradores"`);
  }
}
