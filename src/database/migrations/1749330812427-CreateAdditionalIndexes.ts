import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para criação de índices adicionais em entidades relacionadas
 * 
 * Esta migration adiciona índices em entidades que se relacionam com pagamentos
 * para melhorar a performance de queries complexas e joins:
 * - InfoBancaria: otimiza busca por dados bancários
 * - ComprovantePagamento: otimiza busca por comprovantes
 * - ConfirmacaoRecebimento: otimiza busca por confirmações
 * - Cidadao: otimiza busca por beneficiários
 * 
 * @author Equipe PGBen
 */
export class CreateAdditionalIndexes1749330812427 implements MigrationInterface {
  name = 'CreateAdditionalIndexes1749330812427';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Índices essenciais para InfoBancaria
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_info_bancaria_banco_agencia_conta 
      ON info_bancaria(banco, agencia, conta)
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_info_bancaria_chave_pix 
      ON info_bancaria(chave_pix)
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_info_bancaria_ativo 
      ON info_bancaria(ativo)
    `);
    
    // Índices essenciais para ComprovantePagamento
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_comprovante_pagamento_id 
      ON comprovante_pagamento(pagamento_id)
    `);
    
    // Índices essenciais para Solicitacao
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_solicitacao_unidade_status 
      ON solicitacao(unidade_id, status)
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_solicitacao_data_abertura 
      ON solicitacao(data_abertura)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índices na ordem inversa
    await queryRunner.query(`DROP INDEX IF EXISTS idx_solicitacao_data_abertura`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_solicitacao_unidade_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_comprovante_pagamento_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_info_bancaria_ativo`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_info_bancaria_chave_pix`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_info_bancaria_banco_agencia_conta`);
  }
}