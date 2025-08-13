import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPrioridadeToSolicitacaoAprovacao1754800000000 implements MigrationInterface {
  name = 'AddPrioridadeToSolicitacaoAprovacao1754800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Adicionando coluna prioridade à tabela solicitacoes_aprovacao...');

    // Adicionar coluna prioridade
    await queryRunner.query(`
      ALTER TABLE "solicitacoes_aprovacao"
      ADD COLUMN "prioridade" "prioridade_aprovacao_enum" NOT NULL DEFAULT 'normal'
    `);

    // Criar índice para performance
    await queryRunner.query(`
      CREATE INDEX "IDX_solicitacoes_aprovacao_prioridade_created_at"
      ON "solicitacoes_aprovacao" ("prioridade", "created_at")
    `);

    console.log('Coluna prioridade adicionada com sucesso.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Removendo coluna prioridade da tabela solicitacoes_aprovacao...');

    // Remover índice
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_solicitacoes_aprovacao_prioridade_created_at"`);
    
    // Remover coluna prioridade
    await queryRunner.query(`ALTER TABLE "solicitacoes_aprovacao" DROP COLUMN "prioridade"`);
    
    console.log('Coluna prioridade removida com sucesso.');
  }
}