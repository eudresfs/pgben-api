import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migração para criar a tabela de solicitação de benefício
 * 
 * Esta migração cria a tabela que armazena as solicitações de benefícios
 * com suporte para dados dinâmicos específicos de cada tipo de benefício.
 */
export class CreateSolicitacaoBeneficioTabela1621234567891 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar tabela de solicitação de benefício
    await queryRunner.query(`
      CREATE TABLE "solicitacao_beneficio" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "cidadao_id" uuid NOT NULL,
        "tipo_beneficio_id" uuid NOT NULL,
        "observacoes" text,
        "dados_dinamicos" jsonb NOT NULL DEFAULT '{}',
        "versao_schema" integer NOT NULL,
        "status" varchar(50) NOT NULL DEFAULT 'PENDENTE',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_solicitacao_tipo_beneficio" FOREIGN KEY ("tipo_beneficio_id") 
          REFERENCES "tipo_beneficio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    // Criar índice para busca por cidadão
    await queryRunner.query(`
      CREATE INDEX "idx_solicitacao_cidadao" ON "solicitacao_beneficio" ("cidadao_id")
    `);

    // Criar índice para busca por tipo de benefício
    await queryRunner.query(`
      CREATE INDEX "idx_solicitacao_tipo_beneficio" ON "solicitacao_beneficio" ("tipo_beneficio_id")
    `);

    // Criar índice para busca por status
    await queryRunner.query(`
      CREATE INDEX "idx_solicitacao_status" ON "solicitacao_beneficio" ("status")
    `);

    // Criar índice GIN para busca em dados dinâmicos
    await queryRunner.query(`
      CREATE INDEX "idx_solicitacao_dados_dinamicos" ON "solicitacao_beneficio" USING GIN ("dados_dinamicos")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índices
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_solicitacao_dados_dinamicos"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_solicitacao_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_solicitacao_tipo_beneficio"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_solicitacao_cidadao"`);

    // Remover tabela
    await queryRunner.query(`DROP TABLE IF EXISTS "solicitacao_beneficio"`);
  }
}
