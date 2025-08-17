import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para adicionar valores 'executada' e 'erro_execucao' ao enum status_solicitacao_enum
 * Corrige o erro de valor de enum inválido no banco de dados
 */
export class AddExecutadaToStatusSolicitacaoEnum1755361000000 implements MigrationInterface {
  name = 'AddExecutadaToStatusSolicitacaoEnum1755361000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adiciona os novos valores ao enum status_solicitacao_enum
    await queryRunner.query(`
      ALTER TYPE "status_solicitacao_enum" 
      ADD VALUE IF NOT EXISTS 'executada';
    `);
    
    await queryRunner.query(`
      ALTER TYPE "status_solicitacao_enum" 
      ADD VALUE IF NOT EXISTS 'erro_execucao';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Nota: PostgreSQL não permite remover valores de enum diretamente
    // Para reverter esta migration, seria necessário:
    // 1. Criar um novo enum sem os valores
    // 2. Migrar os dados
    // 3. Substituir o enum antigo
    // Por simplicidade, esta migration não é reversível
    throw new Error('Esta migration não é reversível. PostgreSQL não permite remover valores de enum diretamente.');
  }
}