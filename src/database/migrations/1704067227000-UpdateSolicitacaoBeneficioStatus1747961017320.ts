import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateSolicitacaoBeneficioStatus1704067245000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Atualizar o tipo enum para incluir os novos valores
    await queryRunner.query(`
      ALTER TYPE status_solicitacao_enum ADD VALUE IF NOT EXISTS 'RASCUNHO';
      ALTER TYPE status_solicitacao_enum ADD VALUE IF NOT EXISTS 'ABERTA';
      ALTER TYPE status_solicitacao_enum ADD VALUE IF NOT EXISTS 'LIBERADA';
      ALTER TYPE status_solicitacao_enum ADD VALUE IF NOT EXISTS 'ARQUIVADA';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Não é possível remover valores de um tipo enum no PostgreSQL
    // A alternativa seria recriar o tipo, mas isso exigiria uma migração mais complexa
    // que envolveria a criação de um novo tipo, atualização da coluna e remoção do tipo antigo
    this.warnAboutIrreversibleMigration();
  }

  private warnAboutIrreversibleMigration(): void {
    console.warn(
      'ATENÇÃO: Esta migração adiciona valores ao tipo enum status_solicitacao_enum e não pode ser revertida automaticamente.',
      'Para reverter, seria necessário criar um novo tipo enum sem os valores adicionados e atualizar a coluna.',
    );
  }
}
