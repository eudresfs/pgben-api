import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migração para criar a tabela de histórico de solicitação de benefício
 * 
 * Esta migração cria a tabela que armazena o histórico de mudanças de status
 * das solicitações de benefícios, permitindo rastrear todo o fluxo de aprovação.
 */
export class CreateHistoricoSolicitacaoTabela1621234567892 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar tabela de histórico de solicitação
    await queryRunner.query(`
      CREATE TABLE "historico_solicitacao" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "solicitacao_id" uuid NOT NULL,
        "status_anterior" varchar(50),
        "status_novo" varchar(50) NOT NULL,
        "usuario_id" uuid NOT NULL,
        "justificativa" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_historico_solicitacao" FOREIGN KEY ("solicitacao_id") 
          REFERENCES "solicitacao_beneficio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    // Criar índice para busca por solicitação
    await queryRunner.query(`
      CREATE INDEX "idx_historico_solicitacao" ON "historico_solicitacao" ("solicitacao_id")
    `);

    // Criar índice para busca por usuário
    await queryRunner.query(`
      CREATE INDEX "idx_historico_usuario" ON "historico_solicitacao" ("usuario_id")
    `);

    // Criar índice para busca por status novo
    await queryRunner.query(`
      CREATE INDEX "idx_historico_status_novo" ON "historico_solicitacao" ("status_novo")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índices
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_historico_status_novo"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_historico_usuario"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_historico_solicitacao"`);

    // Remover tabela
    await queryRunner.query(`DROP TABLE IF EXISTS "historico_solicitacao"`);
  }
}
