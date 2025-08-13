import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migração para adicionar colunas faltantes na tabela acoes_criticas
 * 
 * Esta migração adiciona as colunas que estão definidas na entidade AcaoCritica
 * mas não existem na estrutura atual da tabela no banco de dados.
 */
export class AddMissingColumnsToAcaoCritica1755100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adicionar colunas faltantes
    await queryRunner.query(`
      ALTER TABLE "acoes_criticas" 
      ADD COLUMN "entidade_alvo" character varying(100) NOT NULL DEFAULT 'Solicitacao';
    `);

    // Atualizar registros existentes com valores padrão baseados no tipo
    await queryRunner.query(`
      UPDATE "acoes_criticas" 
      SET "entidade_alvo" = CASE 
        WHEN "tipo" = 'cancelamento_solicitacao' THEN 'Solicitacao'
        WHEN "tipo" = 'suspensao_beneficio' THEN 'Beneficio'
        WHEN "tipo" = 'reativacao_beneficio' THEN 'Beneficio'
        WHEN "tipo" = 'transferencia_beneficio' THEN 'Beneficio'
        WHEN "tipo" = 'alteracao_valor_beneficio' THEN 'Beneficio'
        WHEN "tipo" = 'alteracao_status_pagamento' THEN 'Pagamento'
        WHEN "tipo" = 'estorno_pagamento' THEN 'Pagamento'
        WHEN "tipo" = 'bloqueio_usuario' THEN 'Usuario'
        WHEN "tipo" = 'desbloqueio_usuario' THEN 'Usuario'
        WHEN "tipo" = 'exclusao_usuario' THEN 'Usuario'
        WHEN "tipo" = 'alteracao_perfil_usuario' THEN 'Usuario'
        WHEN "tipo" = 'alteracao_permissao' THEN 'Usuario'
        WHEN "tipo" = 'alteracao_dados_bancarios' THEN 'Cidadao'
        WHEN "tipo" = 'exclusao_beneficiario' THEN 'Cidadao'
        WHEN "tipo" = 'exclusao_documento' THEN 'Documento'
        WHEN "tipo" = 'aprovacao_recurso' THEN 'Recurso'
        WHEN "tipo" = 'rejeicao_recurso' THEN 'Recurso'
        WHEN "tipo" = 'configuracao_sistema' THEN 'Sistema'
        ELSE 'Solicitacao'
      END
      WHERE "entidade_alvo" = 'Solicitacao';
    `);

    // Criar índice para performance
    await queryRunner.query(`
      CREATE INDEX "IDX_acoes_criticas_entidade_alvo" 
      ON "acoes_criticas" ("entidade_alvo");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_acoes_criticas_modulo_entidade" 
      ON "acoes_criticas" ("modulo", "entidade_alvo");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índices
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_acoes_criticas_modulo_entidade";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_acoes_criticas_entidade_alvo";`);

    // Remover coluna
    await queryRunner.query(`
      ALTER TABLE "acoes_criticas" 
      DROP COLUMN "entidade_alvo";
    `);
  }
}