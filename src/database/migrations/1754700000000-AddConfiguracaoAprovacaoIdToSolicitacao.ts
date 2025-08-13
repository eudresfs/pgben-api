import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConfiguracaoAprovacaoIdToSolicitacao1754700000000 implements MigrationInterface {
  name = 'AddConfiguracaoAprovacaoIdToSolicitacao1754700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Adicionando coluna configuracao_aprovacao_id à tabela solicitacoes_aprovacao...');

    // Adicionar coluna configuracao_aprovacao_id
    await queryRunner.query(`
      ALTER TABLE "solicitacoes_aprovacao"
      ADD COLUMN "configuracao_aprovacao_id" uuid
    `);

    // Criar índice para performance
    await queryRunner.query(`
      CREATE INDEX "IDX_solicitacoes_aprovacao_configuracao"
      ON "solicitacoes_aprovacao" ("configuracao_aprovacao_id")
    `);

    // Adicionar foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "solicitacoes_aprovacao"
      ADD CONSTRAINT "FK_solicitacoes_aprovacao_configuracao"
      FOREIGN KEY ("configuracao_aprovacao_id") 
      REFERENCES "configuracoes_aprovacao"("id")
      ON DELETE RESTRICT
    `);

    console.log('Coluna configuracao_aprovacao_id adicionada com sucesso.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Removendo coluna configuracao_aprovacao_id da tabela solicitacoes_aprovacao...');

    // Remover foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "solicitacoes_aprovacao"
      DROP CONSTRAINT IF EXISTS "FK_solicitacoes_aprovacao_configuracao"
    `);

    // Remover índice
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_solicitacoes_aprovacao_configuracao"
    `);

    // Remover coluna
    await queryRunner.query(`
      ALTER TABLE "solicitacoes_aprovacao"
      DROP COLUMN "configuracao_aprovacao_id"
    `);

    console.log('Coluna configuracao_aprovacao_id removida com sucesso.');
  }
}