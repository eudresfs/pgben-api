import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCodigoToSolicitacaoAprovacao1754600000000 implements MigrationInterface {
  name = 'AddCodigoToSolicitacaoAprovacao1754600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adicionar coluna codigo na tabela solicitacoes_aprovacao
    await queryRunner.query(`
      ALTER TABLE "solicitacoes_aprovacao" 
      ADD COLUMN "codigo" character varying(50) NOT NULL DEFAULT 'TEMP-' || EXTRACT(EPOCH FROM NOW())::text
    `);

    // Criar índice único para a coluna codigo
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_solicitacoes_aprovacao_codigo" 
      ON "solicitacoes_aprovacao" ("codigo")
    `);

    // Atualizar registros existentes com códigos únicos baseados no ID
    await queryRunner.query(`
      UPDATE "solicitacoes_aprovacao" 
      SET "codigo" = 'SOL-' || LPAD(EXTRACT(EPOCH FROM "created_at")::text, 10, '0') || '-' || SUBSTRING("id"::text, 1, 8)
    `);

    // Remover o valor padrão após atualizar os registros existentes
    await queryRunner.query(`
      ALTER TABLE "solicitacoes_aprovacao" 
      ALTER COLUMN "codigo" DROP DEFAULT
    `);

    console.log('Coluna codigo adicionada à tabela solicitacoes_aprovacao com sucesso.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índice único
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_solicitacoes_aprovacao_codigo"`);
    
    // Remover coluna codigo
    await queryRunner.query(`ALTER TABLE "solicitacoes_aprovacao" DROP COLUMN "codigo"`);
    
    console.log('Coluna codigo removida da tabela solicitacoes_aprovacao.');
  }
}