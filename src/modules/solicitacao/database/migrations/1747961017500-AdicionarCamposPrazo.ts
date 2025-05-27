import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para adicionar campos de prazo à tabela de solicitações
 * para controle e monitoramento de prazos de análise, documentos e processamento
 */
export class AdicionarCamposPrazo1747961017500 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE solicitacao
      ADD COLUMN prazo_analise TIMESTAMP,
      ADD COLUMN prazo_documentos TIMESTAMP,
      ADD COLUMN prazo_processamento TIMESTAMP
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE solicitacao
      DROP COLUMN prazo_analise,
      DROP COLUMN prazo_documentos,
      DROP COLUMN prazo_processamento
    `);
  }
}
